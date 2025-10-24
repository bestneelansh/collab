import { useState, useEffect } from "react";
import HackathonForm from "./HackathonForm";
import HackathonFeed from "./HackathonFeed";
import styles from "./Hackathons.module.css";
import { supabase } from "../supabaseClient";
import LoginPrompt from "../components/LoginPrompt";
import useRedirectToLogin from "../utils/redirectToLogin";
import Loader from "/Users/neelanshgoyal/Documents/collatz/src/components/Loader.jsx";

export default function Hackathons() {
  const [showFormSidebar, setShowFormSidebar] = useState(false);
  const [session, setSession] = useState(null);

  const toggleFormSidebar = () => {
    if (!session) {
      setShowLoginPrompt(true);
    } else {
      setShowFormSidebar(prev => !prev);
    }
  };

  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const redirectToLogin = useRedirectToLogin();

  useEffect(() => {
    const fetchSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data?.session || null);

      // Listen for auth changes
      const { data: authListener } = supabase.auth.onAuthStateChange(
        (_event, newSession) => setSession(newSession)
      );
      return () => authListener.subscription.unsubscribe();
    };
    fetchSession();
  }, []);

  return (
    <div className={styles.hackathonPage}>
      {showFormSidebar && (
        <div className={`${styles.leftSidebar} ${styles.active}`} 
        onClick={() => setShowFormSidebar(false)}>  
      </div>
      )}

      {/* Login Prompt */}
      {showLoginPrompt && (
        <LoginPrompt
          onClose={() => setShowLoginPrompt(false)}
          onRedirect={redirectToLogin} // ✅ add redirect handler
        />
      )}

      {/* Header */}
      <div className={styles.heroSection}>
          <h1 className={styles.heroTitle}>
            🚀 Think, Build & Innovate!
          </h1>
          <p className={styles.heroSubtitle}>
            Join the best hackathons, showcase your skills, and collaborate with innovators around the world.
          </p>

        <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem", flexWrap: "wrap" }}>
          <button className={styles.addButton} onClick={toggleFormSidebar}>
            Add Hackathon
          </button>
          <button
            className={styles.heroCTA}
            onClick={() => window.scrollTo({ top: 300, behavior: "smooth" })}
          >
            Explore Hackathons
          </button>
        </div>
      </div>

      <div className={styles.container}>
        {/* Left Sidebar: Form */}
        <div
          className={`${styles.leftSidebar} ${showFormSidebar ? styles.show : ""}`}
        >
          {/* Close button inside sidebar */}
          <button
            className={styles.closeButton}
            onClick={() => setShowFormSidebar(false)}
          >
            ×
          </button>
          <HackathonForm />
        </div>

        {/* Right Sidebar: Feed */}
        <div className={styles.rightSidebar}>
          <HackathonFeed />
        </div>
      </div>
    </div>
  );
}
