import { useState } from "react";
import { Outlet } from "react-router-dom";
import { LeftNav } from "../../widgets/navigation/LeftNav";
import { TopNav } from "../../widgets/navigation/TopNav";
import { cn } from "../../shared/lib/utils";

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="app-shell">
      <TopNav onToggleSidebar={() => setCollapsed((v) => !v)} />
      <LeftNav collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <main className={cn("app-content", collapsed && "app-content--collapsed")}>
        <Outlet />
      </main>
    </div>
  );
}
