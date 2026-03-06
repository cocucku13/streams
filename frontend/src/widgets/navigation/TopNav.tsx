import { useQuery } from "@tanstack/react-query";
import { Bell, LogIn, Menu, Radio, Search, SendHorizontal } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { djApi } from "../../api";
import { useAuth } from "../../shared/hooks/useAuth";
import { Button } from "../../shared/ui/Button";
import { Input } from "../../shared/ui/Input";

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
        <Button variant="ghost" aria-label="Toggle sidebar" onClick={onToggleSidebar}>
          <Menu size={18} />
        </Button>
        <Link to="/" className="brand">
          DJ Streams
        </Link>
        <Link to="/" className="top-nav-link">
          Обзор
        </Link>
      </div>

      <div className="top-nav-search">
        <Search size={16} className="top-nav-search-icon" />
        <Input placeholder="Поиск DJ, клубов и жанров" aria-label="Поиск по платформе" />
      </div>

      <div className="top-nav-right">
        <Button variant="ghost" onClick={() => navigate("/")}>
          <Radio size={16} />
          Сейчас в эфире
        </Button>
        <Button variant="ghost" aria-label="Уведомления" disabled title="Скоро">
          <Bell size={16} />
        </Button>
        <Button variant="ghost" aria-label="Сообщения" disabled title="Скоро">
          <SendHorizontal size={16} />
        </Button>

        {isAuthed ? (
          <>
            <Button variant="secondary" onClick={() => navigate("/dashboard")}>
              Creator Studio
            </Button>
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              Dashboard
            </Button>
            {manageableClub ? (
              <Button variant="ghost" onClick={() => navigate(`/club-studio/${manageableClub.id}`)}>
                Club Studio
              </Button>
            ) : null}
            <Button variant="ghost" onClick={() => navigate("/clubs")}>
              Клубы
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                logout();
                navigate("/");
              }}
            >
              Выйти
            </Button>
          </>
        ) : (
          <>
            <Button variant="primary" onClick={() => navigate("/auth")}>
              <LogIn size={16} />
              Войти
            </Button>
            <Button variant="secondary" onClick={() => navigate("/auth?mode=register")}>
              Регистрация
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
