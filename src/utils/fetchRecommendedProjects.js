// utils/supabaseQueries.js
import { supabase } from "../supabaseClient";

export async function fetchRecommendedProjects(userId, filters = {}) {
  const { categories = [], difficulty = null, visibility = "public" } = filters;

  const { data, error } = await supabase.rpc("match_projects_for_user_with_filters", {
    p_user_id: userId,
    p_categories: categories.length > 0 ? categories : null,
    p_difficulty: difficulty,
    p_visibility: visibility,
    match_limit: 5,
  });

  if (error) {
    console.error("❌ Error fetching recommended projects:", error);
    return [];
  }

  return data || [];
}
