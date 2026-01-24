from http.server import BaseHTTPRequestHandler
import json
import requests
import os
from upstash_redis import Redis

redis = Redis.from_env()
FASHN_API_KEY = os.environ.get("FASHN_API_KEY")

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        data = json.loads(self.rfile.read(content_length))
        client_key = data.get("client_key", "TEST_001")

        # --- AUTO-SETUP FOR NEW KEYS ---
        status = redis.get(client_key)
        
        # If the key doesn't exist yet, we create it as 'active' automatically
        if status is None:
            redis.set(client_key, "active")
            status = "active"

        # --- THE BLOCKER ---
        if status != "active":
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": f"Status: {status}. Contact Admin."}).encode())
            return

        # --- RUN AI ---
        ai_resp = requests.post(
            "https://api.fashn.ai/v1/run",
            headers={"Authorization": f"Bearer {FASHN_API_KEY}", "Content-Type": "application/json"},
            json={"model_name": "tryon-v1.6", "inputs": data["inputs"]},
            timeout=60
        )
        
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(ai_resp.json()).encode())
