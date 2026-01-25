from http.server import BaseHTTPRequestHandler
import json
import requests
import os

# 1. SETUP - Ensure these are in your Vercel Environment Variables
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
        # --- THE GREY BUTTON CHECK ---
        if "check=" in self.path:
            ckey = self.path.split("check=")[-1]
            try:
                r = requests.get(f"{BASE_SHEETY}/sheet1", timeout=5).json()
                rows = r.get("sheet1", [])
                client = next((x for x in rows if str(x.get("clientKey")).strip() == ckey), None)
                
                # Turn button silver/grey if limit reached
                if client and int(client.get("usage", 0)) >= int(client.get("limit", 0)):
                    self.wfile.write(json.dumps({"status": "PAUSED"}).encode())
                else:
                    self.wfile.write(json.dumps({"status": "ACTIVE"}).encode())
            except:
                self.wfile.write(json.dumps({"status": "ACTIVE"}).encode())
            return

        # --- THE STATUS POLLING ---
        pid = self.path.split('id=')[-1] if 'id=' in self.path else None
        if pid:
            res = requests.get(f"https://api.fashn.ai/v1/status/{pid}", 
                               headers={"Authorization": f"Bearer {FASHN_API_KEY}"})
            self.wfile.write(json.dumps(res.json()).encode())

    def do_POST(self):
        try:
            blen = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(blen))
            ckey = body.get("client_key", "TEST_USER")

            # 1. FETCH BOUTIQUE DATA
            r = requests.get(f"{BASE_SHEETY}/sheet1", timeout=5).json()
            rows = r.get("sheet1", [])
            client = next((x for x in rows if str(x.get("clientKey")).strip() == ckey), None)

            # 2. THE GATEKEEPER CHECK
            if client and int(client.get("usage", 0)) >= int(client.get("limit", 0)):
                self._set_headers(200)
                self.wfile.write(json.dumps({"status": "PAUSED"}).encode())
                return

            # 3. CALL FASHN AI
            api_url = "https://api.fashn.ai/v1/run"
            headers = {"Authorization": f"Bearer {FASHN_API_KEY}", "Content-Type": "application/json"}
            payload = {
                "model_name": "tryon-v1.6",
                "inputs": {
                    "model_image": body["inputs"]["model_image"],
                    "garment_image": body["inputs"]["garment_image"],
                    "category": "auto"
                }
            }
            
            ai_call = requests.post(api_url, headers=headers, json=payload, timeout=15)
            ai_data = ai_call.json()

            # 4. IF AI STARTS, UPDATE SHEET IMMEDIATELY
            if "id" in ai_data:
                if client:
                    # Increment the usage count
                    new_usage = int(client.get("usage", 0)) + 1
                    requests.put(f"{BASE_SHEETY}/sheet1/{client['id']}", 
                                 json={"sheet1": {"usage": new_usage}})
                
                self._set_headers(200)
                self.wfile.write(json.dumps(ai_data).encode())
            else:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "AI_PROVIDER_ERROR", "details": ai_data}).encode())

        except Exception as e:
            self._set_headers(500)
            self.wfile.write(json.dumps({"error": str(e)}).encode())
