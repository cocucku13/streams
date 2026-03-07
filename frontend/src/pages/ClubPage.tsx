import { useQuery } from "@tanstack/react-query";
import { Disc3, ExternalLink, Radio, Settings, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { useParams } from "react-router-dom";
import { clubApi, profileApi } from "../api";
import { useSafeImageUrl } from "../shared/hooks/useSafeImageUrl";
import { useAuth } from "../shared/hooks/useAuth";
import { MediaGrid } from "../shared/ui/MediaGrid";
import { SocialLinks } from "../shared/ui/SocialLinks";
import { Button } from "../shared/ui/Button";
import { WorkspaceStateCard } from "../shared/ui/WorkspaceStateCard";

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
      <WorkspaceStateCard title="Клуб не найден" description="Проверьте ссылку или попробуйте позже." tone="error" />
    );
  }

  const myMembership = club.djs?.find((member) => member.user_id === me?.id && member.status === "active");
  const canManageClub = Boolean(myMembership && ["owner", "admin"].includes(myMembership.role));
  const safeAvatarUrl = useSafeImageUrl(club.avatar_url || "");
  const safeCoverUrl = useSafeImageUrl(club.cover_url || "");

  return (
    <section className="club-page-v2">
      <article className="clubv2-hero">
        <div className="clubv2-cover" style={safeCoverUrl ? { backgroundImage: `url(${safeCoverUrl})` } : undefined}>
          <div className="clubv2-cover-glow" />
        </div>

        <div className="clubv2-hero-body">
          <div className="clubv2-avatar" style={safeAvatarUrl ? { backgroundImage: `url(${safeAvatarUrl})` } : undefined}>
            {!safeAvatarUrl ? club.name.slice(0, 1).toUpperCase() : null}
          </div>

          <div className="clubv2-main">
            <div className="clubv2-kicker-row">
              <span className="clubv2-visibility-pill">{(club.visibility || "public").toUpperCase()}</span>
              <span className="clubv2-slug">club/{club.slug}</span>
            </div>

            <h1 className="clubv2-title">{club.name}</h1>
            <p className="clubv2-city">{club.city || "Город не указан"}</p>
            <p className="clubv2-description">{club.description || "Описание пока не заполнено."}</p>

            <div className="clubv2-stats-row">
              <span className="clubv2-stat-pill">
                <Disc3 size={14} />
                DJ: {club.djs?.length || 0}
              </span>
              <span className="clubv2-stat-pill">
                <Radio size={14} />
                Live: {club.live_streams?.length || 0}
              </span>
            </div>
          </div>

          <div className="clubv2-actions">
            {canManageClub ? (
              <>
                <Link to={`/club-studio/${club.id}`}>
                  <Button>
                    <Settings size={15} />
                    Club Studio
                  </Button>
                </Link>
                <Link to={`/club-studio/${club.id}/invites`}>
                  <Button variant="secondary">
                    <UserPlus size={15} />
                    Приглашения
                  </Button>
                </Link>
              </>
            ) : (
              <Button disabled title="Скоро">
                Follow
              </Button>
            )}
          </div>
        </div>
      </article>

      <div className="clubv2-grid">
        <article className="clubv2-panel">
          <h3>Соцсети</h3>
          <SocialLinks socials={club.socials} />
        </article>

        <article className="clubv2-panel">
          <h3>Состав клуба</h3>
          {!club.djs?.length ? (
            <p className="muted">Пока нет участников с DJ-ролью</p>
          ) : (
            <div className="clubv2-member-list">
              {club.djs.map((member) => (
                <Link key={member.id} to={`/dj/${member.username}`} className="clubv2-member-item">
                  <div>
                    <strong>{member.display_name}</strong>
                    <span>@{member.username}</span>
                  </div>
                  <span className="clubv2-role-pill">{member.role}</span>
                </Link>
              ))}
            </div>
          )}
        </article>
      </div>

      <article className="clubv2-panel">
        <h3>Галерея</h3>
        <MediaGrid
          items={club.gallery}
          emptyText={me?.id === club.owner_user_id ? "Добавьте первые фото клуба" : "Нет фото"}
        />
      </article>

      <article className="clubv2-panel">
        <h3>Сейчас в эфире из клуба</h3>
        {!club.live_streams?.length ? (
          <p className="muted">Сейчас нет активных лайвов</p>
        ) : (
          <div className="clubv2-live-list">
            {club.live_streams.map((stream) => (
              <Link key={stream.id} to={`/watch/${stream.id}`} className="clubv2-live-item">
                <div>
                  <strong>{stream.title}</strong>
                  <span>{stream.owner_name}</span>
                </div>
                <span className="clubv2-live-viewers">
                  <ExternalLink size={14} />
                  {stream.viewer_count}
                </span>
              </Link>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
