from http.server import BaseHTTPRequestHandler
import json
import requests
import os

FASHN_API_KEY = os.environ.get("FASHN_API_KEY")
# Your verified Sheety URL
SHEETY_URL = "https://api.sheety.co/c89502e433d17ba64f4cf1105578e56c/aiFittingLabsGatekeeper/sheet1"

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

    def do_POST(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(content_length))
            client_key = body.get("client_key", "TEST_USER")

            # 1. GATEKEEPER CHECK
            sheet_resp = requests.get(SHEETY_URL, timeout=10)
            rows = sheet_resp.json().get("sheet1", [])
            user_row = next((r for r in rows if str(r.get("clientKey")).strip() == client_key), None)

            if not user_row:
                self._set_headers(403)
                self.wfile.write(json.dumps({"error": "Invalid Key"}).encode())
                return

            # Check Premium Status (Column C in your sheet should be 'Is Premium')
            is_premium = str(user_row.get("isPremium", "")).upper() == "TRUE"

            if user_row.get("usage", 0) >= 500:
                self._set_headers(403)
                self.wfile.write(json.dumps({"error": "Credit limit reached"}).encode())
                return

            # 2. RUN AI
            ai_payload = {
                "model_name": "tryon-v1.6",
                "inputs": {
                    "model_image": body["inputs"]["model_image"],
                    "garment_image": body["inputs"]["garment_image"],
                    "category": "auto",
                    "nsfw_filter": True
                }
            }
            
            ai_call = requests.post(
                "https://api.fashn.ai/v1/run",
                headers={"Authorization": f"Bearer {FASHN_API_KEY}"},
                json=ai_payload
            )
            ai_resp = ai_call.json()

            # 3. UPDATE SHEET & SEND RESPONSE
            if "id" in ai_resp:
                new_usage = user_row.get("usage", 0) + 1
                requests.put(f"{SHEETY_URL}/{user_row['id']}", json={"sheet1": {"usage": new_usage}})
                
                # Send premium status back to frontend
                ai_resp["is_premium"] = is_premium
                self._set_headers(200)
                self.wfile.write(json.dumps(ai_resp).encode())
            else:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "AI Error", "details": ai_resp}).encode())

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
