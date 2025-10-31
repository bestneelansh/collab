// OrbitStreakModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../supabaseClient";
import styles from "./Copy.module.css";
import { X, CheckCircle2 } from "lucide-react";

/**
 * Dark Premium Glass Orb — dynamic + high-tech
 * - Keeps your Supabase + week-mapping logic intact
 * - New visuals: glass orb, energy halos, particle shimmer
 *
 * Usage:
 * <OrbitStreakModal user={user} onClose={() => setOpen(false)} />
 */

export default function OrbitStreakModal({ user, onClose }) {
  const [alignedDays, setAlignedDays] = useState(new Array(7).fill(false)); // Mon..Sun
  const [loading, setLoading] = useState(true);
  const [isAligning, setIsAligning] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);

  // Monday=0 ... Sunday=6
  const todayIndex = useMemo(() => {
    const d = new Date();
    return (d.getDay() + 6) % 7;
  }, []);

  // stable weekly seed for colors/speeds/phases (keeps look stable across week)
  const weekSeed = useMemo(() => {
    const now = new Date();
    const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((now - firstDayOfYear) / (24 * 60 * 60 * 1000));
    const weekNum = Math.floor((dayOfYear + firstDayOfYear.getDay() + 1) / 7);
    return `${now.getFullYear()}-${weekNum}`;
  }, []);

  // seeded RNG
  const seededRng = (seedString) => {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < seedString.length; i++) {
      h = Math.imul(h ^ seedString.charCodeAt(i), 16777619) >>> 0;
    }
    return () => {
      h = Math.imul(h ^ (h >>> 16), 2246822507) >>> 0;
      h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0;
      const res = (h ^= h >>> 16) >>> 0;
      return res / 2 ** 32;
    };
  };

  // halo colors, speeds, and phase offsets
  const haloColors = useMemo(() => {
    const rand = seededRng(weekSeed + "-halo");
    // cooler bluish with touches of gold
    return Array.from({ length: 7 }).map((_, i) => {
      const baseHue = 215 + Math.floor(rand() * 40); // 215..255
      const shift = i * 8;
      const hue = (baseHue + shift) % 360;
      const sat = 70 + Math.floor(rand() * 8);
      const light = 48 + Math.floor(rand() * 8);
      return `hsl(${hue} ${sat}% ${light}%)`;
    });
  }, [weekSeed]);

  const haloSpeeds = useMemo(() => {
    const rand = seededRng(weekSeed + "-speed");
    return Array.from({ length: 7 }).map((_, i) => {
      // inner faster, outer slower with jitter
      const base = 3.6 + i * 0.9;
      const jitter = rand() * 1.4;
      return Math.max(1.6, Math.round((base + jitter) * 10) / 10);
    });
  }, [weekSeed]);

  const haloPhase = useMemo(() => {
    const rand = seededRng(weekSeed + "-phase");
    return Array.from({ length: 7 }).map(() => Math.floor(rand() * 360));
  }, [weekSeed]);

  // radii (visual only)
  const radii = useMemo(() => [52, 86, 120, 154, 188, 226, 260], []);

  // today's ISO date (browser TZ)
  const todayISO = useMemo(() => {
    return new Date().toLocaleDateString("en-CA", {
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  }, []);

  // fetch user streaks and map to current week
  useEffect(() => {
    let mounted = true;
    const fetchAligned = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("user_streaks")
          .select("date")
          .eq("user_id", user.id);

        if (error) {
          console.error("fetchAligned error:", error);
          if (mounted) setAlignedDays(new Array(7).fill(false));
          return;
        }

        const now = new Date();
        const day = (now.getDay() + 6) % 7; // Mon=0
        const monday = new Date(now);
        monday.setDate(now.getDate() - day);
        const weekDates = Array.from({ length: 7 }).map((_, i) => {
          const d = new Date(monday);
          d.setDate(monday.getDate() + i);
          return d.toLocaleDateString("en-CA");
        });

        const alignedMap = weekDates.map((wd) =>
          data.some((r) => {
            const d = r.date instanceof Date ? r.date.toLocaleDateString("en-CA") : ("" + r.date).split("T")[0];
            return d === wd;
          })
        );

        if (mounted) setAlignedDays(alignedMap);
      } catch (err) {
        console.error("fetchAligned exception:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchAligned();
    return () => {
      mounted = false;
    };
  }, [user]);

  // lock scroll + esc close
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow || "auto";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // align today (optimistic)
  const handleAlignToday = async () => {
    if (!user?.id || alignedDays[todayIndex] || isAligning) return;
    setIsAligning(true);

    setPulseKey((k) => k + 1);
    setAlignedDays((prev) => {
      const copy = [...prev];
      copy[todayIndex] = true;
      return copy;
    });

    try {
      const { error } = await supabase.from("user_streaks").insert([{ user_id: user.id, date: todayISO }]);
      if (error) {
        console.error("Align insert error:", error);
        setAlignedDays((prev) => {
          const copy = [...prev];
          copy[todayIndex] = false;
          return copy;
        });
      } else {
        setPulseKey((k) => k + 1);
      }
    } catch (err) {
      console.error("Align exception:", err);
    } finally {
      setIsAligning(false);
    }
  };

  // streak length (this week local)
  const streakLength = useMemo(() => {
    let streak = 0;
    for (let i = todayIndex; i >= 0; i--) {
      if (alignedDays[i]) streak++;
      else break;
    }
    return streak;
  }, [alignedDays, todayIndex]);

  // utility: convert hsl-like to hex for subtle shadows (used inline)
  function hexify(hsl) {
    try {
      const el = document.createElement("div");
      el.style.color = hsl;
      document.body.appendChild(el);
      const cs = window.getComputedStyle(el).color;
      document.body.removeChild(el);
      const matches = cs.match(/rgba?\((\d+), (\d+), (\d+)(?:, ([0-9.]+))?\)/);
      if (!matches) return "#ffffff";
      const r = parseInt(matches[1]).toString(16).padStart(2, "0");
      const g = parseInt(matches[2]).toString(16).padStart(2, "0");
      const b = parseInt(matches[3]).toString(16).padStart(2, "0");
      return `#${r}${g}${b}`;
    } catch {
      return "#ffffff";
    }
  }

  // Render
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
          transition={{ type: "spring", stiffness: 170, damping: 22 }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <header className={styles.header}>
            <div className={styles.titleWrap}>
              <h2 className={styles.h2}>Streak Orb</h2>
              <p className={styles.sub}>Keep your rhythm — align once per day</p>
            </div>
            <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
              <X />
            </button>
          </header>

          <main className={styles.content}>
            <section className={styles.stage}>
              {/* particle shimmer backdrop */}
              <div className={styles.particles} aria-hidden="true" />

              {/* halos container */}
              <div className={styles.halos}>
                {radii.map((r, idx) => {
                  const aligned = !!alignedDays[idx];
                  const color = haloColors[idx];
                  const speed = haloSpeeds[idx];
                  const phase = haloPhase[idx];
                  const cssVars = {
                    ["--r"]: `${r}px`,
                    ["--halo-color"]: color,
                    ["--halo-speed-s"]: `${speed}s`,
                    ["--halo-phase-deg"]: `${phase}deg`,
                    ["--halo-idx"]: idx,
                  };

                  return (
                    <div
                      key={idx}
                      className={`${styles.halo} ${aligned ? styles.haloActive : styles.haloInactive}`}
                      style={cssVars}
                      aria-hidden="true"
                    >
                      {/* inner subtle ring (svg) */}
                      <svg
                        className={styles.haloRing}
                        viewBox={`0 0 ${r * 2} ${r * 2}`}
                        preserveAspectRatio="xMidYMid meet"
                      >
                        <circle cx={r} cy={r} r={r - 1} className={styles.haloCircle} />
                      </svg>
                      {/* spark segment (glowy) */}
                      <div
                        className={styles.haloGlow}
                        style={{
                          boxShadow: `0 10px 40px ${hexify(color)}22, 0 0 80px ${color}66`,
                          background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9), ${color})`,
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* center glass orb */}
              <motion.div
                key={pulseKey}
                className={styles.orbWrap}
                initial={{ scale: 0.98 }}
                animate={{ scale: [1, 1.04, 1], rotate: [0, 6, 0] }}
                transition={{ duration: 1.4, ease: "easeInOut" }}
              >
                <div className={styles.orbSurface}>
                  <div className={styles.orbCore}>
                    <div className={styles.counter}>
                      <span className={styles.count}>{streakLength}</span>
                      <span className={styles.unit}>days</span>
                    </div>
                    <div className={styles.subStat}>
                      <span>{alignedDays.filter(Boolean).length} aligned • {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][todayIndex]}</span>
                    </div>
                  </div>

                  {/* rim glare */}
                  <div className={styles.rim} aria-hidden="true" />
                </div>
              </motion.div>
            </section>

            <aside className={styles.panel}>
              <p className={styles.hint}>
                Daily halos charge when aligned — each halo pulses and spins faster as you progress.
              </p>

              <div className={styles.controls}>
                <button
                  className={styles.alignBtn}
                  onClick={handleAlignToday}
                  disabled={alignedDays[todayIndex] || loading || isAligning}
                >
                  {alignedDays[todayIndex] ? (
                    <>
                      <CheckCircle2 size={16} /> Aligned Today
                    </>
                  ) : isAligning ? "Aligning…" : "Align Today"}
                </button>

                <button className={styles.secondary} onClick={() => {
                  // small convenience: reset optimistic pulse if needed
                  setPulseKey((k) => k + 1);
                }}>
                  Refresh
                </button>
              </div>
            </aside>
          </main>

          <footer className={styles.footer}>
            <small className={styles.footerNote}>Pro tip: align consistently for a radiant full halo.</small>
          </footer>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
