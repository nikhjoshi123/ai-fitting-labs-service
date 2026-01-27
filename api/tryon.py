import json
import os
import requests
from http.server import BaseHTTPRequestHandler

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
        status = "ACTIVE"
        try:
            url = os.environ.get("UPSTASH_REDIS_REST_URL")
            tok = os.environ.get("UPSTASH_REDIS_REST_TOKEN")
            if url and tok:
                # Direct check to Redis
                r = requests.get(f"{url}/get/global_usage", headers={"Authorization": f"Bearer {tok}"})
                val = r.json().get("result")
                if val and int(val) >= 57:
                    status = "PAUSED"
        except:
            pass
        self.wfile.write(json.dumps({"status": status}).encode())

    def do_POST(self):
        self._set_headers()
        try:
            content_length = int(self.headers['Content-Length'])
            body = self.rfile.read(content_length)
            data = json.loads(body)
            
            fashn_key = os.environ.get("FASHN_API_KEY")
            
            # 1. Trigger the AI
            res = requests.post(
                "https://api.fashn.ai/v1/run",
                headers={"Authorization": f"Bearer {fashn_key}", "Content-Type": "application/json"},
                json={"model": "stable-viton-v1", "inputs": data.get("inputs")},
                timeout=30
            )
            
            response_data = res.json()

            # 2. Increment Redis only if AI started successfully
            if res.status_code == 200:
                url = os.environ.get("UPSTASH_REDIS_REST_URL")
                tok = os.environ.get("UPSTASH_REDIS_REST_TOKEN")
                requests.get(f"{url}/incr/global_usage", headers={"Authorization": f"Bearer {tok}"})

            self.wfile.write(json.dumps(response_data).encode())
        except Exception as e:
            # This sends the actual error to your alert box so we can see WHAT is busy
            self.wfile.write(json.dumps({"error": str
