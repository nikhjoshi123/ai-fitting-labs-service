from http.server import BaseHTTPRequestHandler
import json
import requests
import os

# Your secret key is safe here on the server
API_KEY = os.environ.get("FASHN_API_KEY")
usage_tracker = {} 
MAX_TRIES = 5 

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        # Crucial for fixing "Connection Error"
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept')
        self.end_headers()

    def do_POST(self):
        client_ip = self.headers.get('x-forwarded-for', 'unknown').split(',')[0]
        current_usage = usage_tracker.get(client_ip, 0)

        # Transparency check: Prevent over-usage
        if current_usage >= MAX_TRIES:
            self.send_response(403)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Limit Reached"}).encode())
            return

        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        data = json.loads(body)

        try:
            # Proxies the request to the AI engine
            response = requests.post(
                "https://api.fashn.ai/v1/run",
                headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"},
                json={"model_name": "tryon-v1.6", "inputs": data["inputs"]},
                timeout=60
            )
            
            usage_tracker[client_ip] = current_usage + 1
            result = response.json()
            # Send the transparency data back to the browser
            result["remaining_tries"] = MAX_TRIES - usage_tracker[client_ip]

            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
