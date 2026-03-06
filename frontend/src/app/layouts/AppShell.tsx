import { motion } from "framer-motion";
import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { LeftNav } from "../../widgets/navigation/LeftNav";
import { TopNav } from "../../widgets/navigation/TopNav";

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const isLiveRoute = location.pathname.startsWith("/live/") || location.pathname.startsWith("/watch/");

  return (
    <div className="app-shell">
      <TopNav onToggleSidebar={() => setCollapsed((value) => !value)} />
      {!isLiveRoute && <LeftNav collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />}
      <motion.main
        className={isLiveRoute ? "app-content app-content--live" : "app-content"}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
      >
        <Outlet />
      </motion.main>
    </div>
  );
}
