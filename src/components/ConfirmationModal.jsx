import React from "react";
import styles from "./ConfirmationModal.module.css";

export default function ConfirmationModal({ 
  isOpen, 
  message = "Are you sure?", 
  onConfirm, 
  onCancel 
}) {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <p className={styles.message}>{message}</p>
        <div className={styles.buttons}>
          <button className={`${styles.btn} ${styles.cancel}`} onClick={onCancel}>
            Cancel
          </button>
          <button className={`${styles.btn} ${styles.confirm}`} onClick={onConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
