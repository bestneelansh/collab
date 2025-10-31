import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient.js";
import styles from "./JobsFeed.module.css";
import Loader from "../components/Loader.jsx";
import Select from "react-select";
import LoginPrompt from "../components/LoginPrompt.jsx";

const assignSkillColors = (skills) => {
  const colors = [
    "#f59e0b","#10b981","#3b82f6","#8b5cf6","#ef4444",
    "#f97316","#6366f1","#14b8a6","#eab308","#ec4899",
    "#84cc16","#f43f5e","#22d3ee","#a855f7","#fb923c"
  ];
  const map = {};
  skills.forEach((s,i)=>map[s]=colors[i%colors.length]);
  return map;
};

const getSkillStyle = (skill, map) => ({
  backgroundColor: map[skill] || "#6b7280",
  color: "#fff"
});

const sortOptions = [
  { value: "recent", label: "Most Recent" },
  { value: "match", label: "Personalised" },
];

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
  const [sortOption, setSortOption] = useState("recent");
  const [profile, setProfile] = useState(null);
  const [showLoginPrompt,setShowLoginPrompt] = useState(false);

  const handleSearchChange = (e) => setSearchTerm(e.target.value);

  // -------- Fetch Skills --------
  useEffect(() => {
    async function fetchSkills() {
      const { data, error } = await supabase.from("skills").select("name").order("name");
      if (!error && data) {
        const names = data.map((s) => s.name);
        setAllSkills(names);
        setSkillColorMap(assignSkillColors(names));
      }
    }
    fetchSkills();
  }, []);

  // -------- Fetch Logged-in Profile --------
  useEffect(() => {
    async function fetchProfile() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, embedding")
        .eq("id", session.user.id)
        .single();
      if (!error) setProfile(data);
    }
    fetchProfile();
  }, []);

  // -------- Load Jobs --------
  const loadJobs = async (pageNumber = 0, term = "", mode = sortOption) => {
    setLoading(true);
    try {
      let data, count, error;

      if (mode === "match" && profile?.id) {
        const { data: matchData, error: matchError } = await supabase.rpc(
          "match_jobs_for_user",
          { user_id: profile.id, match_limit: PAGE_SIZE }
        );
        data = matchData;
        error = matchError;
        count = matchData?.length || 0;
      } else {
        let query = supabase
          .from("external_jobs")
          .select(
            "id, title, company, location, type, posted_date, skills_required, redirect_url, external",
            { count: "exact" }
          )
          .order("created_at", { ascending: false });

        if (term) {
          query = query.or(
            `title.ilike.%${term}%,company.ilike.%${term}%,location.ilike.%${term}%`
          );
        } else {
          query = query.range(pageNumber * PAGE_SIZE, (pageNumber + 1) * PAGE_SIZE - 1);
        }

        const res = await query;
        data = res.data;
        error = res.error;
        count = res.count;
      }

      if (error) throw error;
      if (pageNumber === 0) setJobs(data || []);
      else setJobs((prev) => [...prev, ...(data || [])]);

      setHasMore(!term && (pageNumber + 1) * PAGE_SIZE < (count || 0));
      setTotalJobs(count || 0);
    } catch (err) {
      console.error("Error loading jobs:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // -------- Fetch Match for a Single Job --------
  const handleSingleMatch = async (jobId) => {
    if (!profile?.id) {
      setShowLoginPrompt(true);
      return;
    }

    const { data, error } = await supabase.rpc("match_single_job_for_user", {
      user_id: profile.id,
      job_id: jobId,
    });

    if (!error && data && data.length > 0) {
      const percent = Math.round(data[0].similarity * 100);
      setJobs((prev) =>
        prev.map((job) =>
          job.id === jobId ? { ...job, similarity: data[0].similarity } : job
        )
      );
    } else {
      console.error("Error fetching single match:", error);
    }
  };


  // -------- Initial Load --------
  useEffect(() => {
    if (sortOption === "match" && !profile) return;
    loadJobs(0, "", sortOption);
  }, [sortOption, profile]);

  // -------- Search (debounced) --------
  useEffect(() => {
    const delay = setTimeout(() => {
      loadJobs(0, searchTerm.trim(), sortOption);
      setPage(0);
    }, 800);
    return () => clearTimeout(delay);
  }, [searchTerm]);

  // -------- Pagination --------
  const handleLoadMore = () => {
    const next = page + 1;
    loadJobs(next, searchTerm.trim(), sortOption);
    setPage(next);
  };

  if (loading && jobs.length === 0) return <Loader fullScreen={true} />;

  // -------- UI --------
  return (
    <div className={`${styles.container} ${styles.dark}`}>
      <div className={styles.placementsHero}>
        <h1 className={styles.heroTitle}>🚀 Kickstart Your Career with Top Placements</h1>
        <p className={styles.heroSubtitle}>
          Discover exciting opportunities and land your dream job!
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

      <div className={styles.filtersContainer}>
      <Select
        id="sortSelect"
        value={sortOptions.find(opt => opt.value === sortOption)}
        onChange={(opt) => {
          if (opt.value === "match" && !profile?.id) {
            setShowLoginPrompt(true);
            return;
          }
          setSortOption(opt.value);
        }}
        options={sortOptions}
        className={styles.reactSelect}
        classNamePrefix="rs"
        isSearchable={false}
        styles={{
          control: (base, state) => ({
            ...base,
            backgroundColor: "#1f2937",
            borderColor: state.isFocused ? "#6366f1" : "#374151",
            boxShadow: state.isFocused ? "0 0 8px rgba(99,102,241,0.4)" : "none",
            "&:hover": { borderColor: "#4f46e5" },
            borderRadius: "10px",
            padding: "2px 4px",
            cursor: "pointer",
          }),
          menu: (base) => ({
            ...base,
            backgroundColor: "#111827",
            borderRadius: "10px",
            marginTop: 6,
            boxShadow: "0 8px 20px rgba(0,0,0,0.5)",
            overflow: "hidden",
          }),
          option: (base, { isFocused, isSelected }) => ({
            ...base,
            backgroundColor: isSelected
              ? "#4338ca"
              : isFocused
              ? "rgba(99,102,241,0.3)"
              : "transparent",
            color: "#f3f4f6",
            cursor: "pointer",
            fontWeight: isSelected ? 700 : 500,
            transition: "all 0.2s ease",
          }),
          singleValue: (base) => ({
            ...base,
            color: "#f3f4f6",
            fontWeight: 600,
          }),
          dropdownIndicator: (base, state) => ({
            ...base,
            color: state.isFocused ? "#6366f1" : "#9ca3af",
            transition: "color 0.2s ease",
            "&:hover": { color: "#818cf8" },
          }),
          indicatorSeparator: () => ({ display: "none" }),
        }}
      />
    </div>

       <span className={styles.jobCountDisplay}>
          {totalJobs} Job{totalJobs !== 1 ? "s" : ""}
        </span>
      </div>

      {jobs.length === 0 ? (
        <p className={styles.empty}>No jobs available for this search.</p>
      ) : (
        <>
          <div className={styles.grid}>
            {jobs.map((job) => {
              const matchPercent = Math.round((job.similarity || 0) * 100);
              const hue = (matchPercent * 120) / 100;
              return (
                <div key={job.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h2 className={styles.jobTitle}>{job.title}</h2>
                    <span className={styles.jobType}>{job.type?.replace(/_/g, " ")}</span>
                  </div>

                  <p className={styles.company}>
                    <strong>{job.company}</strong> – <em>{job.location}</em>
                  </p>

                  <div className={styles.chipsContainer}>
                    {(Array.isArray(job.skills_required) ? job.skills_required : []).map((skill, i) => (
                      <span key={i} className={styles.chipSkill} style={getSkillStyle(skill, skillColorMap)}>
                        {skill}
                      </span>
                    ))}
                  </div>

                  {/* 🧠 AI Match Indicator (Below Company + Location) */}
                  <div className={styles.aiMatchSection}>
                    {job.similarity !== undefined ? (
                      <div className={styles.matchContainer}>
                        <div className={styles.matchText}>
                          You Match {Math.round(job.similarity * 100)}%
                        </div>
                        <div className={styles.matchBar}>
                          <div
                            className={`${styles.matchFill} ${matchPercent > 70 ? styles.shimmer : ""}`}
                            style={{
                              width: `${matchPercent}%`,
                              backgroundColor: `hsl(${hue}, 80%, 50%)`,
                              boxShadow: matchPercent > 70
                                ? `0 0 12px hsl(${hue}, 80%, 50%)`
                                : "none",
                            }}
                          ></div>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleSingleMatch(job.id)}
                        className={styles.aiMatchBtn}
                        title="Find AI Match %"
                      >
                        Check AI Match 🤖
                      </button>
                    )}
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
              );
            })}
          </div>

          {hasMore && !searchTerm.trim() && (
            <div className={styles.loadMoreContainer}>
              <button onClick={handleLoadMore} className={styles.loadMoreBtn} disabled={loading}>
                {loading ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
          {showLoginPrompt && (
            <LoginPrompt onClose={() => setShowLoginPrompt(false)} />
          )}
        </>
      )}
    </div>
  );
}
