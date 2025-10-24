import { useNavigate, useLocation } from "react-router-dom";

export default function useRedirectToLogin() {
  const navigate = useNavigate();
  const location = useLocation();

  return (extraParams = {}) => {
    const currentPath = location.pathname + location.search;
    const queryParams = new URLSearchParams({
      redirectTo: currentPath,
      ...extraParams,
    });
    navigate(`/login?${queryParams.toString()}`);
  };
}
