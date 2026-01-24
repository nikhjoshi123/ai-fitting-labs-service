from http.server import BaseHTTPRequestHandler
import json
import requests
import os
from upstash_redis import Redis

# Magic line to connect to your database automatically
redis = Redis.from_env()
FASHN_API_KEY = os.environ.get("FASHN_API_KEY")

class handler(BaseHTTPRequestHandler):
    def _set_headers(self, status_code=200):
        self.send_response(status_code)
        # --- THE CORS FIX: ALLOW EVERYONE ---
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Content-type', 'application/json')
        self.end_headers()

    def do_OPTIONS(self):
        # This handles the "Preflight" knock on the door
        self._set_headers(200)

    def do_POST(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            data = json.loads(self.rfile.read(content_length))
            client_key = data.get("client_key", "TEST_001")

            # 1. Gatekeeper Check
            status = redis.get(client_key)
            if status is None:
                redis.set(client_key, "active")
                status = "active"

            if status != "active":
                self._set_headers(200)
                self.wfile.write(json.dumps({"error": f"Account {status}"}).encode())
                return

            # 2. Run AI
            ai_resp = requests.post(
                "https://api.fashn.ai/v1/run",
                headers={"Authorization": f"Bearer {FASHN_API_KEY}", "Content-Type": "application/json"},
                json={"model_name": "tryon-v1.6", "inputs": data["inputs"]},
                timeout=60
            )
            
            self._set_headers(200)
            self.wfile.write(json.dumps(ai_resp.json()).encode())
            
        except Exception as e:
            self._set_headers(500)
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def do_GET(self):
        # Handle status checking for polling
        query = self.path.split('?')[-1]
        params = dict(qc.split('=') for qc in query.split('&')) if '=' in query else {}
        prediction_id = params.get('id')

        if prediction_id:
            ai_resp = requests.get(
                f"https://api.fashn.ai/v1/status/{prediction_id}",
                headers={"Authorization": f"Bearer {FASHN_API_KEY}"}
            )
            self._set_headers(200)
            self.wfile.write(json.dumps(ai_resp.json()).encode())
