import { useEffect, useState } from "react";
import styles from "./MessageCard.module.css";

export default function ToastCard({ message, duration = 3000, onClose }) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(interval);
          onClose();
          return 0;
        }
        return prev - 100 / (duration / 50); // update every 50ms
      });
    }, 50);

    return () => clearInterval(interval);
  }, [duration, onClose]);

  return (
    <div className={styles.toast}>
      <span>{message}</span>
      <div className={styles.progress} style={{ width: `${progress}%` }}></div>
    </div>
  );
}
