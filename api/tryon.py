from http.server import BaseHTTPRequestHandler
import json
import requests
import os

# CONFIG
FASHN_API_KEY = os.environ.get("FASHN_API_KEY")
# Using the direct Sheet1 URL for faster connection
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
        # 1. THE GREY BUTTON CHECK
        if "check=" in self.path:
            try:
                r = requests.get(BASE_SHEETY, timeout=5).json()
                rows = r.get("sheet1", [])
                if rows:
                    data = rows[0] # Checks the very first boutique in your sheet
                    usage = int(data.get("usage", 0))
                    limit = int(data.get("limit", 0))
                    if usage >= limit:
                        self.wfile.write(json.dumps({"status": "PAUSED"}).encode())
                        return
                self.wfile.write(json.dumps({"status": "ACTIVE"}).encode())
            except Exception as e:
                self.wfile.write(json.dumps({"status": "ERROR", "details": str(e)}).encode())
            return

        # 2. STATUS POLLING
        pid = self.path.split('id=')[-1] if 'id=' in self.path else None
        if pid:
            res = requests.get(f"https://api.fashn.ai/v1/status/{pid}", 
                               headers={"Authorization": f"Bearer {FASHN_API_KEY}"})
            self.wfile.write(json.dumps(res.json()).encode())

    def do_POST(self):
        try:
            blen = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(blen))
            
            # RUN AI
            ai_call = requests.post("https://api.fashn.ai/v1/run",
                headers={"Authorization": f"Bearer {FASHN_API_KEY}"},
                json={
                    "model_name": "tryon-v1.6",
                    "inputs": {
                        "model_image": body["inputs"]["model_image"],
                        "garment_image": body["inputs"]["garment_image"],
                        "category": "auto"
                    }
                })
            ai_data = ai_call.json()

            if "id" in ai_data:
                # UPDATE SHEETY IMMEDIATELY
                try:
                    r = requests.get(BASE_SHEETY).json()
                    first_row = r.get("sheet1", [])[0]
                    row_id = first_row["id"]
                    curr_usage = int(first_row.get("usage", 0))
                    requests.put(f"{BASE_SHEETY}/{row_id}", 
                                 json={"sheet1": {"usage": curr_usage + 1}})
                except: pass # Don't block the user if Sheety is slow
                
                self._set_headers(200)
                self.wfile.write(json.dumps(ai_data).encode())
            else:
                self._set_headers(200)
                self.wfile.write(json.dumps({"error": "AI_BUSY", "details": ai_data}).encode())
        except Exception as e:
            self._set_headers(500)
            self.wfile.write(json.dumps({"error": str(e)}).encode())
