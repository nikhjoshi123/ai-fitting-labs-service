from http.server import BaseHTTPRequestHandler
import json
import requests
import os

FASHN_API_KEY = os.environ.get("FASHN_API_KEY")
BASE_SHEETY = "https://api.sheety.co/c89502e433d17ba64f4cf1105578e56c/aiFittingLabsGatekeeper/sheet1"

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
        # Pre-check logic for the Silver Button
        if "check=" in self.path:
            try:
                r = requests.get(BASE_SHEETY, timeout=5).json()
                # Get the first row (Usage/Limit)
                data = r.get("sheet1", [])[0] 
                if int(data.get("usage", 0)) >= int(data.get("limit", 0)):
                    self.wfile.write(json.dumps({"status": "PAUSED"}).encode())
                else:
                    self.wfile.write(json.dumps({"status": "ACTIVE"}).encode())
            except Exception as e:
                self.wfile.write(json.dumps({"status": "ERROR", "msg": str(e)}).encode())
            return

        # Polling
        pid = self.path.split('id=')[-1] if 'id=' in self.path else None
        if pid:
            res = requests.get(f"https://api.fashn.ai/v1/status/{pid}", 
                               headers={"Authorization": f"Bearer {FASHN_API_KEY}"})
            self.wfile.write(json.dumps(res.json()).encode())

    def do_POST(self):
        try:
            blen = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(blen))
            
            # 1. Start AI
            ai_res = requests.post("https://api.fashn.ai/v1/run",
                headers={"Authorization": f"Bearer {FASHN_API_KEY}"},
                json={"model_name": "tryon-v1.6", "inputs": body["inputs"]})
            ai_data = ai_res.json()

            if "id" in ai_data:
                # 2. Update Sheet Usage
                try:
                    r = requests.get(BASE_SHEETY).json()
                    row_id = r.get("sheet1", [])[0]["id"]
                    curr_usage = r.get("sheet1", [])[0]["usage"]
                    requests.put(f"{BASE_SHEETY}/{row_id}", json={"sheet1": {"usage": curr_usage + 1}})
                except: pass
                
                self._set_headers(200)
                self.wfile.write(json.dumps(ai_data).encode())
            else:
                self._set_headers(200)
                self.wfile.write(json.dumps({"error": "AI Busy"}).encode())
        except Exception as e:
            self._set_headers(500)
            self.wfile.write(json.dumps({"error": str(e)}).encode())
