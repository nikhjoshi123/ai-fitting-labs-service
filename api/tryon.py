from http.server import BaseHTTPRequestHandler
import json
import requests
import os

FASHN_API_KEY = os.environ.get("FASHN_API_KEY")
# Your Sheety URL
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
            
            # Use TEST_USER if no key is provided
            client_key = body.get("client_key", "TEST_USER")

            # 1. CHECK THE GATEKEEPER (Google Sheets)
            sheet_resp = requests.get(SHEETY_URL, timeout=15)
            if sheet_resp.status_code != 200:
                self._set_headers(500)
                self.wfile.write(json.dumps({"error": "Sheety connection failed", "status": sheet_resp.status_code}).encode())
                return
                
            rows = sheet_resp.json().get("sheet1", [])
            
            # Finding the row where clientKey matches
            user_row = next((r for r in rows if str(r.get("clientKey")).strip() == client_key), None)

            if not user_row:
                self._set_headers(403)
                self.wfile.write(json.dumps({"error": f"Access Denied: Key '{client_key}' not found."}).encode())
                return

            # Check if total shop usage is over 500
            if user_row.get("usage", 0) >= 500:
                self._set_headers(403)
                self.wfile.write(json.dumps({"error": "Shop credit limit reached (500/500)."}).encode())
                return

            # 2. RUN THE AI (Fashn.ai)
            ai_payload = {
                "model_name": "tryon-v1.6",
                "inputs": body["inputs"]
            }
            ai_call = requests.post(
                "https://api.fashn.ai/v1/run",
                headers={"Authorization": f"Bearer {FASHN_API_KEY}", "Content-Type": "application/json"},
                json=ai_payload,
                timeout=30
            )
            ai_resp = ai_call.json()

            # 3. IF AI STARTS, UPDATE THE GOOGLE SHEET
            if "id" in ai_resp:
                new_usage = user_row.get("usage", 0) + 1
                row_id = user_row["id"]
                # Update specific row in Google Sheets
                requests.put(f"{SHEETY_URL}/{row_id}", json={"sheet1": {"usage": new_usage}}, timeout=10)
                
                self._set_headers(200)
                self.wfile.write(json.dumps(ai_resp).encode())
            else:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": "AI Engine Busy", "details": ai_resp}).encode())

        except Exception as e:
            self._set_headers(500)
            self.wfile.write(json.dumps({"error": "Python Backend Error", "details": str(e)}).encode())

    def do_GET(self):
        # Handles polling for status
        self._set_headers()
        prediction_id = self.path.split('id=')[-1] if 'id=' in self.path else None
        if prediction_id:
            res = requests.get(
                f"https://api.fashn.ai/v1/status/{prediction_id}",
                headers={"Authorization": f"Bearer {FASHN_API_KEY}"},
                timeout=15
            )
            self.wfile.write(json.dumps(res.json()).encode())
