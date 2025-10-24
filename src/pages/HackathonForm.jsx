import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import Select from "react-select";
import styles from "./HackathonForm.module.css";
import { FaHeading, FaTags, FaUsers } from "react-icons/fa";
import { AiOutlineFileText, AiOutlineCode } from "react-icons/ai";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/dark.css"; // Dark theme

export default function HackathonForm({ sidebarOpen, setSidebarOpen }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "",
    skills: [],
    teamName: "",
    teamSize: "",
    categories: [],
    eventDate: new Date(),
  });
  const [allSkills, setAllSkills] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const typeOptions = [
    { value: "Collaboration", label: "Collaboration" },
    { value: "Announcement", label: "Announcement" },
  ];

  useEffect(() => {
    async function fetchSkills() {
      const { data } = await supabase.from("skills").select("name");
      setAllSkills(data?.map(s => ({ value: s.name, label: s.name })) || []);
    }
    fetchSkills();

    async function fetchCategories() {
      const { data } = await supabase.from("project_categories").select("name");
      setAllCategories(data?.map(c => ({ value: c.name, label: c.name })) || []);
    }
    fetchCategories();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    clearTimeout(window.messageTimeout);

    // ✅ Basic validation
    if (!form.title.trim()) {
      setMessage("❌ Hackathon title is required");
      window.messageTimeout = setTimeout(() => setMessage(""), 3000);
      return;
    }

    if (!form.description.trim()) {
      setMessage("❌ Hackathon description is required");
      window.messageTimeout = setTimeout(() => setMessage(""), 3000);
      return;
    }

    if (!form.type.trim()) {
      setMessage("❌ Please select a type (Collaboration or Announcement)");
      window.messageTimeout = setTimeout(() => setMessage(""), 3000);
      return;
    }

    if (form.type === "Collaboration" && form.skills.length === 0) {
      setMessage("❌ Please select at least one skill");
      window.messageTimeout = setTimeout(() => setMessage(""), 3000);
      return;
    }

    if (form.type === "Announcement" && form.categories.length === 0) {
      setMessage("❌ Please select at least one category");
      window.messageTimeout = setTimeout(() => setMessage(""), 3000);
      return;
    }

    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("hackathons").upsert({
      user_id: user.id,
      title: form.title,
      description: form.description,
      type: form.type,
      skills: form.skills.map(s => s.value),
      team_name: form.teamName || null,
      team_size: form.teamSize || null,
      categories: form.categories?.map(c => c.value) || null,
      event_date: form.eventDate || null,
    });

    if (error) {
      console.error(error);
      setMessage("❌ Error creating request");
      window.messageTimeout = setTimeout(() => setMessage(""), 3000);
    } else {
      setForm({
        title: "",
        description: "",
        type: "",
        skills: [],
        teamName: "",
        teamSize: "",
        categories: [],
        eventDate: new Date(),
      });
      setMessage("✅ Hackathon request created");
      window.messageTimeout = setTimeout(() => setMessage(""), 3000);
      setSidebarOpen(false);
    }

    setSaving(false);
  }


  return (
    <form onSubmit={handleSubmit}>
      <h2 className={styles.sidebarHeader}>Create Hackathon Request</h2>
      {/* Type first */}
      <h3 className={styles.sidebarHeadline}><FaTags /> Type</h3>
      <p className={styles.sidebarSubtext}>Choose whether you’re collaborating on a hackathon or announcing a new event.</p>
      <Select
        options={typeOptions}
        value={typeOptions.find(opt => opt.value === form.type)}
        onChange={selected => setForm({ ...form, type: selected?.value || "" })}
        placeholder="Select type..."
        menuPortalTarget={document.body}
        styles={selectStyles}
      />

      {/* Common fields */}
      <h3 className={styles.sidebarHeadline}><FaHeading /> Title</h3>
      <p className={styles.sidebarSubtext}>Give your hackathon a clear and concise title that attracts participants.</p>
      <input
        type="text"
        placeholder="E.g. Build an AI-Powered Chatbot"
        value={form.title}
        onChange={e => setForm({ ...form, title: e.target.value })}
        className={styles.inputField}
      />

      <h3 className={styles.sidebarHeadline}><AiOutlineFileText /> Description</h3>
      <p className={styles.sidebarSubtext}>Provide a detailed description so participants understand the goal and scope.</p>
      <textarea
        placeholder="Describe your hackathon idea, challenges, and requirements..."
        value={form.description}
        onChange={e => setForm({ ...form, description: e.target.value })}
        className={styles.textareaField}
      />

      {/* Dynamic fields based on type */}
      {form.type === "Collaboration" && (
        <div className={styles.dynamicFields + " " + styles.slideIn}>
          <h3 className={styles.sidebarHeadline}><FaTags /> Team Name</h3>
          <p className={styles.sidebarSubtext}>Enter the name of your team so other users can recognize it easily.</p>
          <input
            type="text"
            placeholder="Your team's name"
            value={form.teamName}
            onChange={e => setForm({ ...form, teamName: e.target.value })}
            className={styles.inputField}
          />

          <h3 className={styles.sidebarHeadline}><FaUsers /> Team Size</h3>
          <p className={styles.sidebarSubtext}>Specify the number of members you are looking to collaborate with.</p>
          <input
            type="number"
            placeholder="Number of members you're looking for"
            value={form.teamSize}
            onChange={e => setForm({ ...form, teamSize: e.target.value })}
            className={styles.inputField}
          />

          <h3 className={styles.sidebarHeadline}><AiOutlineCode /> Skills</h3>
          <p className={styles.sidebarSubtext}>Select the skills required for your collaborators.</p>
          <Select
            isMulti
            options={allSkills}
            value={form.skills}
            onChange={selected => setForm({ ...form, skills: selected })}
            placeholder="Skills required for collaboration..."
            menuPortalTarget={document.body}
            styles={selectStyles}
          />
        </div>
      )}

      {form.type === "Announcement" && (
        <div className={styles.dynamicFields}>
          <h3 className={styles.sidebarHeadline}><FaTags /> Categories</h3>
          <p className={styles.sidebarSubtext}>Choose relevant categories to help users find your hackathon announcement easily.</p>
          <Select
            isMulti
            options={allCategories}
            value={form.categories}
            onChange={selected => setForm({ ...form, categories: selected })}
            placeholder="Select relevant categories..."
            menuPortalTarget={document.body}
            styles={selectStyles}
          />

          <h3 className={styles.sidebarHeadline}><AiOutlineFileText /> Event Date</h3>
          <p className={styles.sidebarSubtext}>Select the date when your hackathon will take place.</p>
          <Flatpickr
            value={form.eventDate}
            onChange={date => setForm({ ...form, eventDate: date[0] })}
            options={{
              dateFormat: "Y-m-d",
              altInput: true,
              altFormat: "F j, Y",
              allowInput: false,
              monthSelectorType: "dropdown",
              yearSelectorType: "dropdown",
              minDate: "today",
            }}
            className={styles.inputField}
            style={{ fontSize: "1.1rem" }}
          />
        </div>
      )}

      {/* Chips for skills */}
      {form.skills.length > 0 && (
        <div className={styles.chipsContainer}>
          {form.skills.map((skill, idx) => (
            <span key={idx} className={styles.chipSkill}>{skill.label}</span>
          ))}
        </div>
      )}

      {message && <p className={styles.formMessage}>{message}</p>}
      <div className={styles.buttonWrapper}>
        <button type="submit" className={styles.saveButton} disabled={saving}>
          {saving ? "Saving..." : "Post Request"}
        </button>
      </div>
    </form>
  );
}

// --- Select Styles (Community Dark Theme) ---
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
