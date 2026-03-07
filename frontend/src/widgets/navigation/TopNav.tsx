import { useQuery } from "@tanstack/react-query";
import { LogIn, Menu, Radio, Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { djApi } from "../../api";
import { useAuth } from "../../shared/hooks/useAuth";
import { Button } from "../../shared/ui/Button";

export function TopNav({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { isAuthed, logout } = useAuth();
  const navigate = useNavigate();
  const { data: myDjProfile } = useQuery({
    queryKey: ["dj-me"],
    queryFn: djApi.me,
    enabled: isAuthed,
  });

  const manageableClub = myDjProfile?.clubs.find((club) => ["owner", "admin"].includes(club.role));

  return (
    <header className="top-nav">
      <div className="top-nav-left">
        <button
          className="top-nav-icon-btn"
          aria-label="Переключить боковое меню"
          onClick={onToggleSidebar}
        >
          <Menu size={18} />
        </button>

        <Link to="/" className="top-nav-brand">
          <Radio size={18} className="top-nav-brand-icon" />
          <span>DJ Streams</span>
        </Link>
      </div>

      <div className="top-nav-search-wrap">
        <div className="top-nav-search">
          <Search size={15} className="top-nav-search-icon" />
          <input
            className="top-nav-search-input"
            placeholder="Поиск DJ, клубов и жанров…"
            aria-label="Поиск по платформе"
          />
        </div>
      </div>

      <nav className="top-nav-right">
        {isAuthed ? (
          <>
            <button
              className="top-nav-text-btn"
              onClick={() => navigate("/dashboard")}
            >
              Creator Studio
            </button>
            {manageableClub ? (
              <button
                className="top-nav-text-btn"
                onClick={() => navigate(`/club-studio/${manageableClub.id}`)}
              >
                Клуб
              </button>
            ) : null}
            <button
              className="top-nav-text-btn"
              onClick={() => { logout(); navigate("/"); }}
            >
              Выйти
            </button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={() => navigate("/auth?mode=register")}>
              Регистрация
            </Button>
            <Button variant="primary" onClick={() => navigate("/auth")}>
              <LogIn size={15} />
              Войти
            </Button>
          </>
        )}
      </nav>
    </header>
  );
}
