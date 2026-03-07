import { Settings, Shield, SlidersHorizontal, UserCircle2, Wrench } from "lucide-react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { cn } from "../../shared/lib/utils";

const items = [
  { to: "/dashboard/profile", label: "Профиль", icon: <UserCircle2 size={16} /> },
  { to: "/dashboard/stream", label: "Стрим", icon: <SlidersHorizontal size={16} /> },
  { to: "/dashboard/moderation", label: "Модерация", icon: <Shield size={16} /> },
  { to: "/dashboard/integrations", label: "Интеграции", icon: <Wrench size={16} /> },
  { to: "/settings", label: "Безопасность", icon: <Settings size={16} /> },
];

export function DashboardLayout() {
  const location = useLocation();

  return (
    <section className="dashboard-layout">
      <aside className="dashboard-menu ui-card">
        <h2>Рабочая зона</h2>
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
