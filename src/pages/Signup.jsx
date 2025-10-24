import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import styles from "./Signup.module.css";
import Lottie from "lottie-react";
import logo from "../assets/logo_second.png";
import signupAnimation from "../assets/animations/Signup.json"; // your downloaded Lottie JSON

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
      // Redirect URL
      const redirectUrl = window.location.hostname.includes("localhost")
        ? "http://localhost:5173/profile"
        : "https://bestneelansh.github.io/collab/profile";

      // 1️⃣ Sign up user
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

      // 2️⃣ Insert username + email in DB
      const { error: dbError } = await supabase
        .from("users")
        .upsert([{ id: userId, email, username }], { onConflict: ["id"] });
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
    <div className={styles.mainContainer}>
      {/* LEFT SIDE - Animation */}
      <div className={styles.animationWrapper}>
        <Lottie
          animationData={signupAnimation}
          loop={true}
          autoplay={true}
          style={{ width: "70%", maxWidth: 350 }}
        />
      </div>

      {/* RIGHT SIDE - Signup Card */}
      <div className={styles.card}>
        <h1 className={styles.heading}>
          <img
            src={logo} // import your logo at the top like in login
            alt="Logo"
            className={styles.logoAnimation} // optional animation
            style={{
              width: 130,
              height: 90,
              borderRadius: "30%",
              padding: 5,
            }}
          />
        </h1>

        <h2 className={styles.createAccount}>Create Account</h2>
        <p className={styles.subHeading}>Sign up with your email</p>

        <form onSubmit={handleEmailSignup} className={styles.form}>
          {/* Email */}
          <div className={styles.inputWrapper}>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={styles.input}
              placeholder=" "
            />
            <label htmlFor="email" className={styles.label}>Email</label>
          </div>

          {/* Username */}
          <div className={styles.inputWrapper}>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className={styles.input}
              placeholder=" "
            />
            <label htmlFor="username" className={styles.label}>Username</label>
          </div>

          {/* Password */}
          <div className={`${styles.inputWrapper} ${styles.passwordWrapper}`}>
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={styles.input}
              placeholder=" "
            />
            <label htmlFor="password" className={styles.label}>Password</label>
            <button
              type="button"
              className={styles.passwordToggle}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* Submit Button */}
          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                Signing Up... <span className={styles.spinner}></span>
              </span>
            ) : (
              "Sign Up"
            )}
          </button>
        </form>

        {/* Footer */}
        <p className={styles.signupFooter}>
          Already have an account?
          <Link to="/login" className={styles.link}>
            Log in
          </Link>
        </p>

        {message && (
          <p
            className={
              message.startsWith("Signup successful") ? styles.success : styles.error
            }
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
