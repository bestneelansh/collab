import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import Lottie from "lottie-react";
import { motion } from "framer-motion";
import { Card } from "../components/ui/Card.jsx";
import { User, Users, Code, Briefcase } from "lucide-react";
import { fetchAllRecommendations } from "../utils/fetchAllRecommendations";
import styles from "./Dashboard.module.css";
import Loader from "/Users/neelanshgoyal/Documents/collatz/src/components/Loader.jsx";
import { CheckCircle, Crown, Flame } from "lucide-react";
import StreakModal from "../components/StreakModal.jsx";
import Dragon from "../assets/animations/Dragon.json";
import OrbitStreakModal from "./Copy.jsx";
import Hello from "../assets/animations/Hi.json";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip
} from "recharts";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    posts: 0,
    hackathons: 0,
    projects: 0,
    jobs: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [recommendedItems, setRecommendedItems] = useState([]);
  const [activeTab, setActiveTab] = useState("jobs");
  const [modalData, setModalData] = useState(null);
  const [insights, setInsights] = useState({ chartData: [], total: 0, topType: "" });
  const [isModalOpen,setIsModalOpen] = useState(false);
  const toggleModal = () => setIsModalOpen(!isModalOpen);
  const [streakDates, setStreakDates] = useState([]);
  const [streakDays, setStreakDays] = useState(0);
  const projectsData = [
    { status: "Completed", value: 8 },
    { status: "Ongoing", value: 2 },
  ];

  const hackathonData = [
    { status: "Joined", value: 3 },
    { status: "Upcoming", value: 2 },
  ];

  const jobData = [
    { status: "Applied", value: 12 },
    { status: "Shortlisted", value: 4 },
  ];

  const SYSTEM_GOALS = {
    projects: [
      { key: "projects_3", title: "Complete 3 Projects", threshold: 3 },
      { key: "projects_6", title: "Complete 6 Projects", threshold: 6 },
      { key: "projects_10", title: "Complete 10 Projects", threshold: 10 },
    ],
    hackathons: [
      { key: "hackathons_2", title: "Participate in 2 Hackathons", threshold: 2 },
      { key: "hackathons_5", title: "Participate in 5 Hackathons", threshold: 5 },
    ],
    jobs: [
      { key: "jobs_1", title: "Apply to 1 Job", threshold: 1 },
      { key: "jobs_5", title: "Apply to 5 Jobs", threshold: 5 },
      { key: "jobs_10", title: "Apply to 10 Jobs", threshold: 10 },
    ],
    posts: [
      { key: "posts_3", title: "Create 3 Community Posts", threshold: 3 },
      { key: "posts_10", title: "Create 10 Community Posts", threshold: 10 },
    ],
  };

  const userProgress = {
    projects: stats.projects || 0,
    hackathons: stats.hackathons || 0,
    jobs: stats.jobs || 0,
    posts: stats.posts || 0,
  };

  // ✅ Category-wise next active goal
  const categoryGoals = Object.entries(SYSTEM_GOALS).map(([category, goals]) => {
    const progress = userProgress[category];
    const nextGoal = goals.find((g) => progress < g.threshold);

    // If all completed, show the final one as completed
    const finalGoal = goals[goals.length - 1];
    const goalToShow = nextGoal || { ...finalGoal, completed: true };

    return { category, progress, goal: goalToShow };
  });

  const activeGoals = categoryGoals.slice(0, 4);

  useEffect(() => {
      async function fetchDashboard() {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) console.error("Auth fetch error:", userError);
        if (!user) {
          navigate("/login");
          return;
        }

        // 🟢 Fetch user info from public.users
        const { data: userProfile, error: profileError } = await supabase
          .from("users")
          .select("username, subscription_status")
          .eq("id", user.id)
          .single();

        if (profileError) {
          console.error("Error fetching user profile:", profileError);
        } 

        // 🟢 Safely update user state
        setUser({
          id: user.id,
          email: user.email,
          username: userProfile?.username ?? "Unknown",
          subscription_status: userProfile?.subscription_status ?? "free",
        });

        // Fetch interested jobs
        const { data: interestedJobsData } = await supabase
          .from("job_interests")
          .select("job_id, job_title, created_at")
          .eq("user_id", user.id);

        const interestedJobs = (interestedJobsData || []).map((j) => ({
          id: j.job_id,
          title: j.job_title,
          created_at: j.created_at,
          type: "Interested",
        }));

        // Fetch stats
        const [
          { count: postsCount },
          { count: hackathonsCount },
          { count: projectsCount },
        ] = await Promise.all([
          supabase
            .from("posts")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id),
          supabase
            .from("hackathons")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id),
          supabase
            .from("projects")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id),
        ]);

        setStats({
          posts: postsCount || 0,
          hackathons: hackathonsCount || 0,
          projects: projectsCount || 0,
          jobs: interestedJobs.length,
        });


        // Fetch recent activity
        const [postsRes, hackathonsRes, projectsRes] = await Promise.all([
          supabase
            .from("posts")
            .select("id, title, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(50),
          supabase
            .from("hackathons")
            .select("id, title, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(50),
          supabase
            .from("projects")
            .select("id, title, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(50),
        ]);

        const posts = (postsRes.data || []).map((item) => ({
          ...item,
          type: "Post",
        }));
        const hackathons = (hackathonsRes.data || []).map((item) => ({
          ...item,
          type: "Hackathon",
        }));
        const projects = (projectsRes.data || []).map((item) => ({
          ...item,
          type: "Project",
        }));

        // Fetch user streaks
        try {
          const { data: streakRows, error: streakErr } = await supabase
            .from("user_streaks")
            .select("date")
            .eq("user_id", user.id)
            .order("date", { ascending: true });

        if (!streakErr && Array.isArray(streakRows)) {
              const dates = streakRows.map((r) => r.date);
              setStreakDates(dates);
              setStreakDays(calculateStreak(dates));
        } else {
          console.warn("Streak fetch error:", streakErr);
            }
          } catch (e) {
            console.error("Error fetching streaks:", e);
          }

        // Compute weekly activity (last 6 weeks)
        function groupByWeek(data) {
          const weekMap = {};
          data.forEach(item => {
            const date = new Date(item.created_at);
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            const key = weekStart.toISOString().split("T")[0];
            weekMap[key] = (weekMap[key] || 0) + 1;
          });
          return weekMap;
        }

        function findMostFrequentType(data) {
          const counts = {};
          data.forEach(item => counts[item.type] = (counts[item.type] || 0) + 1);
          const top = Object.entries(counts).sort((a,b) => b[1]-a[1])[0];
          return top ? top[0] : "N/A";
        }

        const allActivity = [...posts, ...projects, ...hackathons];
        const activityByWeek = groupByWeek(allActivity);
        const chartData = Object.entries(activityByWeek)
          .sort(([a], [b]) => new Date(a) - new Date(b))
          .map(([week, count]) => ({ week, count }));

        setInsights({
          chartData,
          total: allActivity.length,
          topType: findMostFrequentType(allActivity),
        });

        const combined = [
          ...posts,
          ...hackathons,
          ...projects,
          ...interestedJobs,
        ];
        combined.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
        setRecentActivity(combined.slice(0, 13));

        // Fetch all recommendations using utility
        try {
          const recommendations = await fetchAllRecommendations(user.id);

          setRecommendedItems({
            jobs: recommendations.jobs || [],
            hackathons: recommendations.hackathons || [],
            projects: recommendations.projects || [],
          });
        } catch (err) {
          console.error("❌ Error fetching recommendations:", err);
          setRecommendedItems({ jobs: [], projects: [], hackathons: [] });
        }
        setLoading(false);
      }

      fetchDashboard();
  }, [navigate]);

  async function openModal(type) {
    let tableName = "";
    let selectCols = "";
    switch (type) {
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
      case "Jobs":
        const { data: interestedJobsData } = await supabase
          .from("job_interests")
          .select("job_id, job_title, created_at")
          .eq("user_id", user.id);

        const items = (interestedJobsData || []).map((item) => ({
          id: item.job_id,
          title: item.job_title,
          created_at: item.created_at,
          type: "Job Interest",
        }));

        items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setModalData({
          type: "Job Interest",
          items,
          color: getThemeColor("Jobs"),
        });
        return;
        default:
        return;
    }

    const res = await supabase
      .from(tableName)
      .select(selectCols)
      .eq("user_id", user.id);
      const items = (res.data || []).map((item) => ({ ...item, type }));
      items.sort((a, b) => new Date(b.created_at) - new Date(a.createdAt));
      setModalData({ type, items, color: getThemeColor(type) });
    }

  if (loading) return <Loader fullScreen={true} />;

  return (
    <div className={styles.container}>
      <div className={styles.dashboardContainer}>
        {/* Welcome Banner */}
        <>
          <div className={styles.banner}>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className={styles.welcomeBanner}
            >
              {/* Left Side */}
              <div className={styles.bannerLeft}>
              <div className={styles.welcomeHeader}>
                <div className={styles.welcomeText}>
                  <h1 className={styles.welcomeTitle}>
                    Welcome back, {user?.username || "User"}
                  </h1>

                  {user?.subscription_status === "premium" ? (
                    <div className={styles.premiumBadge}>
                      <Crown className={styles.crownIcon} />
                      <span>Premium Member</span>
                    </div>
                  ) : (
                    <div className={styles.freeBadge}>
                      <span>Free Plan</span>
                      <button className={styles.upgradeCircleBtn}>Upgrade</button>
                    </div>
                  )}
                </div>

                {/* Right: Lottie animation */}
                <div className={styles.welcomeLottieContainer}>
                  <Lottie
                    animationData={Hello}
                    loop
                    autoplay
                    style={{height:"120px"}}
                  />
                </div>
              </div>

              {/* Quick stats inside banner left */}
              <div className={styles.bannerQuickStats} style={{ display: "flex", gap: 12, marginTop: 16 }}>
                <div
                  className={styles.statCard}
                  style={{ background: "#10b981", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", flex: 1 }}
                  onClick={() => openModal("Posts")}
                >
                  <User size={20} color="white" />
                  <div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.9)" }}>Posts</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{stats.posts}</div>
                  </div>
                </div>

                <div
                  className={styles.statCard}
                  style={{ background: "#8b5cf6", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", flex: 1 }}
                  onClick={() => openModal("Hackathons")}
                >
                  <Code size={20} color="white" />
                  <div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.9)" }}>Hackathons</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{stats.hackathons}</div>
                  </div>
                </div>

                <div
                  className={styles.statCard}
                  style={{ background: "#ec4899", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", flex: 1 }}
                  onClick={() => openModal("Projects")}
                >
                  <Users size={20} color="white" />
                  <div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.9)" }}>Projects</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{stats.projects}</div>
                  </div>
                </div>

                <div
                  className={styles.statCard}
                  style={{ background: "#f58610", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", flex: 1 }}
                  onClick={() => openModal("Jobs")}
                >
                  <Briefcase size={20} color="white" />
                  <div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.9)" }}>Jobs</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{stats.jobs}</div>
                  </div>
                </div>
              </div>
              </div>  

              {/* Right Side: Streak Section */}
              <motion.div className={styles.profileCard} whileHover={{ y: -4 }}>
                <div className={styles.profileTop}>
                  <div className={styles.profileBadge}>
                    <Crown size={18} /> <span>Premium</span>
                  </div>
                  <div className={styles.avatar}>{user?.username?.charAt(0).toUpperCase()}</div>
                </div>

                <div className={styles.streakWrap} onClick={toggleModal} role="button" tabIndex={0} aria-label="Open streak modal">
                  <div className={styles.streakBlob}>
                    <Lottie animationData={Dragon} loop autoplay className={styles.streakLottie} />
                  </div>

                  <div className={styles.streakText}>
                    <div className={styles.streakLabel}>Current Streak</div>
                    <div className={styles.streakNum}>{streakDays}<span className={styles.streakSuffix}>d</span></div>
                    <div className={styles.streakAction}>Feed the dragon — he’s hungry! 🔥</div>
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <button className={styles.btnPrimary} onClick={toggleModal}>Open Streak</button>
                  <button className={styles.btnGhost}>Manage Goals</button>
                </div>
              </motion.div>
            </motion.div>
          </div>

          {/* Modal */}
          {isModalOpen && (
            <OrbitStreakModal
                onClose={toggleModal}
                user={user}
              />
            )}
          </>

        {/* Insight + Stat Card (custom grid: top row 2 equal columns, bottom row split 60/40) */}
        <div className={styles.topGrid}>
          <div className={styles.gridInner}>

            {/* Top-left (50% width visually inside a 2-column row) */}
            <div className={styles.gridCellTopLeft}>
              <div className={styles.recommendedJobsCard}>
                <h2 className={styles.recommendationTitle}>Personalized Recommendations</h2>
                <div className={styles.toggleTabs}>
                  {["jobs", "projects", "hackathons"].map((tab) => (
                    <button
                      key={tab}
                      className={`${styles.toggleBtn} ${
                        activeTab === tab ? styles.activeToggle : ""
                      }`}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>

                <div className={styles.recommendationContent}>
                  {activeTab === "jobs" && (
                    <ul className={styles.recommendedListCompact}>
                      {recommendedItems.jobs.slice(0, 5).map((item) => (
                        <li
                          key={item.id}
                          className={styles.recommendedItemCompact}
                          onClick={() => navigate(`/jobs?id=${item.id}`)}
                        >
                          <div className={styles.itemLeft}>
                            <span className={styles.itemTitle}>{item.title}</span>
                            <div className={styles.matchBarMini}>
                              <div
                                className={styles.matchBarFillMini}
                                style={{ width: `${Math.round(item.similarity * 100)}%` }}
                              ></div>
                            </div>
                          </div>
                          <span className={styles.itemPercent}>
                            {Math.round(item.similarity * 100)}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {activeTab === "projects" && (
                    <ul className={styles.recommendedListCompact}>
                      {recommendedItems.projects.slice(0, 5).map((item) => (
                        <li
                          key={item.id}
                          className={styles.recommendedItemCompact}
                          onClick={() => navigate(`/projects?id=${item.id}`)}
                        >
                          <div className={styles.itemLeft}>
                            <span className={styles.itemTitle}>{item.title}</span>
                            <div className={styles.matchBarMini}>
                              <div
                                className={styles.matchBarFillMini}
                                style={{ width: `${Math.round(item.similarity * 100)}%` }}
                              ></div>
                            </div>
                          </div>
                          <span className={styles.itemPercent}>
                            {Math.round(item.similarity * 100)}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {activeTab === "hackathons" && (
                    <ul className={styles.recommendedListCompact}>
                      {recommendedItems.hackathons.slice(0, 5).map((item) => (
                        <li
                          key={item.id}
                          className={styles.recommendedItemCompact}
                          onClick={() => navigate(`/projects?id=${item.id}`)}
                        >
                          <div className={styles.itemLeft}>
                            <span className={styles.itemTitle}>{item.title}</span>
                            <div className={styles.matchBarMini}>
                              <div
                                className={styles.matchBarFillMini}
                                style={{ width: `${Math.round(item.similarity * 100)}%` }}
                              ></div>
                            </div>
                          </div>
                          <span className={styles.itemPercent}>
                            {Math.round(item.similarity * 100)}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {/* Top-right: Activity Over Time + quick stats */}
            <div className={styles.gridCellTopRight}>
              <div className={styles.analyticsRight}>
                <div className={styles.insightsGrid}>
                  <Card className={styles.activityChartCard}>
                    <h3 className={styles.sectionTitle}>Activity Over Time</h3>
                    {insights.chartData.length === 0 ? (
                      <p style={{ color: "#777" }}>No activity data available yet.</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={insights.chartData}>
                          <XAxis dataKey="week" tick={{ fill: "#aaa", fontSize: 12 }} />
                          <YAxis tick={{ fill: "#aaa", fontSize: 12 }} />
                          <Tooltip contentStyle={{ background: "#1a1a1a", border: "none" }} />
                          <Bar dataKey="count" fill="#6366f1" radius={[6,6,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </Card>

                  <div className={styles.insightStats}>
                    <div className={styles.insightBox}>
                      <h4>Total Actions</h4>
                      <p>{insights.total}</p>
                    </div>
                    <div className={styles.insightBox}>
                      <h4>Most Active Type</h4>
                      <p>{insights.topType}</p>
                    </div>
                    <div className={styles.insightBox}>
                      <h4>Profile Growth</h4>
                      <p>+{Math.round(Math.random() * 30)}%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom row: single container that splits 60/40 for Activity Breakdown and Goals */}
                <div className={styles.gridCellBottomLeft}>
                  {/* Activity Breakdown (pies) */}
                  <div className={styles.analyticsLeft}>
                    <h2>Activity Breakdown</h2>
                    <div className={styles.multiPieGrid}>
                      {/* 🟣 Projects */}
                      <div className={styles.pieContainer}>
                        <h4>Projects</h4>
                        <ResponsiveContainer width="100%" height={180}>
                          <PieChart>
                            <Pie
                              dataKey="value"
                              data={[
                                { name: "Completed", value: 70 },
                                { name: "Pending", value: 30 }
                              ]}
                              outerRadius={90}
                              innerRadius={55}
                              labelLine={false}
                            >
                              <Cell fill="#6366f1" />
                              <Cell fill="#10b981" />
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        <div className={styles.legend}>
                          <div className={styles.legendItem}>
                            <span className={styles.legendColor} style={{ background: "#6366f1" }}></span>
                            <span>Completed — 70%</span>
                          </div>
                          <div className={styles.legendItem}>
                            <span className={styles.legendColor} style={{ background: "#10b981" }}></span>
                            <span>Pending — 30%</span>
                          </div>
                        </div>
                      </div>

                      {/* 🟡 Hackathons */}
                      <div className={styles.pieContainer}>
                        <h4>Hackathons</h4>
                        <ResponsiveContainer width="100%" height={180}>
                          <PieChart>
                            <Pie
                              dataKey="value"
                              data={[
                                { name: "Participated", value: 50 },
                                { name: "Upcoming", value: 50 }
                              ]}
                              outerRadius={90}
                              innerRadius={55}
                              labelLine={false}
                            >
                              <Cell fill="#f59e0b" />
                              <Cell fill="#f87171" />
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        <div className={styles.legend}>
                          <div className={styles.legendItem}>
                            <span className={styles.legendColor} style={{ background: "#f59e0b" }}></span>
                            <span>Participated — 50%</span>
                          </div>
                          <div className={styles.legendItem}>
                            <span className={styles.legendColor} style={{ background: "#f87171" }}></span>
                            <span>Upcoming — 50%</span>
                          </div>
                        </div>
                      </div>

                      {/* 💜 Posts */}
                      <div className={styles.pieContainer}>
                        <h4>Posts</h4>
                        <ResponsiveContainer width="100%" height={180}>
                          <PieChart>
                            <Pie
                              dataKey="value"
                              data={[
                                { name: "Questions", value: 40 },
                                { name: "Discussions", value: 60 }
                              ]}
                              outerRadius={90}
                              innerRadius={55}
                              labelLine={false}
                            >
                              <Cell fill="#a855f7" />
                              <Cell fill="#22d3ee" />
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        <div className={styles.legend}>
                          <div className={styles.legendItem}>
                            <span className={styles.legendColor} style={{ background: "#a855f7" }}></span>
                            <span>Questions — 40%</span>
                          </div>
                          <div className={styles.legendItem}>
                            <span className={styles.legendColor} style={{ background: "#22d3ee" }}></span>
                            <span>Discussions — 60%</span>
                          </div>
                        </div>
                      </div>

                      {/* Inbox */}
                      <div className={styles.pieContainer}>
                        <h4>Inbox</h4>
                        <ResponsiveContainer width="100%" height={180}>
                          <PieChart>
                            <Pie
                              dataKey="value"
                              data={[
                                { name: "Read", value: 60 },
                                { name: "Unread", value: 40 },
                              ]}
                              outerRadius={90}
                              innerRadius={55}
                              labelLine={false}
                            >
                              <Cell fill="#3b82f6" />
                              <Cell fill="#facc15" />
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        <div className={styles.legend}>
                          <div className={styles.legendItem}>
                            <span className={styles.legendColor} style={{ background: "#3b82f6" }}></span>
                            <span>Read — 60%</span>
                          </div>
                          <div className={styles.legendItem}>
                            <span className={styles.legendColor} style={{ background: "#facc15" }}></span>
                            <span>Unread — 25%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={styles.gridCellBottomRight}>
                  {/* Goals card */}
                  <Card className={styles.goalsCard}>
                    <h3 className={styles.sectionTitle}>🎯 Your Goals</h3>
                    <div className={styles.goalsList}>
                      {activeGoals.map(({ category, goal, progress }) => (
                        <div
                          key={goal.key}
                          className={`${styles.goalItem} ${
                            goal.completed ? styles.goalCompleted : ""
                          }`}
                        >
                          <div className={styles.goalText}>{goal.title}</div>
                          {goal.completed ? (
                            <div className={styles.goalCheckWrap}>
                              <CheckCircle size={22} color="#22c55e" />
                            </div>
                          ) : (
                            <div className={styles.progressBarWrapper}>
                              <div className={styles.progressBar}>
                                <div
                                  className={styles.progressFill}
                                  style={{
                                    width: `${Math.min((progress / goal.threshold) * 100, 100)}%`,
                                  }}
                                ></div>
                              </div>
                              <div className={styles.progressText}>
                                {progress}/{goal.threshold}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
          </div>
        </div>
 
          {/* Modal */}
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
                <div
                  className={styles.modalHeader}
                  style={{ borderBottomColor: modalData.color }}
                >
                  <h2 style={{ color: modalData.color }}>{modalData.type}</h2>
                  <button
                    className={styles.modalClose}
                    style={{ background: modalData.color }}
                    onClick={() => setModalData(null)}
                  >
                    Close
                  </button>
                </div>

                <motion.ul
                  className={styles.modalList}
                  initial="hidden"
                  animate="visible"
                  variants={{
                    visible: { transition: { staggerChildren: 0.08 } },
                    hidden: {},
                  }}
                >
                  {modalData.items.map((item) => (
                    <motion.li
                      key={item.id}
                      className={styles.modalItem}
                      style={{
                        borderLeft: `4px solid ${modalData.color}`,
                      }}
                      variants={{
                        hidden: { opacity: 0, y: 10 },
                        visible: { opacity: 1, y: 0 },
                      }}
                      transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    >
                      <div className={styles.modalItemLeft}>
                        {item.type === "Post" && (
                          <User className={styles.modalIcon} />
                        )}
                        {item.type === "Hackathon" && (
                          <Code className={styles.modalIcon} />
                        )}
                        {item.type === "Project" && (
                          <Users className={styles.modalIcon} />
                        )}
                        {(item.type === "Interested" ||
                          item.type === "Job Interest") && (
                          <Briefcase
                            className={styles.modalIcon}
                            color="#f58610"
                          />
                        )}
                        <span className={styles.modalTitle}>{item.title}</span>
                      </div>
                      <div className={styles.modalItemRight}>
                        <span
                          className={`badge badge-${item.type}`}
                        >
                          {item.type}
                        </span>
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
  switch (type) {
    case "Posts":
      return "#10b981";
    case "Hackathons":
      return "#8b5cf6";
    case "Projects":
      return "#ec4899";
    case "Jobs":
    case "Interested":
      return "#f58610";
    default:
      return "#4f46e5";
  }
}

function calculateStreak(dates) {
  if (!dates || !dates.length) return 0;
  const sorted = [...dates].sort((a, b) => new Date(b) - new Date(a));
  let streak = 0;
  let currentDate = new Date();

  for (const d of sorted) {
    const diff = (currentDate - new Date(d)) / (1000 * 60 * 60 * 24);
    if (diff < 1.5) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else if (diff < 2.5) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else break;
  }
  return streak;
}