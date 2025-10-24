import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card } from "../components/ui/Card.jsx";
import { User, Users, Code ,Briefcase} from "lucide-react";
import styles from "./Dashboard.module.css";
import Loader from "/Users/neelanshgoyal/Documents/collatz/src/components/Loader.jsx";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ posts: 0, hackathons: 0, projects: 0, jobs: 0 });
  const [recentActivity, setRecentActivity] = useState([]);
  const [modalData, setModalData] = useState(null);

  useEffect(() => {
    async function fetchDashboard() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      // Fetch username from public.users
      const { data: userProfile, error: profileError } = await supabase
        .from("users")
        .select("username")
        .eq("id", user.id)
        .single();

      if(profileError) console.error("Error fetching username:", profileError);
      setUser({ ...user, username: userProfile?.username || "" });

      // Fetch interested jobs (count + ids)
      const { data: interestedJobsData } = await supabase
        .from("job_interests")
        .select("job_id, job_title, created_at")
        .eq("user_id", user.id);

      const interestedJobs = (interestedJobsData || []).map(j => ({
        id: j.job_id,
        title: j.job_title,
        created_at: j.created_at,
        type: "Interested",
      }));

      // Fetch stats
      const [
        { count: postsCount },
        { count: hackathonsCount },
        { count: projectsCount }
      ] = await Promise.all([
        supabase.from("posts").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("hackathons").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("projects").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      ]);

      setStats({
        posts: postsCount || 0,
        hackathons: hackathonsCount || 0,
        projects: projectsCount || 0,
        jobs: interestedJobs.length, // count of interested jobs
      });

      // Fetch other activity
      const [postsRes, hackathonsRes, projectsRes] = await Promise.all([
        supabase.from("posts").select("id, title, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
        supabase.from("hackathons").select("id, title, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
        supabase.from("projects").select("id, title, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
      ]);

      const posts = (postsRes.data || []).map(item => ({ ...item, type: "Post" }));
      const hackathons = (hackathonsRes.data || []).map(item => ({ ...item, type: "Hackathon" }));
      const projects = (projectsRes.data || []).map(item => ({ ...item, type: "Project" }));

      const combined = [...posts, ...hackathons, ...projects, ...interestedJobs];
      combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setRecentActivity(combined.slice(0, 7));
      setLoading(false);
    }

    fetchDashboard();
  }, [navigate]);

  async function openModal(type) {
    let tableName = "";
    let selectCols = "";
    switch(type) {
      case "Posts":
        tableName = "posts";
        selectCols = "id, title, created_at";
        break;
      case "Hackathons":
        tableName = "hackathons";
        selectCols = "id, title, created_at";
        break;
      case "Projects":
        tableName = "projects";
        selectCols = "id, title, created_at";
        break;
      case "Jobs": // Fetch only Interested jobs
        const { data: interestedJobsData } = await supabase
          .from("job_interests")
          .select("job_id, job_title, created_at")
          .eq("user_id", user.id);

        const items = (interestedJobsData || []).map(item => ({
          id: item.job_id,
          title: item.job_title,
          created_at: item.created_at,
          type: "Job Interest",
        }));

        items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setModalData({ type: "Job Interest", items, color: getThemeColor("Jobs") });
        return;
      default:
        return;
    }

    const res = await supabase.from(tableName).select(selectCols).eq("user_id", user.id);
    const items = (res.data || []).map(item => ({ ...item, type }));
    items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    setModalData({ type, items, color: getThemeColor(type) });
  }

  if(loading) return <Loader fullScreen={true}/>;

  return (
    <div className={styles.container}>
      <div className={styles.dashboardContainer}>
        {/* Welcome Banner */}
        <motion.div
          className={styles.welcomeBanner}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className={styles.welcomeTitle}>
            Welcome back, {user?.username || "User"} 👋
          </h1>
          <p className={styles.welcomeSubtitle}>Here’s what’s happening with your account today.</p>
        </motion.div>

        {/* Stats */}
        <div className={styles.statsGrid}>
          <StatCard icon={<User size={24} />} title="Posts" value={stats.posts} bgColor="#10b981" onClick={()=>openModal("Posts")}/>
          <StatCard icon={<Code size={24} />} title="Hackathons" value={stats.hackathons} bgColor="#8b5cf6" onClick={()=>openModal("Hackathons")}/>
          <StatCard icon={<Users size={24} />} title="Projects" value={stats.projects} bgColor="#ec4899" onClick={()=>openModal("Projects")}/>
          <StatCard icon={<Users size={24} />} title="Jobs" value={stats.jobs} bgColor="#f58610ff" onClick={()=>openModal("Jobs")}/>
        </div>

        {/* Recent Activity */}
        <Card className={styles.recentActivityCard}>
          <div className={styles.recentActivityHeader}>Recent Activity</div>
          {recentActivity.length === 0 ? (
            <p style={{ padding: "16px 24px", color: "#666" }}>No recent activity yet.</p>
          ) : (
            <ul className={styles.activityList}>
              {recentActivity.map(item => (
                <li key={item.id} className={styles.activityItem}>
                  <div className={styles.activityTitleWrapper}>
                    {item.type === "Hackathon" && (
                        <Code className={styles.activityIcon} color="#8b5cf6" />   // purple
                      )}
                      {item.type === "Project" && (
                        <Users className={styles.activityIcon} color="#ec4899" />  // pink
                      )}
                      {item.type === "Post" && (
                        <User className={styles.activityIcon} color="#10b981" />   // green
                      )}
                      {(item.type === "Interested" || item.type === "Job Interest") && (
                        <Briefcase className={styles.activityIcon} color="#f58610" /> // orange
                      )}
                    <span className={styles.activityTitle}>{item.title}</span>
                    <span className={`${styles.badge} ${styles[`badge-${item.type}`]}`}>
                      {item.type}
                    </span>
                  </div>
                  <span className={styles.activityDate}>
                    {new Date(item.created_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {modalData && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModalData(null)}
          >
            <motion.div
              className={styles.modalContent}
              style={{ borderColor: modalData.color }}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader} style={{ borderBottomColor: modalData.color }}>
                <h2 style={{ color: modalData.color }}>{modalData.type}</h2>
                <button
                  className={styles.modalClose}
                  style={{ background: modalData.color }}
                  onClick={() => setModalData(null)}
                >
                  Close
                </button>
              </div>

              <motion.ul className={styles.modalList} initial="hidden" animate="visible"
                        variants={{ visible: { transition: { staggerChildren: 0.08 } }, hidden: {} }}>
                {modalData.items.map((item) => (
                  <motion.li
                    key={item.id}
                    className={styles.modalItem}
                    style={{ borderLeft: `4px solid ${modalData.color}` }}
                    variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  >
                    <div className={styles.modalItemLeft}>
                      {item.type === "Post" && <User className={styles.modalIcon} />}
                      {item.type === "Hackathon" && <Code className={styles.modalIcon} />}
                      {item.type === "Project" && <Users className={styles.modalIcon} />}
                      {(item.type === "Interested" || item.type === "Job Interest") && <Briefcase className={styles.modalIcon} color="#f58610" />}
                      <span className={styles.modalTitle}>{item.title}</span>
                    </div>
                    <div className={styles.modalItemRight}>
                      <span className={`badge badge-${item.type}`}>{item.type}</span>
                      <span className={styles.modalDate}>
                        {new Date(item.created_at).toLocaleString()}
                      </span>
                    </div>
                  </motion.li>
                ))}
              </motion.ul>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, bgColor, onClick }) {
  return (
    <motion.div
      className={styles.statCard}
      style={{ background: bgColor, cursor: "pointer" }}
      whileHover={{ scale: 1.05 }}
      onClick={onClick}
    >
      <motion.div
        className={styles.statIcon}
        animate={{ y: [0, -5, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        {icon}
      </motion.div>
      <div>
        <p className={styles.statTitle}>{title}</p>
        <p className={styles.statValue}>{value}</p>
      </div>
    </motion.div>
  );
}

function getThemeColor(type) {
  switch(type) {
    case "Posts": return "#10b981";       // green
    case "Hackathons": return "#8b5cf6";  // purple
    case "Projects": return "#ec4899";    // pink
    case "Jobs":
    case "Interested": return "#f58610";  // orange
    default: return "#4f46e5";            // fallback
  }
}
