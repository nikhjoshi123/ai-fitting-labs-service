import json
import os
import requests
from http.server import BaseHTTPRequestHandler

class handler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        """Sets the headers globally to stop the 'Blocked by CORS' error."""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def do_OPTIONS(self):
        """Handles the browser pre-flight check."""
        self._send_cors_headers()

    def do_GET(self):
        """Handles the credit limit check."""
        # Force these headers or Lovable will block the response
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-type', 'application/json')
        self.end_headers()

        REDIS_URL = os.environ.get("UPSTASH_REDIS_REST_URL")
        REDIS_TOKEN = os.environ.get("UPSTASH_REDIS_REST_TOKEN")

        usage = 0
        try:
            r = requests.get(f"{REDIS_URL}/get/global_usage", headers={"Authorization": f"Bearer {REDIS_TOKEN}"})
            val = r.json().get("result")
            usage = int(val) if val else 0
        except:
            pass

        status = "PAUSED" if usage >= 57 else "ACTIVE"
        self.wfile.write(json.dumps({"status": status, "usage": usage}).encode())

    def do_POST(self):
        """Handles the AI Try-On."""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-type', 'application/json')
        self.end_headers()

        FASHN_API_KEY = os.environ.get("FASHN_API_KEY")
        
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        payload = json.loads(post_data)

        try:
            fashn_res = requests.post(
                "https://api.fashn.ai/v1/run",
                headers={"Authorization": f"Bearer {FASHN_API_KEY}", "Content-Type": "application/json"},
                json={"model": "stable-viton-v1", "inputs": payload.get("inputs")},
                timeout=60
            )
            
            # Increment Redis on success
            if fashn_res.status_code == 200:
                REDIS_URL = os.environ.get("UPSTASH_REDIS_REST_URL")
                REDIS_TOKEN = os.environ.get("UPSTASH_REDIS_REST_TOKEN")
                requests.get(f"{REDIS_URL}/incr/global_usage", headers={"Authorization": f"Bearer {REDIS_TOKEN}"})

            self.wfile.write(json.dumps(fashn_res.json()).encode())
        except Exception as e:
            self.wfile.write(json.dumps({"error": str(e)}).encode())
