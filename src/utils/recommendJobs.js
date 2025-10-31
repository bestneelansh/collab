// src/utils/recommendJobs.js
import { supabase } from '../supabaseClient';

export async function recommendJobsForUser(profileId, limit = 10, opts = {}) {
  // opts: { location, type }
  const params = {
    user_id: profileId,
    match_count: limit
  };
  // if you created filtered function, pass filters:
    const { data, error } = await supabase.rpc('match_jobs_for_user_filtered', {
      user_id: profileId,
      match_count: limit,
      location_filter: opts.location ?? null,
      type_filter: opts.type ?? null
    });
    return { data, error };
}
