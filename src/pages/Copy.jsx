// OrbitStreakModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../supabaseClient";
import styles from "./Copy.module.css";
import { X, CheckCircle2 } from "lucide-react";

/**
 * Usage:
 * <OrbitStreakModal user={user} onClose={() => setOpen(false)} />
 *
 * Assumes supabase table `user_streaks` with { user_id, date (YYYY-MM-DD) }.
 */

export default function OrbitStreakModal({ user, onClose }) {
  const [alignedDays, setAlignedDays] = useState([false, false, false, false, false, false, false]); // Mon..Sun
  const [loading, setLoading] = useState(true);
  const [isAligning, setIsAligning] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);

  // today index: Monday === 0, ... Sunday === 6
  const todayIndex = useMemo(() => {
    const d = new Date();
    return (d.getDay() + 6) % 7;
  }, []);

  // produce a stable "random" color palette per week so colors change weekly but consistent during week
  const weekSeed = useMemo(() => {
    const now = new Date();
    // get ISO week number-ish seed (year + week-of-year)
    const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((now - firstDayOfYear) / (24 * 60 * 60 * 1000));
    const weekNum = Math.floor((dayOfYear + firstDayOfYear.getDay() + 1) / 7);
    return `${now.getFullYear()}-${weekNum}`;
  }, []);

  const colors = useMemo(() => {
    // deterministic pseudo-random generator based on seed
    let h = 0;
    for (let i = 0; i < weekSeed.length; i++) h = (h * 31 + weekSeed.charCodeAt(i)) >>> 0;
    const rand = () => { h = (h * 1664525 + 1013904223) >>> 0; return h / 2 ** 32; };

    return Array.from({ length: 7 }).map(() => {
      const hue = Math.floor(rand() * 360);
      const sat = 68 + Math.floor(rand() * 12);
      const light = 48 + Math.floor(rand() * 6);
      return `hsl(${hue} ${sat}% ${light}%)`;
    });
  }, [weekSeed]);

  // random rotation speeds (seconds) for each planet when they are aligned
  const speeds = useMemo(() => {
    // speeds between 8s and 18s, varied per planet deterministically
    let h = 0;
    for (let i = 0; i < weekSeed.length; i++) h = (h * 31 + weekSeed.charCodeAt(i)) >>> 0;
    const rand = () => { h = (h * 1664525 + 1013904223) >>> 0; return h / 2 ** 32; };
    return Array.from({ length: 7 }).map(() => 8 + Math.floor(rand() * 11));
  }, [weekSeed]);

  // local-date today in YYYY-MM-DD consistent with browser timezone
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  // fetch aligned days from Supabase (dates -> Mon..Sun booleans for current week)
  useEffect(() => {
    const fetchAligned = async () => {
      if (!user?.id) { setLoading(false); return; }
      setLoading(true);

      try {
        const { data, error } = await supabase
          .from("user_streaks")
          .select("date")
          .eq("user_id", user.id);

        if (error) {
          console.error("fetchAligned error:", error);
          setAlignedDays([false, false, false, false, false, false, false]);
          setLoading(false);
          return;
        }

        // Map the returned dates to the current week (Mon..Sun)
        // Build weekStart (Monday) and list of ISO dates for the week
        const now = new Date();
        const day = (now.getDay() + 6) % 7; // Mon=0
        const monday = new Date(now);
        monday.setDate(now.getDate() - day);

        const weekDates = Array.from({ length: 7 }).map((_, i) => {
          const d = new Date(monday);
          d.setDate(monday.getDate() + i);
          return d.toLocaleDateString("en-CA");
        });

        const alignedMap = weekDates.map((wd) => data.some((r) => r.date === wd));
        setAlignedDays(alignedMap);
      } catch (err) {
        console.error("fetchAligned exception:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAligned();
  }, [user]);

  // lock background scroll + ESC close
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "auto";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const handleAlignToday = async () => {
    if (!user?.id || alignedDays[todayIndex] || isAligning) return;
    setIsAligning(true);

    // optimistic UI: pulse center + visually enable the planet immediately
    setPulseKey((k) => k + 1);
    setAlignedDays((prev) => {
      const next = [...prev];
      next[todayIndex] = true;
      return next;
    });

    // insert into Supabase (local date)
    try {
      const { error } = await supabase.from("user_streaks").insert([{ user_id: user.id, date: today }]);
      if (error) {
        console.error("Align insert error:", error);
        // rollback optimistic update on failure
        setAlignedDays((prev) => {
          const next = [...prev];
          next[todayIndex] = false;
          return next;
        });
      } else {
        // success: trigger mild center pulse and speed-up wave effect (handled by CSS/Framer via pulseKey)
        setPulseKey((k) => k + 1);
      }
    } catch (err) {
      console.error("Align exception:", err);
    } finally {
      setIsAligning(false);
    }
  };

  // radii for 7 orbits (percent or px) - inner to outer
  const radii = [48, 72, 96, 120, 146, 176, 210]; // px distances from center on our fixed visual container

  // render
  return (
    <AnimatePresence>
      <motion.div
        className={styles.backdrop}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className={styles.modal}
          initial={{ scale: 0.98, y: 24, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.98, y: 24, opacity: 0 }}
          transition={{ type: "spring", stiffness: 180, damping: 20 }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <header className={styles.header}>
            <div>
              <h2 className={styles.h2}>Orbit Streak — This Week</h2>
              <p className={styles.sub}>Align your orbit once per day to keep momentum</p>
            </div>
            <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
              <X />
            </button>
          </header>

          <main className={styles.content}>
            <section className={styles.visualArea}>
              <div className={styles.centerArea}>
                {/* pulsating center bubble; pulseKey changes to retrigger animation */}
                <motion.div
                  key={pulseKey}
                  initial={{ scale: 0.94, opacity: 0.95 }}
                  animate={{ scale: [1, 1.06, 1], opacity: [1, 0.9, 1] }}
                  transition={{ duration: 1.1 }}
                  className={styles.centerCore}
                >
                  <div className={styles.coreGlow} />
                  <div className={styles.coreLabel}>
                    <strong>{alignedDays.filter(Boolean).length}</strong>
                    <span>days</span>
                  </div>
                </motion.div>

                {/* orbits and planets */}
                <div className={styles.orbitContainer}>
                  {radii.map((r, idx) => {
                    const aligned = alignedDays[idx];
                    const color = colors[idx];
                    const speed = speeds[idx];
                    // inline style variables for radius, color, and speed
                    const cssVars = {
                      ["--orbit-radius-px"]: `${r}px`,
                      ["--planet-color"]: color,
                      ["--orbit-speed-s"]: `${speed}s`,
                      ["--planet-index"]: idx,
                    };
                    return (
                      <div
                        key={idx}
                        className={styles.orbitWrap}
                        style={cssVars}
                        aria-hidden="true"
                      >
                        {/* ring */}
                        <svg className={styles.ringSvg} viewBox="0 0 1 1" preserveAspectRatio="none">
                          <circle cx="0.5" cy="0.5" r="0.45" className={styles.ringSvgCircle} />
                        </svg>

                        {/* orbiting wrapper: rotates when aligned */}
                        <div
                          className={`${styles.orbiting} ${aligned ? styles.orbitingActive : ""}`}
                          style={aligned ? { animationDuration: `${speed}s` } : {}}
                        >
                          {/* planet positioned to the right of center; orbiting wrapper rotates, carrying the planet */}
                          <div
                            className={`${styles.planet} ${aligned ? styles.planetActive : styles.planetInactive}`}
                            style={{
                              background: color,
                              boxShadow: `0 8px 20px ${hexify(color)}33`,
                            }}
                            title={`Day ${idx + 1} — ${aligned ? "Aligned" : "Not aligned"}`}
                          >
                            <span className={styles.planetCore} />
                          </div>

                          {/* comet tail overlay for aligned planets */}
                          <div
                            className={`${styles.tail} ${aligned ? styles.tailActive : ""}`}
                            style={{ background: `linear-gradient(90deg, ${color} 0%, rgba(255,255,255,0) 60%)` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* side/ui */}
              <aside className={styles.sidePanel}>
                <div className={styles.statsRow}>
                  <div>
                    <p className={styles.statLabel}>Aligned</p>
                    <p className={styles.statValue}>{alignedDays.filter(Boolean).length}</p>
                  </div>
                  <div>
                    <p className={styles.statLabel}>Today</p>
                    <p className={styles.statValue}>{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][todayIndex]}</p>
                  </div>
                </div>

                <p className={styles.hint}>Aligned planets rotate with a faint comet trail. Click to align today's planet.</p>

                <button
                  className={styles.alignBtn}
                  onClick={handleAlignToday}
                  disabled={alignedDays[todayIndex] || loading || isAligning}
                >
                  {alignedDays[todayIndex] ? (
                    <>
                      <CheckCircle2 size={16} /> Aligned for Today
                    </>
                  ) : isAligning ? "Aligning…" : "Align Today"}
                </button>
              </aside>
            </section>
          </main>

          <footer className={styles.footer}>
            <small className={styles.footerNote}>Tip: Keep the week aligned to form a full constellation.</small>
          </footer>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function hexify(hsl) {
  try {
    // Create temporary element to compute color
    const el = document.createElement("div");
    el.style.color = hsl;
    document.body.appendChild(el);
    const cs = window.getComputedStyle(el).color; // rgb(r, g, b)
    document.body.removeChild(el);
    const matches = cs.match(/rgba?\((\d+), (\d+), (\d+)(?:, ([0-9.]+))?\)/);
    if (!matches) return "rgba(255,255,255,0.12)";
    const r = parseInt(matches[1]).toString(16).padStart(2, "0");
    const g = parseInt(matches[2]).toString(16).padStart(2, "0");
    const b = parseInt(matches[3]).toString(16).padStart(2, "0");
    return `#${r}${g}${b}`;
  } catch {
    return "rgba(255,255,255,0.12)";
  }
}
