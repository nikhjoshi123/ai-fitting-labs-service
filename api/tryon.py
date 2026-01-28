from http.server import BaseHTTPRequestHandler
import json
import requests
import os
from upstash_redis import Redis

# Fetch variables from Vercel
UPSTASH_URL = os.environ.get("UPSTASH_REDIS_REST_URL")
UPSTASH_TOKEN = os.environ.get("UPSTASH_REDIS_REST_TOKEN")
FASHN_API_KEY = os.environ.get("FASHN_API_KEY")

redis = Redis(url=UPSTASH_URL, token=UPSTASH_TOKEN)

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def do_POST(self):
        # Add CORS here too
        content_length = int(self.headers['Content-Length'])
        post_data = json.loads(self.rfile.read(content_length))
        
        # ... your existing Fashn/Upstash logic ...

        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*') # IMPORTANT
        self.end_headers()
        # ... write your JSON ...

        if job_id:
            status_data = redis.get(f"job_{job_id}")
            res = status_data if isinstance(status_data, str) else json.dumps(status_data)
            self.wfile.write(res.encode() if res else b'{"status":"processing"}')
        else:
            self.wfile.write(json.dumps({"message": "API is Active"}).encode())

    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = json.loads(self.rfile.read(content_length))
        inputs = post_data.get('inputs', {})

        fashn_res = requests.post(
            "https://api.fashn.ai/v1/run",
            headers={"Authorization": f"Bearer {FASHN_API_KEY}", "Content-Type": "application/json"},
            json={
                "model_image": inputs.get("model_image"),
                "garment_image": inputs.get("garment_image"),
                "category": "tops"
            },
            timeout=30
        )
        
        data = fashn_res.json()
        
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()

        if "id" in data:
            redis.set(f"job_{data['id']}", json.dumps({"status": "starting"}), ex=3600)
            self.wfile.write(json.dumps({"id": data["id"]}).encode())
        else:
            self.wfile.write(json.dumps({"error": "AI_START_FAILED", "details": data}).encode())

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
