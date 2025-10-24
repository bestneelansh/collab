import { supabase } from "../supabaseClient";

/**
 * 🔹 Step 1: Get embedding for a given text using Gemini
 */
export async function getEmbedding(text) {
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
 * 🔹 Step 2: Generate embeddings for all profiles without one
 */
export async function generateProfileEmbeddings() {
  try {
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, username, full_name, college, branch, skills, interests")
      .is("embedding",null);

    if (error) throw error;
    if (!profiles || profiles.length === 0) {
      console.log("✅ All profiles already have embeddings.");
      return;
    }

    for (const profile of profiles) {
      const text = [
        profile.full_name || profile.username || "User",
        profile.college || "Unknown",
        profile.branch || "General",
        ...(profile.skills || []),
        ...(profile.interests || [])
      ].join(", ");

      let embedding = await getEmbedding(text);

      if (!embedding || embedding.length === 0) {
        console.warn(`⚠️ Profile ${profile.id} returned empty embedding, using fallback vector`);
        embedding = new Array(768).fill(0);
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ embedding: (embedding) })
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
