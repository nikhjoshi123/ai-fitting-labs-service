from http.server import BaseHTTPRequestHandler
import json
import requests
import os
from upstash_redis import Redis

# Automatically pulls from Vercel Environment Variables
redis = Redis(
    url=os.environ.get("UPSTASH_REDIS_REST_URL"), 
    token=os.environ.get("UPSTASH_REDIS_REST_TOKEN")
)
FASHN_KEY = os.environ.get("FASHN_API_KEY")

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        from urllib.parse import urlparse, parse_qs
        query = parse_qs(urlparse(self.path).query)
        job_id = query.get('id', [None])[0]

        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()

        if job_id:
            # Check Upstash for the status of the AI job
            res = redis.get(f"job_{job_id}")
            if res:
                output = res if isinstance(res, str) else json.dumps(res)
                self.wfile.write(output.encode())
            else:
                self.wfile.write(b'{"status":"processing"}')
        else:
            self.wfile.write(b'{"message":"Server is Online"}')

    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        body = json.loads(self.rfile.read(content_length))
        inputs = body.get('inputs', {})

        # 1. Send to Fashn AI
        fashn_res = requests.post(
            "https://api.fashn.ai/v1/run",
            headers={"Authorization": f"Bearer {FASHN_KEY}", "Content-Type": "application/json"},
            json={
                "model_image": inputs.get("model_image"),
                "garment_image": inputs.get("garment_image"),
                "category": "tops"
            },
            timeout=25
        )
        
        data = fashn_res.json()
        
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()

        if "id" in data:
            # 2. Store the Job ID in Upstash so we can check it later
            redis.set(f"job_{data['id']}", json.dumps({"status": "starting"}), ex=3600)
            self.wfile.write(json.dumps({"id": data["id"]}).encode())
        else:
            self.wfile.write(json.dumps({"error": "Fashn AI failed", "details": data}).encode())
