from http.server import BaseHTTPRequestHandler
import json
import requests
import os
from upstash_redis import Redis

# Fetching variables from Vercel Environment
UPSTASH_URL = os.environ.get("UPSTASH_REDIS_REST_URL")
UPSTASH_TOKEN = os.environ.get("UPSTASH_REDIS_REST_TOKEN")
FASHN_API_KEY = os.environ.get("FASHN_API_KEY")

# Initialize Redis
redis = Redis(url=UPSTASH_URL, token=UPSTASH_TOKEN)

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
            try:
                status_data = redis.get(f"job_{job_id}")
                if status_data:
                    # If it's a string, write it. If it's a dict, dump to json.
                    res = status_data if isinstance(status_data, str) else json.dumps(status_data)
                    self.wfile.write(res.encode())
                else:
                    self.wfile.write(b'{"status":"processing"}')
            except Exception as e:
                self.wfile.write(json.dumps({"error": str(e)}).encode())
        else:
            self.wfile.write(b'{"message":"Server is Online"}')

    def do_POST(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(content_length))
            inputs = body.get('inputs', {})

            fashn_res = requests.post(
                "https://api.fashn.ai/v1/run",
                headers={
                    "Authorization": f"Bearer {FASHN_API_KEY}",
                    "Content-Type": "application/json"
                },
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
                # Store in Redis with 1-hour expiry
                redis.set(f"job_{data['id']}", json.dumps({"status": "starting"}), ex=3600)
                # CRITICAL FIX: Writing the ID to the response body
                self.wfile.write(json.dumps({"id": data["id"]}).encode())
            else:
                self.wfile.write(json.dumps({"error": "AI_INIT_FAILED", "details": data}).encode())
                
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
