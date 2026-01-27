import json
import os
import requests
from http.server import BaseHTTPRequestHandler

class handler(BaseHTTPRequestHandler):
    def _set_headers(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers()

    def do_GET(self):
        self._set_headers()
        self.wfile.write(json.dumps({"status": "ACTIVE"}).encode())

    def do_POST(self):
        self._set_headers()
        try:
            content_length = int(self.headers['Content-Length'])
            data = json.loads(self.rfile.read(content_length))
            
            # Check for API Key
            fashn_key = os.environ.get("FASHN_API_KEY")
            if not fashn_key:
                return self.wfile.write(json.dumps({"error": "Missing FASHN_API_KEY in Vercel"}).encode())

            # Attempt AI Call
            res = requests.post(
                "https://api.fashn.ai/v1/run",
                headers={"Authorization": f: "Bearer {fashn_key}"},
                json={"model": "stable-viton-v1", "inputs": data.get("inputs")},
                timeout=25 # Set just below Vercel limit
            )
            
            self.wfile.write(json.dumps(res.json()).encode())
            
        except requests.exceptions.Timeout:
            self.wfile.write(json.dumps({"error": "AI took too long (Vercel Timeout)"}).encode())
        except Exception as e:
            self.wfile.write(json.dumps({"error": str(e)}).encode())
