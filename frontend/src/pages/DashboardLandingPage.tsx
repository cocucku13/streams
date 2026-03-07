import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { djApi } from "../api";
import { Badge } from "../shared/ui/Badge";
import { Button } from "../shared/ui/Button";
import { WorkspaceHeader } from "../shared/ui/WorkspaceHeader";

export function DashboardLandingPage() {
  const { data } = useQuery({ queryKey: ["dj-me"], queryFn: djApi.me });
  const manageableClub = data?.clubs.find((club) => ["owner", "admin"].includes(club.role));

  return (
    <section className="page-stack">
      <WorkspaceHeader title="Рабочая зона автора" description="Управление профилем, эфиром и клубными инструментами из единой точки." />

      <div className="profile-clubs-grid">
        <section className="ui-card">
          <h3>Инструменты DJ</h3>
          <p className="muted">Редактирование публичного профиля и настроек активного эфира.</p>
          <div className="row gap">
            <Link to="/dashboard/stream">
              <Button>Стрим</Button>
            </Link>
            <Link to="/dashboard/profile">
              <Button variant="secondary">Профиль</Button>
            </Link>
          </div>
        </section>

        <section className="ui-card">
          <h3>Системные разделы</h3>
          <p className="muted">Разделы ниже доступны, но часть возможностей пока ограничена backend-контрактом.</p>
          <div className="row gap">
            <Link to="/dashboard/moderation">
              <Button variant="secondary">Модерация</Button>
            </Link>
            <Link to="/dashboard/integrations">
              <Button variant="secondary">Интеграции</Button>
            </Link>
          </div>
        </section>

        <section className="ui-card">
          <h3>Club Studio</h3>
          {manageableClub ? (
            <>
              <p className="muted">Клуб: {manageableClub.title}</p>
              <Badge tone="club">{manageableClub.role}</Badge>
              <div className="row gap">
                <Link to={`/club-studio/${manageableClub.id}`}>
                  <Button>Открыть Club Studio</Button>
                </Link>
                <Link to={`/club/${manageableClub.slug}`}>
                  <Button variant="secondary">Профиль клуба</Button>
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="muted">У вас нет роли owner/admin в клубах. Управление клубом станет доступно после назначения роли.</p>
              <Link to="/clubs">
                <Button variant="secondary">К клубам</Button>
              </Link>
            </>
          )}
        </section>
      </div>
    </section>
  );
}
