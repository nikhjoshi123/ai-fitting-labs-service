from http.server import BaseHTTPRequestHandler
import json
import requests
import os

FASHN_API_KEY = os.environ.get("FASHN_API_KEY")
SHEETY_URL = "YOUR_SHEETY_API_URL_HERE" 

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
            sheet_resp = requests.get(SHEETY_URL)
            if sheet_resp.status_code != 200:
                raise Exception(f"Sheety GET Failed: {sheet_resp.text}")
                
            rows = sheet_resp.json().get("sheet1", [])
            user_row = next((r for r in rows if str(r.get("clientKey")).strip() == client_key), None)

            if not user_row:
                self._set_headers(403)
                self.wfile.write(json.dumps({"error": "Key not found in Sheet"}).encode())
                return

            # Total shop limit (e.g., 500)
            if user_row.get("usage", 0) >= 500: 
                self._set_headers(403)
                self.wfile.write(json.dumps({"error": "Shop credit exhausted"}).encode())
                return

            # 2. CALL FASHN.AI
            ai_payload = {"model_name": "tryon-v1.6", "inputs": body["inputs"]}
            ai_call = requests.post(
                "https://api.fashn.ai/v1/run",
                headers={"Authorization": f"Bearer {FASHN_API_KEY}", "Content-Type": "application/json"},
                json=ai_payload
            )
            ai_resp = ai_call.json()

            # 3. UPDATE USAGE
            if "id" in ai_resp:
                new_usage = user_row.get("usage", 0) + 1
                requests.put(f"{SHEETY_URL}/{user_row['id']}", json={"sheet1": {"usage": new_usage}})
                self._set_headers(200)
                self.wfile.write(json.dumps(ai_resp).encode())
            else:
                # This helps us see the REAL error from Fashn.ai
                self._set_headers(500)
                self.wfile.write(json.dumps({"error": "Fashn.ai Error", "details": ai_resp}).encode())

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
