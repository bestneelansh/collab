// src/components/ProtectedRoute.jsx
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import Loader from "../components/Loader"; 
import { isProfileIncomplete } from "../utils/checkProfileCompletion";

export default function ProtectedRoute({ session, children }) {
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    async function checkProfile() {
      if (!session) {
        setAllowed(false);
        setChecking(false);
        return;
      }

      // fetch profile for this user
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      // If profile is incomplete and not already on profile page → redirect
      if (isProfileIncomplete(profile) && !location.pathname.startsWith("/profile")) {
        navigate("/profile?helper=true");
        return;
      }

      // profile is complete → allow access
      setAllowed(true);
      setChecking(false);
    }

    checkProfile();
  }, [session, location.pathname, navigate]);

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (checking) return <Loader fullScreen={true} />;

  return allowed ? children : null;
}
