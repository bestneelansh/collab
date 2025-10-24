import React from "react";
import styles from "./ui.module.css";

export function PrimaryButton({ children, onClick }) {
  return (
    <button className={styles.primaryButton} onClick={onClick}>
      {children}
    </button>
  );
}

export function SecondaryButton({ children, onClick }) {
  return (
    <button className={styles.secondaryButton} onClick={onClick}>
      {children}
    </button>
  );
}
