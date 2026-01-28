import json
import requests
import time
import os
from http.server import BaseHTTPRequestHandler

# API Keys from Vercel Environment Variables
FASHN_API_KEY = os.environ.get("FASHN_API_KEY")

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        # This tells the browser: "Yes, you are allowed to talk to me"
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        # Handling the status check (polling)
        from urllib.parse import urlparse, parse_qs
        query = parse_qs(urlparse(self.path).query)
        prediction_id = query.get('id', [None])[0]

        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-type', 'application/json')
        self.end_headers()

        if not prediction_id:
            self.wfile.write(json.dumps({"message": "Server is Online"}).encode())
            return

        headers = {"Authorization": f"Bearer {FASHN_API_KEY}"}
        response = requests.get(f"https://api.fashn.ai/v1/predictions/{prediction_id}", headers=headers)
        self.wfile.write(response.content)

    def do_POST(self):
        # Handling the initial AI request
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data)

        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-type', 'application/json')
        self.end_headers()

        inputs = data.get("inputs", {})
        
        payload = {
            "model_image": inputs.get("model_image"),
            "garment_image": inputs.get("garment_image"),
            "category": "tops" # Default category
        }

        headers = {
            "Authorization": f"Bearer {FASHN_API_KEY}",
            "Content-Type": "application/json"
        }

        response = requests.post("https://api.fashn.ai/v1/predictions", headers=headers, json=payload)
        self.wfile.write(response.content)
