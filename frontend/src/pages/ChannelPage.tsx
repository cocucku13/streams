import { Navigate, useParams } from "react-router-dom";

export function ChannelPage() {
  const { username = "" } = useParams();
  // Deprecated in Wave 13: /channel/:username is redirected to canonical DJ profile route.
  return <Navigate to={`/dj/${username}`} replace />;
}
