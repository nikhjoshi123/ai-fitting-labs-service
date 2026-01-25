from http.server import BaseHTTPRequestHandler
import json
import requests
import os

FASHN_API_KEY = os.environ.get("FASHN_API_KEY")
BASE_SHEETY = "https://api.sheety.co/c89502e433d17ba64f4cf1105578e56c/aiFittingLabsGatekeeper"

class handler(BaseHTTPRequestHandler):
    def _set_headers(self, status=200):
        self.send_response(status)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Content-type', 'application/json')
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers()

    def do_GET(self):
        self._set_headers()
        if "check=" in self.path:
            ckey = self.path.split("check=")[-1]
            try:
                r = requests.get(f"{BASE_SHEETY}/sheet1", timeout=5).json()
                client = next((x for x in r.get("sheet1", []) if str(x.get("clientKey")) == ckey), None)
                if client and int(client.get("usage", 0)) >= int(client.get("limit", 0)):
                    self.wfile.write(json.dumps({"status": "PAUSED"}).encode())
                    return
            except: pass
            self.wfile.write(json.dumps({"status": "ACTIVE"}).encode())
            return

        pid = self.path.split('id=')[-1] if 'id=' in self.path else None
        if pid:
            res = requests.get(f"https://api.fashn.ai/v1/status/{pid}", headers={"Authorization": f"Bearer {FASHN_API_KEY}"})
            self.wfile.write(json.dumps(res.json()).encode())

    def do_POST(self):
        try:
            blen = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(blen))
            
            # CALL AI
            ai_res = requests.post(
                "https://api.fashn.ai/v1/run",
                headers={"Authorization": f"Bearer {FASHN_API_KEY}"},
                json={
                    "model_name": "tryon-v1.6",
                    "inputs": {
                        "model_image": body["inputs"]["model_image"],
                        "garment_image": body["inputs"]["garment_image"],
                        "category": "auto"
                    }
                }
            )
            ai_data = ai_res.json()
            
            if "id" in ai_data:
                # Update Sheet1 if client_key exists
                try:
                    ckey = body.get("client_key")
                    r = requests.get(f"{BASE_SHEETY}/sheet1").json()
                    client = next((x for x in r.get("sheet1", []) if str(x.get("clientKey")) == ckey), None)
                    if client:
                        requests.put(f"{BASE_SHEETY}/sheet1/{client['id']}", json={"sheet1": {"usage": int(client['usage']) + 1}})
                except: pass
                
                self._set_headers(200)
                self.wfile.write(json.dumps(ai_data).encode())
            else:
                self._set_headers(200)
                self.wfile.write(json.dumps({"error": "AI_ERROR", "details": ai_data}).encode())
        except Exception as e:
            self._set_headers(500)
            self.wfile.write(json.dumps({"error": str(e)}).encode())
