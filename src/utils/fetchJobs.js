const ADZUNA_API = "https://api.adzuna.com/v1/api/jobs";
const APP_ID = "06fec555"; // your app id
const APP_KEY = "1c60f54b42e4a0a879be95db593e8f30"; // your app key
const COUNTRY = "in"; // India
const SEARCH_TERMS = ["developer", "designer", "data"]; 
const RESULTS_PER_PAGE = 20;
const MAX_REQUESTS_PER_DAY = 250; 

export async function fetchJobs(supabase) {
  const fetchedJobIds = new Set();
  let requestsMade = 0;

  for (let term of SEARCH_TERMS) {
    for (let page = 1; page <= MAX_REQUESTS_PER_DAY; page++) {
      if (requestsMade >= MAX_REQUESTS_PER_DAY) break;

      const url = `${ADZUNA_API}/${COUNTRY}/search/${page}?app_id=${APP_ID}&app_key=${APP_KEY}&results_per_page=${RESULTS_PER_PAGE}&what=${encodeURIComponent(term)}`;

      try {
        const res = await fetch(url);
        const data = await res.json();

        if (!data?.results?.length) break; // stop if no more results

        const formattedJobs = data.results.map((job) => ({
          id: job.id,
          title: job.title,
          company: job.company?.display_name || "Unknown",
          location: job.location?.display_name || "Remote",
          type: job.contract_time || "Full Time",
          skills_required: job.description
            ? job.description.match(/\b(JavaScript|Python|React|Node|SQL|AWS|Java|C\+\+|HTML|CSS)\b/gi) || []
            : [],
          salary_min: job.salary_min || null,
          salary_max: job.salary_max || null,
          posted_date: job.created || null,
          redirect_url: job.redirect_url || null,
          external: true, // mark as external
          last_seen: new Date(),
        }));

        // Insert / update jobs
        const { error } = await supabase
          .from("external_jobs")
          .upsert(formattedJobs, { onConflict: ["id"] });

        if (error) console.error("Error inserting jobs:", error);

        // Track fetched IDs
        formattedJobs.forEach((j) => fetchedJobIds.add(j.id));

        requestsMade++;
      } catch (err) {
        console.error("Fetch error:", err);
      }
    }
  }

  const { error: deleteError } = await supabase
  .from("external_jobs")
  .delete()
  .lt("last_seen", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  if (deleteError) console.error("Error deleting old jobs:", deleteError);

  console.log(`✅ Synced ${fetchedJobIds.size} external jobs today.`);
}
