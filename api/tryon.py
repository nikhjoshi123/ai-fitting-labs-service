import json
import os
import requests
from http.server import BaseHTTPRequestHandler

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        # This stops the 404/CORS errors in your console
        self.wfile.write(json.dumps({"status": "ACTIVE"}).encode())

    def do_POST(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        try:
            content_length = int(self.headers['Content-Length'])
            data = json.loads(self.rfile.read(content_length))
            
            fashn_key = os.environ.get("FASHN_API_KEY")
            
            # Simple direct call to Fashn AI
            res = requests.post(
                "https://api.fashn.ai/v1/run",
                headers={"Authorization": f"Bearer {fashn_key}"},
                json={
                    "model": "stable-viton-v1",
                    "inputs": data.get("inputs")
                },
                timeout=30
            )
            self.wfile.write(json.dumps(res.json()).encode())
        except Exception as e:
            self.wfile.write(json.dumps({"error": str(e)}).encode())
