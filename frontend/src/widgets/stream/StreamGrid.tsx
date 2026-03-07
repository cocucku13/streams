import { Radio } from "lucide-react";
import type { PublicStream, StreamWithMeta } from "../../types";
import { StreamCard } from "./StreamCard";

function CardSkeleton() {
  return (
    <div className="stream-card stream-card--skeleton">
      <div className="stream-thumb stream-thumb--skeleton">
        <div className="skeleton-shimmer" />
      </div>
      <div className="stream-meta">
        <div className="skeleton-line" style={{ width: "80%", height: 18 }} />
        <div className="skeleton-line" style={{ width: "50%", height: 13 }} />
      </div>
    </div>
  );
}

export function StreamGrid({ streams, loading }: { streams: Array<PublicStream | StreamWithMeta>; loading: boolean }) {
  if (loading) {
    return (
      <div className="stream-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!streams.length) {
    return (
      <div className="empty-state-card">
        <Radio size={32} strokeWidth={1.5} className="empty-state-icon" />
        <h3 className="empty-state-title">Сейчас нет активных эфиров</h3>
        <p className="empty-state-body">Загляните позже, когда диджеи снова выйдут в эфир.</p>
      </div>
    );
  }

  const gridClass = streams.length < 3 ? "stream-grid stream-grid--few" : "stream-grid";

  return (
    <div className={gridClass}>
      {streams.map((stream) => (
        <StreamCard key={stream.id} stream={stream} />
      ))}
    </div>
  );
}
