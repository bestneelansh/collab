import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function ProfileHelper({ profile, onComplete }) {
  const [step, setStep] = useState(0); // 0=username, 1=college, 2=branch, 3=year

  const steps = [
    { field: "username", label: "Enter a username" },
    { field: "college", label: "Select your college" },
    { field: "branch", label: "Select your branch" },
    { field: "year", label: "Select your year" },
  ];

  useEffect(() => {
    // auto-advance to next step if current field is already filled
    const nextStep = steps.findIndex(s => !profile[s.field] || profile[s.field].trim() === "");
    if (nextStep !== -1) setStep(nextStep);
    else onComplete(); // all done → hide helper
  }, [profile]);

  const current = steps[step];

  if (!current) return null;

  // calculate field position for tooltip
  const el = document.getElementById(`profile-${current.field}`);
  if (!el) return null;
  const rect = el.getBoundingClientRect();

  return (
    <div
      style={{
        position: "fixed",
        top: rect.top + window.scrollY - 60,
        left: rect.left + window.scrollX,
        zIndex: 9999,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          background: "#4f46e5",
          color: "#fff",
          padding: "6px 12px",
          borderRadius: 6,
          fontSize: 14,
          fontWeight: 500,
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        }}
      >
        {current.label}
      </motion.div>

      {/* arrow pointing down */}
      <motion.div
        initial={{ y: -5 }}
        animate={{ y: 0 }}
        transition={{ repeat: Infinity, repeatType: "mirror", duration: 0.6 }}
        style={{
          width: 0,
          height: 0,
          borderLeft: "6px solid transparent",
          borderRight: "6px solid transparent",
          borderTop: "10px solid #4f46e5",
          margin: "0 auto",
        }}
      />
    </div>
  );
}
