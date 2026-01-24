from http.server import BaseHTTPRequestHandler
import json
import requests
import os
from urllib.parse import urlparse, parse_qs

# API Keys from Vercel Env Variables
FASHN_API_KEY = os.environ.get("FASHN_API_KEY")
# The URL from your Google Apps Script "Deploy as Web App"
SHEET_API_URL = os.environ.get("SHEET_URL") 

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        query = parse_qs(urlparse(self.path).query)
        prediction_id = query.get('id', [None])[0]
        
        if not prediction_id:
            self.send_error(400, "Missing ID")
            return

        response = requests.get(
            f"https://api.fashn.ai/v1/status/{prediction_id}",
            headers={"Authorization": f"Bearer {FASHN_API_KEY}"}
        )
        
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(response.json()).encode())

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        data = json.loads(body)
        
        # 1. AUTHENTICATION: Get the client's unique key from the request
        client_key = data.get("client_key", "GUEST") 

        # 2. THE GATEKEEPER: Check Google Sheets for Status & Credits
        try:
            sheet_check = requests.get(f"{SHEET_API_URL}?key={client_key}").json()
            
            if sheet_check.get("status") != "Active":
                return self.send_error_msg("Subscription Inactive. Please contact support.")
            
            if sheet_check.get("remaining", 0) <= 0:
                return self.send_error_msg("Credit Limit Reached. Please refill.")
                
        except Exception as e:
            # If sheet fails, decide if you want to allow (safety) or block
            print(f"Sheet error: {e}")

        # 3. RUN AI: Only if the gatekeeper allowed it
        response = requests.post(
            "https://api.fashn.ai/v1/run",
            headers={"Authorization": f"Bearer {FASHN_API_KEY}", "Content-Type": "application/json"},
            json={"model_name": "tryon-v1.6", "inputs": data["inputs"]},
            timeout=60
        )
        
        res_json = response.json()

        # 4. LOG USAGE: If AI started successfully, tell the sheet to add +1
        if "id" in res_json:
            requests.post(SHEET_API_URL, json={"key": client_key, "action": "increment"})
            # Pass the remaining tries back to the UI
            res_json["remaining_tries"] = sheet_check.get("remaining", 1) - 1

        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(res_json).encode())

    def send_error_msg(self, message):
        self.send_response(403)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({"error": message}).encode())
