from http.server import BaseHTTPRequestHandler
import json
import requests
import os
from urllib.parse import urlparse, parse_qs

# Environment Variables
FASHN_API_KEY = os.environ.get("FASHN_API_KEY")
# Your new App URL should be in Vercel as SHEET_URL
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
        
        # Get the key from the website request
        client_key = data.get("client_key", "TEST_001") 

        # --- THE GATEKEEPER CHECK ---
        try:
            # 1. Ask Google Sheet about this client
            sheet_resp = requests.get(f"{SHEET_API_URL}?key={client_key}", timeout=10, allow_redirects=True)
            sheet_data = sheet_resp.json()
            
            status = str(sheet_data.get("status", "")).strip().lower()
            remaining = sheet_data.get("remaining", 0)

            # 2. VALIDATION LOGIC
            if status != "active":
                print(f"BLOCKING: Client {client_key} status is {status}")
                return self.send_error_msg(f"Account {status.capitalize()}. Please contact support.")
            
            if remaining <= 0:
                print(f"BLOCKING: Client {client_key} has 0 credits")
                return self.send_error_msg("Credit limit reached. Please refill.")
                
        except Exception as e:
            # If the sheet link is broken, we BLOCK to protect your wallet
            print(f"GATEKEEPER ERROR: {str(e)}")
            return self.send_error_msg("System verification failed.")

        # --- RUN AI (Only if Active and has Credits) ---
        response = requests.post(
            "https://api.fashn.ai/v1/run",
            headers={"Authorization": f"Bearer {FASHN_API_KEY}", "Content-Type": "application/json"},
            json={"model_name": "tryon-v1.6", "inputs": data["inputs"]},
            timeout=60
        )
        
        res_json = response.json()

        # --- UPDATE SHEET COUNT (+1) ---
        if "id" in res_json:
            try:
                requests.post(SHEET_API_URL, json={"key": client_key}, timeout=5)
            except:
                print("Failed to increment count in sheet, but AI started.")

        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(res_json).encode())

    def send_error_msg(self, message):
        self.send_response(403) # Forbidden
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({"error": message}).encode())
