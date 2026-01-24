import os
from upstash_redis import Redis

# This finds your database automatically
redis = Redis.from_env()

def set_client():
    # This manually sets your client to active
    redis.set("TEST_001", "active")
    print("✅ Success! TEST_001 is now ACTIVE in your database.")

if _name_ == "_main_":
    set_client()
