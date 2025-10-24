import { createClient } from "@supabase/supabase-js";
import { fetchJobs } from "./src/utils/fetchJobs.js";
import "dotenv/config"; 

const supabase = createClient(
  process.env.SB_URL,
  process.env.SB_SERVICE_ROLE_KEY
);

fetchJobs(supabase)
  .then(() => console.log("Jobs fetched successfully"))
  .catch((err) => console.error("Error fetching jobs:", err));
