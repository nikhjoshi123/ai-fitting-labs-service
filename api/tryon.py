from http.server import BaseHTTPRequestHandler
import json
import requests
import os

API_KEY = os.environ.get("FASHN_API_KEY")
usage_tracker = {} 
MAX_TRIES = 5 

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        # This part tells the browser: "It's okay to send data here"
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*') # In production, replace * with your store URL
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        # 1. Identity & Limit Check
        client_ip = self.headers.get('x-forwarded-for', 'unknown').split(',')[0]
        current_usage = usage_tracker.get(client_ip, 0)

        if current_usage >= MAX_TRIES:
            self.send_response(403)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Limit Reached"}).encode())
            return

        # 2. Process Request
        content_length = int(self.headers['Content-Length'])
        data = json.loads(self.rfile.read(content_length))

        try:
            response = requests.post(
                "https://api.fashn.ai/v1/run",
                headers={"Authorization": f"Bearer {API_KEY}"},
                json={"model_name": "tryon-v1.6", "inputs": data["inputs"]},
                timeout=30
            )
            
            usage_tracker[client_ip] = current_usage + 1
            result = response.json()
            result["remaining_tries"] = MAX_TRIES - usage_tracker[client_ip]

            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
