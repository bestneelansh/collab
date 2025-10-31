import { supabase } from "../supabaseClient";

export async function fetchSimilarJobs(queryEmbedding, count = 5) {
  const { data, error } = await supabase.rpc("match_jobs", {
    query_embedding: queryEmbedding,
    match_count: count,
  });

  if (error) {
    console.error("Error fetching similar jobs:", error);
    return [];
  }

  return data;
}
