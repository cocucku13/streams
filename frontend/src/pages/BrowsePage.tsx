import Hls from "hls.js";
import { useQuery } from "@tanstack/react-query";
import { Music, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { browseApi } from "../api";
import { StreamGrid } from "../widgets/stream/StreamGrid";
import type { StreamWithMeta } from "../types";

const SECTION_LIMIT = 8;
const FEATURED_WARMUP_MS = 320;

type NavigatorWithConnection = Navigator & {
  connection?: {
    saveData?: boolean;
  };
};

function applyViewerCounts(streams: StreamWithMeta[], viewerCounts: Record<number, number>): StreamWithMeta[] {
  return streams.map((stream) => {
    const refreshedViewers = viewerCounts[stream.id];
    if (refreshedViewers === undefined) return stream;
    return { ...stream, viewer_count: refreshedViewers };
  });
}

function pluralStreams(n: number) {
  if (n % 100 >= 11 && n % 100 <= 19) return `${n} стримов`;
  const r = n % 10;
  if (r === 1) return `${n} стрим`;
  if (r >= 2 && r <= 4) return `${n} стрима`;
  return `${n} стримов`;
}

function FeaturedHero({ stream }: { stream: StreamWithMeta }) {
  const [isPreviewActive, setIsPreviewActive] = useState(false);
  const [hasFrame, setHasFrame] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const warmupTimerRef = useRef<number | null>(null);

  const canUsePreview = useMemo(() => {
    if (!stream.hls_url) return false;
    if (typeof window === "undefined") return false;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = (navigator as NavigatorWithConnection).connection?.saveData === true;
    return !prefersReducedMotion && !saveData;
  }, [stream.hls_url]);

  const clearWarmupTimer = useCallback(() => {
    if (warmupTimerRef.current !== null) {
      window.clearTimeout(warmupTimerRef.current);
      warmupTimerRef.current = null;
    }
  }, []);

  const destroyPreview = useCallback(() => {
    clearWarmupTimer();

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.removeAttribute("src");
    video.load();
  }, [clearWarmupTimer]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !canUsePreview) return;

    video.muted = true;
    video.playsInline = true;

    const onLoadedData = () => {
      setHasFrame(true);
    };
    video.addEventListener("loadeddata", onLoadedData);

    const warmupPreview = () => {
      void video.play().then(() => {
        clearWarmupTimer();
        warmupTimerRef.current = window.setTimeout(() => {
          video.pause();
          setHasFrame(true);
        }, FEATURED_WARMUP_MS);
      }).catch(() => {
        setHasFrame(false);
      });
    };

    if (Hls.isSupported()) {
      const hls = new Hls({ lowLatencyMode: false, liveSyncDurationCount: 2 });
      hlsRef.current = hls;
      hls.loadSource(stream.hls_url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, warmupPreview);
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          setIsPreviewActive(false);
          setHasFrame(false);
          destroyPreview();
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = stream.hls_url;
      warmupPreview();
    }

    return () => {
      video.removeEventListener("loadeddata", onLoadedData);
      destroyPreview();
    };
  }, [canUsePreview, clearWarmupTimer, destroyPreview, stream.hls_url]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !canUsePreview) return;

    if (!isPreviewActive) {
      video.pause();
      return;
    }

    void video.play().catch(() => undefined);
  }, [canUsePreview, isPreviewActive]);

  const previewClassName = [
    "featured-preview",
    hasFrame ? "featured-preview--has-frame" : "",
    isPreviewActive ? "featured-preview--previewing" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="featured-hero">
      {/* glow backdrop */}
      <div className="featured-hero-glow" />

      {/* left: preview */}
      <Link
        to={`/watch/${stream.id}`}
        className={previewClassName}
        aria-label={`Смотреть эфир ${stream.title}`}
        onMouseEnter={() => setIsPreviewActive(true)}
        onMouseLeave={() => setIsPreviewActive(false)}
        onFocus={() => setIsPreviewActive(true)}
        onBlur={() => setIsPreviewActive(false)}
      >
        <div className="featured-preview-bg" />
        <video
          ref={videoRef}
          className="featured-preview-video"
          muted
          playsInline
          preload="none"
          disablePictureInPicture
        />
        <div className="featured-preview-gradient" />
        {/* play hint */}
        <div className="featured-play-hint">
          <span className="featured-play-circle">▶</span>
        </div>
      </Link>

      {/* right: meta */}
      <div className="featured-meta">
        <div className="featured-meta-inner">
          <div className="featured-meta-top">
            <span className="featured-live-badge">
              <span className="featured-live-dot" />
              В ЭФИРЕ
            </span>
            {stream.genre ? <span className="featured-genre-badge">{stream.genre}</span> : null}
          </div>

          <h2 className="featured-title">{stream.title}</h2>

          <div className="featured-dj-row">
            <div className="featured-dj-avatar">
              {(stream.owner_name || stream.owner_username || "D").slice(0, 1).toUpperCase()}
            </div>
            <div>
              <p className="featured-dj-name">{stream.owner_name || stream.owner_username}</p>
              {stream.owner_username && (
                <p className="featured-dj-handle">@{stream.owner_username}</p>
              )}
            </div>
          </div>

          <div className="featured-stats-row">
            <span className="featured-stat">
              <Users size={13} />
              {stream.viewer_count} зрителей
            </span>
            {stream.current_track ? (
              <span className="featured-stat">
                <Music size={13} />
                {stream.current_track}
              </span>
            ) : null}
          </div>

          <div className="featured-actions">
            <Link to={`/watch/${stream.id}`} className="featured-cta-primary">
              Смотреть эфир
            </Link>
            {stream.owner_username ? (
              <Link to={`/dj/${stream.owner_username}`} className="featured-cta-secondary">
                Профиль DJ
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div className="section-header">
      <h2 className="section-header-title">{title}</h2>
      {count !== undefined ? (
        <span className="section-header-badge">{count}</span>
      ) : null}
    </div>
  );
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
        if (isMounted) setViewerCounts(counts);
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
  const byPopularity = useMemo(
    () => [...streams].sort((a, b) => b.viewer_count - a.viewer_count).slice(0, SECTION_LIMIT),
    [streams]
  );
  const byRecent = useMemo(
    () =>
      [...streams]
        .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
        .slice(0, SECTION_LIMIT),
    [streams]
  );

  const featured = byPopularity[0];
  const liveNow = byPopularity.slice(1);
  const recentIds = new Set((featured ? [featured.id] : []).concat(liveNow.map((s) => s.id)));
  const justStarted = byRecent.filter((s) => !recentIds.has(s.id)).slice(0, SECTION_LIMIT);

  const genres = useMemo(() => {
    const counts = new Map<string, number>();
    streams.forEach((stream) => {
      const genre = stream.genre?.trim();
      if (!genre) return;
      counts.set(genre, (counts.get(genre) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [streams]);

  return (
    <div className="browse-page">
      {error && (
        <p className="browse-error">Не удалось загрузить эфиры. Обновите страницу.</p>
      )}

      {isLoading && (
        <div className="browse-sections">
          <div className="browse-skeleton-hero" />
          <SectionHeader title="Сейчас в эфире" />
          <StreamGrid streams={[]} loading />
        </div>
      )}

      {!isLoading && !streams.length && (
        <div className="browse-empty">
          <StreamGrid streams={[]} loading={false} />
        </div>
      )}

      {!isLoading && streams.length > 0 && (
        <div className="browse-sections">
          {featured ? <FeaturedHero stream={featured} /> : null}

          <section>
            <SectionHeader title="Сейчас в эфире" count={streams.length} />
            <p className="browse-count-label">{pluralStreams(streams.length)} в эфире прямо сейчас</p>
            <StreamGrid streams={liveNow.length ? liveNow : byPopularity} loading={false} />
          </section>

          {justStarted.length > 0 ? (
            <section>
              <SectionHeader title="Только начали" count={justStarted.length} />
              <StreamGrid streams={justStarted} loading={false} />
            </section>
          ) : null}

          {genres.length > 0 ? (
            <section>
              <SectionHeader title="Жанры" />
              <div className="genre-tags-row">
                {genres.map((genre) => (
                  <Link
                    key={genre.name}
                    to={`/directory/${encodeURIComponent(genre.name)}`}
                    className="genre-pill"
                  >
                    {genre.name}
                    <span className="genre-pill-count">{genre.count}</span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
