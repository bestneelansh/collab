import React, { useState } from "react";
import { motion } from "framer-motion";

// Body SVGs
import Body1 from "../assets/Animation/LoginSetup/Body1.svg";
import Body2 from "../assets/Animation/LoginSetup/Body2.svg";
import Body3 from "../assets/Animation/LoginSetup/Body3.svg";
import Body4 from "../assets/Animation/LoginSetup/Body4.svg";

// Eye SVGs
import Eye1 from "../assets/Animation/LoginSetup/EyeBody1.svg";
import Eye2 from "../assets/Animation/LoginSetup/EyeBody2.svg";
import Eye3 from "../assets/Animation/LoginSetup/EyeBody3.svg";
import Eye4 from "../assets/Animation/LoginSetup/EyeBody4.svg";

// Mouth SVGs
import Mouth1 from "../assets/Animation/LoginSetup/MouthBody1.svg";
import Mouth2 from "../assets/Animation/LoginSetup/MouthBody2.svg"; 
import Mouth4 from "../assets/Animation/LoginSetup/MouthBody4.svg";

// Character Component
const Character = ({ body, eye, mouth, isTyping, style }) => {
  const pupilMovement = isTyping
    ? { x: [-2, 2, -2], y: [-1, 1, -1] }
    : { x: 0, y: 0 };

  return (
    <div style={{ position: "relative", width: 120, ...style }}>
      {/* Body/Head */}
      <motion.img
        src={body}
        alt="Body"
        style={{ width: "100%" }}
        animate={{ rotate: isTyping ? [0, -10, 10, -10, 0] : 0 }}
        transition={{ duration: 0.6, repeat: isTyping ? Infinity : 0 }}
      />

      {/* Eyes */}
      <motion.img
        src={eye}
        alt="Eyes"
        style={{ position: "absolute", top: 20, left: 20, width: "60%" }}
        animate={pupilMovement}
        transition={{ duration: 0.5, repeat: isTyping ? Infinity : 0 }}
      />

      {/* Mouth */}
      {mouth && (
        <motion.img
          src={mouth}
          alt="Mouth"
          style={{ position: "absolute", top: 60, left: 25, width: "50%" }}
          animate={{ y: isTyping ? [-1, 1, -1] : 0 }}
          transition={{ duration: 0.5, repeat: isTyping ? Infinity : 0 }}
        />
      )}
    </div>
  );
};

export default function CharacterAnimationPage() {
  const [isTyping, setIsTyping] = useState(false);

  const handleTyping = (e) => {
    setIsTyping(true);
    clearTimeout(window.typingTimeout);
    window.typingTimeout = setTimeout(() => setIsTyping(false), 800);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "2rem",
        padding: "2rem",
      }}
    >
      <h2>Character Animation Test</h2>

      {/* Typing Input */}
      <input
        type="text"
        placeholder="Type here..."
        onChange={handleTyping}
        style={{ padding: "0.5rem 1rem", fontSize: "1rem" }}
      />

      {/* Characters Row */}
      <div style={{ display: "flex", gap: "20px" }}>
        <Character body={Body1} eye={Eye1} mouth={Mouth1} isTyping={isTyping} />
        <Character body={Body2} eye={Eye2} mouth={Mouth2} isTyping={isTyping} />
        <Character body={Body3} eye={Eye3} mouth={Mouth4} isTyping={isTyping} />
        <Character body={Body4} eye={Eye4} mouth={Mouth4} isTyping={isTyping} />
      </div>
    </div>
  );
}
