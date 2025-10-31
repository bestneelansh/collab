// runGenerateJobEmbeddings.js
import { spawnSync } from "child_process";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

// 🔹 Initialize Supabase
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
  console.log("🔍 Fetching jobs...");
  const { data: jobs, error } = await supabase.from("jobs").select("id, title, type, location, skills_required");

  if (error) throw error;
  if (!jobs.length) {
    console.log("⚠️ No jobs found.");
    return;
  }

  for (const job of jobs) {
    console.log(`Generating embedding for: ${job.title}`);

    const text = `${job.title || ""} ${job.type || ""} ${job.location || ""} ${job.skills_required?.join(" ") || ""}`;

    // Run local Python embedding generator
    const result = spawnSync("python3", ["generate_embeddings.py", text], { encoding: "utf-8" });

    if (result.error) {
      console.error("❌ Python error:", result.error);
      continue;
    }

    try {
      const embedding = JSON.parse(result.stdout);

      // Update Supabase
      const { error: updateError } = await supabase
        .from("jobs")
        .update({ embedding })
        .eq("id", job.id);

      if (updateError) console.error("⚠️ Update error:", updateError);
      else console.log(`✅ Saved embedding for ${job.title}`);
    } catch (err) {
      console.error("⚠️ JSON parse error:", err, result.stdout);
    }
  }

  console.log("🏁 All embeddings generated!");
}

main().catch(console.error);
