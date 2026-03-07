import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { browseApi, djApi } from "../api";
import { useAuth } from "../shared/hooks/useAuth";
import { Badge } from "../shared/ui/Badge";
import { Button } from "../shared/ui/Button";
import { Card } from "../shared/ui/Card";

type ActiveClubFromStreams = {
  slug: string;
  title: string;
  liveCount: number;
  viewerCount: number;
  nowPlaying: string;
};

export function ClubsPage() {
  const { isAuthed } = useAuth();

  const { data: liveStreams, isLoading, error } = useQuery({
    queryKey: ["live-streams-for-clubs"],
    queryFn: browseApi.liveStreams,
  });

  const activeClubs = useMemo<ActiveClubFromStreams[]>(() => {
    const grouped = new Map<string, ActiveClubFromStreams>();

    (liveStreams || []).forEach((stream) => {
      if (!stream.club_slug || !stream.club_title) {
        return;
      }
      const current = grouped.get(stream.club_slug);
      if (current) {
        current.liveCount += 1;
        current.viewerCount += stream.viewer_count;
        if (!current.nowPlaying && stream.current_track) {
          current.nowPlaying = stream.current_track;
        }
        return;
      }

      grouped.set(stream.club_slug, {
        slug: stream.club_slug,
        title: stream.club_title,
        liveCount: 1,
        viewerCount: stream.viewer_count,
        nowPlaying: stream.current_track || "Track not available",
      });
    });

    return Array.from(grouped.values()).sort((a, b) => b.viewerCount - a.viewerCount);
  }, [liveStreams]);

  const { data: myProfile } = useQuery({
    queryKey: ["dj-me"],
    queryFn: djApi.me,
    enabled: isAuthed,
  });

  return (
    <section className="page-stack">
      <div className="row between">
        <div>
          <h1>Клубы</h1>
          <p className="muted">Список клубов построен по текущим активным эфирам.</p>
        </div>
        {isAuthed ? (
          <Link to="/clubs/create">
            <Button>Создать клуб</Button>
          </Link>
        ) : null}
      </div>

      {isAuthed ? (
        <Card>
          <h3>Мои роли в клубах</h3>
          {!myProfile?.clubs.length ? (
            <p className="muted">Вы пока не состоите ни в одном клубе.</p>
          ) : (
            <div className="profile-clubs-grid">
              {myProfile.clubs.map((club) => (
                <div key={club.id} className="profile-club-item">
                  <strong>{club.title}</strong>
                  <span className="muted">Роль: {club.role}</span>
                  <div className="row gap">
                    <Link to={`/club/${club.slug}`}>
                      <Button variant="secondary">Профиль клуба</Button>
                    </Link>
                    {["owner", "admin"].includes(club.role) ? (
                      <Link to={`/club-studio/${club.id}`}>
                        <Button>Club Studio</Button>
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : null}

      {isLoading && <p>Загружаем активные клубы…</p>}
      {error && <p className="error">Не удалось загрузить клубы.</p>}

      {!isLoading && !activeClubs.length ? <p className="muted">Сейчас нет активных клубных эфиров.</p> : null}

      <div className="profile-clubs-grid">
        {activeClubs.map((club) => (
          <Card key={club.slug}>
            <div className="row between" style={{ marginBottom: 8 }}>
              <h3>{club.title}</h3>
              <Badge tone="live">LIVE {club.liveCount}</Badge>
            </div>
            <p className="muted">Viewers: {club.viewerCount}</p>
            <p className="muted">Now playing: {club.nowPlaying}</p>
            <Link to={`/club/${club.slug}`}>
              <Button>Открыть клуб</Button>
            </Link>
          </Card>
        ))}
      </div>
    </section>
  );
}
