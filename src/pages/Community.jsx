import { useState, useEffect,useRef} from "react";
import { supabase } from "../supabaseClient";
import styles from "./Community.module.css";
import Select, { components } from "react-select";
import LoginPrompt from "../components/LoginPrompt";
import useRedirectToLogin from "../utils/redirectToLogin";
import { FaListAlt, FaHeading, FaPen, FaComments, FaHeart} from "react-icons/fa";
import Loader from "../components/Loader.jsx";

export default function Community() {
  const [postType, setPostType] = useState("announcement");
  const [posts, setPosts] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [postFilter, setPostFilter] = useState("");
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const postRef = useRef(null);
  const redirectToLogin = useRedirectToLogin();
  const [selectedPost, setSelectedPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [likedPosts, setLikedPosts] = useState([]);
  const [postViewModalOpen, setPostViewModalOpen] = useState(false);


  const postTypeOptions = [
    { value: "", label: "All" },
    { value: "announcement", label: "Announcement" },
    { value: "question", label: "Question" },
    { value: "discussion", label: "Discussion" },
  ];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        setSession(sessionData?.session || null);

        const { data: postsData, error } = await supabase
          .from("posts")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;

        if (postsData.length > 0) {
          // 🔹 Collect all unique user IDs
          const userIds = [...new Set(postsData.map((p) => p.user_id))];

          // 🔹 Fetch usernames from users table
          const { data: usersData, error: usersError } = await supabase
            .from("users")
            .select("id, username")
            .in("id", userIds);

          if (usersError) throw usersError;

          // 🔹 Map users for quick lookup
          const userMap = Object.fromEntries(usersData.map((u) => [u.id, u.username]));

          // 🔹 Attach username to each post
          const postsWithUsernames = postsData.map((p) => ({
            ...p,
            username: userMap[p.user_id] || "Anonymous",
          }));

          setPosts(postsWithUsernames);
        } else {
          setPosts([]);
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };

    fetchData();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => setSession(newSession)
    );

    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === "Escape" && commentsModalOpen) {
        setPostViewModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [postViewModalOpen]);

  useEffect(() => {
    const fetchUserLikes = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("post_likes")
        .select("post_id")
        .eq("user_id", user.id);

      if (!error && data) {
        setLikedPosts(data.map((d) => d.post_id));
      }
    };
    fetchUserLikes();
  }, [session]);

  useEffect(() => {
    const subscription = supabase
      .channel("posts-changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "posts" },
        (payload) => {
          setPosts((prev) =>
            prev.map((p) =>
              p.id === payload.new.id
                ? { ...p, ...payload.new }
                : p
            )
          );
        }
      )
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, []);

  // Fetch comments for a specific post
  const fetchComments = async (postId) => {
    try {
      const { data: commentsData, error: commentsError } = await supabase
        .from("comments")
        .select("id, content, created_at, user_id")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (commentsError) throw commentsError;

      const userIds = [...new Set(commentsData.map(c => c.user_id))];
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, username")
        .in("id", userIds);

      if (usersError) throw usersError;

      const usersMap = Object.fromEntries(usersData.map(u => [u.id, u.username]));

      const commentsWithUsernames = commentsData.map(c => ({
        ...c,
        username: usersMap[c.user_id] || "Anonymous",
      }));

      setComments(commentsWithUsernames);
    } catch (err) {
      console.error("Error fetching comments:", err);
    }
  };

  const handleOpenPostView = async (post) => {
    setSelectedPost(post);
    setPostViewModalOpen(true);

    try {
      await supabase.rpc("increment_view", { post_id: post.id });
      setPosts(prev =>
        prev.map(p =>
          p.id === post.id
            ? { ...p, views_count: (p.views_count || 0) + 1 }
            : p
        )
      );
    } catch (error) {
      console.error("Error incrementing view:", error);
    }

    await fetchComments(post.id);
  };

  const handleLike = async (postId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Please log in to like posts.");
        return;
      }

      // Check if user has already liked this post
      const { data: existingLike, error: checkError } = await supabase
        .from("post_likes")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingLike) {
        await supabase.rpc("decrement_like", {
          post_id: postId,
          user_id: user.id,
        });

        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, likes_count: p.likes_count - 1 } : p
          )
        );

        // 👇 Remove from likedPosts
        setLikedPosts((prev) => prev.filter((id) => id !== postId));
      } else {
        await supabase.rpc("increment_like", {
          post_id: postId,
          user_id: user.id,
        });

        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, likes_count: (p.likes_count || 0) + 1 } : p
          )
        );

        // 👇 Add to likedPosts
        setLikedPosts((prev) => [...prev, postId]);
      }

    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  // Add a new comment
  const addComment = async () => {
    if (!newComment.trim() || !session?.user) return;

    const { error } = await supabase.from("comments").insert([
      { post_id: selectedPost.id, user_id: session.user.id, content: newComment },
    ]);

    if (!error) {
      setNewComment("");
      fetchComments(selectedPost.id); // refresh comments
    }
  };

  const handleAddPostClick = () => {
    if (!session?.user) {
      setShowLoginPrompt(true);
      return;
    }
    setSidebarOpen(true);
  };

  const handleLoginRedirect = () => {
    redirectToLogin();
    setShowLoginPrompt(false);
  };

  async function addPost() {
    if (!title.trim() || !content.trim()) return;
    const { error } = await supabase.from("posts").insert([
      { title, content, user_id: session.user.id, type: postType },
    ]);
    if (!error) {
      setTitle("");
      setContent("");
      setSidebarOpen(false);
      const { data } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });
      setPosts(data || []);
    }
  }

  if(loading) return <Loader fullScreen={true}/>;

  return (
    <div className={styles.communitiesContainer}>
      {/* Login Prompt */}
      {showLoginPrompt && (
        <LoginPrompt
          onClose={() => setShowLoginPrompt(false)}
          onRedirect={handleLoginRedirect}
        />
      )}

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className={`${styles.sidebarOverlay} active`}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Hero Section */}
      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>Community Hub</h1>
        <p className={styles.heroSubtitle}>
          Share announcements, ask questions, and join discussions with others.
        </p>
        <div className={styles.heroButtons}>
          <button onClick={handleAddPostClick} className={styles.primaryButton}>
            Add Post
          </button>
          <button className={styles.secondaryButton} onClick={() => postRef.current.scrollIntoView({ behavior: "smooth" })}> 
            Explore Posts
          </button>
        </div>
      </section>

      {/* Overlay */}
      <div
        className={`${styles.sidebarOverlay} ${sidebarOpen ? styles.active : ""}`}
        onClick={() => setSidebarOpen(false)}
      ></div>

      {/* Sidebar */}
      {session?.user && (
        <div className={`${styles.sidebar} ${sidebarOpen ? styles.open : ""}`}>
          
          <div className={styles.sidebarHeader}>
            <h2>Create Post</h2>
            <button
              className={styles.closeButton}
              onClick={() => setSidebarOpen(false)}
            >
              ✕
            </button>
          </div>

          <h3 className={styles.sidebarHeadline}>
            <FaListAlt/> Choose Post Type</h3>
          <p className={styles.sidebarSubtext}>
            Select whether this is an Announcement, Question, or Discussion.
          </p>
          <Select
            options={postTypeOptions}
            value={postTypeOptions.find((opt) => opt.value === postType)}
            onChange={(selected) => setPostType(selected.value)}
            placeholder="Select post type"
            menuPortalTarget={document.body}
            menuPosition="fixed"
            styles={selectStyles}
          />

          <h3 className={styles.sidebarHeadline}>
            <FaHeading/> Post Title
          </h3>
          <p className={styles.sidebarSubtext}>
            Give your post a clear and concise title.
          </p>
          <input
            type="text"
            placeholder="Post title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={styles.inputField}
            required
          />
          
          <h3 className={styles.sidebarHeadline}>
            <FaPen/>  Your Message
          </h3>
          <p className={styles.sidebarSubtext}>
            Write the content of your post. Be clear and detailed!
          </p>
          <textarea
            placeholder="Write your post..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={styles.inputField}
            style={{ height: "80px" }}
          />

          <div className={styles.buttonWrapper}>
            <button onClick={addPost} className={styles.saveButton}>
              Add Post
            </button>
          </div>
        </div>
        )}

      {/* Posts Feed */}
      <div ref={postRef} id="posts" className={styles.postsFeed}>
        <h2 className={styles.feedHeader}>Latest Posts</h2>

        {/* Search + Filter */}
        <div className={styles.searchFilter}>
          <input
            type="text"
            placeholder="Search posts..."
            className={styles.inputField}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className={styles.filterDropdown}>
            <Select
            options={postTypeOptions}
            value={postTypeOptions.find((opt) => opt.value === postFilter)}
            onChange={(selected) => setPostFilter(selected ? selected.value : "")}
            placeholder="Filter"
            isClearable={false}
            isSearchable={false}
            menuPortalTarget={document.body}
            menuPosition="fixed"
            styles={{
              control: (base, state) => ({
                ...base,
                minHeight: "32px",
                height: "32px",
                backgroundColor: "#121212",
                border: state.isFocused ? "1px solid #6366f1" : "1px solid #333",
                borderRadius: "6px",
                boxShadow: "none",
                color: "#e0e0e0",
                "&:hover": { borderColor: "#6366f1" },
              }),
              valueContainer: (base) => ({ ...base, padding: "0 6px" }),
              singleValue: (base) => ({ ...base, color: "#e0e0e0" }),
              menu: (base) => ({
                ...base,
                backgroundColor: "#1a1a1d",
                borderRadius: "8px",
                border: "1px solid #333",
              }),
              option: (base, state) => ({
                ...base,
                backgroundColor: state.isFocused ? "#2a2a2e" : "#1a1a1d",
                color: state.isSelected ? "#6366f1" : "#e0e0e0",
                cursor: "pointer",
              }),
              placeholder: (base) => ({ ...base, color: "#777" }),
              dropdownIndicator: (base) => ({ ...base, color: "#aaa" }),
              indicatorSeparator: () => ({ display: "none" }),
              menuPortal: (base) => ({ ...base, zIndex: 10000 }),
            }}
          />
          </div>
        </div>

        {posts.length === 0 ? (
          <p>No posts yet.</p>
        ) : (
          <div className={styles.communityGrid}>
            {posts
              .filter((post) => {
                const matchesSearch =
                  post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  post.content.toLowerCase().includes(searchQuery.toLowerCase());
                const matchesType = postFilter ? post.type === postFilter : true;
                return matchesSearch && matchesType;
            })
            .map((post) => (
              <div
                key={post.id}
                className={`${styles.communityCard} ${styles[`card-${post.type}`]}`}
                onClick={() => handleOpenPostView(post)}
              >
                <div className={styles.badgeWrapper}>
                  <span className={`${styles.badge} ${styles[`badge-${post.type}`]}`}>
                    {post.type}
                  </span>
                </div>
                <h3 className={styles.communityTitle}>{post.title}</h3>
                <p className={styles.communityContent}>{post.content}</p>
                
              {/* ===== Post Stats Row (Unified for Card & Modal) ===== */}
              <div className={styles.postStatsRow}>
                <div className={styles.statsGroup}>
                  {/* ❤️ Like */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLike(post.id);
                    }}
                    className={`${styles.iconButton} ${
                      likedPosts.includes(post.id) ? styles.liked : ""
                    }`}
                  >
                    <FaHeart className={styles.statIcon} />
                    <span>{post.likes_count || 0}</span>
                  </button>

                  {/* 👁️ Views */}
                  <div className={styles.iconButton}>
                    <span className={styles.statIcon}>👁️</span>
                    <span>{post.views_count || 0}</span>
                  </div>

                  {/* 💬 Comments */}
                  <button
                    className={styles.iconButton}
                  >
                    <FaComments className={styles.statIcon} />
                  </button>
                </div>
              </div>
              </div>
            ))
            }
          </div>
        )}
      </div>

      {postViewModalOpen && selectedPost && (
      <div className={styles.modalOverlay} onClick={() => setPostViewModalOpen(false)}>
        <div
          className={`${styles.modalContent} ${styles.postViewLayout}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ===== LEFT: Post Section ===== */}
          <div className={styles.postViewLeft}>
            {/* Header */}
            <div className={styles.postHeader}>
              <div className={styles.avatar}>
                {/* {c.username ? c.username[0].toUpperCase() : "U"} */}
                {selectedPost.username ? selectedPost.username[0].toUpperCase() : "U"}
              </div>
              <div>
                <h2 className={styles.postTitle}>{selectedPost.title}</h2>
                <p className={styles.postType}>{selectedPost.type}</p>
              </div>
            </div>

            {/* Post Body */}
            <div className={styles.postBody}>
              <p>{selectedPost.content}</p>
            </div>

            {/* ===== Stats Row (Insta / YouTube style) ===== */}
            <div className={styles.postStatsRow}>
              <div className={styles.statsGroup}>
                {/* ❤️ Like */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLike(selectedPost.id);
                  }}
                  className={`${styles.iconButton} ${
                    likedPosts.includes(selectedPost.id) ? styles.liked : ""
                  }`}
                >
                  <FaHeart className={styles.statIcon} />
                  <span>{selectedPost.likes_count || 0}</span>
                </button>

                {/* 👁️ Views */}
                <div className={styles.iconButton}>
                  <span className={styles.statIcon}>👁️</span>
                  <span>{selectedPost.views_count || 0}</span>
                </div>

                {/* 💬 Comments */}
                <div className={styles.iconButton}>
                  <FaComments className={styles.statIcon} />
                  <span>{comments.length || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ===== RIGHT: Comments Section ===== */}
          <div className={styles.postViewRight}>
            <div className={styles.modalHeader}>
              <h3>Comments</h3>
              <button
                className={styles.closeButton}
                onClick={() => setPostViewModalOpen(false)}
              >
                ✕
              </button>
            </div>

            {/* Comments Feed */}
            <div className={styles.modalBody}>
              {comments.length === 0 ? (
                <p className={styles.noComments}>No comments yet. Be the first!</p>
              ) : (
                comments.map((c) => (
                    <div key={c.id} className={styles.commentItem}>
                    <div className={styles.commentAvatar}>
                      {c.username ? c.username[0].toUpperCase() : "U"}
                    </div>
                    <div className={styles.commentContent}>
                      <div className={styles.commentUsername}>{c.username}</div>
                      <div className={styles.commentText}>{c.content}</div>
                      <div className={styles.commentTimestamp}>{formatTimeAgo(c.created_at)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add Comment Input */}
            {session?.user && (
              <div className={styles.addComment}>
                <input
                  type="text"
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className={styles.inputField}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      addComment();
                    }
                  }}
                />
                <button onClick={addComment} className={styles.saveButton}>
                  Post
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )}

    </div>
  );
}

const selectStyles = {
  menuPortal: (base) => ({ ...base, zIndex: 10000 }),
  menu: (base) => ({
    ...base,
    backgroundColor: "#1a1a1d",
    borderRadius: 12,
    boxShadow: "0 6px 20px rgba(0,0,0,0.5)",
    maxHeight: 180,
    overflowY: "auto",
    marginBottom:"40px",
    color: "#e0e0e0",
    scrollbarWidth: "thin",
    scrollbarColor: "#4f46e5 #1b1b1d",
    "&::-webkit-scrollbar": { width: "8px" },
    "&::-webkit-scrollbar-track": { background: "#1b1b1d", borderRadius: "8px" },
    "&::-webkit-scrollbar-thumb": { background: "#4f46e5", borderRadius: "8px" },
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused ? "#2a2a2e" : "#1a1a1d",
    color: state.isSelected ? "#6366f1" : "#e0e0e0",
    cursor: "pointer",
    padding: "8px 12px",
    transition: "background 0.2s ease",
  }),
  control: (base, state) => ({
    ...base,
    backgroundColor: "#121212",
    borderColor: state.isFocused ? "#6366f1" : "#333",
    borderRadius: 10,
    minHeight: 42,
    boxShadow: state.isFocused ? "0 0 8px rgba(99,102,241,0.3)" : "none",
    "&:hover": { borderColor: "#6366f1" },
  }),
  singleValue: (base) => ({ ...base, color: "#e0e0e0" }),
  placeholder: (base) => ({ ...base, color: "#888" }),
  multiValue: (base) => ({
    ...base,
    background: "linear-gradient(135deg, #4f46e5, #6366f1)",
    color: "#f3f4f6",
    borderRadius: 9999,
    padding: "2px 8px",
    fontSize: "0.85rem",
    fontWeight: 500,
  }),
  multiValueLabel: (base) => ({ ...base, color: "#f3f4f6", fontWeight: 500 }),
  multiValueRemove: (base) => ({
    ...base,
    color: "#f3f4f6",
    cursor: "pointer",
    ":hover": { backgroundColor: "#4338ca", color: "#fff", borderRadius: "50%" },
  }),
  indicatorSeparator: (base) => ({ ...base, backgroundColor: "#374151" }),
  dropdownIndicator: (base) => ({ ...base, color: "#e0e0e0", ":hover": { color: "#6366f1" } }),
};

function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  const intervals = [
    { label: "year", seconds: 31536000 },
    { label: "month", seconds: 2592000 },
    { label: "week", seconds: 604800 },
    { label: "day", seconds: 86400 },
    { label: "hour", seconds: 3600 },
    { label: "minute", seconds: 60 },
  ];

  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count >= 1) {
      return `${count} ${interval.label}${count > 1 ? "s" : ""} ago`;
    }
  }

  return "Just now";
}
