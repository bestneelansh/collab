import styles from "./LoginPrompt.module.css";

export default function LoginPrompt({ onClose, onRedirect }) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>Account Required</h2>
        <p className={styles.message}>
          You need an account to continue.  
          Already have one? Please log in.  
          Otherwise, sign up to get started 🚀
        </p>

        <div className={styles.actions}>
          <button
            className={`${styles.button} ${styles.loginBtn}`}
            onClick={() => {
              onClose();      // close the prompt
              onRedirect();   // redirect to login with current page
            }}
          >
            Login
          </button>
          <button
            className={`${styles.button} ${styles.signupBtn}`}
            onClick={() => {
              onClose();
              onRedirect();   // redirect to signup with current page
            }}
          >
            Sign Up
          </button>
        </div>

        <button className={styles.closeBtn} onClick={onClose}>✖</button>
      </div>
    </div>
  );
}
