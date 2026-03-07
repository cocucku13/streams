import { Building2, ChevronLeft, ChevronRight, Compass, Disc3, Heart, LayoutDashboard } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "../../shared/lib/utils";

type Item = { label: string; to?: string; icon: ReactNode; disabled?: boolean };

const items: Item[] = [
  { label: "Подписки", icon: <Heart size={16} />, disabled: true },
  { label: "Рекомендации", to: "/", icon: <Compass size={16} /> },
  { label: "Жанры", to: "/directory", icon: <Disc3 size={16} /> },
  { label: "Клубы рядом", to: "/clubs", icon: <Building2 size={16} /> },
  { label: "Кабинет", to: "/dashboard", icon: <LayoutDashboard size={16} /> },
];

export function LeftNav({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const location = useLocation();

  return (
    <aside className={cn("left-nav", collapsed && "left-nav--collapsed")}>
      <div className="left-nav-items">
        {items.map((item) => {
          const isActive = item.to
            ? item.to === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.to)
            : false;

          if (item.disabled || !item.to) {
            return (
              <span
                key={item.label}
                className="left-nav-item left-nav-item--disabled"
                aria-disabled="true"
                title={item.label + " — скоро"}
              >
                <span className="left-nav-icon">{item.icon}</span>
                {!collapsed && <span className="left-nav-label">{item.label}</span>}
              </span>
            );
          }

          return (
            <Link
              key={item.label}
              to={item.to}
              className={cn("left-nav-item", isActive && "left-nav-item--active")}
              title={collapsed ? item.label : undefined}
            >
              <span className="left-nav-icon">{item.icon}</span>
              {!collapsed && <span className="left-nav-label">{item.label}</span>}
            </Link>
          );
        })}
      </div>

      <button className="left-nav-collapse-btn" onClick={onToggle} aria-label={collapsed ? "Развернуть меню" : "Свернуть меню"}>
        {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        {!collapsed && <span>Свернуть</span>}
      </button>
    </aside>
  );
}
