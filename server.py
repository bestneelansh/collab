# server.py
from flask import Flask, request, jsonify
from flask_cors import CORS
from sentence_transformers import SentenceTransformer

app = Flask(__name__)
CORS(app)  # allow requests from your dev server (only for local dev)
model = SentenceTransformer('all-MiniLM-L6-v2')

@app.route('/embed', methods=['POST'])
def embed():
    data = request.get_json(silent=True) or {}
    text = data.get('text', '')
    if not text or not text.strip():
        return jsonify({'error': 'Missing text'}), 400

    embedding = model.encode(text).tolist()
    return jsonify({'embedding': embedding})

if __name__ == '__main__':
    # Use port 5001 to avoid conflicts; run in dev only
    app.run(host='127.0.0.1', port=5001)
