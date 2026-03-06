import { Settings, Shield, SlidersHorizontal, UserCircle2, Wrench } from "lucide-react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { cn } from "../../shared/lib/utils";

const items = [
  { to: "/dashboard/profile", label: "Profile", icon: <UserCircle2 size={16} /> },
  { to: "/dashboard/stream", label: "Stream", icon: <SlidersHorizontal size={16} /> },
  { to: "/dashboard/moderation", label: "Chat Moderation", icon: <Shield size={16} /> },
  { to: "/dashboard/integrations", label: "Integrations", icon: <Wrench size={16} /> },
  { to: "/settings", label: "Security", icon: <Settings size={16} /> },
];

export function DashboardLayout() {
  const location = useLocation();

  return (
    <section className="dashboard-layout">
      <aside className="dashboard-menu ui-card">
        <h2>Creator Studio</h2>
        <nav>
          {items.map((item) => (
            <Link key={item.to} to={item.to} className={cn("dashboard-menu-item", location.pathname === item.to && "dashboard-menu-item--active")}>
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>
      <div className="dashboard-body">
        <Outlet />
      </div>
    </section>
  );
}
