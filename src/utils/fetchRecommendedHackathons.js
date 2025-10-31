import { supabase } from "../supabaseClient";

export async function fetchRecommendedHackathons(userId, filters = {}) {
  const {
    skills = [],
    categories = [],
    type = null,
    teamSize = null,
    limit = 20,
    offset = 0,
  } = filters;

  const { data, error } = await supabase.rpc("match_hackathons_for_user", {
    p_user_id: userId,
    match_limit: limit,
    match_offset: offset,
    filter_type: type || null,
    filter_skills: skills.length > 0 ? skills.map((s) => s.value || s) : null,
    filter_categories: categories.length > 0 ? categories.map((c) => c.value || c) : null,
    filter_team_size: teamSize || null,
  });

  if (error) {
    console.error("⚠️ Hackathon RPC Error:", error);
    return [];
  }

  console.log("✅ Hackathon RPC Data:", data);
  return data;
}
