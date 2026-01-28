import json
import requests
import os
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

FASHN_API_KEY = os.environ.get("FASHN_API_KEY")

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
        query = parse_qs(urlparse(self.path).query)
        prediction_id = query.get('id', [None])[0]

        if not prediction_id:
            self.wfile.write(json.dumps({"status": "online"}).encode())
            return

        headers = {"Authorization": f"Bearer {FASHN_API_KEY}"}
        try:
            response = requests.get(f"https://api.fashn.ai/v1/predictions/{prediction_id}", headers=headers)
            self.wfile.write(response.content)
        except Exception as e:
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def do_POST(self):
        self._set_headers()
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

            response = requests.post("https://api.fashn.ai/v1/predictions", headers=headers, json=payload)
            # This ensures we send back exactly what Fashn AI sent us
            self.wfile.write(response.content)
            
        except Exception as e:
            # If something fails, send a JSON error, not a text error
            self.wfile.write(json.dumps({"error": "Failed to process", "details": str(e)}).encode())
