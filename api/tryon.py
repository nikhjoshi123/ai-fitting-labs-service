from http.server import BaseHTTPRequestHandler
import json
import requests
import os

FASHN_API_KEY = os.environ.get("FASHN_API_KEY")
# Base URL for your Sheety project
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
        # Handles the browser security check (CORS)
        self._set_headers()

    def do_POST(self):
        try:
            # Capture User IP for tracking
            user_ip = self.headers.get('x-forwarded-for', self.client_address[0]).split(',')[0]
            
            content_length = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(content_length))
            client_key = body.get("client_key", "TEST_USER")

            # 1. CHECK BOUTIQUE LIMITS (Sheet1)
            m_resp = requests.get(f"{BASE_SHEETY}/sheet1", timeout=10)
            rows = m_resp.json().get("sheet1", [])
            client_data = next((r for r in rows if str(r.get("clientKey")).strip() == client_key), None)

            if not client_data:
                self._set_headers(403)
                self.wfile.write(json.dumps({"error": f"Client Key '{client_key}' not found."}).encode())
                return

            usage = client_data.get("usage", 0)
            limit = client_data.get("limit", 0)
            if usage >= limit:
                self._set_headers(200) # Send 200 so frontend sees the status
                self.wfile.write(json.dumps({"status": "PAUSED"}).encode())
                return

            # 2. CHECK IP LOGS (Sheet2)
            # Sheety converts "Ip" -> "ip" and "Count" -> "count"
            l_resp = requests.get(f"{BASE_SHEETY}/sheet2", timeout=10)
            logs = l_resp.json().get("sheet2", [])
            user_log = next((l for l in logs if str(l.get("ip")).strip() == user_ip), None)
            
            personal_limit = client_data.get("userTrialLimit", 5)
            current_user_count = user_log.get("count", 0) if user_log else 0

            if current_user_count >= personal_limit:
                self._set_headers(403)
                self.wfile.write(json.dumps({"error": f"Daily limit of {personal_limit} reached."}).encode())
                return

            # 3. RUN AI (Fashn.ai)
            ai_payload = {
                "model_name": "tryon-v1.6",
                "inputs": {
                    "model_image": body["inputs"]["model_image"],
                    "garment_image": body["inputs"]["garment_image"],
                    "category": "auto"
                }
            }
            
            ai_call = requests.post(
                "https://api.fashn.ai/v1/run",
                headers={"Authorization": f"Bearer {FASHN_API_KEY}"},
                json=ai_payload
            )
            ai_resp = ai_call.json()

            if "id" in ai_resp:
                # 4. UPDATE MASTER USAGE (Sheet1)
                requests.put(f"{BASE_SHEETY}/sheet1/{client_data['id']}", 
                             json={"sheet1": {"usage": usage + 1}})
                
                # 5. UPDATE IP LOGS (Sheet2)
                if user_log:
                    requests.put(f"{BASE_SHEETY}/sheet2/{user_log['id']}", 
                                 json={"sheet2": {"count": current_user_count + 1}})
                else:
                    requests.post(f"{BASE_SHEETY}/sheet2", 
                                  json={"sheet2": {"ip": user_ip, "count": 1}})

                ai_resp["is_premium"] = str(client_data.get("isPremium", "FALSE")).upper() == "TRUE"
                self._set_headers(200)
                self.wfile.write(json.dumps(ai_resp).encode())
            else:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "AI Provider Error", "details": ai_resp}).encode())

        except Exception as e:
            self._set_headers(500)
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def do_GET(self):
        self._set_headers()
        prediction_id = self.path.split('id=')[-1] if 'id=' in self.path else None
        if prediction_id:
            res = requests.get(f"https://api.fashn.ai/v1/status/{prediction_id}",
                               headers={"Authorization": f"Bearer {FASHN_API_KEY}"})
            self.wfile.write(json.dumps(res.json()).encode())
