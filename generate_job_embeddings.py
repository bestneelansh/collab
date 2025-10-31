# generate_job_embeddings.py

import os
from dotenv import load_dotenv
from supabase import create_client, Client
from sentence_transformers import SentenceTransformer
import numpy as np
import time

# ====== Load environment variables ======
load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    raise ValueError("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file")

# ====== Connect to Supabase ======
supabase: Client = create_client(url, key)

# ====== Load model ======
print("🔹 Loading sentence transformer model...")
model = SentenceTransformer("all-MiniLM-L6-v2")

# ====== Fetch jobs that DON'T have embeddings yet ======
print("🔹 Fetching jobs without embeddings...")

all_jobs = []
batch_size = 1000
offset = 0

while True:
    batch = (
        supabase.table("external_jobs")
        .select("id, title, company, location, type, skills_required, embedding")
        .is_("embedding", None)
        .range(offset, offset + batch_size - 1)
        .execute()
        .data
    )
    if not batch:
        break
    all_jobs.extend(batch)
    offset += batch_size
    print(f"✅ Fetched {len(all_jobs)} jobs so far...")

if not all_jobs:
    print("🎉 All jobs already have embeddings!")
    exit()

# ====== Generate and store embeddings ======
print(f"🧠 Generating embeddings for {len(all_jobs)} jobs...")

for job in all_jobs:
    try:
        job_text = f"{job['title']} {job['company']} {job.get('location', '')} {job.get('type', '')}"
        if job.get("skills_required"):
            if isinstance(job["skills_required"], list):
                job_text += " " + " ".join(job["skills_required"])
            elif isinstance(job["skills_required"], str):
                job_text += " " + job["skills_required"]
        
        embedding = model.encode(job_text).tolist()

        supabase.table("external_jobs").update({"embedding": embedding}).eq("id", job["id"]).execute()
        print(f"✅ Updated embedding for: {job['title']} ({job['id']})")

        # Be nice to rate limits
        time.sleep(0.3)

    except Exception as e:
        print(f"⚠️ Error processing job {job['id']}: {e}")

print("🎯 All missing job embeddings generated successfully!")
