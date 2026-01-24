from http.server import BaseHTTPRequestHandler
import json
import requests
import os
from urllib.parse import urlparse, parse_qs

FASHN_API_KEY = os.environ.get("FASHN_API_KEY")
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
        
        # Identify which client is calling (Default to a 'test' key if none provided)
        client_key = data.get("client_key", "TEST_001") 

        # --- THE GATEKEEPER CHECK ---
        try:
            sheet_resp = requests.get(f"{SHEET_API_URL}?key={client_key}", timeout=5)
            sheet_data = sheet_resp.json()
            
            if sheet_data.get("status") != "Active":
                self.send_response(403)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Subscription Inactive"}).encode())
                return
        except:
            print("Sheet check failed, allowing by default for safety.")

        # --- RUN AI ---
        response = requests.post(
            "https://api.fashn.ai/v1/run",
            headers={"Authorization": f"Bearer {FASHN_API_KEY}", "Content-Type": "application/json"},
            json={"model_name": "tryon-v1.6", "inputs": data["inputs"]},
            timeout=60
        )
        
        res_json = response.json()

        # --- UPDATE SHEET COUNT ---
        if "id" in res_json:
            try:
                requests.post(SHEET_API_URL, json={"key": client_key}, timeout=5)
            except:
                pass

        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(res_json).encode())
