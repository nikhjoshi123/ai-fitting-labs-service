from http.server import BaseHTTPRequestHandler
import json
import requests
import os
from upstash_redis import Redis

# Use the Vercel names directly
redis = Redis(
    url=os.environ.get("KV_REST_API_URL"), 
    token=os.environ.get("KV_REST_API_TOKEN")
)
FASHN_API_KEY = os.environ.get("FASHN_API_KEY")

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        # This handles the "CORS handshake" directly in Python
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            data = json.loads(self.rfile.read(content_length))
            
            # 1. Gatekeeper Check
            client_key = data.get("client_key", "TEST_001")
            status = redis.get(client_key)
            if status is None:
                redis.set(client_key, "active")
                status = "active"

            # 2. Call AI
            ai_resp = requests.post(
                "https://api.fashn.ai/v1/run",
                headers={"Authorization": f"Bearer {FASHN_API_KEY}", "Content-Type": "application/json"},
                json={"model_name": "tryon-v1.6", "inputs": data["inputs"]},
                timeout=60
            )
            self.wfile.write(json.dumps(ai_resp.json()).encode())
        except Exception as e:
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def do_GET(self):
        # For polling status
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        # ... logic for status check ...
