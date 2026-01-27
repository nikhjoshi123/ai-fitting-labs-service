import json
import os
import requests
from http.server import BaseHTTPRequestHandler

# Load environment variables from Vercel settings
REDIS_URL = os.environ.get("UPSTASH_REDIS_REST_URL")
REDIS_TOKEN = os.environ.get("UPSTASH_REDIS_REST_TOKEN")
FASHN_API_KEY = os.environ.get("FASHN_API_KEY")

class handler(BaseHTTPRequestHandler):
    def _set_headers(self):
        """Sets the essential headers to prevent CORS errors and allow Lovable to talk to Vercel."""
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_OPTIONS(self):
        # Mandatory for CORS 'preflight' requests from browsers
        self._set_headers()

    def do_GET(self):
        self._set_headers()
        current_usage = 0
        try:
            # Check current credit usage in Upstash Redis
            r = requests.get(
                f"{REDIS_URL}/get/global_usage", 
                headers={"Authorization": f"Bearer {REDIS_TOKEN}"}
            )
            val = r.json().get("result")
            current_usage = int(val) if val else 0
        except Exception as e:
            print(f"Redis Error: {e}")

        # If usage is 57 or more, we signal the frontend to pause the button
        status = "PAUSED" if current_usage >= 57 else "ACTIVE"
        self.wfile.write(json.dumps({"status": status, "usage": current_usage}).encode())

    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        payload = json.loads(post_data)

        # 1. Call FASHN AI API
        fashn_headers = {
            "Authorization": f"Bearer {FASHN_API_KEY}", 
            "Content-Type": "application/json"
        }
        
        try:
            fashn_res = requests.post(
                "https://api.fashn.ai/v1/run", 
                headers=fashn_headers, 
                json={
                    "model": "stable-viton-v1",
                    "inputs": payload.get("inputs")
                },
                timeout=60 # AI takes time, so we set a long timeout
            )
            result = fashn_res.json()

            # 2. If the AI call was successful, increment the count in Redis
            if fashn_res.status_code == 200:
                requests.get(
                    f"{REDIS_URL}/incr/global_usage", 
                    headers={"Authorization": f"Bearer {REDIS_TOKEN}"}
                )

            self._set_headers()
            self.wfile.write(json.dumps(result).encode())
            
        except Exception as e:
            self.send_response(500)
            self._set_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
