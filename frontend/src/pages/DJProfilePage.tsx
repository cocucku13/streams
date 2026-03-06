import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { djApi, profileApi } from "../api";
import { useAuth } from "../shared/hooks/useAuth";
import { Badge } from "../shared/ui/Badge";
import { Button } from "../shared/ui/Button";
import { Card } from "../shared/ui/Card";
import { SocialLinks } from "../shared/ui/SocialLinks";

export function DJProfilePage() {
  const { username = "" } = useParams();
  const { isAuthed } = useAuth();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["dj-profile", username],
    queryFn: () => djApi.byUsername(username),
    enabled: Boolean(username),
  });

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: profileApi.me,
    enabled: isAuthed,
  });

  if (isLoading) {
    return <p>Загружаем профиль DJ…</p>;
  }

  if (isError || !data) {
    return (
      <Card>
        <h2>Профиль DJ не найден</h2>
        <p className="muted">Проверьте username или попробуйте позже.</p>
      </Card>
    );
  }

  return (
    <section className="page-stack">
      <div className="ui-card profile-hero">
        <div className="profile-cover" style={data.cover_url ? { backgroundImage: `url(${data.cover_url})` } : undefined} />
        <div className="profile-head">
          <div className="profile-avatar" style={data.avatar_url ? { backgroundImage: `url(${data.avatar_url})` } : undefined}>
            {!data.avatar_url ? data.display_name.slice(0, 1).toUpperCase() : null}
          </div>
          <div>
            <h1>{data.display_name}</h1>
            <p className="muted">@{data.username}</p>
            {data.is_live ? <Badge tone="live">Сейчас в эфире</Badge> : <Badge tone="neutral">Offline</Badge>}
          </div>
          <div className="watch-action-row">
            {me?.username === data.username ? (
              <Link to="/dashboard/profile">
                <Button>Редактировать профиль</Button>
              </Link>
            ) : null}
            {data.is_live ? (
              <Link to={`/watch/${data.live_stream_id}`}>
                <Button>Смотреть</Button>
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <Card>
        <h3>Bio</h3>
        <p className="muted">{data.bio || "Био пока не заполнено"}</p>
      </Card>

      <Card>
        <h3>Клубы</h3>
        {!data.clubs.length ? (
          <p className="muted">Не состоит в клубах</p>
        ) : (
          <div className="profile-clubs-grid">
            {data.clubs.map((club) => (
              <Link key={club.id} to={`/club/${club.slug}`} className="profile-club-item">
                <strong>{club.title}</strong>
                <span className="muted">{club.city || "City TBD"}</span>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h3>Соцсети</h3>
        <SocialLinks socials={data.socials} />
      </Card>

      <Card>
        <h3>Последние эфиры</h3>
        <p className="muted">Скоро</p>
      </Card>
    </section>
  );
}
