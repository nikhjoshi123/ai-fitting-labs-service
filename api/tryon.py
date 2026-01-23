from http.server import BaseHTTPRequestHandler
import json
import requests
import os

# This key will be hidden in Vercel Settings, not in the code!
API_KEY = os.environ.get("FASHN_API_KEY")

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data)

        # Direct call to AI with HIDDEN KEY
        response = requests.post(
            "https://api.fashn.ai/v1/run",
            headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"},
            json={
                "model_name": "tryon-v1.6",
                "inputs": data["inputs"]
            }
        )

        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*') # Control who uses it
        self.end_headers()
        self.wfile.write(response.text.encode())
