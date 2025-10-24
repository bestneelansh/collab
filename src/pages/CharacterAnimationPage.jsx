import React, { useState } from "react";
import { motion } from "framer-motion";

// Body SVGs
import Body1 from "../assets/animations/LoginSetup/Body1.svg";
import Body2 from "../assets/animations/LoginSetup/Body2.svg";
import Body3 from "../assets/animations/LoginSetup/Body3.svg";
import Body4 from "../assets/animations/LoginSetup/Body4.svg";

// Eye SVGs
import Eye1 from "../assets/animations/LoginSetup/EyeBody1.svg";
import Eye2 from "../assets/animations/LoginSetup/EyeBody2.svg";
import Eye3 from "../assets/animations/LoginSetup/EyeBody3.svg";
import Eye4 from "../assets/animations/LoginSetup/EyeBody4.svg";

// Mouth SVGs
import Mouth1 from "../assets/animations/LoginSetup/MouthBody1.svg";
import Mouth2 from "../assets/animations/LoginSetup/MouthBody2.svg";
import Mouth4 from "../assets/animations/LoginSetup/MouthBody4.svg";

// Character Component
const Character = ({
  body,
  eye,
  mouth,
  isTyping,
  bodySize=120,
  style,
  eyePos,
  eyeSize = "60%",
  mouthPos,
  mouthSize = "50%",
  bodyHeight=100
}) => {
  const pupilMovement = isTyping
    ? { x: [-2, 2, -2], y: [-1, 1, -1] }
    : { x: 0, y: 0 };

  return (
    <div style={{ position: "relative", height: bodyHeight,width: bodySize, ...style }}>
      {/* Body */}
      <motion.img
        src={body}
        alt="Body"
        style={{ width: "100%"}}
        animate={{ rotate: isTyping ? [0, -10, 10, -10, 0] : 0 }}
        transition={{ duration: 0.6, repeat: isTyping ? Infinity : 0 }}
      />

      {/* Eyes */}
      <motion.img
        src={eye}
        alt="Eyes"
        style={{
          position: "absolute",
          width: eyeSize,
          top: eyePos?.top || 20,
          left: eyePos?.left || 20,
        }}
        animate={pupilMovement}
        transition={{ duration: 0.5, repeat: isTyping ? Infinity : 0 }}
      />

      {/* Mouth */}
      {mouth && (
        <motion.img
          src={mouth}
          alt="Mouth"
          style={{
            position: "absolute",
            width: mouthSize,
            top: mouthPos?.top || 60,
            left: mouthPos?.left || 25,
          }}
          animate={{ y: isTyping ? [-1, 1, -1] : 0 }}
          transition={{ duration: 0.5, repeat: isTyping ? Infinity : 0 }}
        />
      )}
    </div>
  );
};

export default function CharacterAnimationPage() {
  const [isTyping, setIsTyping] = useState(false);

  const handleTyping = () => {
    setIsTyping(true);
    clearTimeout(window.typingTimeout);
    window.typingTimeout = setTimeout(() => setIsTyping(false), 800);
  };

  return (
    <div
      style={{
        backgroundColor: "#1e1e1e",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <input
        type="text"
        placeholder="Type here..."
        onChange={handleTyping}
        style={{
          padding: "0.6rem 1rem",
          marginBottom: "2rem",
          fontSize: "1rem",
          borderRadius: "8px",
          border: "1px solid #444",
          background: "#2a2a2a",
          color: "#fff",
        }}
      />

      {/* Layout Container */}
      <div style={{ position: "relative", width: 400, height: 250 }}>
        {/* Back Row */}
        <Character
          body={Body2}
          eye={Eye2}
          mouth={Mouth2}
          isTyping={isTyping}
          eyeSize="55%"
          eyePos={{ top: 20, left: 25 }}
          mouthSize="45%"
          mouthPos={{ top: 60, left: 30 }}
          style={{
            position: "absolute",
            top: 20,
            left: 60,
            zIndex: 1,
          }}
        />
        <Character
          body={Body3}
          eye={Eye3}
          mouth={Mouth4}
          isTyping={isTyping}
          eyeSize="50%"
          eyePos={{ top: 25, left: 30 }}
          mouthSize="40%"
          mouthPos={{ top: 70, left: 30 }}
          style={{
            position: "absolute",
            top: 40,
            left: 160,
            zIndex: 1,
          }}
        />
        <Character
          body={Body4}
          eye={Eye4}
          mouth={Mouth4}
          isTyping={isTyping}
          eyeSize="50%"
          eyePos={{ top: 25, left: 25 }}
          mouthSize="40%"
          mouthPos={{ top: 75, left: 30 }}
          style={{
            position: "absolute",
            top: 50,
            left: 260,
            zIndex: 1,
          }}
        />

        {/* Front (Orange) */}
        <Character
          body={Body1}
          eye={Eye1}
          mouth={Mouth1}
          isTyping={isTyping}
          eyeSize="20%"
          eyePos={{ top: 30, left: 120 }}
          bodySize={260}
          mouthSize="10%"
          mouthPos={{ top: 50, left: 135 }}
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            zIndex: 2,
            top:200,
          }}
        />
      </div>
    </div>
  );
}
