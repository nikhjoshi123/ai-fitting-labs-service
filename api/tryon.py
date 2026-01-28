import json
import requests
import os
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# Hiding the key in Vercel Environment Variables is your security
FASHN_API_KEY = os.environ.get("FASHN_API_KEY")

class handler(BaseHTTPRequestHandler):
    def _headers(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_OPTIONS(self):
        self._headers()

    def do_GET(self):
        self._headers()
        query = parse_qs(urlparse(self.path).query)
        pid = query.get('id', [None])[0]

        if not pid:
            self.wfile.write(json.dumps({"status": "ready"}).encode())
            return

        # Direct check to Fashn AI - No Redis middleman
        headers = {"Authorization": f"Bearer {FASHN_API_KEY}"}
        try:
            res = requests.get(f"https://api.fashn.ai/v1/predictions/{pid}", headers=headers, timeout=10)
            self.wfile.write(res.content)
        except Exception as e:
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def do_POST(self):
        try:
            content_length = int(self.headers['Content-Length'])
            data = json.loads(self.rfile.read(content_length))
            
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

            # Fire request to Fashn AI
            response = requests.post("https://api.fashn.ai/v1/predictions", headers=headers, json=payload, timeout=25)
            
            self._headers()
            self.wfile.write(response.content)
            
        except Exception as e:
            self._headers()
            self.wfile.write(json.dumps({"error": "Gateway Error", "details": str(e)}).encode())
