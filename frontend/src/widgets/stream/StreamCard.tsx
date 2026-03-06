import { motion } from "framer-motion";
import { Eye, MoreHorizontal } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "../../shared/ui/Badge";
import { Button } from "../../shared/ui/Button";
import type { StreamWithMeta } from "../../types";

export function StreamCard({ stream }: { stream: StreamWithMeta }) {
  return (
    <motion.article className="stream-card ui-card" whileHover={{ scale: 1.02 }} transition={{ duration: 0.15 }}>
      <Link to={`/watch/${stream.id}`} className="stream-thumb">
        <div className="stream-thumb-overlay">
          <Badge tone="live">LIVE</Badge>
          <span className="viewers">
            <Eye size={14} /> {stream.viewers}
          </span>
        </div>
        {stream.latency === "low" && <Badge tone="low" className="latency-badge">Low latency</Badge>}
      </Link>

      <div className="stream-meta">
        <div className="stream-meta-head">
          <h3>{stream.title}</h3>
          <Button variant="ghost" aria-label="More" disabled title="Скоро">
            <MoreHorizontal size={16} />
          </Button>
        </div>
        <p className="stream-dj">{stream.owner_name}</p>
        <p className="muted">Club: {stream.club}</p>
        <p className="stream-now-playing">Now Playing: {stream.current_track || "не указан"}</p>
        <div className="stream-tags">
          <Badge tone="club">{stream.genre || "open format"}</Badge>
          <Badge tone="neutral">{stream.city}</Badge>
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
