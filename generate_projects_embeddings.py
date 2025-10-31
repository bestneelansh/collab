#!/usr/bin/env python3
"""
generate_project_embeddings.py
------------------------------
Generates embeddings for all projects in the 'projects' table
that don't yet have an embedding, using Sentence Transformers.
"""

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

# ====== Fetch projects that DON'T have embeddings yet ======
print("🔹 Fetching projects without embeddings...")

all_projects = []
batch_size = 1000
offset = 0

while True:
    batch = (
        supabase.table("projects")
        .select("id, title, description, technologies, categories, tags, embedding")
        .is_("embedding", None)
        .range(offset, offset + batch_size - 1)
        .execute()
        .data
    )
    if not batch:
        break
    all_projects.extend(batch)
    offset += batch_size
    print(f"✅ Fetched {len(all_projects)} projects so far...")

if not all_projects:
    print("🎉 All projects already have embeddings!")
    exit()

# ====== Generate and store embeddings ======
print(f"🧠 Generating embeddings for {len(all_projects)} projects...")

for project in all_projects:
    try:
        # --- Build a text representation of the project ---
        parts = [
            project.get("title", ""),
            project.get("description", ""),
        ]

        for field in ["technologies", "categories", "tags"]:
            value = project.get(field)
            if isinstance(value, list):
                parts.append(" ".join(value))
            elif isinstance(value, str):
                parts.append(value)

        project_text = " ".join(parts).strip()

        if not project_text:
            print(f"⚠️ Skipping empty project: {project['id']}")
            continue

        # --- Generate embedding ---
        embedding = model.encode(project_text).tolist()

        # --- Update Supabase record ---
        supabase.table("projects").update({"embedding": embedding}).eq("id", project["id"]).execute()

        print(f"✅ Updated embedding for: {project['title']} ({project['id']})")

        # Be nice to rate limits
        time.sleep(0.3)

    except Exception as e:
        print(f"⚠️ Error processing project {project['id']}: {e}")

print("🎯 All missing project embeddings generated successfully!")
