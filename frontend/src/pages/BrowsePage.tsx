import { useQuery } from "@tanstack/react-query";
import { Radio } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { browseApi } from "../api";
import { Button } from "../shared/ui/Button";
import { StreamGrid } from "../widgets/stream/StreamGrid";
import type { StreamWithMeta } from "../types";

const SECTION_LIMIT = 8;

function applyViewerCounts(streams: StreamWithMeta[], viewerCounts: Record<number, number>): StreamWithMeta[] {
  return streams.map((stream) => {
    const refreshedViewers = viewerCounts[stream.id];
    if (refreshedViewers === undefined) return stream;
    return {
      ...stream,
      viewer_count: refreshedViewers,
    };
  });
}

export function BrowsePage() {
  const [viewerCounts, setViewerCounts] = useState<Record<number, number>>({});

  const { data, isLoading, error } = useQuery({
    queryKey: ["browse-discover"],
    queryFn: () => browseApi.discoverStreams(20),
  });

  useEffect(() => {
    if (!data?.length) return;

    let isMounted = true;

    const refreshCounts = async () => {
      try {
        const counts = await browseApi.refreshViewerCounts(data.map((stream) => stream.id));
        if (isMounted) {
          setViewerCounts(counts);
        }
      } catch {
        // Keep previous counts if refresh fails.
      }
    };

    refreshCounts();
    const intervalId = window.setInterval(refreshCounts, 10_000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [data]);

  const streams = useMemo(() => applyViewerCounts(data || [], viewerCounts), [data, viewerCounts]);
  const trendingNow = useMemo(() => [...streams].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, SECTION_LIMIT), [streams]);
  const liveDjs = useMemo(() => [...streams].sort((a, b) => b.viewer_count - a.viewer_count).slice(0, SECTION_LIMIT), [streams]);
  const justStarted = useMemo(
    () => [...streams].sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()).slice(0, SECTION_LIMIT),
    [streams]
  );

  return (
    <section className="page-stack">
      <div className="page-hero">
        <div className="hero-content">
          <p className="hero-kicker">DJ Streams</p>
          <h1>LIVE DJ STREAMS</h1>
          <p className="hero-subtitle">Смотри лайвы диджеев и узнай, что играет в клубе до того, как туда пойти.</p>
          <div className="hero-actions">
            <Link to="#live-grid">
              <Button>Смотреть эфиры</Button>
            </Link>
            <Link to="/dashboard/stream">
              <Button variant="ghost">Стать диджеем</Button>
            </Link>
          </div>
        </div>
        <div className="hero-stat">
          <Radio size={18} />
          <strong>{streams.length}</strong>
          <span>live сетов</span>
        </div>
      </div>

      {error && <p className="error">Не удалось загрузить эфиры. Обновите страницу.</p>}

      {isLoading && (
        <div id="live-grid" className="page-stack">
          <section className="page-stack">
            <h2>Trending now</h2>
            <StreamGrid streams={[]} loading />
          </section>
          <section className="page-stack">
            <h2>Live DJs</h2>
            <StreamGrid streams={[]} loading />
          </section>
          <section className="page-stack">
            <h2>Just started</h2>
            <StreamGrid streams={[]} loading />
          </section>
        </div>
      )}

      {!isLoading && !streams.length && <p className="muted">No DJs are live right now.</p>}

      {!isLoading && streams.length > 0 && (
        <div id="live-grid" className="page-stack">
          <section className="page-stack">
            <h2>Trending now</h2>
            <StreamGrid streams={trendingNow} loading={false} />
          </section>
          <section className="page-stack">
            <h2>Live DJs</h2>
            <StreamGrid streams={liveDjs} loading={false} />
          </section>
          <section className="page-stack">
            <h2>Just started</h2>
            <StreamGrid streams={justStarted} loading={false} />
          </section>
        </div>
      )}
    </section>
  );
}
