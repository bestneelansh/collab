#!/usr/bin/env python3
"""
generate_embeddings.py
-----------------------
Generates a free, local embedding (no paid API) using Sentence Transformers.

Usage (from terminal):
    python3 generate_embeddings.py "Frontend Developer skilled in React"

Usage (from Node.js):
    spawnSync("python3", ["generate_embeddings.py", text])
"""

import sys
import json
from sentence_transformers import SentenceTransformer

# Load model once (cached locally after first download)
model = SentenceTransformer('all-MiniLM-L6-v2')

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No input text provided"}))
        sys.exit(1)

    # Combine all CLI arguments into one string (handles multi-word input)
    text = " ".join(sys.argv[1:])

    # Generate embedding
    embedding = model.encode(text).tolist()

    # Output embedding as JSON so Node.js can parse it
    print(json.dumps(embedding))

if __name__ == "__main__":
    main()
