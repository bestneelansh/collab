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
 * 🔹 Step 2: Generate embeddings for all external jobs without one
 */
export async function generateJobEmbeddings() {
  try {
    // 1️⃣ Fetch all jobs missing embeddings
    const { data: jobs, error } = await supabase
      .from("external_jobs")
      .select("id, title, company,location,type,skills_required")
      .is("embedding",null);

    if (error) throw error;
    if (!jobs || jobs.length === 0) {
      console.log("✅ All external jobs already have embeddings.");
      return;
    }

    for (const job of jobs) {
      const text = [
        job.title || "Job",
        job.company || "Unknown",
        job.location || "Remote",
        job.type || "Full Time",
        ...(job.skills_required && job.skills_required.length > 0
          ? job.skills_required
          : ["general"])
      ].join(", ");

      let embedding = await getEmbedding(text);

      // Skip empty embeddings
      if (!embedding || embedding.length === 0) {
        console.warn(`⚠️ Job ${job.id} returned empty embedding, using fallback vector`);
        embedding = new Array(768).fill(0); 
      }

      // 3️⃣ Update job record with embedding
      const { error: updateError } = await supabase
        .from("external_jobs")
        .update({ embedding: JSON.stringify(embedding) }) // ✅ must be stringified
        .eq("id", job.id);

      if (updateError) {
        console.error(`❌ Failed to update job ${job.id}:`, updateError);
      } else {
        console.log(`✅ Updated job ${job.id}`);
      }
    }

    console.log("🎯 All embeddings generated successfully!");
  } catch (err) {
    console.error("Error generating job embeddings:", err);
  }
}
