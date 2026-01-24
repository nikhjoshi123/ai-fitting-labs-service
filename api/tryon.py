from http.server import BaseHTTPRequestHandler
import json
import requests
import os

FASHN_API_KEY = os.environ.get("FASHN_API_KEY")

class handler(BaseHTTPRequestHandler):
    def _set_headers(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Content-type', 'application/json')
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers()

    def do_POST(self):
        self._set_headers()
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            data = json.loads(self.rfile.read(content_length))
            
            # DIRECT CALL TO FASHN AI (No Gatekeeper)
            ai_resp = requests.post(
                "https://api.fashn.ai/v1/run",
                headers={"Authorization": f"Bearer {FASHN_API_KEY}", "Content-Type": "application/json"},
                json={"model_name": "tryon-v1.6", "inputs": data["inputs"]},
                timeout=60
            )
            self.wfile.write(json.dumps(ai_resp.json()).encode())
        except Exception as e:
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def do_GET(self):
        # This handles the "Is it done yet?" status check
        self._set_headers()
        query = self.path.split('?')[-1]
        params = dict(qc.split('=') for qc in query.split('&')) if '=' in query else {}
        prediction_id = params.get('id')

        if prediction_id:
            ai_resp = requests.get(
                f"https://api.fashn.ai/v1/status/{prediction_id}",
                headers={"Authorization": f"Bearer {FASHN_API_KEY}"}
            )
            self.wfile.write(json.dumps(ai_resp.json()).encode())
