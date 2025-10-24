import { useState, useEffect,useRef} from "react";
import { supabase } from "../supabaseClient";
import styles from "./Community.module.css";
import Select, { components } from "react-select";
import LoginPrompt from "../components/LoginPrompt";
import useRedirectToLogin from "../utils/redirectToLogin";
import { FaListAlt, FaHeading, FaPen, FaComments} from "react-icons/fa";
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
  const [commentsModalOpen, setCommentsModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");


  const postTypeOptions = [
    { value: "", label: "All" },
    { value: "announcement", label: "Announcement" },
    { value: "question", label: "Question" },
    { value: "discussion", label: "Discussion" },
  ];

  const ArrowOnlyControl = ({ children, ...props }) => (
    <components.Control {...props}>
      {children[1]} {/* Only arrow */}
    </components.Control>
  );

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
        if (!error) setPosts(postsData || []);
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
        setCommentsModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [commentsModalOpen]);


  // Fetch comments for a specific post
  const fetchComments = async (postId) => {
    try {
      const { data: commentsData, error: commentsError } = await supabase
        .from("comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (commentsError) throw commentsError;

      const userIds = [...new Set(commentsData.map(c => c.user_id))];

      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, username")
        .in("id", userIds);

      if (usersError) throw usersError;

      const commentsWithUsernames = commentsData.map(c => {
        const user = usersData.find(u => u.id === c.user_id);
        return { ...c, username: user?.username || "Anonymous" };
      });

      setComments(commentsWithUsernames);
    } catch (err) {
      console.error(err);
    }
  };

  // Open modal and load comments for a post
  const handleOpenComments = async (post) => {
    setSelectedPost(post);
    await fetchComments(post.id);
    setCommentsModalOpen(true);
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
              >
                <div className={styles.badgeWrapper}>
                  <span className={`${styles.badge} ${styles[`badge-${post.type}`]}`}>
                    {post.type}
                  </span>
                </div>
                <h3 className={styles.communityTitle}>{post.title}</h3>
                <p className={styles.communityContent}>{post.content}</p>

                {/*Comments button*/}
                <div className={styles.commentButtonWrapper}>
                  <button
                    className={styles.commentButton}
                    onClick={() => handleOpenComments(post)}
                    title="View comments"
                  >
                    <FaComments />
                  </button>
                </div>
                
              </div>
            ))}
          </div>
        )}
      </div>

      {commentsModalOpen && selectedPost && (
        <div className={styles.modalOverlay} onClick={() => setCommentsModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className={styles.modalHeader}>
              <h3>Comments for: {selectedPost.title}</h3>
              <button className={styles.closeButton} onClick={() => setCommentsModalOpen(false)}>
                ✕
              </button>
            </div>

            {/* Scrollable Comments */}
            <div className={styles.modalBody}>
              {comments.length === 0 ? (
                <p className={styles.noComments}>No comments yet.</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className={styles.commentItem}>
                    <div className={styles.commentText}>
                      <strong className={styles.commentUsername}>{c.username}</strong>: {c.content}
                    </div>
                    <div className={styles.commentTimestamp}>
                      {new Date(c.created_at).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add Comment */}
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
                      e.preventDefault(); // prevent newline
                      addComment();
                    }
                  }}
                />
                <button onClick={addComment} className={styles.saveButton}>
                  Add
                </button>
              </div>
            )}
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
