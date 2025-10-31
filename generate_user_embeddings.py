import os
from dotenv import load_dotenv
from supabase import create_client, Client
from sentence_transformers import SentenceTransformer
import numpy as np

# Load environment variables
load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file")

supabase: Client = create_client(url, key)

# Load sentence transformer model (384 dimensions)
model = SentenceTransformer("all-MiniLM-L6-v2")

# Fetch all profiles
print("🧠 Fetching profiles...")
response = supabase.table("profiles").select("*").execute()
profiles = response.data

if not profiles:
    print("No profiles found.")
    exit()

print(f"✅ Found {len(profiles)} profiles. Generating embeddings...")

for profile in profiles:
    text_parts = []

    if profile.get("full_name"):
        text_parts.append(profile["full_name"])
    if profile.get("skills"):
        text_parts.extend(profile["skills"])
    if profile.get("interests"):
        text_parts.extend(profile["interests"])

    combined_text = " ".join(text_parts).strip()
    if not combined_text:
        print(f"⚠️ Skipping profile {profile['id']} (no skills or interests)")
        continue

    embedding = model.encode(combined_text)

    # Update embedding in Supabase
    supabase.table("profiles").update({
        "embedding": embedding.tolist()
    }).eq("id", profile["id"]).execute()

    print(f"✅ Updated embedding for {profile.get('username') or profile['id']}")

print("🎉 All profile embeddings updated successfully!")
