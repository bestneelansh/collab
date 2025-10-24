import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient.js";
import styles from "./JobsFeed.module.css";
import Loader from "../components/Loader.jsx";
import { FiSearch } from "react-icons/fi";

const assignSkillColors = (skills) => {
  const colors = [
    "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444",
    "#f97316", "#6366f1", "#14b8a6", "#eab308", "#ec4899",
    "#84cc16", "#f43f5e", "#22d3ee", "#a855f7", "#fb923c"
  ];
  const skillColorMap = {};
  skills.forEach((skill, idx) => skillColorMap[skill] = colors[idx % colors.length]);
  return skillColorMap;
};

const getSkillStyle = (skill, skillColorMap) => {
  const color = skillColorMap[skill] || "#6b7280";
  return { backgroundColor: color, color: "#fff" };
};

export default function Jobs() {
  const PAGE_SIZE = 50;

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalJobs, setTotalJobs] = useState(0);
  const [allSkills, setAllSkills] = useState([]);
  const [skillColorMap, setSkillColorMap] = useState({});

  const handleSearchChange = (e) => setSearchTerm(e.target.value);

  // --------- FETCH SKILLS ---------
  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const { data, error } = await supabase.from("skills").select("name").order("name");
        if (error) throw error;
        if (data) {
          const skillNames = data.map(s => s.name);
          setAllSkills(skillNames);
          setSkillColorMap(assignSkillColors(skillNames));
        }
      } catch (err) {
        console.error("Error fetching skills:", err.message);
      }
    };
    fetchSkills();
  }, []);

  // --------- LOAD JOBS (paged or search) ---------
  const loadJobs = async (pageNumber = 0, term = "") => {
    setLoading(true);
    try {
      let query = supabase
        .from("external_jobs")
        .select(
          "id, title, company, location, type, posted_date, skills_required, redirect_url, external",
          { count: "exact" }
        )
        .order("created_at", { ascending: false });

      if (term) {
        query = query.or(`title.ilike.%${term}%,company.ilike.%${term}%,location.ilike.%${term}%`);
      } else {
        query = query.range(pageNumber * PAGE_SIZE, (pageNumber + 1) * PAGE_SIZE - 1);
      }

      const { data, count, error } = await query;
      if (error) throw error;

      if (pageNumber === 0) setJobs(data || []);
      else setJobs(prev => [...prev, ...(data || [])]);

      setHasMore(!term && (pageNumber + 1) * PAGE_SIZE < (count || 0));
      setTotalJobs(count || 0);
    } catch (err) {
      console.error("Error fetching jobs:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // --------- INITIAL LOAD ---------
  useEffect(() => {
    loadJobs(0);
  }, []);

  // --------- SEARCH WITH DEBOUNCE ---------
  useEffect(() => {
    const delay = setTimeout(() => {
      loadJobs(0, searchTerm.trim());
      setPage(0);
    }, 500); // 1 second buffer
    return () => clearTimeout(delay);
  }, [searchTerm]);

  // --------- LOAD MORE ---------
  const handleLoadMore = () => {
    const nextPage = page + 1;
    loadJobs(nextPage, searchTerm.trim());
    setPage(nextPage);
  };

  if (loading && jobs.length === 0) return <Loader fullScreen={true} />;

  return (
    <div className={`${styles.container} ${styles.dark}`}>
      <div className={styles.placementsHero}>
        <h1 className={styles.heroTitle}>🚀 Kickstart Your Career with Top Placements</h1>
        <p className={styles.heroSubtitle}>
          Discover exciting opportunities, view jobs and land your dream career!
        </p>
      </div>

      <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search jobs by title, company or location..."
            value={searchTerm}
            onChange={handleSearchChange}
            className={styles.searchInput}
          />
        <span className={styles.jobCountDisplay}>
          {totalJobs} Job{totalJobs !== 1 ? "s" : ""}
        </span>
      </div>

      {jobs.length === 0 ? (
        <p className={styles.empty}>No jobs available for this search.</p>
      ) : (
        <>
          <div className={styles.grid}>
            {jobs.map((job) => (
              <div key={job.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.jobTitle}>{job.title}</h2>
                  <span className={styles.jobType}>{job.type.replace(/_/g, " ")}</span>
                </div>
                <p className={styles.company}>
                  <strong>{job.company}</strong> - <em>{job.location}</em>
                </p>
                <div className={styles.chipsContainer}>
                  {(Array.isArray(job.skills_required) ? job.skills_required : []).map((skill, idx) => (
                    <span key={idx} className={styles.chipSkill} style={getSkillStyle(skill, skillColorMap)}>
                      {skill}
                    </span>
                  ))}
                </div>
                <div className={styles.actionsContainer}>
                  <a
                    href={job.redirect_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.applyBtn}
                  >
                    View Job
                  </a>
                </div>
              </div>
            ))}
          </div>
          {hasMore && !searchTerm.trim() && (
            <div className={styles.loadMoreContainer}>
              <button
                onClick={handleLoadMore}
                className={styles.loadMoreBtn}
                disabled={loading}
              >
                {loading ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
