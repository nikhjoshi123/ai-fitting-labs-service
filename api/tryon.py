from http.server import BaseHTTPRequestHandler
import json
import requests
import os

FASHN_API_KEY = os.environ.get("FASHN_API_KEY")
SHEET_API_URL = os.environ.get("SHEET_URL") 

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        data = json.loads(self.rfile.read(content_length))
        client_key = data.get("client_key", "TEST_001")

        # --- THE GATEKEEPER ---
        try:
            # Check the Google Sheet
            sheet_resp = requests.get(f"{SHEET_API_URL}?key={client_key}", timeout=10)
            sheet_json = sheet_resp.json()
            
            status = str(sheet_json.get("status", "")).strip().upper()
            
            # IF NOT ACTIVE, KILL THE PROCESS IMMEDIATELY
            if status != "ACTIVE":
                self.send_response(200) # Send 200 so the browser can read the error message
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": f"Subscription {status}. Please contact support."}).encode())
                return

        except Exception as e:
            # If Google Sheet fails, block the request to be safe
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "System verification failed. Check Sheet Connection."}).encode())
            return

        # --- RUN AI (Only happens if status was ACTIVE) ---
        ai_resp = requests.post(
            "https://api.fashn.ai/v1/run",
            headers={"Authorization": f"Bearer {FASHN_API_KEY}", "Content-Type": "application/json"},
            json={"model_name": "tryon-v1.6", "inputs": data["inputs"]},
            timeout=60
        )
        
        # Update usage count in sheet
        requests.post(SHEET_API_URL, json={"key": client_key})

        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(ai_resp.json()).encode())

    def do_GET(self):
        # ... (Keep your existing do_GET for polling)
