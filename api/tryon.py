import json
import os
import requests
from http.server import BaseHTTPRequestHandler

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        # 1. Always send headers first to stop CORS errors
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-type', 'application/json')
        self.end_headers()

        # 2. Try to talk to Redis, but don't crash if it fails
        status = "ACTIVE"
        usage = 0
        try:
            REDIS_URL = os.environ.get("UPSTASH_REDIS_REST_URL")
            REDIS_TOKEN = os.environ.get("UPSTASH_REDIS_REST_TOKEN")
            
            if REDIS_URL and REDIS_TOKEN:
                r = requests.get(
                    f"{REDIS_URL}/get/global_usage", 
                    headers={"Authorization": f"Bearer {REDIS_TOKEN}"},
                    timeout=5
                )
                val = r.json().get("result")
                usage = int(val) if val else 0
                if usage >= 57:
                    status = "PAUSED"
        except Exception as e:
            print(f"Error: {e}")
            # We keep status "ACTIVE" so the button doesn't break if Redis is down

        self.wfile.write(json.dumps({"status": status, "usage": usage}).encode())

    def do_POST(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-type', 'application/json')
        self.end_headers()

        try:
            FASHN_API_KEY = os.environ.get("FASHN_API_KEY")
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            payload = json.loads(post_data)

            # Call Fashn
            fashn_res = requests.post(
                "https://api.fashn.ai/v1/run",
                headers={"Authorization": f"Bearer {FASHN_API_KEY}"},
                json={"model": "stable-viton-v1", "inputs": payload.get("inputs")},
                timeout=60
            )
            
            # Increment Redis if successful
            if fashn_res.status_code == 200:
                REDIS_URL = os.environ.get("UPSTASH_REDIS_REST_URL")
                REDIS_TOKEN = os.environ.get("UPSTASH_REDIS_REST_TOKEN")
                requests.get(
                    f"{REDIS_URL}/incr/global_usage", 
                    headers={"Authorization": f"Bearer {REDIS_TOKEN}"}
                )

            self.wfile.write(json.dumps(fashn_res.json()).encode())
        except Exception as e:
            self.wfile.write(json.dumps({"error": str(e)}).encode())
