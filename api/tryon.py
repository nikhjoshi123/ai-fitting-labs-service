from http.server import BaseHTTPRequestHandler
import json
import requests
import os
from urllib.parse import urlparse, parse_qs

API_KEY = os.environ.get("FASHN_API_KEY")

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        # THIS PREVENTS THE 401 ERROR IN YOUR IMAGE
        query = parse_qs(urlparse(self.path).query)
        prediction_id = query.get('id', [None])[0]
        
        if not prediction_id:
            self.send_error(400, "Missing ID")
            return

        # Vercel uses the API_KEY safely here
        response = requests.get(
            f"https://api.fashn.ai/v1/status/{prediction_id}",
            headers={"Authorization": f"Bearer {API_KEY}"}
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
        
        response = requests.post(
            "https://api.fashn.ai/v1/run",
            headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"},
            json={"model_name": "tryon-v1.6", "inputs": data["inputs"]},
            timeout=60
        )
        
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(response.json()).encode())
