import json
import requests
import os
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

FASHN_API_KEY = os.environ.get("FASHN_API_KEY")

class handler(BaseHTTPRequestHandler):
    def _set_headers(self, status=200):
        self.send_response(status)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers()

    def do_GET(self):
        self._set_headers()
        query = parse_qs(urlparse(self.path).query)
        pid = query.get('id', [None])[0]

        if not pid:
            self.wfile.write(json.dumps({"status": "online"}).encode())
            return

        headers = {"Authorization": f"Bearer {FASHN_API_KEY}"}
        try:
            # Check the status of the AI generation
            res = requests.get(f"https://api.fashn.ai/v1/predictions/{pid}", headers=headers, timeout=10)
            self.wfile.write(res.content)
        except Exception as e:
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def do_POST(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data)
            
            inputs = data.get("inputs", {})
            payload = {
                "model_image": inputs.get("model_image"),
                "garment_image": inputs.get("garment_image"),
                "category": "tops"
            }

            headers = {
                "Authorization": f"Bearer {FASHN_API_KEY}",
                "Content-Type": "application/json"
            }

            # We use a short timeout so the connection doesn't hang
            response = requests.post("https://api.fashn.ai/v1/predictions", headers=headers, json=payload, timeout=25)
            
            self._set_headers(200)
            self.wfile.write(response.content)
            
        except Exception as e:
            # If it times out or resets, we still send a JSON response
            self._set_headers(500)
            self.wfile.write(json.dumps({"error": "Reset or Timeout", "details": str(e)}).encode())
