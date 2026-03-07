import { useQuery } from "@tanstack/react-query";
import { Building2, Disc3, ExternalLink, Radio, User2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { djApi, profileApi } from "../api";
import { useSafeImageUrl } from "../shared/hooks/useSafeImageUrl";
import { useAuth } from "../shared/hooks/useAuth";
import { Button } from "../shared/ui/Button";
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

  const safeCoverUrl = useSafeImageUrl(data?.cover_url || "");
  const safeAvatarUrl = useSafeImageUrl(data?.avatar_url || "");

  if (isLoading) {
    return <p>Загружаем профиль DJ…</p>;
  }

  if (isError || !data) {
    return (
      <section className="djp-page">
        <article className="djp-panel">
          <h2 className="djp-panel-title">Профиль DJ не найден</h2>
          <p className="djp-muted">Проверьте username или попробуйте позже.</p>
        </article>
      </section>
    );
  }

  const isOwnProfile = me?.username === data.username;
  const hasClubs = data.clubs.length > 0;

  return (
    <section className="djp-page">
      <article className="djp-hero">
        <div
          className="djp-cover"
          style={safeCoverUrl ? { backgroundImage: `url(${safeCoverUrl})` } : undefined}
        >
          <div className="djp-cover-glow" />
        </div>

        <div className="djp-hero-body">
          <div
            className="djp-avatar"
            style={safeAvatarUrl ? { backgroundImage: `url(${safeAvatarUrl})` } : undefined}
          >
            {!safeAvatarUrl ? data.display_name.slice(0, 1).toUpperCase() : null}
          </div>

          <div className="djp-main">
            <div className="djp-kicker-row">
              <span className={data.is_live ? "djp-live-pill" : "djp-offline-pill"}>
                <span className="djp-live-dot" />
                {data.is_live ? "В эфире" : "Офлайн"}
              </span>
              <span className="djp-username">@{data.username}</span>
            </div>

            <h1 className="djp-title">{data.display_name}</h1>
            <p className="djp-bio">{data.bio || "DJ пока не добавил описание профиля."}</p>

            <div className="djp-stats-row">
              <div className="djp-stat-card">
                <Disc3 size={14} />
                <span>{data.is_live ? "Идёт live-сет" : "Ждём следующий сет"}</span>
              </div>
              <div className="djp-stat-card">
                <Building2 size={14} />
                <span>{hasClubs ? `${data.clubs.length} клуб(а)` : "Без клубов"}</span>
              </div>
            </div>
          </div>

          <div className="djp-actions">
            {isOwnProfile ? (
              <Link to="/dashboard/profile">
                <Button>Редактировать профиль</Button>
              </Link>
            ) : null}

            {data.is_live && data.live_stream_id ? (
              <Link to={`/watch/${data.live_stream_id}`}>
                <Button variant="primary">
                  <Radio size={15} />
                  Смотреть эфир
                </Button>
              </Link>
            ) : (
              <button className="djp-disabled-btn" type="button" disabled>
                <Radio size={15} />
                Вне эфира
              </button>
            )}
          </div>
        </div>
      </article>

      <div className="djp-grid">
        <article className="djp-panel djp-panel--clubs">
          <h2 className="djp-panel-title">Клубы</h2>
          {!hasClubs ? (
            <p className="djp-muted">Пока не состоит в клубах.</p>
          ) : (
            <div className="djp-club-list">
              {data.clubs.map((club) => (
                <Link key={club.id} to={`/club/${club.slug}`} className="djp-club-item">
                  <div className="djp-club-main">
                    <strong>{club.title}</strong>
                    <span>{club.city || "Город не указан"}</span>
                  </div>
                  <ExternalLink size={14} />
                </Link>
              ))}
            </div>
          )}
        </article>

        <article className="djp-panel djp-panel--socials">
          <h2 className="djp-panel-title">Соцсети</h2>
          <SocialLinks socials={data.socials} />
        </article>

        <article className="djp-panel djp-panel--history">
          <h2 className="djp-panel-title">Последние эфиры</h2>
          <div className="djp-history-placeholder">
            <User2 size={16} />
            <p>Скоро здесь появится архив выступлений.</p>
          </div>
        </article>
      </div>
    </section>
  );
}
