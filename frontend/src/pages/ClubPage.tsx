import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useParams } from "react-router-dom";
import { clubApi, profileApi } from "../api";
import { useAuth } from "../shared/hooks/useAuth";
import { MediaGrid } from "../shared/ui/MediaGrid";
import { SocialLinks } from "../shared/ui/SocialLinks";
import { Button } from "../shared/ui/Button";
import { Card } from "../shared/ui/Card";

export function ClubPage() {
  const { slug = "" } = useParams();
  const { isAuthed } = useAuth();

  const { data: club, isLoading, isError } = useQuery({
    queryKey: ["club-profile", slug],
    queryFn: () => clubApi.bySlug(slug),
    enabled: Boolean(slug),
  });

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: profileApi.me,
    enabled: isAuthed,
  });

  if (isLoading) {
    return <p>Загружаем профиль клуба…</p>;
  }

  if (isError || !club) {
    return (
      <Card>
        <h2>Клуб не найден</h2>
        <p className="muted">Проверьте ссылку или попробуйте позже.</p>
      </Card>
    );
  }

  const myMembership = club.djs?.find((member) => member.user_id === me?.id && member.status === "active");
  const canManageClub = Boolean(myMembership && ["owner", "admin"].includes(myMembership.role));

  return (
    <section className="page-stack">
      <div className="ui-card profile-hero">
        <div className="profile-cover" style={club.cover_url ? { backgroundImage: `url(${club.cover_url})` } : undefined} />
        <div className="profile-head">
          <div className="profile-avatar" style={club.avatar_url ? { backgroundImage: `url(${club.avatar_url})` } : undefined}>
            {!club.avatar_url ? club.name.slice(0, 1).toUpperCase() : null}
          </div>
          <div>
            <h1>{club.name}</h1>
            <p className="muted">{club.city || "City TBD"}</p>
          </div>
          {canManageClub ? (
            <Link to={`/club-studio/${club.id}`}>
              <Button>Управлять клубом</Button>
            </Link>
          ) : (
            <Button disabled title="Скоро">
              Follow
            </Button>
          )}
        </div>
      </div>

      <Card>
        <h3>Описание</h3>
        <p className="muted">{club.description || "Описание пока не заполнено"}</p>
      </Card>

      <Card>
        <h3>Соцсети</h3>
        <SocialLinks socials={club.socials} />
      </Card>

      <Card>
        <h3>Галерея</h3>
        <MediaGrid
          items={club.gallery}
          emptyText={me?.id === club.owner_user_id ? "Добавьте первые фото клуба" : "Нет фото"}
        />
      </Card>

      <Card>
        <h3>Диджеи клуба</h3>
        {!club.djs?.length ? (
          <p className="muted">Пока нет участников с DJ ролью</p>
        ) : (
          <div className="profile-clubs-grid">
            {club.djs.map((member) => (
              <Link key={member.id} to={`/dj/${member.username}`} className="profile-club-item">
                <strong>{member.display_name}</strong>
                <span className="muted">@{member.username}</span>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h3>Сейчас в эфире из клуба</h3>
        {!club.live_streams?.length ? (
          <p className="muted">Сейчас нет активных лайвов</p>
        ) : (
          <div className="profile-clubs-grid">
            {club.live_streams.map((stream) => (
              <Link key={stream.id} to={`/watch/${stream.id}`} className="profile-club-item">
                <strong>{stream.title}</strong>
                <span className="muted">{stream.owner_name}</span>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </section>
  );
}
