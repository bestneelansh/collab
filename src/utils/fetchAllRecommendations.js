// utils/fetchAllRecommendations.js
import { recommendJobsForUser } from "./recommendJobs";
import { fetchRecommendedHackathons } from "./fetchRecommendedHackathons";
import { fetchRecommendedProjects } from "./fetchRecommendedProjects";

export async function fetchAllRecommendations(userId) {
  try {
    // Fetch all in parallel
    const [jobsRes, hackathonsRes, projectsRes] = await Promise.all([
      recommendJobsForUser(userId, 5),
      fetchRecommendedHackathons(userId, { limit: 5 }),
      fetchRecommendedProjects(userId, { match_limit: 5 }),
    ]);

    // Normalize data
    const jobs = (jobsRes?.data || jobsRes || []).map((j) => ({
      id: j.id,
      title: j.title,
      type: "Job",
      similarity: j.similarity ?? 0.8,
    }));

    const hackathons = (hackathonsRes?.data || hackathonsRes || []).map((h) => ({
      id: h.id,
      title: h.title,
      type: "Hackathon",
      similarity: h.similarity ?? 0.8,
    }));

    const projects = (projectsRes?.data || projectsRes || []).map((p) => ({
      id: p.id,
      title: p.title,
      type: "Project",
      similarity: p.similarity ?? 0.8,
    }));

    // Return grouped results (5 per type)
    return {
      jobs: jobs.slice(0, 5),
      hackathons: hackathons.slice(0, 5),
      projects: projects.slice(0, 5),
    };
  } catch (err) {
    console.error("❌ Error in fetchAllRecommendations:", err);
    return { jobs: [], hackathons: [], projects: [] };
  }
}
