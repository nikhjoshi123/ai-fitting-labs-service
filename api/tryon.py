import os
import replicate
from flask import Flask, request, jsonify
from upstash_redis import Redis
from flask_cors import CORS

app = Flask(_name_)
CORS(app)

# 1. Connect to Upstash
redis = Redis(
    url="https://superb-rhino-25696.upstash.io", 
    token="AmRgAAIgcDL9pAExdb2CBzoIagkyyoXIrcZRRctlgid2u3MyntvM3g"
)

# 2. Set Replicate Token
os.environ["REPLICATE_API_TOKEN"] = "YOUR_REPLICATE_TOKEN_HERE"

@app.route('/api/tryon', methods=['GET', 'POST'])
def tryon():
    # Detect Visitor IP for "Per Person" tracking
    visitor_ip = request.headers.get('x-forwarded-for', request.remote_addr)
    if visitor_ip and ',' in visitor_ip: 
        visitor_ip = visitor_ip.split(',')[0].strip()

    # Create a unique key for this specific visitor in Redis
    visitor_key = f"usage:{visitor_ip}"

    # --- ACTION: CHECK STATUS (Button Logic) ---
    if request.method == 'GET':
        # Skip limits if IP is in your 'premium' list
        if redis.get(f"premium:{visitor_ip}"):
            return jsonify({"status": "ACTIVE", "is_premium": True})

        # Check Global Limit (57 Credits)
        global_usage = int(redis.get("global_usage") or 0)
        if global_usage >= 57:
            return jsonify({"status": "PAUSED", "reason": "System Limit Reached"})

        # Check Per-Person Limit (5 Credits)
        visitor_usage = int(redis.get(visitor_key) or 0)
        if visitor_usage >= 5:
            return jsonify({"status": "PAUSED", "reason": "Your Daily Limit Reached"})

        return jsonify({"status": "ACTIVE", "remaining": 5 - visitor_usage})

    # --- ACTION: RUN AI TRY-ON ---
    if request.method == 'POST':
        data = request.json
        model_image = data.get("inputs", {}).get("model_image")
        garment_image = data.get("inputs", {}).get("garment_image")

        # Increment counts in Redis automatically
        redis.incr("global_usage")
        redis.incr(visitor_key)
        # Set visitor limit to reset every 24 hours
        redis.expire(visitor_key, 86400)

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
            return jsonify({"status": "completed", "output": output})
        except Exception as e:
            return jsonify({"status": "failed", "error": str(e)})

    return jsonify({"error": "Invalid Method"})
