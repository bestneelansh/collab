import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import Select from "react-select";
import LoginPrompt from "../components/LoginPrompt.jsx";
import useRedirectToLogin from "../utils/redirectToLogin";
import styles from "./Projects.module.css";
import {FaHeading} from "react-icons/fa";
import Loader from "../components/Loader.jsx";
import { AiOutlineFileText, AiOutlineCode, AiOutlineUpload} from "react-icons/ai";
import { BiCategory } from "react-icons/bi";
import { components } from "react-select";
import  ConfirmationModal from "../components/ConfirmationModal.jsx";
import Zoom from 'react-medium-image-zoom';
import 'react-medium-image-zoom/dist/styles.css';

export default function Projects() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState([]);
  const [filters, setFilters] = useState({
    categories: [],
    difficulty: null,
  });
  const [allSkills, setAllSkills] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [form, setForm] = useState({
    id: "",
    title: "",
    description: "",
    technologies: [],
    categories: [],
  });
  const [message, setMessage] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTech, setFilterTech] = useState([]);
  const [filterCat, setFilterCat] = useState([]);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const redirectToLogin = useRedirectToLogin();
  const [openDropdown, setOpenDropdown] = useState(null); 
  const placeholders = [
    "🚀 Search projects by title or description...",
    "💻 Looking for cutting-edge Web Dev projects?",
    "🔍 Filter by technologies, tools, or categories...",
    "🤖 Explore mind-blowing AI/ML creations...",
    "📱 Find innovative mobile apps built by others...",
    "🌌 Discover futuristic projects and tech marvels...",
    "💎 Hunt for creative coding gems and hidden talents...",
    "📈 Check out trending tech ideas taking off 🚀",
    "🛠️ Explore open-source wonders and collaborations...",
    "💡 Peek into inspiring, innovative apps and tools...",
    "❤️ Browse projects built with pure passion...",
    "✨ Find projects that motivate and spark creativity...",
    "💼 Spot the next big startup idea ready to shine...",
    "🕵️‍♂️ Uncover hidden coding talents and experiments...",
    "🎯 Explore hacks, side-projects, and fun experiments...",
    "⚡ Discover high-energy projects breaking boundaries...",
    "🎨 Dive into visually stunning and creative projects...",
    "🌍 Explore projects from creators around the world...",
    "🧩 Find unique solutions and clever code snippets...",
    "🔥 Check out projects that are setting tech trends..."
  ];
  const [searchPlaceholder, setSearchPlaceholder] = useState(placeholders[0]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const user = session?.user;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [projectToDelete, setProjectToDelete] = useState(null);
  const handleDeleteClick = (project) => {
    setProjectToDelete(project);
    setConfirmMessage(`Are you sure you want to delete "${project.title}"?`);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;
    await deleteProject(projectToDelete.id);
    setConfirmOpen(false);
    setProjectToDelete(null);
  };

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % placeholders.length;
      setSearchPlaceholder(placeholders[index]);
    }, 1500); // change every 1.5 seconds
    return () => clearInterval(interval);
  }, []);

  // Fetch session
  useEffect(() => {
    const getSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) console.error(error);
      setSession(data?.session || null);
    };
    getSession();
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => setSession(newSession)
    );
    return () => authListener.subscription.unsubscribe();
  }, []);

  const handleAddProjectClick = () => {
    if (!session) setShowLoginPrompt(true);
    else setSidebarOpen(true);
  };

  // Fetch skills
  useEffect(() => {
    async function fetchSkills() {
      const { data } = await supabase.from("skills").select("name");
      setAllSkills(data?.map(s => ({ value: s.name, label: s.name })) || []);
    }
    fetchSkills();
  }, []);

  // Fetch categories
  useEffect(() => {
    async function fetchCategories() {
      const { data } = await supabase.from("project_categories").select("name");
      setAllCategories(data?.map(c => ({ value: c.name, label: c.name })) || []);
    }
    fetchCategories();
  }, []);

  // Fetch projects
  useEffect(() => {
    if (!user?.id) return;
    fetchProjects();
  }, [user, filters]);

  async function fetchProjects() {
    setLoading(true);

    const { data, error } = await supabase.rpc("match_projects_for_user_with_filters", {
      p_user_id: user.id,
      p_categories:
        filters.categories && filters.categories.length > 0 ? filters.categories : null,
      p_difficulty: filters.difficulty,
      p_visibility: "public",
      match_limit: 50,
    });

    if (error) {
      console.error("❌ Error fetching projects:", error);
      setProjects([]);
    } else {
      // ✅ Sort projects by similarity/match score descending
      const sorted = (data || []).sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
      setProjects(sorted);
    }

    setLoading(false);
  }

  // Fetch tags
  useEffect(() => {
    async function fetchTags() {
      const { data, error } = await supabase.from("tags").select("name");
      if (error) console.error(error);
      else setAllTags(data?.map(t => ({ value: t.name, label: t.name })) || []);
    }
    fetchTags();
  }, []);

  //clicking outside closes the dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".iconFiltersWrapper")) setOpenDropdown(null);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Save project
  async function saveProject(e) {
    e.preventDefault();
    setMessage("");

    let imageUrl = null;

    // ✅ Upload image only if present
    if (form.imageFile) {
      setIsUploading(true);
      try {
        const sanitizedFileName = form.imageFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const filePath = `project-thumbnails/${Date.now()}_${sanitizedFileName}`;

        const { error: uploadError } = await supabase.storage
          .from("collatz-images")
          .upload(filePath, form.imageFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("collatz-images")
          .getPublicUrl(filePath);

        imageUrl = publicUrlData.publicUrl;
      } catch (err) {
        console.error("Error uploading image:", err);
        alert("❌ Image upload failed. Please try again.");
      } finally {
        setIsUploading(false);
      }
    }


    if (!form.title.trim()) {
    setMessage("❌ Project title is required");
    setTimeout(() => setMessage(""), 3000);
    return;
    }
    if (!form.description.trim()) {
      setMessage("❌ Project description is required");
      setTimeout(() => setMessage(""), 3000);
      return;
    }
    if (form.technologies.length === 0) {
      setMessage("❌ Please select at least one technology");
      setTimeout(() => setMessage(""), 3000);
      return;
    }
    if (form.categories.length === 0) {
      setMessage("❌ Please select at least one category");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("projects").upsert(
      {
        id: form.id || undefined,
        user_id: user.id,
        title: form.title,
        description: form.description,
        technologies: form.technologies.map(t => t.value),
        categories: form.categories.map(c => c.value),
        live_url: form.live_url || null,
        repo_url: form.repo_url || null,
        image_url: imageUrl || form.image_url || null,
        difficulty: form.difficulty || null,
        status: form.status || null,
        tags: form.tags || [],
        visibility: form.visibility || 'public',
      },
      { onConflict: ["id"], returning: "representation" }
    );

    if (error) setMessage("Error saving project ❌");
    else {
      const { data } = await supabase.from("projects").select("*").eq("user_id", user.id);
      setProjects(data || []);
      setForm({ id: "", title: "", description: "", technologies: [], categories: [] });
      setMessage("Project saved! ✅");
      setSidebarOpen(false);
    }
    setSaving(false);
  }

  // Edit project
  function editProject(project) {
    setForm({
      id: project.id,
      title: project.title,
      description: project.description,
      technologies: (project.technologies || []).map(t => ({ value: t, label: t })),
      categories: (project.categories || []).map(c => ({ value: c, label: c })),
    });
    setSidebarOpen(true);
  }

  // Delete project
  async function deleteProject(id) {
    try {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (!error) setProjects(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error("Unexpected error:", err);
    }
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return alert("❌ Only image files are allowed");
    if (file.size > 5 * 1024 * 1024) return alert("❌ Image must be smaller than 5 MB");

    // Only preview, no upload yet
    const previewUrl = URL.createObjectURL(file);
    setForm(prev => ({
      ...prev,
      imageFile: file,
      imagePreview: previewUrl,
    }));
  };

  if (loading) return <Loader fullScreen={true} />;

  // Filter projects
  const filteredProjects = projects.filter(project => {
    const matchesSearch =
      project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTech =
      filterTech.length === 0 ||
      (project.technologies || []).some(t => filterTech.map(f => f.value).includes(t));
    const matchesCat =
      filterCat.length === 0 ||
      (project.categories || []).some(c => filterCat.map(f => f.value).includes(c));
    return matchesSearch && matchesTech && matchesCat;
  });

  return (
    <div className={styles.projectsContainer}>
      {/* Login Prompt */}
      {showLoginPrompt && <LoginPrompt onClose={() => setShowLoginPrompt(false)} onRedirect={redirectToLogin} />}

      {/* Hero Section */}
      <div className={styles.projectsHero}>
        <h1 className={styles.projectsHeroTitle}>Showcase Your Projects 🚀</h1>
        <p className={styles.projectsHeroSubtitle}>
          Build, share, and inspire others with your work.
        </p>
        <div className={styles.heroButtons}>
          <button className={styles.addButton} onClick={handleAddProjectClick}>
            Add Project
          </button>
          <button
            className={styles.heroCTA}
            onClick={() => window.scrollTo({ top: 300, behavior: "smooth" })}
          >
            Explore Projects
          </button>
        </div>
      </div>

      {/* Sidebar Overlay */}
      <div
        className={`${styles.sidebarOverlay} ${sidebarOpen ? styles.active : ""}`}
        onClick={() => setSidebarOpen(false)}
      ></div>

      {/* Sidebar Form */}
      <form 
        onSubmit={e => e.preventDefault()}
        className={`${styles.projectsForm} ${sidebarOpen ? styles.open : ""}`}
      >
        <div className={styles.sidebarHeader}>
          <h2>{form.id ? "Edit Project" : "Add Project"}</h2>
          <button
            className={styles.closeButton}
            onClick={() => setSidebarOpen(false)}
          >
            ×
          </button>  
        </div>
        
          <h3 className={styles.sidebarHeadline}>
            <FaHeading/> Project Title</h3>
          <p className={styles.sidebarSubtext}>
            Give your project a clear and concise title.
          </p>
          <input
            type="text"
            value={form.title}
            placeholder="🚀 Awesome Project Name..."
            onChange={e => setForm({ ...form, title: e.target.value })}
            className={styles.inputField}
          />
          
          <h3 className={styles.sidebarHeadline}>
            <AiOutlineFileText/> Description</h3>
          <p className={styles.sidebarSubtext}>
            Provide a description of your projects 
          </p>
          <textarea
            value={form.description}
            placeholder="✨ Describe what makes your project cool..."
            onChange={e => setForm({ ...form, description: e.target.value })}
            className={styles.textareaField}
          />

          <h3 className={styles.sidebarHeadline}>
            <AiOutlineCode/> Technologies</h3>
            <p className={styles.sidebarSubtext}>
              Select relevant categories for your project
            </p>

          <Select
            isMulti
            options={allSkills}
            value={form.technologies}
            onChange={selected => setForm({ ...form, technologies: selected })}
            placeholder="Select technologies..."
            menuPortalTarget={null}
            styles={selectStyles}
          />

          <h3 className={styles.sidebarHeadline}>
            <BiCategory/> Categories</h3>
          <p className={styles.sidebarSubtext}>
            Provide relevant technologies to be used in your project 
          </p>
          <Select
            isMulti
            options={allCategories}
            value={form.categories}
            onChange={selected => setForm({ ...form, categories: selected })}
            placeholder="Select categories..."
            menuPortalTarget={null}
            styles={selectStyles}
          />

          {/* Live URL */}
          <h3 className={styles.sidebarHeadline}>🌐 Live Demo URL</h3>
          <p className={styles.sidebarSubtext}>Optional: Provide a link to your live project.</p>
          <input
            type="text"
            value={form.live_url || ""}
            placeholder="https://example.com"
            onChange={e => setForm({ ...form, live_url: e.target.value })}
            className={styles.inputField}
          />

          {/* Repo URL */}
          <h3 className={styles.sidebarHeadline}>💻 Repository URL</h3>
          <p className={styles.sidebarSubtext}>Optional: Provide a link to your code repository.</p>
          <input
            type="text"
            value={form.repo_url || ""}
            placeholder="https://github.com/username/project"
            onChange={e => setForm({ ...form, repo_url: e.target.value })}
            className={styles.inputField}
          />

          <h3 className={styles.sidebarHeadline}>🖼️ Thumbnail Image</h3>
          <p className={styles.sidebarSubtext}>Upload an image for your project (Max 5 MB).</p>

          <div className={styles.uploadContainer}>
            {/* Hidden file input */}
            <input
              type="file"
              accept="image/*"
              id="project-image-upload"
              style={{ display: "none" }}
              onChange={handleImageChange}
            />

            {/* Upload button with icon */}
            <label htmlFor="project-image-upload" className={styles.uploadIconLabel}>
              <AiOutlineUpload size={22} />
              <span>Choose Image</span>
            </label>

            {/* Optional upload status */}
            {isUploading && (
              <p className={styles.uploadStatus}>⏳ Uploading image...</p>
            )}

            {/* Preview section */}
            {form.imagePreview && (
            <div
              className={styles.imagePreviewWrapper}
              onClick={() => document.getElementById("project-image-upload").click()}
              style={{ position: "relative", display: "inline-block" }} // Ensure relative positioning
            >
              <img
                src={form.imagePreview}
                alt="Project Preview"
                className={styles.imagePreview}
                style={{ display: "block", maxWidth: "100%", borderRadius: "8px" }}
              />
              <button
                type="button"
                aria-label="Remove image"
                onClick={(e) => {
                  e.stopPropagation(); // ✅ Stops parent click
                  if (form.imagePreview) URL.revokeObjectURL(form.imagePreview);
                  setForm((prev) => ({ ...prev, imageFile: null, imagePreview: null }));
                }}
                style={{
                  position: "absolute",
                  top: "4px",
                  right: "4px",
                  background: "rgba(0,0,0,0.6)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "50%",
                  width: "24px",
                  height: "24px",
                  cursor: "pointer",
                  zIndex: 10,
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✖
              </button>
            </div>
          )}

          </div>

          {/* Difficulty Dropdown */}
          <h3 className={styles.sidebarHeadline}>⚡ Difficulty</h3>
          <p className={styles.sidebarSubtext}>Select the difficulty level of your project.</p>
          <Select
            options={[
              { value: "Beginner", label: "Beginner" },
              { value: "Intermediate", label: "Intermediate" },
              { value: "Advanced", label: "Advanced" },
            ]}
            value={form.difficulty ? { value: form.difficulty, label: form.difficulty } : null}
            onChange={selected => setForm({ ...form, difficulty: selected?.value })}
            placeholder="Select difficulty..."
            styles={selectStyles}
          />

          {/* Status Dropdown */}
          <h3 className={styles.sidebarHeadline}>📌 Status</h3>
          <p className={styles.sidebarSubtext}>Select the current status of your project.</p>
          <Select
            options={[
              { value: "WIP", label: "WIP" },
              { value: "Completed", label: "Completed" },
              { value: "Archived", label: "Archived" },
            ]}
            value={form.status ? { value: form.status, label: form.status } : null}
            onChange={selected => setForm({ ...form, status: selected?.value })}
            placeholder="Select status..."
            styles={selectStyles}
          />

          {/* Tags Multi-Select */}
          <h3 className={styles.sidebarHeadline}>🏷️ Tags</h3>
          <p className={styles.sidebarSubtext}>Optional: Add extra tags for your project.</p>
          <Select
            isMulti
            options={allTags} // Use fetched tags
            value={form.tags?.map(t => ({ value: t, label: t })) || []}
            onChange={selected => setForm({ ...form, tags: selected.map(t => t.value) })}
            placeholder="Select or add tags..."
            styles={selectStyles}
            isSearchable
            noOptionsMessage={() => "No tags found"} 
          />

          {/* Visibility */}
          <h3 className={styles.sidebarHeadline}>🔒 Visibility</h3>
          <p className={styles.sidebarSubtext}>Choose if your project is public or private.</p>
          <Select
            options={[
              { value: "public", label: "Public" },
              { value: "private", label: "Private" },
            ]}
            value={form.visibility ? { value: form.visibility, label: form.visibility } : { value: "public", label: "Public" }}
            onChange={selected => setForm({ ...form, visibility: selected.value })}
            placeholder="Select visibility..."
            styles={selectStyles}
          />

          {message && <p className={styles.formMessage}>{message}</p>}
          <div className={styles.buttonWrapper}>
            <button type="button" onClick={saveProject} className={styles.saveButton}>
              {saving ? "Saving..." : form.id ? "Update Project ✨" : "Add Project"}
            </button>
          </div>
         
      </form>

      {/* Search & Filters */}
      <div className={styles.searchFilterWrapper}>
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className={styles.inputField}
        />
        <div onClick={(e) => e.stopPropagation()}>

        {/* Technologies Filter */}
        <div style={{ position: "relative", display: "inline-block", marginRight: "20px",marginLeft: "10px"}}>
          <AiOutlineCode
            title="Filter by Technologies"
            size={24}
            onClick={() => setOpenDropdown(openDropdown === "tech" ? null : "tech")}
            style={{ cursor: "pointer", color: "#6366f1" }}
          />
          {openDropdown === "tech" && (
            <div style={{ 
                position: "absolute", 
                top: "30px", 
                minWidth: "200px", 
                zIndex: 999 
            }}>
              <Select
                isMulti
                options={allSkills}
                value={filterTech}
                onChange={setFilterTech}
                closeMenuOnSelect={false}
                hideSelectedOptions={false}
                isSearchable={false}
                menuIsOpen
                menuPortalTarget={document.body}
                components={{ Option: CheckboxOption, MenuList: CustomMenuList, DropdownIndicator: () => null }}
                styles={{
                  ...customSelectStyles,
                  control: (provided) => ({ 
                    ...provided, 
                    minHeight: 0, 
                    height: 0, 
                    padding: 0, 
                    border: "none",
                    boxShadow: 'none',      
                    ':focus': { boxShadow: 'none' },
                    opacity: 0,          
                    pointerEvents: "none"
                  }),
                }}
              />
            </div>
          )}
        </div>

        {/* Categories Filter */}
        <div style={{ position: "relative", display: "inline-block", marginRight: "10px" }} onClick={(e) => e.stopPropagation()}>
          <BiCategory 
            title="Filter by Categories"
            size={24}
            onClick={() => setOpenDropdown(openDropdown === "cat" ? null : "cat")}
            style={{ cursor: "pointer", color: "#6366f1" }}
          />
          {openDropdown === "cat" && (
            <div style={{ position: "absolute", top: "30px", minWidth: "200px", zIndex: 999 }}>
              <Select
                isMulti
                options={allCategories}
                value={filterCat}
                onChange={setFilterCat}
                closeMenuOnSelect={false}
                hideSelectedOptions={false}
                isSearchable={false}
                menuIsOpen
                menuPortalTarget={document.body}
                components={{ Option: CheckboxOption, MenuList: CustomMenuList, DropdownIndicator: () => null }}
                styles={{
                  ...customSelectStyles,
                  control: (provided) => ({ 
                    ...provided, 
                    minHeight: 0, 
                    height: 0, 
                    padding: 0, 
                    border: "none",
                    boxShadow: 'none',      
                    ':focus': { boxShadow: 'none' },
                    opacity: 0,          
                    pointerEvents: "none"
                  }),
                }}
              />
            </div>
          )}
        </div>
      </div>

      </div>

      {/* Projects Grid */}
      <div className={styles.projectsGrid}>
        {filteredProjects.length === 0 ? (
          <p className={styles.emptyState}>🚀 No projects found. Try adding one above!</p>
        ) : (
          filteredProjects.map(project => (
            <div 
              key={project.id} 
              className={`${styles.projectCard} animateFadeIn`}
              onClick={() => setSelectedProject(project)}
            >
              {/* Thumbnail */}
              <div className={styles.projectImageWrapper}>
                {project.image_url ? (
                  <img
                    src={project.image_url}
                    alt={project.title}
                    className={styles.projectImage}
                  />
                ) : (
                  <div className={styles.projectImagePlaceholder}>
                    <span>{project.title?.charAt(0)?.toUpperCase()}</span>
                  </div>
                )}
              </div>

              {/* Card Body */}
              <div className={styles.projectBody}>
                <h3 className={styles.projectTitle}>{project.title}</h3>

                <div className={styles.projectMeta}>
                  {project.status && (
                    <span className={styles.badge}>
                      {project.status}
                    </span>
                  )}
                  {project.difficulty && (
                    <span className={styles.difficultyBadge}>{project.difficulty}</span>
                  )}
                </div>

                <p className={styles.projectDescription}>
                  {project.description?.length > 90
                    ? project.description.slice(0, 90) + "..."
                    : project.description}
                </p>
              </div>

              {/* Card Footer */}
              <div className={styles.projectFooter}>
                <div className={styles.techChips}>
                  {project.technologies?.slice(0, 3).map((tech, index) => (
                    <span key={index} className={styles.techChip}>{tech}</span>
                  ))}
                  {project.technologies?.length > 3 && (
                    <span className={styles.moreChip}>+{project.technologies.length - 3}</span>
                  )}
                </div>

                <div className={styles.iconRow}>
                  {project.live_url && (
                    <a 
                      href={project.live_url} 
                      onClick={e => e.stopPropagation()} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      🌐
                    </a>
                  )}
                  {project.repo_url && (
                    <a 
                      href={project.repo_url} 
                      onClick={e => e.stopPropagation()} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      💻
                    </a>
                  )}
                </div>
              </div>
              {project.user_id === user?.id && (
                <div className={styles.projectActions}>
                  <button
                    className={styles.smallButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      editProject(project); // ← use this
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className={`${styles.smallButton} ${styles.deleteBtn}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(project); // ← use this
                    }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
            ))
          )}
          <ConfirmationModal
          isOpen={confirmOpen}
          message={confirmMessage}
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmOpen(false)}
          />
        </div>

        {selectedProject && (
            <div
              className={styles.modalOverlay}
              onClick={() => setSelectedProject(null)}
              role="dialog"
              aria-modal="true"
            >
              <div
                className={styles.modalContent}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <button
                  onClick={() => setSelectedProject(null)}
                  className={styles.modalClose}
                  aria-label="Close modal"
                >
                  ×
                </button>

                {/* Project Image */}
                {selectedProject.image_url && (
                <Zoom>
                  <img
                    src={selectedProject.image_url}
                    alt={selectedProject.title}
                    className={styles.modalImage}
                  />
                </Zoom>
                )}

                {/* Project Title & Description */}
                <div className={styles.modalSection}>
                  <h2 className={styles.modalTitle}>{selectedProject.title}</h2>
                  <p className={styles.modalDescription}>{selectedProject.description}</p>
                </div>

                {/* Technologies */}
                {selectedProject.technologies?.length > 0 && (
                  <div className={styles.modalSection}>
                    <h3>💻 Technologies</h3>
                    <div className={styles.chipsContainer}>
                      {selectedProject.technologies.map((tech) => (
                        <span key={tech} className={styles.chipTech}>
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Categories */}
                {selectedProject.categories?.length > 0 && (
                  <div className={styles.modalSection}>
                    <h3>📂 Categories</h3>
                    <div className={styles.chipsContainer}>
                      {selectedProject.categories.map((cat) => (
                        <span key={cat} className={styles.chipCat}>
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {selectedProject.tags?.length > 0 && (
                  <div className={styles.modalSection}>
                    <h3>🏷️ Tags</h3>
                    <div className={styles.chipsContainer}>
                      {selectedProject.tags.map((tag) => (
                        <span key={tag} className={styles.chipTag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Additional Details */}
                <div className={styles.modalSection}>
                  <h3>🔧 Project Details</h3>
                  <p>{selectedProject.difficulty && `⚡ Difficulty: ${selectedProject.difficulty}`}</p>
                  <p>{selectedProject.status && `📌 Status: ${selectedProject.status}`}</p>
                  <p>{selectedProject.visibility && `🔒 Visibility: ${selectedProject.visibility}`}</p>
                  <p>
                    {selectedProject.live_url && (
                      <a
                        href={selectedProject.live_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.modalButton}
                      >
                        🌐 Live Demo
                      </a>
                    )}
                  </p>
                  <p>
                    {selectedProject.repo_url && (
                      <a
                        href={selectedProject.repo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.modalButton}
                      >
                        💻 Repository
                      </a>
                    )}
                  </p>
                  {selectedProject.created_at && (
                    <p>📅 Created At: {new Date(selectedProject.created_at).toLocaleString()}</p>
                  )}
                </div>

                {/* Optional Owner Actions */}
                {selectedProject.user_id === user?.id && (
                  <div className={styles.ownerActions}>
                    <button
                      className={styles.editButton}
                      onClick={() => {
                        editProject(selectedProject);
                        setSelectedProject(null);
                      }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      className={styles.deleteButton}
                      onClick={() => {
                        handleDeleteClick(selectedProject);
                        setSelectedProject(null);
                      }}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

      </div>
    );
  } 

const CheckboxOption = (props) => {
  const { isSelected, label, data, selectOption, selectProps } = props;
  const handleClick = (e) => {
    e.stopPropagation();
    if (!selectProps.isMulti) {
      if (isSelected) selectProps.onChange(null);
      else selectOption(data);
    } else {
      selectOption(data);
    }
  };
  return (
    <components.Option {...props}>
      <div
        onClick={handleClick}
        style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", color: "#e0e0e0" }}
      >
        <input
          type="checkbox"
          checked={isSelected}
          readOnly
          style={{ accentColor: "#6366f1", width: "15px", height: "15px", cursor: "pointer" }}
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
    if (selectProps.isMulti) selectProps.onChange([]);
    else selectProps.onChange(null);
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

const selectStyles = {
  menuPortal: (base) => ({ ...base, zIndex: 10000 }),
  menu: (base) => ({
    ...base,
    backgroundColor: "#1a1a1d",
    borderRadius: 12,
    boxShadow: "0 6px 20px rgba(0,0,0,0.5)",
    maxHeight: 180,
    overflowY: "auto",
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
  singleValue: (provided) => ({ ...provided, color: '#f3f4f6' }),
  multiValue: (provided) => ({ ...provided, backgroundColor: '#4f46e5', color: '#f3f4f6' }),
  multiValueLabel: (provided) => ({ ...provided, color: '#f3f4f6' }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: '#1f2937',
    zIndex: 9999,
    boxShadow: 'none',      
    border: 'none',        
    outline: 'none',        
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

