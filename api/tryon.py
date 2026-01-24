from http.server import BaseHTTPRequestHandler
import json
import requests
import os
from upstash_redis import Redis

# --- THE BRIDGE FIX ---
# Vercel uses 'KV_...', but Upstash library wants 'UPSTASH_...'
# We manually grab the Vercel ones and give them to the Chef.
redis = Redis(
    url=os.environ.get("KV_REST_API_URL"), 
    token=os.environ.get("KV_REST_API_TOKEN")
)

FASHN_API_KEY = os.environ.get("FASHN_API_KEY")

class handler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def do_POST(self):
        # We start with 200 and CORS so the browser doesn't panic
        self.send_response(200)
        self._send_cors_headers()
        self.send_header('Content-type', 'application/json')
        self.end_headers()

        try:
            content_length = int(self.headers.get('Content-Length', 0))
            data = json.loads(self.rfile.read(content_length))
            client_key = data.get("client_key", "TEST_001")

            # 1. Gatekeeper Check
            status = redis.get(client_key)
            if status is None:
                redis.set(client_key, "active")
                status = "active"

            if str(status).lower() != "active":
                self.wfile.write(json.dumps({"error": f"Status: {status}"}).encode())
                return

            # 2. Run AI
            ai_resp = requests.post(
                "https://api.fashn.ai/v1/run",
                headers={"Authorization": f"Bearer {FASHN_API_KEY}", "Content-Type": "application/json"},
                json={"model_name": "tryon-v1.6", "inputs": data["inputs"]},
                timeout=60
            )
            self.wfile.write(json.dumps(ai_resp.json()).encode())

        except Exception as e:
            self.wfile.write(json.dumps({"error": f"Server Error: {str(e)}"}).encode()
