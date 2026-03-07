import { useQuery } from "@tanstack/react-query";
import { Settings, Share2 } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ApiError, browseApi, clubApi, djApi, profileApi, streamApi } from "../api";
import { EditStreamSettingsModal } from "../features/editStreamInline/EditStreamSettingsModal";
import { useAuth } from "../shared/hooks/useAuth";
import { copyText } from "../shared/lib/utils";
import { Badge } from "../shared/ui/Badge";
import { Button } from "../shared/ui/Button";
import { Card } from "../shared/ui/Card";
import { StreamUnavailableState } from "../shared/ui/StreamUnavailableState";
import { ChatPanel } from "../widgets/chat/ChatPanel";
import { VideoPlayer } from "../widgets/player/VideoPlayer";

function formatStartedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function WatchPage() {
  const { streamId } = useParams();
  const { isAuthed } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { data: stream, isLoading, isError, error } = useQuery({
    queryKey: ["stream-by-id", Number(streamId)],
    queryFn: () => browseApi.streamById(Number(streamId)),
    enabled: Boolean(streamId),
    retry: false,
  });

  const { data: viewerCount } = useQuery({
    queryKey: ["stream-viewer-count", stream?.id],
    queryFn: () => streamApi.viewerCount(stream!.id),
    enabled: Boolean(stream?.id),
    refetchInterval: 10_000,
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
  const effectiveViewerCount = viewerCount?.viewer_count ?? stream?.viewer_count ?? 0;

  if (isLoading) {
    return (
      <Card>
        <h2>Загружаем эфир…</h2>
        <p className="muted">Подключаем плеер, метаданные и чат.</p>
      </Card>
    );
  }

  if (isError && error instanceof ApiError && error.status === 404) {
    return <StreamUnavailableState title="Эфир не найден" description="Проверьте ссылку или откройте активный эфир из каталога." />;
  }

  if (!stream) {
    return <StreamUnavailableState title="Эфир недоступен" description="Трансляция завершена или временно недоступна." />;
  }

  if (!stream.is_live) {
    return (
      <StreamUnavailableState
        title="Эфир сейчас офлайн"
        description="Стрим существует, но в данный момент не в эфире. Проверьте профиль DJ или вернитесь позже."
        djUsername={stream.owner_username}
      />
    );
  }

  return (
    <section className="watch-layout">
      <div className="watch-main">
        <section className="ui-card">
          <h1>{stream.title}</h1>
          <p className="muted">{stream.description || "Описание не заполнено"}</p>
          <div className="watch-action-row" style={{ marginTop: 12 }}>
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
            <Link to={`/dj/${stream.owner_username}`}>
              <Button variant="ghost">Профиль DJ</Button>
            </Link>
            {stream.club_slug ? (
              <Link to={`/club/${stream.club_slug}`}>
                <Button variant="ghost">Профиль клуба</Button>
              </Link>
            ) : null}
            {canManageStream ? (
              <Button variant="ghost" onClick={() => setSettingsOpen(true)} aria-label="Настройки стрима">
                <Settings size={16} />
                Настройки
              </Button>
            ) : null}
          </div>
          {isAuthed && !canManageStream ? <p className="muted">Настройки стрима доступны владельцу или admin клуба.</p> : null}
        </section>

        <section className="ui-card">
          <div className="watch-meta-row">
            <Badge tone="live">LIVE</Badge>
            <span>{effectiveViewerCount} зрителей</span>
            <span className="muted">Started: {formatStartedAt(stream.started_at)}</span>
            <Badge tone="club">{stream.club_title || "Без клуба"}</Badge>
          </div>
          <p className="muted" style={{ marginTop: 8 }}>Now Playing: {stream.current_track || "Трек не указан"}</p>
        </section>

        <VideoPlayer hlsUrl={stream.hls_url} whepUrl={stream.whep_url} />

        <section className="watch-channel-row ui-card">
          <h3 style={{ marginBottom: 12 }}>DJ and Club context</h3>
          <div className="watch-channel-left">
            <div className="watch-avatar">{stream.owner_name.slice(0, 1).toUpperCase()}</div>
            <div>
              <h2 className="watch-channel-name">{stream.owner_name}</h2>
              <p className="muted">@{stream.owner_username || "unknown-dj"}</p>
              <p className="muted">Клуб: {stream.club_title || "Клуб не привязан"}</p>
            </div>
          </div>
          {!stream.owner_username ? <p className="muted">DJ username unavailable in stream payload.</p> : null}
          {!stream.club_id ? <p className="muted">К этому эфиру клуб не привязан.</p> : null}
        </section>

        {canManageStream ? (
          <Card>
            <h3>Creator controls</h3>
            <p className="muted">Редактирование доступно только владельцу или admin назначенного клуба.</p>
            <Button variant="secondary" onClick={() => setSettingsOpen(true)}>
              Открыть настройки стрима
            </Button>
          </Card>
        ) : null}
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
        streamIdKey={stream.id}
      />
    </section>
  );
}
