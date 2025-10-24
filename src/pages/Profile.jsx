import { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import Select from "react-select";
import { Card, CardContent } from "../components/ui/Card.jsx";
import styles from "./Profile.module.css";
import Loader from "../components/Loader.jsx";

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    id: "",
    username: "",
    full_name: "",
    email: "",
    college: "",
    branch: "",
    year: "",
    skills: [],
    interests: [],
  });

  // Guided tour helper
  const [helperStep, setHelperStep] = useState(-1);
  const [helperPosition, setHelperPosition] = useState({ top: 0, left: 0 });
  const helperRefs = useRef({});

  const helperStepNames = [
    "full_name",
    "college",
    "branch",
    "year",
    "skills",
    "interests",
  ];

  const setFieldRef = (field, ref) => {
    if (ref) helperRefs.current[field] = ref;
  };

  const isFieldEmpty = (field) => {
    const value = profile[field];
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === "string") return value.trim() === "";
    return !value;
  };

  const checkAndAdvanceHelper = () => {
    const nextIndex = helperStepNames.findIndex(f => isFieldEmpty(f));
    setHelperStep(nextIndex !== -1 ? nextIndex : -1);
  };

  const isProfileIncomplete = () => {
    return helperStepNames.some(isFieldEmpty);
  };

  // Position helper bubble dynamically
  useEffect(() => {
    if (helperStep === -1) return;
    const field = helperStepNames[helperStep];
    const el = helperRefs.current[field];
    if (el) {
      const rect = el.getBoundingClientRect();
      setHelperPosition({
        top: rect.top + window.scrollY + rect.height / 2 - 20,
        left: rect.right + 15,
      });
    }
  }, [helperStep, profile]);

  // Activate helper on first empty field
  useEffect(() => {
    const firstEmptyIndex = helperStepNames.findIndex(f => isFieldEmpty(f));
    if (firstEmptyIndex !== -1) {
      setIsEditing(true);
      setHelperStep(firstEmptyIndex);
    } else {
      setIsEditing(false); // make sure we don't enter edit mode
    }
  }, [profile]);

  // Fetch options for selects
  const [allSkills, setAllSkills] = useState([]);
  const [allInterests, setAllInterests] = useState([]);
  const [allColleges, setAllColleges] = useState([]);
  const [allBranches, setAllBranches] = useState([]);
  const [allYear] = useState(["1st Year", "2nd Year", "3rd Year", "4th Year"]);

  useEffect(() => {
    async function fetchOptions() {
      const { data: skills } = await supabase.from("skills").select("name");
      const { data: interests } = await supabase.from("interests").select("name");
      const { data: colleges } = await supabase.from("colleges").select("name").order("name");
      const { data: branches } = await supabase.from("branches").select("name").order("name");

      setAllSkills(skills?.map(s => s.name) || []);
      setAllInterests(interests?.map(i => i.name) || []);
      setAllColleges(colleges?.map(c => c.name) || []);
      setAllBranches(branches?.map(b => b.name) || []);
    }
    fetchOptions();
  }, []);

  // Fetch profile
  useEffect(() => {
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setLoading(false);

      const { data: userData } = await supabase
        .from("users")
        .select("email, username")
        .eq("id", user.id)
        .maybeSingle();

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profileData) {
        setProfile({
          ...profileData,
          email: userData?.email || "",
          username: profileData.username || userData?.username || "",
          skills: Array.isArray(profileData.skills) ? profileData.skills : [],
          interests: Array.isArray(profileData.interests) ? profileData.interests : [],
        });
      } else {
        setProfile({
          id: user.id,
          email: userData?.email || "",
          username: userData?.username || "",
          full_name: "",
          college: "",
          branch: "",
          year: "",
          skills: [],
          interests: [],
        });
      }
      setLoading(false);
    }
    fetchProfile();
  }, []);

  // Update profile
  async function updateProfile(e) {
    e.preventDefault();
    setSaving(true);

    await supabase.from("profiles").upsert({
      id: profile.id || undefined,
      username: profile.username,
      full_name: profile.full_name?.trim() || undefined,
      college: profile.college?.trim() || undefined,
      branch: profile.branch?.trim() || undefined,
      year: profile.year || undefined,
      skills: profile.skills,
      interests: profile.interests,
    }, { onConflict: ["id"], returning: "minimal" });

    setSaving(false);
    setIsEditing(false);
  }

  if (loading) return <Loader fullScreen={true} />;

  const yearOptions = allYear.map(y => ({ value: y, label: y }));
  const skillOptions = allSkills.map(s => ({ value: s, label: s }));
  const interestOptions = allInterests.map(i => ({ value: i, label: i }));
  const collegeOptions = allColleges.map(c => ({ value: c, label: c }));
  const branchOptions = allBranches.map(b => ({ value: b, label: b }));

  const selectStyles = {
    control: (base, state) => ({
      ...base,
      background: "#374151",
      color: "#f9fafb",
      borderColor: state.isFocused ? "#4f46e5" : "#4b5563",
      boxShadow: state.isFocused ? "0 0 0 1px #4f46e5" : "none",
      "&:hover": { borderColor: "#4f46e5" },
    }),
    menu: base => ({ ...base, background: "#1f2937", color: "#f9fafb" }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected ? "#6366f1" : state.isFocused ? "#4f46e5" : "#1f2937",
      color: state.isSelected || state.isFocused ? "#fff" : "#f9fafb",
      cursor: "pointer",
    }),
    singleValue: base => ({ ...base, color: "#f9fafb" }),
    multiValue: base => ({ ...base, backgroundColor: "#4f46e5", color: "#fff" }),
    multiValueLabel: base => ({ ...base, color: "#fff" }),
    placeholder: base => ({ ...base, color: "#d1d5db" }),
  };

  return (
    <div className={styles.profileContainer}>
      {!isEditing && (
        <Card className={styles.card}>
          <CardContent>
            <div className={styles.profileView}>
              <div className={styles.profileAvatar}>
                {profile.username ? profile.username.charAt(0).toUpperCase() : "?"}
              </div>
              <div className={styles.profileRow}><span>Full Name:</span> {profile.full_name || "No Name"}</div>
              <div className={styles.profileRow}><span>Username:</span> {profile.username}</div>
              <div className={styles.profileRow}><span>Email:</span> {profile.email}</div>
              <div className={styles.profileRow}><span>College:</span> {profile.college || "Not set"}</div>
              <div className={styles.profileRow}><span>Branch:</span> {profile.branch || "Not set"}</div>
              <div className={styles.profileRow}><span>Year:</span> {profile.year || "Not set"}</div>
              <div className={styles.profileRow}><span>Skills:</span> {profile.skills.join(", ") || "None"}</div>
              <div className={styles.profileRow}><span>Interests:</span> {profile.interests.join(", ") || "None"}</div>
              <div className={styles.buttonWrapper}>
                <button
                  onClick={() => setIsEditing(true)}
                  className={`${styles.saveButton} ${isProfileIncomplete() ? styles.pulseButton : ""}`}
                >
                  Edit Profile
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isEditing && (
        <Card className={styles.card}>
          <CardContent>
            <form onSubmit={updateProfile} className={styles.profileEditForm}>
              <div ref={el => setFieldRef("full_name", el)} className={`${styles.formGroup} ${helperStepNames[helperStep] === "full_name" ? styles.pulse : ""}`}>
                <label>Full Name</label>
                <input
                  type="text"
                  value={profile.full_name}
                  onChange={e => { setProfile({ ...profile, full_name: e.target.value }); checkAndAdvanceHelper(); }}
                  className={styles.inputField}
                  placeholder="Enter your full name"
                />
              </div>

              <div ref={el => setFieldRef("username", el)} className={styles.formGroup}>
                <label>Username</label>
                <input type="text" value={profile.username} readOnly className={styles.inputField} />
              </div>

              <div ref={el => setFieldRef("college", el)} className={`${styles.formGroup} ${helperStepNames[helperStep] === "college" ? styles.pulse : ""}`}>
                <label>College</label>
                <Select
                  options={collegeOptions}
                  value={profile.college ? { value: profile.college, label: profile.college } : null}
                  onChange={sel => { setProfile({ ...profile, college: sel?.value || "" }); checkAndAdvanceHelper(); }}
                  styles={selectStyles} menuPortalTarget={document.body} menuPosition="fixed"
                />
              </div>

              <div ref={el => setFieldRef("branch", el)} className={`${styles.formGroup} ${helperStepNames[helperStep] === "branch" ? styles.pulse : ""}`}>
                <label>Branch</label>
                <Select
                  options={branchOptions}
                  value={profile.branch ? { value: profile.branch, label: profile.branch } : null}
                  onChange={sel => { setProfile({ ...profile, branch: sel?.value || "" }); checkAndAdvanceHelper(); }}
                  styles={selectStyles} menuPortalTarget={document.body} menuPosition="fixed"
                />
              </div>

              <div ref={el => setFieldRef("year", el)} className={`${styles.formGroup} ${helperStepNames[helperStep] === "year" ? styles.pulse : ""}`}>
                <label>Year</label>
                <Select
                  options={yearOptions}
                  value={profile.year ? { value: profile.year, label: profile.year } : null}
                  onChange={sel => { setProfile({ ...profile, year: sel?.value || "" }); checkAndAdvanceHelper(); }}
                  styles={selectStyles} menuPortalTarget={document.body} menuPosition="fixed"
                />
              </div>

              <div ref={el => setFieldRef("skills", el)} className={`${styles.formGroup} ${helperStepNames[helperStep] === "skills" ? styles.pulse : ""}`}>
                <label>Skills</label>
                <Select
                  isMulti
                  options={skillOptions}
                  value={profile.skills?.map(s => ({ value: s, label: s })) || []}
                  onChange={sel => { setProfile({ ...profile, skills: sel.map(s => s.value) }); checkAndAdvanceHelper(); }}
                  styles={selectStyles} menuPortalTarget={document.body} menuPosition="fixed"
                />
              </div>

              <div ref={el => setFieldRef("interests", el)} className={`${styles.formGroup} ${helperStepNames[helperStep] === "interests" ? styles.pulse : ""}`}>
                <label>Interests</label>
                <Select
                  isMulti
                  options={interestOptions}
                  value={profile.interests?.map(i => ({ value: i, label: i })) || []}
                  onChange={sel => { setProfile({ ...profile, interests: sel.map(i => i.value) }); checkAndAdvanceHelper(); }}
                  styles={selectStyles} menuPortalTarget={document.body} menuPosition="fixed"
                />
              </div>

              <div className={styles.buttonWrapper}>
                <button type="submit" className={`${styles.saveButton} ${saving ? styles.disabled : ""}`} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </button>
                <button type="button" className={`${styles.saveButton} ${styles.cancelButton}`} onClick={() => setIsEditing(false)}>
                  View Profile
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
