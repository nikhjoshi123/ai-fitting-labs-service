import json
import os
import requests
from http.server import BaseHTTPRequestHandler

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        # This part is CRITICAL. It tells the browser the request is allowed.
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        # Universal CORS headers for GET
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps({"status": "ACTIVE"}).encode())

    def do_POST(self):
        # Universal CORS headers for POST
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        try:
            content_length = int(self.headers['Content-Length'])
            raw_data = self.rfile.read(content_length)
            data = json.loads(raw_data)
            
            fashn_key = os.environ.get("FASHN_API_KEY")
            
            # This logs the attempt so you can see it in Vercel Logs
            print(f"Attempting AI Run for: {data.get('client_key')}")

            res = requests.post(
                "https://api.fashn.ai/v1/run",
                headers={"Authorization": f"Bearer {fashn_key}"},
                json={
                    "model": "stable-viton-v1",
                    "inputs": data.get("inputs")
                },
                timeout=30
            )
            
            # Print the Fashn response to your logs for debugging
            print(f"Fashn Response: {res.status_code}")
            
            self.wfile.write(json.dumps(res.json()).encode())
            
        except Exception as e:
            # This ensures even a crash is logged
            print(f"CRITICAL ERROR: {str(e)}")
            self.wfile.write(json.dumps({"error": str(e)}).encode())
