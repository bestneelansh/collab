import React from "react";
import styles from "./ui.module.css";

export function Card({ children, className = "" }) {
  return <div className={`${styles.card} ${className}`}>{children}</div>;
}

export function CardContent({ children, className = "" }) {
  return <div className={`${styles.cardContent} ${className}`}>{children}</div>;
}
