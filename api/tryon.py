import json
import requests
import os
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# Your Secret Key stays safe on Vercel
API_KEY = os.environ.get("FASHN_API_KEY")

class handler(BaseHTTPRequestHandler):
    def _send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def do_OPTIONS(self):
        self._send_json({"status": "ok"})

    def do_GET(self):
        query = parse_qs(urlparse(self.path).query)
        pid = query.get('id', [None])[0]
        check_balance = query.get('balance', [None])[0]

        # NEW: Check balance directly from your website!
        if check_balance:
            res = requests.get("https://api.fashn.ai/v1/credits", headers={"Authorization": f"Bearer {API_KEY}"})
            self._send_json(res.json())
            return

        if not pid:
            self._send_json({"status": "ready", "msg": "Send a POST with images or ?id= to check status"})
            return

        # Poll Fashn AI directly
        try:
            res = requests.get(f"https://api.fashn.ai/v1/predictions/{pid}", 
                               headers={"Authorization": f"Bearer {API_KEY}"}, timeout=10)
            self._send_json(res.json())
        except Exception as e:
            self._send_json({"error": str(e)}, 500)

    def do_POST(self):
        try:
            content_length = int(self.headers['Content-Length'])
            data = json.loads(self.rfile.read(content_length))
            
            # Forward the request to Fashn AI
            payload = {
                "model_image": data["inputs"]["model_image"],
                "garment_image": data["inputs"]["garment_image"],
                "category": "tops"
            }
            
            res = requests.post("https://api.fashn.ai/v1/predictions", 
                                 json=payload, 
                                 headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"},
                                 timeout=30)
            
            self._send_json(res.json(), res.status_code)
            
        except Exception as e:
            self._send_json({"error": "Processing failed", "details": str(e)}, 500)
