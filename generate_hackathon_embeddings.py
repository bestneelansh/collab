# generate_hackathon_embeddings.py

import os
import time
from dotenv import load_dotenv
from supabase import create_client, Client
from sentence_transformers import SentenceTransformer

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

# ====== Fetch hackathons without embeddings ======
print("🔹 Fetching hackathons without embeddings...")

all_hacks = []
batch_size = 1000
offset = 0

while True:
    batch = (
        supabase.table("hackathons")
        .select("id, title, description, type, skills, categories, embedding")
        .is_("embedding", None)
        .range(offset, offset + batch_size - 1)
        .execute()
        .data
    )
    if not batch:
        break
    all_hacks.extend(batch)
    offset += batch_size
    print(f"✅ Fetched {len(all_hacks)} hackathons so far...")

if not all_hacks:
    print("🎉 All hackathons already have embeddings!")
    exit()

# ====== Generate and store embeddings ======
print(f"🧠 Generating embeddings for {len(all_hacks)} hackathons...")

for hack in all_hacks:
    try:
        # 🧩 Combine relevant fields for semantic context
        hack_text = f"{hack['title']} {hack.get('description', '')} {hack.get('type', '')}"

        # Add skills and categories
        if hack.get("skills"):
            if isinstance(hack["skills"], list):
                hack_text += " " + " ".join(hack["skills"])
            elif isinstance(hack["skills"], str):
                hack_text += " " + hack["skills"]

        if hack.get("categories"):
            if isinstance(hack["categories"], list):
                hack_text += " " + " ".join(hack["categories"])
            elif isinstance(hack["categories"], str):
                hack_text += " " + hack["categories"]

        # Generate embedding
        embedding = model.encode(hack_text).tolist()

        # Update record in Supabase
        supabase.table("hackathons").update({"embedding": embedding}).eq("id", hack["id"]).execute()
        print(f"✅ Updated embedding for: {hack['title']} ({hack['id']})")

        time.sleep(0.3)  # prevent hitting rate limits

    except Exception as e:
        print(f"⚠️ Error processing hackathon {hack['id']}: {e}")

print("🎯 All missing hackathon embeddings generated successfully!")
