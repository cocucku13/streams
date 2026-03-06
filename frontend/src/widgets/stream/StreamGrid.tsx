import { StreamCard } from "./StreamCard";
import { Skeleton } from "../../shared/ui/Skeleton";
import type { StreamWithMeta } from "../../types";
import { Button } from "../../shared/ui/Button";
import { Link } from "react-router-dom";

export function StreamGrid({ streams, loading }: { streams: StreamWithMeta[]; loading: boolean }) {
  if (loading) {
    return (
      <section className="stream-grid">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="ui-card">
            <Skeleton className="skeleton-thumb" />
            <Skeleton className="skeleton-line" />
            <Skeleton className="skeleton-line short" />
          </div>
        ))}
      </section>
    );
  }

  if (!streams.length) {
    return (
      <section className="ui-card empty-state">
        <h3>Пока никто не стримит</h3>
        <p>Запусти первый сет в твоем городе и собери аудиторию клуба.</p>
        <div className="row gap">
          <Link to="/dashboard/stream">
            <Button>Стать первым</Button>
          </Link>
          <Button variant="secondary" disabled title="Скоро">
            Посмотреть записи
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="stream-grid">
      {streams.map((stream) => (
        <StreamCard key={stream.id} stream={stream} />
      ))}
    </section>
  );
}
