from http.server import BaseHTTPRequestHandler
import json
import requests
import os

# Ensure these environment variables are set in Vercel
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
        # PRE-CHECK LOGIC
        if "check=" in self.path:
            ckey = self.path.split("check=")[-1]
            try:
                r = requests.get(f"{BASE_SHEETY}/sheet1", timeout=5).json()
                rows = r.get("sheet1", [])
                client = next((x for x in rows if str(x.get("clientKey")).strip() == ckey), None)
                if client and int(client.get("usage", 0)) >= int(client.get("limit", 0)):
                    self.wfile.write(json.dumps({"status": "PAUSED"}).encode())
                else:
                    self.wfile.write(json.dumps({"status": "ACTIVE"}).encode())
            except Exception as e:
                self.wfile.write(json.dumps({"status": "ACTIVE", "error": str(e)}).encode())
            return

        # POLLING LOGIC
        pid = self.path.split('id=')[-1] if 'id=' in self.path else None
        if pid:
            res = requests.get(f"https://api.fashn.ai/v1/status/{pid}",
                               headers={"Authorization": f"Bearer {FASHN_API_KEY}"})
            self.wfile.write(json.dumps(res.json()).encode())

    def do_POST(self):
        try:
            ip = self.headers.get('x-forwarded-for', self.client_address[0]).split(',')[0]
            blen = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(blen))
            ckey = body.get("client_key", "TEST_USER")

            # 1. LIMIT CHECKS
            sheet1 = requests.get(f"{BASE_SHEETY}/sheet1").json().get("sheet1", [])
            client = next((x for x in sheet1 if str(x.get("clientKey")).strip() == ckey), None)

            if not client or int(client.get("usage", 0)) >= int(client.get("limit", 0)):
                self._set_headers(200)
                self.wfile.write(json.dumps({"status": "PAUSED"}).encode())
                return

            # 2. RUN AI
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
            ai_call = requests.post(api_url, headers=headers, json=payload)
            ai_data = ai_call.json()

            if "id" in ai_data:
                # 3. UPDATE USAGE
                requests.put(f"{BASE_SHEETY}/sheet1/{client['id']}", json={"sheet1": {"usage": int(client['usage']) + 1}})
                
                # Update IP Logs (Sheet2)
                s2 = requests.get(f"{BASE_SHEETY}/sheet2").json().get("sheet2", [])
                log = next((l for l in s2 if str(l.get("ip")).strip() == ip), None)
                if log:
                    requests.put(f"{BASE_SHEETY}/sheet2/{log['id']}", json={"sheet2": {"count": int(log['count']) + 1}})
                else:
                    requests.post(f"{BASE_SHEETY}/sheet2", json={"sheet2": {"ip": ip, "count": 1}})

                ai_data["is_premium"] = str(client.get("isPremium", "FALSE")).upper() == "TRUE"
                self._set_headers(200)
                self.wfile.write(json.dumps(ai_data).encode())
            else:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "AI Busy"}).encode())

        except Exception as e:
            self._set_headers(500)
            self.wfile.write(json.dumps({"error": str(e)}).encode())
