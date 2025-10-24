import axios from "axios";
import { supabase } from "../supabaseClient.js";

const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY;

/**
 * Generate embedding for a given text using Gemini
 */
async function getEmbedding(text) {
  const response = await axios.post(
    "https://api.generativeai.google/v1beta2/models/text-embedding-3-large:embed",
    { input: text },
    {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GEMINI_API_KEY}`,
      },
    }
  );

  return response.data.data[0].embedding;
}

/**
 * Generate embeddings for all external jobs without one
 */
export async function generateJobEmbeddings() {
  const { data: jobs, error } = await supabase
    .from("external_jobs")
    .select("id, title, skills_required")
    .is("embedding", null);

  if (error) throw error;
  if (!jobs || jobs.length === 0) {
    console.log("All external jobs already have embeddings.");
    return;
  }

  for (const job of jobs) {
    const text = [
      job.title,
      ...(job.skills_required || []),
    ].join(", ");

    const embedding = await getEmbedding(text);

    await supabase
      .from("external_jobs")
      .update({ embedding })
      .eq("id", job.id);
  }

  console.log("External job embeddings generated!");
}
