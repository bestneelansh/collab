import React from "react";
import styles from "./Loader.module.css";

export default function Loader({ fullScreen = true }) {
  return (
    <div
      className={`${styles.loaderContainer} ${
        fullScreen ? styles.fullScreen : ""
      }`}
    >
      <div className={styles.spinner}></div>
      <div className={styles.dots}>
        <span></span>
        <span></span>
        <span></span>
      </div>
      <p className={styles.loadingText}>Loading...</p>
    </div>
  );
}
