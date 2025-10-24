import React, { useState } from "react";
import { supabase } from "../supabaseClient";

/**
 * 🔹 Get embedding from Gemini (1536-dim)
 */
async function getEmbedding(text) {
  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": import.meta.env.VITE_GEMINI_API_KEY,
        },
        body: JSON.stringify({
          model: "models/text-embedding-004",
          content: { parts: [{ text }] },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gemini API error: ${err}`);
    }

    const data = await response.json();
    return data.embedding?.values || [];
  } catch (error) {
    console.error("❌ Error fetching embedding:", error);
    return [];
  }
}

/**
 * 🔹 Generate embeddings for all profiles without one
 */
async function generateProfileEmbeddings() {
  try {
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, username, full_name, college, branch, year, skills, interests");

    if (error) throw error;
    if (!profiles || profiles.length === 0) {
      console.log("✅ All profiles already have embeddings.");
      return;
    }

    for (const profile of profiles) {
      // Combine meaningful text for embedding
      const text = [
        profile.username || "",
        profile.full_name || "",
        profile.college || "",
        profile.branch || "",
        profile.year || "",
        ...(profile.skills || []),
        ...(profile.interests || []),
      ]
        .filter(Boolean)
        .join(", ");

      let embedding = await getEmbedding(text);

      // If empty, fallback to 1536 zeros
      if (!embedding || embedding.length === 0) {
        console.warn(`⚠️ Profile ${profile.id} returned empty embedding, using fallback vector`);
        embedding = new Array(1536).fill(0);
      }

      // Update profile in Supabase
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ embedding: JSON.stringify(embedding) })
        .eq("id", profile.id);

      if (updateError) {
        console.error(`❌ Failed to update profile ${profile.id}:`, updateError);
      } else {
        console.log(`✅ Updated profile ${profile.id}`);
      }
    }

    console.log("🎯 All profile embeddings generated successfully!");
  } catch (err) {
    console.error("Error generating profile embeddings:", err);
  }
}

export default function AdminGenerateProfileEmbeddings() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleGenerate = async () => {
    setLoading(true);
    setMessage("");
    try {
      await generateProfileEmbeddings();
      setMessage("Profile embeddings generated successfully!");
    } catch (err) {
      console.error(err);
      setMessage("Error generating profile embeddings. Check console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem", paddingTop: "70px" }}>
      <h1>Generate Profile Embeddings</h1>
      <button onClick={handleGenerate} disabled={loading}>
        {loading ? "Generating..." : "Generate Embeddings"}
      </button>
      {message && <p>{message}</p>}
    </div>
  );
}
