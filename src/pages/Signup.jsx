import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import styles from "./Auth.module.css";
import logo from "../assets/signup.png";
import { q } from "framer-motion/client";

export default function Signup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) navigate("/profile");
    });
  }, [navigate]);

  const handleEmailSignup = async (e) => {
  e.preventDefault();
  setMessage("");
  setLoading(true);

  try {
    // 1️⃣ Sign up the user
    const redirectUrl = window.location.hostname.includes("localhost")
      ? "http://localhost:5173/profile"
      : "https://bestneelansh.github.io/collab/profile";

    const { data: authData, error: authError } = await supabase.auth.signUp(
      { email, password },
      { redirectTo: redirectUrl }
    );

    if (authError) throw authError;

    const userId = authData.user?.id;
    if (!userId) {
      setMessage("Signup succeeded but user ID not found. Check email confirmation.");
      return;
    }

    // 2️⃣ Insert username and email into users table
    const { error: dbError } = await supabase
      .from("users")
      .upsert([
        {
          id: userId,
          email,
          username,
        },
      ], { onConflict: ["id"] }); // upsert avoids duplicate key error
    if (dbError) throw dbError;

    setMessage("Signup successful! Check your email for confirmation.");
    setEmail("");
    setPassword("");
    setUsername("");

  } catch (err) {
    console.error("Signup error:", err);
    setMessage(`Signup failed: ${err.message}`);
  } finally {
    setLoading(false);
  }
};

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.heading}>
          <img
            src={logo}
            alt="Logo"
            style={{
              width: 70,
              height: 70,
              marginRight: 8,
              verticalAlign: "middle",
              borderRadius: "30%",
              background: "linear-gradient(135deg, #667eea, #764ba2)",
              padding: 5,
            }}
          />
        </h1>

        <p className={styles.subHeading}>Sign up with your email</p>

        <form onSubmit={handleEmailSignup} className={styles.form}>
          <div className={styles.inputWrapper}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={styles.input}
            />
          </div>

          <div className={styles.inputWrapper}>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={`${styles.inputWrapper} ${styles.passwordWrapper}`}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={styles.input}
            />
            <button
              type="button"
              className={styles.passwordToggle}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                Signing Up...
                <span className={styles.spinner}></span>
              </span>
            ) : (
              "Sign Up"
            )}
          </button>
        </form>

        <p className={styles.footerText}>
          Already have an account?{" "}
          <Link to="/login" className={styles.link}>
            Log in
          </Link>
        </p>

        {message && (
          <p className={message.startsWith("Signup successful") ? styles.success : styles.error}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

// https://bestneelansh.github.io/collab/dashboard