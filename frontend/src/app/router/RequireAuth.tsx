import type { ReactElement } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../shared/hooks/useAuth";

export function RequireAuth({ children }: { children: ReactElement }) {
  const location = useLocation();
  const { isAuthed, setRedirectAfterLogin } = useAuth();

  if (!isAuthed) {
    setRedirectAfterLogin(location.pathname);
    return <Navigate to="/auth" replace />;
  }

  return children;
}
