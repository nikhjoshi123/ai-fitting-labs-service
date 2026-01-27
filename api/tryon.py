import os
import replicate
from flask import Flask, request, jsonify
from upstash_redis import Redis
from flask_cors import CORS

app = Flask(_name_)
CORS(app) # Allows your button to talk to this API

# 1. Connect to Upstash
redis = Redis(
    url="https://superb-rhino-25696.upstash.io", 
    token="AmRgAAIgcDL9pAExdb2CBzoIagkyyoXIrcZRRctlgid2u3MyntvM3g"
)

# 2. Set Replicate Token (Make sure this is in your Vercel Env Variables too)
os.environ["REPLICATE_API_TOKEN"] = "your_replicate_token_here"

@app.route('/api/tryon', methods=['GET', 'POST'])
def tryon():
    # Detect Visitor IP
    visitor_ip = request.headers.get('x-forwarded-for', request.remote_addr)
    if visitor_ip and ',' in visitor_ip: 
        visitor_ip = visitor_ip.split(',')[0].strip()

    # --- ACTION: CHECK STATUS ---
    if request.method == 'GET':
        # Check Premium Status
        if redis.get(f"premium:{visitor_ip}"):
            return jsonify({"status": "ACTIVE", "is_premium": True})

        # Check Global Limit (70)
        global_usage = int(redis.get("global_usage") or 0)
        if global_usage >= 70:
            return jsonify({"status": "PAUSED", "reason": "Global Limit Reached"})

        # Check Visitor Limit (5)
        visitor_usage = int(redis.get(f"usage:{visitor_ip}") or 0)
        if visitor_usage >= 5:
            return jsonify({"status": "PAUSED", "reason": "Visitor Limit Reached"})

        return jsonify({"status": "ACTIVE", "remaining": 5 - visitor_usage})

    # --- ACTION: RUN AI TRY-ON ---
    if request.method == 'POST':
        data = request.json
        model_image = data.get("inputs", {}).get("model_image")
        garment_image = data.get("inputs", {}).get("garment_image")

        # 1. Increment usage in Redis
        redis.incr("global_usage")
        redis.incr(f"usage:{visitor_ip}")
        redis.expire(f"usage:{visitor_ip}", 86400) # Reset after 24 hours

        # 2. Run Replicate AI
        try:
            output = replicate.run(
                "cuuupid/idm-vton:c871d0b9e830101a9625aed51ee3650bd314931fb931bd98402127275d3f4435",
                input={
                    "crop": False,
                    "seed": 42,
                    "steps": 30,
                    "category": "upper_body",
                    "garm_img": garment_image,
                    "human_img": model_image,
                    "garment_des": "a chic garment"
                }
            )
            # Replicate returns a list of URLs
            return jsonify({"status": "completed", "output": output})
        except Exception as e:
            return jsonify({"status": "failed", "error": str(e)})

    return jsonify({"error": "Invalid Method"})
