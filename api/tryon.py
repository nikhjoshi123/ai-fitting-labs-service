from http.server import BaseHTTPRequestHandler
import json
import requests
from upstash_redis import Redis

# --- CONFIG ---
UPSTASH_URL = "YOUR_UPSTASH_URL"
UPSTASH_TOKEN = "YOUR_UPSTASH_TOKEN"
FASHN_API_KEY = "YOUR_FASHN_API_KEY"

redis = Redis(url=UPSTASH_URL, token=UPSTASH_TOKEN)

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        # 1. Read the input from frontend
        content_length = int(self.headers['Content-Length'])
        post_data = json.loads(self.rfile.read(content_length))
        inputs = post_data.get('inputs', {})

        # 2. Call Fashn AI
        fashn_res = requests.post(
            "https://api.fashn.ai/v1/run",
            headers={"Authorization": f"Bearer {FASHN_API_KEY}", "Content-Type": "application/json"},
            json={
                "model_image": inputs.get("model_image"),
                "garment_image": inputs.get("garment_image"),
                "category": "tops"
            }
        )
        
        data = fashn_res.json()
        
        # 3. Store job ID in Upstash and return to user
        if "id" in data:
            redis.set(f"job_{data['id']}", json.dumps({"status": "starting"}))
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"id": data["id"]}).encode())
        else:
            self.send_response(500)
            self.end_headers()

    def do_GET(self):
        # Polling logic for Upstash
        from urllib.parse import urlparse, parse_qs
        query = parse_qs(urlparse(self.path).query)
        job_id = query.get('id', [None])[0]

        if job_id:
            status_data = redis.get(f"job_{job_id}")
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(status_data.encode() if status_data else b'{"status":"not_found"}')
