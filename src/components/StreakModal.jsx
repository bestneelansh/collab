import { useState, useEffect } from "react";
import Lottie from "lottie-react";
import { supabase } from "../supabaseClient";
import FireIdle from "../assets/animations/ChineseDragon.json";
import FireSuccess from "../assets/animations/Success.json";
import FireChecked from "../assets/animations/happyDragon.json";
import styles from "./StreakModal.module.css";
import current from "../assets/animations/fire.json";
import trophy from "../assets/animations/Trophy.json";
import { X, Flame, Trophy, CheckCircle2 } from "lucide-react";

export default function StreakModal({ onClose, user }) {
  const [checkedDates, setCheckedDates] = useState([]);
  const [todayChecked, setTodayChecked] = useState(false);
  const [animationState, setAnimationState] = useState("idle"); // "idle", "success", "checked"
  const [isFeeding, setIsFeeding] = useState(false);
  const [loading, setLoading] = useState(true);

  const today = new Date().toLocaleDateString("en-CA", { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
  const currentMonth = new Date().toLocaleString("default", { month: "long" });
  const daysInMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    0
  ).getDate();

  // 🔒 Disable background scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = "auto");
  }, []);

  // ⎋ ESC closes modal
  useEffect(() => {
    const handleEsc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // 📦 Fetch streak data
  useEffect(() => {
    const fetchStreaks = async () => {
      if (!user?.id) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("user_streaks")
        .select("date")
        .eq("user_id", user.id)
        .order("date", { ascending: true });

      if (error) console.error("Error fetching streaks:", error);
      else {
        const dates = data.map((d) => d.date);
        setCheckedDates(dates);
        if (dates.includes(today)) {
          setTodayChecked(true);
          setAnimationState("checked");
        }
      }
      setLoading(false);
    };
    fetchStreaks();
  }, [user]);

  // 🧮 Calculate current streak
  const calculateStreak = (dates) => {
    if (!dates.length) return 0;
    const sorted = [...dates].sort((a, b) => new Date(b) - new Date(a));
    let streak = 0;
    let currentDate = new Date();

    for (const d of sorted) {
      const diff = (currentDate - new Date(d)) / (1000 * 60 * 60 * 24);
      if (diff < 1.5) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else if (diff < 2.5) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else break;
    }
    return streak;
  };

  const streak = calculateStreak(checkedDates);
  const bestStreak = calculateBestStreak(checkedDates);

  // 🟢 Handle Check-in
  const handleCheckIn = async () => {
    if (!user?.id || todayChecked) return;

    setIsFeeding(true); // 🧡 Start feeding state
    setAnimationState("success"); // 🐉 Play feeding animation

    const { error } = await supabase.from("user_streaks").insert([
      {
        user_id: user.id,
        date: today,
      },
    ]);

    if (error) {
      console.error("Check-in failed:", error);
      setIsFeeding(false);
      return;
    }

    setCheckedDates([...checkedDates, today]);
    setTodayChecked(true);

    // Wait for 2s while feeding animation plays
    setTimeout(() => {
      setAnimationState("checked"); // ✅ Switch to "fed" state
      setIsFeeding(false);
    }, 2000);
  };


  // 🎞 Choose correct animation
  const currentAnimation =
    animationState === "success"
      ? FireSuccess
      : animationState === "checked"
      ? FireChecked
      : FireIdle;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
        <div className={styles.headerLeft}>
          <Flame size={22} color="#ff4d4d" className={styles.headerIcon} />
          <h3>{currentMonth} Check-In Streak</h3>
        </div>
        <X className={styles.closeIcon} onClick={onClose} />
      </div>

      {/* Dragon Message (Above Animation) */}
        <PopText
          text={
            animationState === "idle"
              ? "Feed the dragon — he’s hungry !!"
              : isFeeding
              ? "Feeding the dragon… uhm, he’s happy now !!"
              : "The dragon is fed for today — don’t forget to feed him tomorrow !!"
          }
          mood={
            animationState === "idle"
              ? "hungry"
              : isFeeding
              ? "feeding"
              : "happy"
          }
        />

      {/* Animation */}
      <div>
        <Lottie 
          animationData={currentAnimation} 
          loop={animationState === "checked"} 
          autoPlay
        />
      </div>

        {/* Stats */}
      <div className={styles.statsRow}>
          <div className={styles.statBox}>
            <Lottie 
              animationData={current} 
              autoplay
              style={{height:"50px"}}
            />
            <div>
              <span className={styles.statLabel}>Current</span>
              <span className={styles.statValue}>{streak} days</span>
            </div>
          </div>
          <div className={styles.statBox}>
            <Lottie 
              animationData={trophy}
              autoplay
              style={{height:"50px"}}
            />
            <div>
              <span className={styles.statLabel}>Best</span>
              <span className={styles.statValue}>{bestStreak} days</span>
            </div>
          </div>
      </div>

        {/* Calendar Grid */}
        <div className={styles.streakGrid}>
          {[...Array(daysInMonth)].map((_, i) => {
            const date = `2025-10-${String(i + 1).padStart(2, "0")}`;
            const checked = checkedDates.includes(date);
            return (
              <div
                key={i}
                className={`${styles.streakDay} ${checked ? styles.checkedDay : ""}`}
              >
                {i + 1}
              </div>
            );
          })}
        </div>

        {/* Button */}
        <button className={styles.checkInBtn} disabled={todayChecked} onClick={handleCheckIn}>
          {todayChecked ? (
            <>
              <CheckCircle2 size={18} style={{ marginRight: "6px" }} />
              Checked In
            </>
          ) : (
            "Check In for Today"
          )}
        </button>
      </div>
    </div>
  );
}

function calculateBestStreak(dates) {
  if (!dates.length) return 0;

  const sorted = [...dates].sort((a, b) => new Date(a) - new Date(b));
  let best = 1;
  let current = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diffDays = (curr - prev) / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      current++;
      best = Math.max(best, current);
    } else {
      current = 1;
    }
  }
  return best;
}

// ...existing code...
function PopText({ text, mood = "neutral" }) {
  // restart animation on text change
  const [seed, setSeed] = useState(0);
  useEffect(() => setSeed((s) => s + 1), [text]);

  const charDelay = 10; // ms between characters
  const wordGap = 200; // ms gap between words
  let acc = 0; // accumulated delay (ms)

  return (
    <p key={seed} className={`${styles.popText} ${styles[mood]}`} aria-live="polite">
      {text.split(" ").map((word, wi) => {
        const wordKey = `w-${wi}-${seed}`;
        const chars = word.split("");
        const charNodes = chars.map((ch, ci) => {
          const delay = acc;
          acc += charDelay;
          return (
            <span
              key={`c-${wi}-${ci}-${seed}`}
              className={styles.char}
              style={{ animationDelay: `${delay}ms` }}
            >
              {ch}
            </span>
          );
        });

        // after finishing the word add the word gap
        acc += wordGap;

        return (
          <span key={wordKey} className={styles.word}>
            {charNodes}
            {/* preserve space between words */}
            <span className={styles.wordSpace} aria-hidden="true">
              &nbsp;
            </span>
          </span>
        );
      })}
    </p>
  );
}




