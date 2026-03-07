import { useQuery } from "@tanstack/react-query";
import { Eye, Settings, Share2, Users } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ApiError, browseApi, clubApi, djApi, profileApi, streamApi } from "../api";
import { EditStreamSettingsModal } from "../features/editStreamInline/EditStreamSettingsModal";
import { useAuth } from "../shared/hooks/useAuth";
import { copyText } from "../shared/lib/utils";
import { Button } from "../shared/ui/Button";
import { StreamUnavailableState } from "../shared/ui/StreamUnavailableState";
import { ChatPanel } from "../widgets/chat/ChatPanel";
import { VideoPlayer } from "../widgets/player/VideoPlayer";

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
      clubMembers?.some(
        (member) =>
          member.user_id === me.id &&
          member.status === "active" &&
          ["owner", "admin"].includes(member.role)
      )
  );
  const canManageStream = Boolean(isStreamOwner || isClubManager);
  const effectiveViewerCount = viewerCount?.viewer_count ?? stream?.viewer_count ?? 0;

  if (isLoading) {
    return (
      <div className="watch-loading-state">
        <div className="watch-loading-player" />
        <p className="watch-loading-label">Подключаем трансляцию…</p>
      </div>
    );
  }

  if (isError && error instanceof ApiError && error.status === 404) {
    return (
      <StreamUnavailableState
        title="Эфир не найден"
        description="Проверьте ссылку или откройте активный эфир из каталога."
      />
    );
  }

  if (!stream) {
    return (
      <StreamUnavailableState
        title="Эфир недоступен"
        description="Трансляция завершена или временно недоступна."
      />
    );
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
    <div className="watch-page">
      <div className="watch-layout">
        {/* Left: player + info */}
        <div className="watch-main">
          {/* Player */}
          <div className="watch-player-wrap">
            <VideoPlayer hlsUrl={stream.hls_url} whepUrl={stream.whep_url} />
          </div>

          {/* Stream info card */}
          <div className="watch-info-card">
            <div className="watch-info-top">
              {/* Avatar + DJ identity */}
              <div className="watch-dj-identity">
                <div className="watch-dj-avatar">
                  {stream.owner_name.slice(0, 1).toUpperCase()}
                </div>
                <div className="watch-dj-text">
                  <span className="watch-dj-label">DJ</span>
                  <p className="watch-dj-name">{stream.owner_name}</p>
                  {stream.owner_username && (
                    <p className="watch-dj-handle">@{stream.owner_username}</p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="watch-info-actions">
                {stream.owner_username ? (
                  <Link to={`/dj/${stream.owner_username}`}>
                    <Button variant="secondary">Профиль DJ</Button>
                  </Link>
                ) : null}
                <Button
                  variant="ghost"
                  onClick={async () => {
                    await copyText(window.location.href);
                    toast.success("Ссылка на эфир скопирована");
                  }}
                >
                  <Share2 size={15} />
                  Поделиться
                </Button>
                {canManageStream && (
                  <Button variant="ghost" onClick={() => setSettingsOpen(true)}>
                    <Settings size={15} />
                  </Button>
                )}
              </div>
            </div>

            {/* Title + meta */}
            <div className="watch-info-body">
              <h1 className="watch-stream-title">{stream.title}</h1>

              <div className="watch-meta-pills">
                <span className="watch-live-badge">
                  <span className="watch-live-dot" />
                  LIVE
                </span>
                <span className="watch-stat-pill">
                  <Eye size={13} />
                  {effectiveViewerCount} зрителей
                </span>
                {stream.genre ? (
                  <span className="watch-genre-pill">{stream.genre}</span>
                ) : null}
                {stream.club_title ? (
                  <span className="watch-club-pill">
                    <Users size={12} />
                    {stream.club_title}
                  </span>
                ) : null}
              </div>

              {stream.description ? (
                <p className="watch-description">{stream.description}</p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Right: chat */}
        <aside className="watch-chat">
          <ChatPanel streamId={stream.id} disabled={!isAuthed} />
        </aside>
      </div>

      <EditStreamSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        stream={stream}
        canEditClub={isStreamOwner}
        clubs={myDjProfile?.clubs || []}
        canManage={canManageStream}
        streamIdKey={stream.id}
      />
    </div>
  );
}
