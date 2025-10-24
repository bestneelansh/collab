import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import NavBar from "./components/navigationBar";
import ProtectedRoute from "./components/protectedRoute";
import Welcome from "./pages/Welcome";
import Dashboard from "./pages/Dashboard";
import Hackathons from "./pages/Hackathons";
import Projects from "./pages/Projects";
import Jobs from "./pages/JobsFeed";
import Profile from "./pages/Profile";
import Community from "./pages/Community";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Inbox from "./pages/Inbox";
import { supabase } from "./supabaseClient";
import AdminGenerateEmbeddings from "./pages/AdminGenerateEmbeddings";
import AdminGenerateProfileEmbeddings from "./pages/AdminGenerateProfileEmbeddings";
import CharacterAnimationPage from "./pages/CharacterAnimationPage";

function App() {
  const location = useLocation();
  const [session, setSession] = useState(null);

  // Fetch session
  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
    };
    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      if (subscription && typeof subscription.unsubscribe === "function") {
        subscription.unsubscribe();
      }
    };
  }, []);

  const showNavBar = !["/", "/login", "/signup"].includes(location.pathname);

  return (
    <>
      {showNavBar && <NavBar session={session} />}
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/hackathons" element={<Hackathons />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/community" element={<Community session={session} />} />
        <Route path="/inbox" element={<Inbox session={session}/>}/>

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute session={session}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute session={session}>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route path="/admin/generate-jobs" element={<AdminGenerateEmbeddings />} />
        <Route path="/admin/generate-profiles" element={<AdminGenerateProfileEmbeddings />}/>

        <Route path="/characters" element={<CharacterAnimationPage />} />
      </Routes>
    </>
  );
}

export default App;
