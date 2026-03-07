import { Building2, Compass, Disc3, Heart, LayoutDashboard, Shrink } from "lucide-react";
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
        {items.map((item) => (
          item.disabled || !item.to ? (
            <span key={item.label} className={cn("left-nav-item", "left-nav-item--disabled")} aria-disabled="true" title="Скоро">
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </span>
          ) : (
            <Link
              key={item.label}
              to={item.to}
              className={cn(
                "left-nav-item",
                (item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to)) && "left-nav-item--active"
              )}
            >
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        ))}
      </div>

      <button className="left-nav-collapse" onClick={onToggle}>
        <Shrink size={16} />
        {!collapsed && <span>Свернуть</span>}
      </button>
    </aside>
  );
}
