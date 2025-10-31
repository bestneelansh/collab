import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import Loader from "../components/Loader.jsx";
import styles from "./RecommendedJobs.module.css";

export default function RecommendedJobs() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);

  // 1️⃣ Check session and fetch profile
  useEffect(() => {
    async function fetchUserProfile() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        navigate("/login"); // redirect if not logged in
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        navigate("/login");
        return;
      }

      setProfile(data);
    }

    fetchUserProfile();
  }, [navigate]);

  // 2️⃣ When profile loads, call match_jobs_for_user RPC
  useEffect(() => {
    if (!profile?.id) return;

    async function fetchRecommendedJobs() {
      setLoading(true);

      const { data, error } = await supabase.rpc("match_jobs_for_user", {
        user_id: profile.id,
        match_limit: 10,
      });

      if (error) console.error("Error fetching jobs:", error);
      else setJobs(data || []);

      setLoading(false);
    }

    fetchRecommendedJobs();
  }, [profile]);

  // 3️⃣ UI Rendering
  if (loading) return <Loader />;

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Recommended Jobs for You</h1>

      {jobs.length === 0 ? (
        <p className={styles.noJobsText}>
          No job matches found yet. Try adding more skills to your profile!
        </p>
      ) : (
        <div className={styles.grid}>
          {jobs.map((job) => (
            <div key={job.id} className={styles.card}>
              <h2 className={styles.title}>{job.title}</h2>
              <p className={styles.company}>{job.company}</p>
              <p className={styles.details}>
                {job.location} • {job.type}
              </p>

              <div className={styles.skills}>
                {Array.isArray(job.skills_required) &&
                job.skills_required.length > 0 ? (
                  job.skills_required.map((s, i) => (
                    <span
                      key={`${job.id}-${s}-${i}`} // ✅ unique key fix
                      className={styles.skillTag}
                    >
                      {s}
                    </span>
                  ))
                ) : (
                  <span className={styles.noSkills}>No skills listed</span>
                )}
              </div>

              <div className={styles.matchScore}>
                Match score:
                <span className={styles.matchValue}>
                  {Math.round(job.similarity * 100)}%
                </span>
              </div>

              <div className={styles.barContainer}>
                <div
                  className={styles.barFill}
                  style={{ width: `${Math.round(job.similarity * 100)}%` }}
                ></div>
              </div>

              {job.url && (
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.button}
                >
                  View Job
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
