from http.server import BaseHTTPRequestHandler
import json
import requests
import os
from upstash_redis import Redis # Use this library for Vercel KV/Upstash

# 1. This line automatically finds the 'URL' and 'TOKEN' Vercel created for you
# You don't need to paste anything here!
redis = Redis.from_env()

FASHN_API_KEY = os.environ.get("FASHN_API_KEY")

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        data = json.loads(self.rfile.read(content_length))
        client_key = data.get("client_key", "TEST_001")

        # 2. Check the database
        status = redis.get(client_key)

        if status != "active":
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            msg = f"Account {client_key} is {status if status else 'not found'}."
            self.wfile.write(json.dumps({"error": msg}).encode())
            return

        # 3. If active, run AI
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
