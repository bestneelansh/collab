import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import Select, { components } from "react-select";
import styles from "./HackathonFeed.module.css";
import Loader from "../components/Loader.jsx";
import { MdCategory, MdBuild, MdSchool} from "react-icons/md";
import useRedirectToLogin from "../utils/redirectToLogin";
import LoginPrompt from "../components/LoginPrompt.jsx";

export default function HackathonFeed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [showLoginPrompt,setShowLoginPrompt] = useState(false);
  const redirectToLogin = useRedirectToLogin();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [skillFilter, setSkillFilter] = useState([]);
  const [allSkills, setAllSkills] = useState([]);
  const [typeOptions, setTypeOptions] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [openDropdown, setOpenDropdown] = useState(null); 
  const [collegeFilter, setCollegeFilter] = useState([]);
  const [collegeOptions, setCollegeOptions] = useState([]);
  const placeholders = [
    "🔍 Search hackathons by name or theme...",
    "🚀 Looking for ongoing hackathons to join?",
    "📍 Filter by location, mode, or prizes...",
    "🤖 Discover upcoming AI/ML hackathons...",
    "🌎 Find college or global hackathons now...",
    "💡 Hunt for the next coding challenge!",
    "🌟 Explore hackathons that spark brilliant ideas...",
    "🏆 Join contests and compete for awesome prizes!",
    "🕹️ Discover fun, creative, and competitive hackathons...",
    "🔥 Level up your skills with exciting hackathons!",
    "🎯 Find challenges that push your limits...",
    "💻 Code, collaborate, and create amazing projects!",
    "🌈 Explore innovative hackathons around the globe...",
    "🕵️‍♂️ Spot hidden hackathon gems near you...",
    "⚡ Join the next big hackathon and make an impact..."
  ];

  const [searchPlaceholder, setSearchPlaceholder] = useState(placeholders[0]);
  const HideSingleValue = () => null;
  const HideMultiValue = () => null;
  const HideInput = (props) => {
      return (
        <components.Input
          {...props}
          style={{
            outline: 'none',
            boxShadow: 'none',
          }}
        />
      );
    };

  const HideValueContainer = (props) => (
    <components.ValueContainer {...props}>
      {props.children.filter(
        (child) => child.type !== components.Input // remove any Input inside
      )}
    </components.ValueContainer>
  );

  // Dynamically changing placeholders
  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % placeholders.length;
      setSearchPlaceholder(placeholders[index]);
    }, 1000); // change every 1 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (page > 1) fetchHackathons();
  }, [page]);

  //fetch recommended hackathons
  async function fetchHackathons(reset = false) {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);

    const currentPage = reset ? 1 : page;
    const limit = 20;
    const offset = (currentPage - 1) * limit;

    let personalized = [];

    if (user) {
      const { fetchRecommendedHackathons } = await import("../utils/fetchRecommendedHackathons");
      personalized = await fetchRecommendedHackathons(user.id, {
        skills: skillFilter,
        categories: [],
        type: typeFilter,
        teamSize: null,
        limit,
        offset,
      });
  }

  if (personalized?.length) {
    if (reset) setPosts(personalized);
    else setPosts((prev) => [...prev, ...personalized]);
    setHasMore(personalized.length === limit);
    setLoading(false);
    return;
  }

  // fallback normal query
  const { data, error } = await supabase
    .from("hackathons")
    .select("*, profiles(username, college), hackathon_interest(id, user_id)")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error(error);
    setPosts([]);
  } else {
    const enriched = data.map((h) => ({
      ...h,
      interest_count: (h.hackathon_interest || []).length,
      interested_user_ids: (h.hackathon_interest || []).map((i) => i.user_id),
    }));

    if (reset) setPosts(enriched);
    else setPosts((prev) => [...prev, ...enriched]);
  }

  setHasMore(data?.length === limit);
  setLoading(false);
  }

  // Fetch all colleges
  useEffect(() =>{
    async function fetchColleges() {
    const { data, error } = await supabase
      .from("colleges")
      .select("name")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching colleges:", error);
      return;
    }

    setCollegeOptions(data.map((c) => ({ value: c.name, label: c.name })));
  }
  fetchColleges();
  }, []);


  // Fetch hackathons
  useEffect(() => {
    setPage(1);
    fetchHackathons(true);
  }, [skillFilter, typeFilter]);

  // Fetch current user
  useEffect(() => {
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    }
    fetchUser();
  }, []);

  useEffect(() => {
    // Type options (static)
    setTypeOptions([
      { value: "Collaboration", label: "Collaboration" },
      { value: "Announcement", label: "Announcement" },
    ]);

    // Fetch distinct skills dynamically from the hackathons table
    async function fetchSkills() {
      const { data, error } = await supabase
        .from("hackathons")
        .select("skills")
        .not("skills", "is", null);

      if (error) {
        console.error("Error fetching skills:", error);
        return;
      }

      // Flatten skills arrays and deduplicate
      const uniqueSkills = [...new Set(data.flatMap((row) => row.skills || []))];

      // Convert to react-select format
      setAllSkills(uniqueSkills.map((s) => ({ value: s, label: s })));
    }

    fetchSkills();
  }, []);

    // Filtered posts based on search, type, and skills
    const filteredPosts = posts
      .map((post) => {
        const score =
          fuzzyScore(post.title, searchQuery) +
          fuzzyScore(post.description, searchQuery) +
          fuzzyScore(post.type, searchQuery) +
          fuzzyScore(post.profiles?.username, searchQuery) +
          fuzzyScore(post.profiles?.college, searchQuery) +
          (Array.isArray(post.skills)
            ? post.skills.reduce((acc, skill) => acc + fuzzyScore(skill, searchQuery), 0)
            : 0) +
          (Array.isArray(post.categories)
            ? post.categories.reduce((acc, cat) => acc + fuzzyScore(cat, searchQuery), 0)
            : 0) +
          fuzzyScore(post.category, searchQuery) +
          fuzzyScore(post.location, searchQuery);

        const matchesSearch = searchQuery.trim() === "" || score > 0;
        const matchesCollege =
          collegeFilter.length === 0 ||
          collegeFilter.includes(post.profiles?.college);
        const matchesType = typeFilter ? post.type === typeFilter : true;
        const matchesSkills =
          skillFilter.length === 0 ||
          skillFilter.every((f) => (post.skills || []).includes(f.value));

        const isVisible = matchesSearch && matchesType && matchesSkills && matchesCollege;

        return { ...post, score, isVisible };
      })
      .filter((post) => post.isVisible)
      .sort((a, b) => b.score - a.score);

    // send query of interest to creator 
    async function handleInterested(post) { 
      setSaving(post.id);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setShowLoginPrompt(true);
        setSaving(null);
        return;
      }

  // Prevent creator from clicking
  if (post.user_id === user.id) {
    alert("You can't mark interest on your own hackathon!");
    setSaving(null);
    return;
  }

  // Send interest to the join table
  const { error: insertErr } = await supabase.from("hackathon_interest").insert({
    user_id: user.id,
    hackathon_id: post.id,
  });

  if (insertErr) {
    if (insertErr.code === "23505") {
      alert("You already marked interest for this hackathon ⚡");
    } else {
      console.error(insertErr);
      alert("Error: could not save interest ❌");
    }
    setSaving(null);
    return;
  }

  // Update UI counts quickly
  setPosts(prev =>
    prev.map(p =>
      p.id === post.id
        ? {
            ...p,
            interest_count: (p.interest_count || 0) + 1,
            interested_user_ids: [...(p.interested_user_ids || []), user.id],
          }
        : p
    )
  );

  // --- Fetch sender's username from profiles/users table ---
  const { data: senderProfile } = await supabase
    .from("profiles")             // or "users" depending on your schema
    .select("username")
    .eq("id", user.id)
    .single();

  const senderUsername = senderProfile?.username || user.email || "Someone";

  // Try to find an existing conversation that includes the recipient (post.user_id)
  const { data: recipientConvs } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", post.user_id);

  // Try to find a conversation that includes both participants
  let convId = null;
  if (recipientConvs?.length) {
    // check if any of recipient's conversations already include the current user
    for (const r of recipientConvs) {
      const { data: both } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("conversation_id", r.conversation_id)
        .eq("user_id", user.id)
        .limit(1);

      if (both?.length) {
        convId = r.conversation_id;
        break;
      }
    }
  }

  // If not found, create a new conversation and add both participants
  if (!convId) {
    const { data: newConv } = await supabase
      .from("conversations")
      .insert([{ title: `Interest: ${post.title}` }])
      .select("*")
      .single();

    convId = newConv.id;

    await supabase.from("conversation_participants").insert([
      { conversation_id: convId, user_id: user.id },
      { conversation_id: convId, user_id: post.user_id },
    ]);
  }

  // --- Build a structured message (JSON) with username embedded ---
  const messageContent = {
    type: "hackathon_interest",
    hackathonTitle: post.title,
    interestedUsername: senderUsername,
    hackathonId: post.id,
    time: new Date().toISOString(),
  };

  await supabase.from("messages").insert({
    conversation_id: convId,
    sender_id: user.id,
    content: JSON.stringify(messageContent),
  });

  alert("Marked as interested ✅");
  setSaving(null);
    }


  if (loading) return <Loader fullscreen={true} />;

  return (
    <div className={styles.feedContainer}>
    {showLoginPrompt && <LoginPrompt onClose={() => setShowLoginPrompt(false)} onRedirect={redirectToLogin} />}
      {/* Filters */}
    <div className={styles.filterBar}>
      <input
        type="text"
        placeholder={searchPlaceholder}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className={styles.inputField}
      />

      {/* college filter */}
      <div style={{ position: "relative", display: "inline-block", marginRight: "10px" }}>
        <MdSchool
          size={24}
          onClick={() => setOpenDropdown(openDropdown === "college" ? null : "college")}
          style={{ cursor: "pointer", color: "#4f46e5" }}
          title="College filter"
        />
        {openDropdown === "college" && (
          <div style={{ position: "absolute", top: "30px", minWidth: "200px", zIndex: 999 }}>
            <Select
              options={collegeOptions} // e.g. [{ value: 'NIT Delhi', label: 'NIT Delhi' }, ...]
              placeholder="🎓 Search Colleges"
              isMulti
              isClearable
              isSearchable   // ✅ allow typing/searching
              hideSelectedOptions={false}
              closeMenuOnSelect={false}
              components={{
                Option: CheckboxOption,
                MenuList: CustomMenuList,
                MultiValue: () => null, // 🚫 hide selected tags in input
              }}
              value={collegeFilter.map((college) => ({
                label: college,
                value: college,
              }))}
              onChange={(selected) => {
                setCollegeFilter(selected ? selected.map((s) => s.value) : []);
              }}
              styles={customSelectStyles}
            />
          </div>
        )}
      </div>

      {/* category filter */}
      <div style={{ position: "relative", display: "inline-block", marginRight: "10px",marginLeft:"5px "}}>
        <MdCategory
          size={24}
          onClick={() => setOpenDropdown(openDropdown === "type" ? null : "type")}
          style={{ cursor: "pointer", color: "#4f46e5" }}
          title="Type"
        />
        {openDropdown === "type" && (
          <div style={{ position: "absolute", top: "30px", minWidth: "200px", zIndex: 999 }}>
            <Select
              options={typeOptions}
              value={typeOptions.find((opt) => opt.value === typeFilter) || null}
              onChange={(opt) => setTypeFilter(opt?.value || "")}
              isClearable
              menuIsOpen
              placeholder={null}
              isSearchable={false}
              closeMenuOnSelect={false}
              components={{
                Option: CheckboxOption,
                MenuList: CustomMenuList,
                DropdownIndicator: () => null,
                ValueContainer: HideValueContainer,
                IndicatorSeparator: () => null,
                SingleValue: HideSingleValue,
                Input: HideInput,
              }}
              styles={{
                ...customSelectStyles,
                control: (provided) => ({
                  ...provided,
                  minHeight: 0,          
                  height: 0,             
                  padding: 0,            
                  backgroundColor: 'transparent',
                  border: 'none',  
                  boxShadow: 'none',      
                  ':focus': { boxShadow: 'none' },      
                }),
                menu: (provided) => ({
                  ...provided,
                  backgroundColor: '#1f2937',
                  zIndex: 9999,
                }),
              }}
            />
          </div>
        )}
      </div> 

        {/* type filter */}
      <div style={{ position: "relative", display: "inline-block", marginRight: "10px" }}>
        <MdBuild
          size={24}
          onClick={() => setOpenDropdown(openDropdown === "skills" ? null : "skills")}
          style={{ cursor: "pointer", color: "#4f46e5" }}
          title="Skills filter"
        />
        {openDropdown === "skills" && (
          <div style={{ position: "absolute", top: "30px", minWidth: "200px", zIndex: 999 }}>
            <Select
              isMulti
              options={allSkills}
              value={skillFilter}
              onChange={(selected) => setSkillFilter(selected || [])}
              closeMenuOnSelect={false}
              hideSelectedOptions={false}
              isSearchable={false}
              placeholder={null}
              menuIsOpen
              components={{
                Option: CheckboxOption,
                MenuList: CustomMenuList,
                ValueContainer: HideValueContainer,
                MultiValue: HideMultiValue,
                DropdownIndicator: () => null,
                IndicatorSeparator: () => null,
                Input: HideInput, 
              }}
              styles={{
              ...customSelectStyles,
              control: (provided) => ({
                ...provided,
                minHeight: 0,          
                height: 0,             
                padding: 0,            
                backgroundColor: 'transparent',
                border: 'none', 
                boxShadow: 'none',      
                ':focus': { boxShadow: 'none' },        
              }),
              menu: (provided) => ({
                ...provided,
                backgroundColor: '#1f2937',
                zIndex: 9999,
              }),
            }}
            />
          </div>
        )}
      </div>

      {/* 🧹 Clear All Filters button */}
      <button
        onClick={() => {
          setSearchQuery("");
          setTypeFilter("");
          setCollegeFilter("");
          setSkillFilter([]);
        }}
        className={styles.clearButton}
      >
        Clear All
      </button>
    </div>

      {/* Hackathon feed cards */}
      {filteredPosts.length === 0 ? (
        <p>No requests found.</p>
      ) : (
        <div className={styles.hackathonGrid}>
          {filteredPosts.map(post => (
            <div key={post.id} className={styles.hackathonCard}>
              <h3 className={styles.hackathonTitle}>
                {post.title} <span className={styles.hackathonType}>({post.type})</span>
              </h3>
              <p className={styles.hackathonBy}>
                  By: {post.profiles?.full_name || "Unknown"}
                  {post.profiles?.college && (
                    <span className={styles.hackathonCollege}> • {post.profiles.college}</span>
                  )}
              </p>

              <p className={styles.hackathonDesc}>{post.description}</p>

              {/* Dynamic UI for Collaboration / Announcement */}
              {post.type === "Collaboration" && (
                <div className={styles.dynamicSection}>
                  {post.team_name && <p className={styles.metaLine}><strong>Team:</strong> {post.team_name}</p>}
                  {post.team_size && <p className={styles.metaLine}><strong>Team Size:</strong> {post.team_size}</p>}
                  {post.skills?.length > 0 && (
                    <div className={styles.chipsContainer}>
                      {post.skills.map(skill => (
                        <span key={skill} className={styles.chipSkill}>{skill}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {post.type === "Announcement" && (
                <div className={styles.dynamicSection}>
                  {post.categories?.length > 0 && (
                    <div className={styles.chipsContainer}>
                      {post.categories.map(cat => (
                        <span key={cat} className={styles.chipCategory}>{cat}</span>
                      ))}
                    </div>
                  )}
                  {post.event_date && (
                    <p className={styles.metaLine}>
                      <strong>Event Date:</strong>{" "}
                      {new Date(post.event_date).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  )}
                </div>
              )}

              {/* Interest section */}
              <span className={styles.interestChip}>
                {post.interest_count ?? 0} Interested
              </span>

              <div style={{ marginTop: "1rem" }}>
                <button
                  onClick={() => handleInterested(post)}
                  disabled={
                    saving === post.id ||
                    post.user_id === currentUser?.id ||
                    post.interested_user_ids?.includes(currentUser?.id)
                  }
                  className={styles.interestButton}
                >
                  {post.user_id === currentUser?.id
                    ? "This is your Hackathon"
                    : post.interested_user_ids?.includes(currentUser?.id)
                      ? "Already Interested"
                      : saving === post.id
                        ? "Saving..."
                        : "I'm Interested"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {hasMore && !loading && (
        <div style={{ textAlign: "center", marginTop: "2rem" }}>
          <button
            onClick={() => setPage((prev) => prev + 1)}
            className={styles.loadMoreButton}
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}

const customSelectStyles = {
  container: (provided) => ({
    ...provided,
    backgroundColor: 'transparent',
    width: '100%',
  }),
  control: (provided) => ({
    ...provided,
    backgroundColor: '#1f2937',
    borderColor: '#4b5563',
    color: '#f3f4f6',
    minHeight: '40px',
    width: '100%',
  }),
  input: (provided) => ({
    ...provided,
    color: '#f5f6f9ff', // 🎨 change this to whatever color you want
  }),
  singleValue: (provided) => ({ ...provided, color: '#f3f4f6' }),
  multiValue: (provided) => ({ ...provided, backgroundColor: '#4f46e5', color: '#f3f4f6' }),
  multiValueLabel: (provided) => ({ ...provided, color: '#f3f4f6' }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: '#1f2937',
    zIndex: 9999,
    boxShadow: 'none',      // remove the default shadow
    border: 'none',         // remove any blue border
    outline: 'none',        // remove focus outline
  }),
  menuPortal: (provided) => ({
    ...provided,
    zIndex: 9999,
    boxShadow: 'none',
    border: 'none',
    outline: 'none',
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: 'transparent', 
    color: '#f3f4f6',
    cursor: 'pointer',
    ':hover': { backgroundColor: 'transparent' },
    ':active': { backgroundColor: 'transparent' },
  }),
  dropdownIndicator: (provided) => ({ ...provided, color: '#f3f4f6' }),
  clearIndicator: (provided) => ({ ...provided, color: '#f3f4f6' }),
};

const CheckboxOption = (props) => {
  const { isSelected, label, data, selectOption, selectProps } = props;

  const handleClick = (e) => {
    e.stopPropagation();
    // For single select, manually toggle selection
    if (!selectProps.isMulti) {
      if (isSelected) {
        selectProps.onChange(null);
      } else {
        selectOption(data);
      }
    } else {
      // For multi-select, just toggle normally
      selectOption(data);
    }
  };

  return (
    <components.Option {...props}>
      <div
        onClick={handleClick}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          color: "#f3f4f6",
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={isSelected}
          readOnly
          style={{
            accentColor: "#4f46e5",
            width: "15px",
            height: "15px",
            cursor: "pointer",
            outline: "none",        
            boxShadow: "none", 
          }}
        />
        <label>{label}</label>
      </div>
    </components.Option>
  );
};

const CustomMenuList = (props) => {
  const { children, selectProps } = props;

  const handleClear = (e) => {
    e.stopPropagation();
    if (selectProps.isMulti) {
      selectProps.onChange([]); // clear all for multi-select
    } else {
      selectProps.onChange(null); // clear for single-select
    }
  };

  return (
    <components.MenuList {...props}>
      <div
        onClick={handleClear}
        style={{
          padding: "8px 12px",
          cursor: "pointer",
          color: "#f87171",
          fontWeight: 500,
          borderBottom: "1px solid #374151",
        }}
      >
        🧹 Clear All
      </div>
      {children}
    </components.MenuList>
  );
};

function fuzzyScore(text = "", query = "") {
  if (!text || !query) return 0;

  const t = text.toLowerCase().trim();
  const q = query.toLowerCase().trim();

  if (t === q) return 3;          // exact match
  if (t.startsWith(q)) return 2;  // prefix match
  if (t.includes(q)) return 1;    // partial match
  return 0;
}










