import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { AppShell } from "./app/layouts/AppShell";
import { DashboardLayout } from "./app/layouts/DashboardLayout";
import { RequireAuth } from "./app/router/RequireAuth";
import { AuthPage } from "./pages/AuthPage";
import { BrowsePage } from "./pages/BrowsePage";
import { ClubPage } from "./pages/ClubPage";
import { ClubStudioInvitesPage } from "./pages/ClubStudioInvitesPage";
import { ClubStudioPage } from "./pages/ClubStudioPage";
import { ClubsPage } from "./pages/ClubsPage";
import { DashboardIntegrationsPage } from "./pages/DashboardIntegrationsPage";
import { DashboardLandingPage } from "./pages/DashboardLandingPage";
import { DashboardModerationPage } from "./pages/DashboardModerationPage";
import { DashboardProfilePage } from "./pages/DashboardProfilePage";
import { DashboardStreamPage } from "./pages/DashboardStreamPage";
import { DJProfilePage } from "./pages/DJProfilePage";
import { DirectoryPage } from "./pages/DirectoryPage";
import { GenrePage } from "./pages/GenrePage";
import { InviteDecisionPage } from "./pages/InviteDecisionPage";
import { LiveAliasPage } from "./pages/LiveAliasPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { SettingsPage } from "./pages/SettingsPage";
import { WatchPage } from "./pages/WatchPage";

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route
        path="/invites/:token"
        element={
          <RequireAuth>
            <InviteDecisionPage />
          </RequireAuth>
        }
      />
      <Route path="/404" element={<NotFoundPage />} />
      <Route element={<AppShell />}>
        <Route path="/" element={<BrowsePage />} />
        <Route path="/discover" element={<Navigate to="/" replace />} />
        <Route path="/directory" element={<DirectoryPage />} />
        <Route path="/directory/:genre" element={<GenrePage />} />
        <Route path="/clubs" element={<ClubsPage />} />
        <Route path="/club/:slug" element={<ClubPage />} />
        <Route path="/dj/:username" element={<DJProfilePage />} />
        <Route path="/channel/:username" element={<LegacyChannelRedirect />} />
        <Route path="/live/:username" element={<LiveAliasPage />} />
        <Route path="/watch/:streamId" element={<WatchPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route element={<DashboardLayout />}>
          <Route index element={<DashboardLandingPage />} />
          <Route path="profile" element={<DashboardProfilePage />} />
          <Route path="stream" element={<DashboardStreamPage />} />
          <Route path="moderation" element={<DashboardModerationPage />} />
          <Route path="integrations" element={<DashboardIntegrationsPage />} />
        </Route>
      </Route>

      <Route
        path="/club-studio/:clubId"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route element={<ClubStudioPage />}>
          <Route path="invites" element={<ClubStudioInvitesPage />} />
        </Route>
      </Route>

      <Route path="/dashboard-legacy" element={<Navigate to="/dashboard" replace />} />

      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}

function LegacyChannelRedirect() {
  const { username = "" } = useParams();
  return <Navigate to={`/dj/${username}`} replace />;
}
