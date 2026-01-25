from http.server import BaseHTTPRequestHandler
import json
import requests
import os

# Get your API key from Vercel Environment Variables
FASHN_API_KEY = os.environ.get("FASHN_API_KEY")

# PASTE YOUR SHEETY API ENDPOINT HERE
# Example: https://api.sheety.co/your_id/aiFittingLabs/sheet1
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
            
            # The frontend sends this key (e.g., "TEST_USER")
            client_key = body.get("client_key", "TEST_USER")

            # --- 1. GATEKEEPER CHECK (Google Sheets) ---
            sheet_resp = requests.get(SHEETY_URL)
            sheet_data = sheet_resp.json()
            rows = sheet_data.get("sheet1", [])
            
            # Find the matching user row in your Sheet
            user_row = next((r for r in rows if str(r.get("clientKey")).strip() == client_key), None)

            if not user_row:
                self._set_headers(403)
                self.wfile.write(json.dumps({"error": "Invalid Client Key. Access Denied."}).encode())
                return

            # CHECK THE LIMIT: Change 5 to 70 if you want to give more trials
            if user_row.get("usage", 0) >= 5:
                self._set_headers(403)
                self.wfile.write(json.dumps({"error": "Demo limit reached (5/5). Contact AI Fitting Labs to unlock more."}).encode())
                return

            # --- 2. CALL FASHN.AI (Spend Credit) ---
            ai_payload = {
                "model_name": "tryon-v1.6",
                "inputs": body["inputs"]
            }
            ai_headers = {
                "Authorization": f"Bearer {FASHN_API_KEY}",
                "Content-Type": "application/json"
            }
            
            ai_resp = requests.post(
                "https://api.fashn.ai/v1/run",
                headers=ai_headers,
                json=ai_payload,
                timeout=60
            ).json()

            # --- 3. UPDATE THE SHEET (Usage + 1) ---
            if "id" in ai_resp:
                new_usage = user_row.get("usage", 0) + 1
                row_id = user_row["id"]
                
                # Tell Sheety to update the specific row
                update_url = f"{SHEETY_URL}/{row_id}"
                requests.put(update_url, json={"sheet1": {"usage": new_usage}})
                
                self._set_headers(200)
                self.wfile.write(json.dumps(ai_resp).encode())
            else:
                self._set_headers(500)
                self.wfile.write(json.dumps({"error": "AI Engine busy", "details": ai_resp}).encode())

        except Exception as e:
            self._set_headers(500)
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def do_GET(self):
        # This handles the 'polling' to see if the image is finished
        self._set_headers()
        params = self.path.split('?')[-1]
        prediction_id = None
        if 'id=' in params:
            prediction_id = params.split('id=')[-1].split('&')[0]

        if prediction_id:
            res = requests.get(
                f"https://api.fashn.ai/v1/status/{prediction_id}",
                headers={"Authorization": f"Bearer {FASHN_API_KEY}"}
            )
            self.wfile.write(json.dumps(res.json()).encode())
        else:
            self.wfile.write(json.dumps({"error": "No ID provided"}).encode())
