import { useEffect, useState,useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import styles from "./Welcome.module.css";
import logo from "../assets/logo_second.png";

const fonts = [
  "Poppins",
  "Orbitron",
  "Monoton",
  "Russo One",
  "Bebas Neue",
  "Lobster",
  "Roboto Mono",
  "Fugaz One",
  "Pacifico",
  "Fredoka One",
  "Press Start 2P",
  "Cairo",
  "Anton",
  "Righteous",
  "Baloo 2",
  "Chewy",
  "Bangers",
  "Permanent Marker",
  "Rock Salt",
  "Concert One",
  "Gloria Hallelujah"
];


export default function Welcome() {
  const navigate = useNavigate();
  const headingText = "Collatz";
  const chars = headingText.split("");
  const [charFonts, setCharFonts] = useState(Array(chars.length).fill("Poppins"));

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) navigate("/dashboard", { replace: true });
    };
    checkSession();
  }, [navigate]);

  return (
    <div className={styles.container}>
      <nav className={styles.navbar}>
        <Link to="/Hackathons" className={styles.navLink}>Hackathons</Link>
        <Link to="/Projects" className={styles.navLink}>Projects</Link>
        <Link to="/Jobs" className={styles.navLink}>Jobs</Link>
        <Link to="/Community" className={styles.navLink}>Community</Link>
      </nav>

      <div className={styles.hero}>
        <img src={logo} alt="StudentHub Logo" className={styles.logo} />
        <h1 className={styles.heading}>
          {chars.map((char, idx) => (
            <span
              key={idx}
              style={{ fontFamily: charFonts[idx] }}
              onMouseEnter={() => {
                setCharFonts(prev => {
                  const copy = [...prev];
                  let nextFont;
                  do {
                    nextFont = fonts[Math.floor(Math.random() * fonts.length)];
                  } while (nextFont === copy[idx]); // ensure different from current
                  copy[idx] = nextFont;
                  return copy;
                });
              }}
            >
              {char}
            </span>
          ))}
        </h1>

        <p className={styles.subHeading}>
          Collaborate with fellow students on projects, hackathons, and placements
        </p>

        <div className={styles.buttonGroup}>
          <button
            className={`${styles.button} ${styles.loginButton}`}
            onClick={() => navigate("/login")}
          >
            Login
          </button>
          <button
            className={`${styles.button} ${styles.signupButton}`}
            onClick={() => navigate("/signup")}
          >
            Sign Up
          </button>
        </div>
      </div>
    </div>
  );
}
