import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Copy, Settings, Share2 } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { browseApi, clubApi, djApi, profileApi } from "../api";
import { EditStreamSettingsModal } from "../features/editStreamInline/EditStreamSettingsModal";
import { useAuth } from "../shared/hooks/useAuth";
import { copyText } from "../shared/lib/utils";
import { Badge } from "../shared/ui/Badge";
import { Button } from "../shared/ui/Button";
import { Card } from "../shared/ui/Card";
import { Tabs } from "../shared/ui/Tabs";
import { ChatPanel } from "../widgets/chat/ChatPanel";
import { VideoPlayer } from "../widgets/player/VideoPlayer";

export function WatchPage() {
  const { username = "", streamId } = useParams();
  const { isAuthed } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { data: stream, isLoading } = useQuery({
    queryKey: streamId ? ["stream-by-id", Number(streamId)] : ["stream-by-username", username],
    queryFn: () => {
      if (streamId) {
        return browseApi.streamById(Number(streamId));
      }
      return browseApi.streamByUsername(username);
    },
  });

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: profileApi.me,
    enabled: isAuthed,
  });

  const { data: myDjProfile } = useQuery({
    queryKey: ["dj-me"],
    queryFn: djApi.me,
    enabled: isAuthed,
  });

  const { data: clubMembers } = useQuery({
    queryKey: ["club-members", stream?.club_id],
    queryFn: () => clubApi.members(stream!.club_id!),
    enabled: isAuthed && Boolean(stream?.club_id),
  });

  const isStreamOwner = Boolean(stream && me && stream.owner_id === me.id);
  const isClubManager = Boolean(
    stream?.club_id &&
      me &&
      clubMembers?.some((member) => member.user_id === me.id && member.status === "active" && ["owner", "admin"].includes(member.role))
  );
  const canManageStream = Boolean(isStreamOwner || isClubManager);

  if (isLoading) {
    return <p>Загружаем эфир…</p>;
  }

  if (!stream) {
    return (
      <Card>
        <h2>Эфир недоступен</h2>
        <p className="muted">Трансляция завершена или временно недоступна.</p>
      </Card>
    );
  }

  return (
    <section className="watch-layout">
      <div className="watch-main">
        <VideoPlayer hlsUrl={stream.hls_url} whepUrl={stream.whep_url} />

        <header className="watch-title-row ui-card">
          <div className="watch-title-main">
            <div className="watch-title-heading">
              <h1>{stream.title}</h1>
              {canManageStream ? (
                <Button variant="ghost" onClick={() => setSettingsOpen(true)} aria-label="Настройки стрима">
                  <Settings size={16} />
                </Button>
              ) : null}
            </div>
            <div className="watch-meta-row">
              <Badge tone="live">LIVE</Badge>
              <span>{stream.viewers} зрителей</span>
              <Badge tone="club">From: {stream.club}</Badge>
            </div>
          </div>

          <div className="watch-action-row">
            <Button>Подписаться</Button>
            <Button
              variant="secondary"
              onClick={async () => {
                await copyText(window.location.href);
                toast.success("Ссылка на эфир скопирована");
              }}
            >
              <Share2 size={16} />
              Поделиться
            </Button>
            <Button variant="ghost" disabled title="Скоро">
              Клип
            </Button>
            <Button variant="ghost" disabled title="Скоро">
              <AlertCircle size={16} />
              Пожаловаться
            </Button>
          </div>
        </header>

        <section className="watch-channel-row ui-card">
          <div className="watch-channel-left">
            <div className="watch-avatar">{stream.owner_name.slice(0, 1).toUpperCase()}</div>
            <div>
              <h2 className="watch-channel-name">{stream.owner_name}</h2>
              <p className="muted">Клуб: {stream.club}</p>
            </div>
          </div>

          <div className="watch-channel-actions">
            <Button>Follow</Button>
            <Button variant="secondary" disabled title="Скоро">
              Подписаться
            </Button>
          </div>
        </section>

        <section className="watch-about-grid">
          <Card className="watch-about-main">
            <div className="watch-now-playing">
              <div className="watch-now-playing-main">
                <div>
                    <span className="muted">Now Playing</span>
                  <strong>{stream.current_track || "Трек не указан"}</strong>
                </div>
              </div>
              <Button
                variant="secondary"
                onClick={async () => {
                  await copyText(stream.current_track || "");
                  toast.success("Трек скопирован");
                }}
                disabled={!stream.current_track}
              >
                <Copy size={14} />
                Copy
              </Button>
            </div>

            <Tabs
              value="about"
              onChange={() => undefined}
              tabs={[
                { value: "about", label: "О канале" },
                { value: "schedule", label: "Расписание" },
                { value: "vod", label: "Записи" },
              ]}
            />
            <p className="muted">{stream.description || "Описание канала скоро появится."}</p>
          </Card>

          <Card className="watch-about-side">
            <h3>Информация</h3>
            <div className="watch-stat-list">
              <div>
                <span className="muted">DJ</span>
                <strong>
                  <Link to={`/dj/${stream.owner_username}`}>{stream.owner_name}</Link>
                </strong>
              </div>
              <div>
                <span className="muted">Клуб</span>
                <strong>
                  {stream.club_slug ? <Link to={`/club/${stream.club_slug}`}>{stream.club}</Link> : stream.club}
                </strong>
              </div>
              <div>
                <span className="muted">Жанр</span>
                <strong>{stream.genre || "Open format"}</strong>
              </div>
              <div>
                <span className="muted">Зрители</span>
                <strong>{stream.viewers}</strong>
              </div>
            </div>
          </Card>
        </section>
      </div>

      <aside className="watch-chat">
        <ChatPanel streamId={stream.id} disabled={!isAuthed} />
      </aside>

      <EditStreamSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        stream={stream}
        canEditClub={isStreamOwner}
        clubs={myDjProfile?.clubs || []}
        canManage={canManageStream}
        usernameKey={stream.username}
      />
    </section>
  );
}
