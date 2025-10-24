import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate, Link } from "react-router-dom";
import styles from "./Auth.module.css";
import logo from "../assets/login.png";
import { Eye, EyeOff } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) navigate("/dashboard");
    });
  }, [navigate]);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) {
        setMessage("Invalid login credentials.");
        return;
      }

      const user = loginData.user;

      if (!user.email_confirmed_at) {
        setMessage("Please confirm your email before logging in.");
        return;
      }

      const { data: dbUser, error: dbUserError } = await supabase
        .from("users")
        .select("id")
        .eq("id", user.id)
        .single();

      if (dbUserError || !dbUser) {
        setMessage("User data not found. Please sign up.");
        return;
      }

      navigate("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setMessage(`Login failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setMessage("Enter your email to reset password.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "http://localhost:5173/login",
    });
    if (error) setMessage(`Error sending reset email: ${error.message}`);
    else setMessage("Password reset email sent! Check your inbox.");
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

        <p className={styles.subHeading}>Log in with your email</p>

        <form onSubmit={handleEmailLogin} className={styles.form}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={styles.input}
          />

          <div className={styles.passwordWrapper}>
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
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                Logging In...
                <span className={styles.spinner}></span>
              </span>
            ) : (
              "Log In"
            )}
          </button>

          {message && (
            <p className={message.includes("sent") ? styles.success : styles.error}>
              {message}
            </p>
          )}

          <div className={styles.extraOptions}>
            <button
              type="button"
              onClick={handleForgotPassword}
              className={styles.forgotPassword}
            >
              Forgot password?
            </button>
          </div>
        </form>

        {/* Centered signup link */}
        <div className={styles.signupFooter}>
          Don’t have an account?{" "}
          <Link to="/signup" className={styles.link}>
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
