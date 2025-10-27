import { useEffect, useState, useRef} from "react";
import { supabase } from "../supabaseClient";
import { useNavigate, Link } from "react-router-dom";
import styles from "./Login.module.css";
import logo from "../assets/logo_second.png";
import Lottie from "lottie-react";
import loginAnimation from "../assets/animations/Login_second.json";
import { Eye, EyeOff } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const animationRef = useRef();

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
      const redirectUrl = window.location.hostname.includes("localhost")
        ? "http://localhost:5173/dashboard"
        : "https://bestneelansh.github.io/collab/dashboard";

      const { data: loginData, error: loginError } =
        await supabase.auth.signInWithPassword(
          { email, password },
          { redirectTo: redirectUrl }
        );

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

    const redirectUrl = window.location.hostname.includes("localhost")
      ? "http://localhost:5173/login"
      : "https://bestneelansh.github.io/collab/login";

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) setMessage(`Error sending reset email: ${error.message}`);
    else setMessage("Password reset email sent! Check your inbox.");
  };

  return (
    <div className={styles.mainContainer}>
      {/* LEFT SIDE - Animation */}
      <div className={styles.animationWrapper}>
        <Lottie
          animationData={loginAnimation}
          loop={true}
          autoplay={true}
          style={{ width: 500, height: 500, margin: "0 auto" }}
          rendererSettings={{
            preserveAspectRatio: "xMidYMid slice",
          }}
        />
      </div>

      {/* RIGHT SIDE - Login Card */}
      <div className={styles.card}>
        <h1 className={styles.heading}>
          <img
            src={logo}
            alt="Logo"
            className={styles.logoAnimation} // <-- add this
            style={{
              width: 130,
              height: 90,
              marginRight: 8,
              verticalAlign: "middle",
              borderRadius: "30%",
              padding: 5,
            }}
          />
        </h1>
        <h2 className={styles.welcomeBack}>Welcome Back</h2>
        <p className={styles.subHeading}>Log in with your email</p>

        <form onSubmit={handleEmailLogin} className={styles.form}>
        <div className={styles.inputWrapper}>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={styles.input}
            placeholder=" " // keep a space for CSS :placeholder-shown trick
          />
          <label htmlFor="email" className={styles.label}>Email</label>
        </div>


          <div className={styles.passwordWrapper}>
            <div className={styles.inputWrapper}>
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
            </div>
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
