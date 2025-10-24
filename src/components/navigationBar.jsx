import { Link, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
import styles from "./navigationBar.module.css";

export default function NavBar({ session }) {
  const location = useLocation();

  const publicNav = [
    { name: "Hackathons", path: "/hackathons" },
    { name: "Projects", path: "/projects" },
    { name: "Jobs", path: "/jobs" },
    { name: "Community", path: "/community" },
  ];

  const privateNav = [
    { name: "Dashboard", path: "/dashboard" },
    { name: "Profile", path: "/profile" },
    {name:"Inbox", path:"/inbox"}
  ];

  const navItems = session
    ? [...privateNav, ...publicNav, { name: "Logout", path: "/logout" }]
    : [...publicNav, { name: "Login", path: "/login" }, { name: "Signup", path: "/signup" }];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/collab/";
  };

  return (
    <nav className={styles.navbar}>
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;

        if (item.name === "Logout") {
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={handleLogout}
              className={styles.navLink}
            >
              {item.name}
            </Link>
          );
        }

        return (
          <Link
            key={item.path}
            to={item.path}
            className={`${styles.navLink} ${isActive ? styles.active : ""}`}
          >
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}
