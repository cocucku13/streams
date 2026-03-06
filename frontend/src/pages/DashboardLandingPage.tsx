import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { djApi } from "../api";
import { Badge } from "../shared/ui/Badge";
import { Button } from "../shared/ui/Button";
import { Card } from "../shared/ui/Card";

export function DashboardLandingPage() {
  const { data } = useQuery({ queryKey: ["dj-me"], queryFn: djApi.me });
  const manageableClub = data?.clubs.find((club) => ["owner", "admin"].includes(club.role));

  return (
    <section className="page-stack">
      <Card>
        <h2>Role Hub</h2>
        <p className="muted">Единая точка перехода между ролями viewer / dj / club owner.</p>
      </Card>

      <div className="profile-clubs-grid">
        <Card>
          <h3>Viewer</h3>
          <p className="muted">Смотреть эфиры и открывать профили DJ/клубов.</p>
          <Link to="/">
            <Button>Открыть Browse</Button>
          </Link>
        </Card>

        <Card>
          <h3>DJ</h3>
          <p className="muted">Управлять своим стримом и публичным DJ-профилем.</p>
          <div className="row gap">
            <Link to="/dashboard/stream">
              <Button>Stream</Button>
            </Link>
            <Link to="/dashboard/profile">
              <Button variant="secondary">Profile</Button>
            </Link>
          </div>
        </Card>

        <Card>
          <h3>Club Owner/Admin</h3>
          {manageableClub ? (
            <>
              <p className="muted">Клуб: {manageableClub.title}</p>
              <Badge tone="club">{manageableClub.role}</Badge>
              <div className="row gap">
                <Link to={`/club-studio/${manageableClub.id}`}>
                  <Button>Club Studio</Button>
                </Link>
                <Link to={`/club/${manageableClub.slug}`}>
                  <Button variant="secondary">Club Page</Button>
                </Link>
              </div>
            </>
          ) : (
            <p className="muted">У вас пока нет роли owner/admin в клубах.</p>
          )}
        </Card>
      </div>
    </section>
  );
}
