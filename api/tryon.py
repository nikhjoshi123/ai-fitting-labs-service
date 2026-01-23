from http.server import BaseHTTPRequestHandler
import json
import requests
import os

API_KEY = os.environ.get("FASHN_API_KEY")

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        
        try:
            data = json.loads(body)
            
            # THE HANDSHAKE WITH FASHN AI
            response = requests.post(
                "https://api.fashn.ai/v1/run",
                headers={
                    "Authorization": f"Bearer {API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model_name": "tryon-v1.6",
                    "inputs": data["inputs"]
                },
                timeout=60
            )
            
            # Send the AI's actual answer back to the browser
            self.send_response(response.status_code)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response.json()).encode())

        except Exception as e:
            self.send_response(500)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
