import { motion } from "framer-motion";
import { Eye, MoreHorizontal } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "../../shared/ui/Badge";
import { Button } from "../../shared/ui/Button";
import type { PublicStream, StreamWithMeta } from "../../types";

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

export function StreamCard({ stream }: { stream: PublicStream | StreamWithMeta }) {
  const peakViewers = "peak_viewers" in stream ? stream.peak_viewers ?? stream.viewer_count : stream.viewer_count;
  const startedAt = "started_at" in stream ? stream.started_at : stream.updated_at || stream.created_at;

  return (
    <motion.article className="stream-card ui-card" whileHover={{ scale: 1.02 }} transition={{ duration: 0.15 }}>
      <Link to={`/watch/${stream.id}`} className="stream-thumb">
        <div className="stream-thumb-overlay">
          <Badge tone="live">LIVE</Badge>
          <span className="viewers">
            <Eye size={14} /> {stream.viewer_count}
          </span>
        </div>
      </Link>

      <div className="stream-meta">
        <div className="stream-meta-head">
          <h3>{stream.title}</h3>
          <Button variant="ghost" aria-label="More" disabled title="Скоро">
            <MoreHorizontal size={16} />
          </Button>
        </div>
        <p className="stream-dj">@{stream.owner_username || stream.owner_name}</p>
        <p className="muted">Viewers: {stream.viewer_count} | Peak: {peakViewers}</p>
        <p className="muted">Started: {formatStartedAt(startedAt)}</p>
        <p className="muted">Club: {stream.club_title || "Not linked"}</p>
        <p className="stream-now-playing">Now Playing: {stream.current_track || "не указан"}</p>
        <div className="stream-tags">
          <Badge tone="club">{stream.genre || "open format"}</Badge>
        </div>

        <div className="stream-actions">
          <Link to={`/watch/${stream.id}`}>
            <Button variant="primary">Смотреть</Button>
          </Link>
          <Button variant="secondary" disabled title="Скоро">
            Подписаться
          </Button>
        </div>
      </div>
    </motion.article>
  );
}
