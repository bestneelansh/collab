import React, { useState } from "react";
import { generateJobEmbeddings } from "../utils/generateJobEmbeddingsClient";

export default function AdminGenerateEmbeddings() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleGenerate = async () => {
    setLoading(true);
    setMessage("");
    try {
      await generateJobEmbeddings();
      setMessage("✅ Job embeddings generated successfully!");
    } catch (err) {
      console.error("Error generating embeddings:", err);
      setMessage("❌ Error generating embeddings. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: "3rem",
        paddingTop: "80px",
        maxWidth: "600px",
        margin: "0 auto",
        textAlign: "center",
      }}
    >
      <h1 style={{ marginBottom: "1rem" }}>🧠 Generate External Job Embeddings</h1>

      <button
        onClick={handleGenerate}
        disabled={loading}
        style={{
          backgroundColor: loading ? "#777" : "#007bff",
          color: "white",
          border: "none",
          borderRadius: "8px",
          padding: "0.8rem 1.6rem",
          fontSize: "1rem",
          cursor: loading ? "not-allowed" : "pointer",
          transition: "background-color 0.3s",
        }}
      >
        {loading ? "⏳ Generating..." : "🚀 Generate Embeddings"}
      </button>

      {message && (
        <p
          style={{
            marginTop: "1.5rem",
            color: message.includes("Error") ? "red" : "green",
            fontWeight: "500",
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}
