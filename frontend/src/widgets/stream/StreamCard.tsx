import Hls from "hls.js";
import { Eye, Music } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { PublicStream, StreamWithMeta } from "../../types";

const PREVIEW_START_DELAY_MS = 180;
const PREVIEW_EVENT = "streamcard-preview-start";

type NavigatorWithConnection = Navigator & {
  connection?: {
    saveData?: boolean;
  };
};

export function StreamCard({ stream }: { stream: PublicStream | StreamWithMeta }) {
  const [isPointerActive, setIsPointerActive] = useState(false);
  const [isPreviewActive, setIsPreviewActive] = useState(false);
  const [hasFrame, setHasFrame] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const thumbLinkRef = useRef<HTMLAnchorElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const startDelayRef = useRef<number | null>(null);
  const warmupTimerRef = useRef<number | null>(null);

  const canUsePreview = useMemo(() => {
    if (!stream.hls_url) return false;
    if (typeof window === "undefined") return false;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = (navigator as NavigatorWithConnection).connection?.saveData === true;
    return !prefersReducedMotion && !saveData;
  }, [stream.hls_url]);

  const clearPreviewDelay = useCallback(() => {
    if (startDelayRef.current !== null) {
      window.clearTimeout(startDelayRef.current);
      startDelayRef.current = null;
    }
  }, []);

  const clearWarmupTimer = useCallback(() => {
    if (warmupTimerRef.current !== null) {
      window.clearTimeout(warmupTimerRef.current);
      warmupTimerRef.current = null;
    }
  }, []);

  const stopPreview = useCallback(() => {
    clearPreviewDelay();
    clearWarmupTimer();

    const video = videoRef.current;
    if (!video) return;
    video.pause();
  }, [clearPreviewDelay, clearWarmupTimer]);

  const destroyPreview = useCallback(() => {
    const video = videoRef.current;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (!video) return;
    video.pause();
    video.removeAttribute("src");
    video.load();
  }, []);

  useEffect(() => {
    const node = thumbLinkRef.current;
    if (!node || typeof window === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        setIsVisible(Boolean(entry?.isIntersecting));
      },
      { threshold: 0.2 }
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !canUsePreview || !isVisible) return;

    if (hlsRef.current || video.src) return;

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
        }, 320);
      }).catch(() => {
        setHasFrame(true);
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
      clearWarmupTimer();
      video.removeEventListener("loadeddata", onLoadedData);
    };
  }, [canUsePreview, clearWarmupTimer, destroyPreview, isVisible, stream.hls_url]);

  useEffect(() => {
    if (!isPointerActive || !canUsePreview) {
      clearPreviewDelay();
      setIsPreviewActive(false);
      return;
    }

    clearPreviewDelay();
    startDelayRef.current = window.setTimeout(() => {
      setIsPreviewActive(true);
    }, PREVIEW_START_DELAY_MS);

    return () => {
      clearPreviewDelay();
    };
  }, [canUsePreview, clearPreviewDelay, isPointerActive]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onPreviewStarted = (event: Event) => {
      const customEvent = event as CustomEvent<number>;
      if (customEvent.detail === stream.id) return;
      setIsPointerActive(false);
      setIsPreviewActive(false);
      stopPreview();
    };

    window.addEventListener(PREVIEW_EVENT, onPreviewStarted as EventListener);
    return () => {
      window.removeEventListener(PREVIEW_EVENT, onPreviewStarted as EventListener);
    };
  }, [stopPreview, stream.id]);

  useEffect(() => {
    const video = videoRef.current;
    if (!isPreviewActive || !video || !canUsePreview || !isVisible) {
      stopPreview();
      return;
    }

    window.dispatchEvent(new CustomEvent<number>(PREVIEW_EVENT, { detail: stream.id }));

    void video.play().catch(() => undefined);

    return () => {
      stopPreview();
    };
  }, [canUsePreview, isPreviewActive, isVisible, stopPreview, stream.id]);

  useEffect(() => {
    if (!isVisible) {
      setIsPointerActive(false);
      setIsPreviewActive(false);
      stopPreview();
    }
  }, [isVisible, stopPreview]);

  useEffect(() => {
    return () => {
      clearPreviewDelay();
      clearWarmupTimer();
      destroyPreview();
    };
  }, [clearPreviewDelay, clearWarmupTimer, destroyPreview]);

  const cardClass = [
    "stream-card",
    hasFrame ? "stream-card--has-frame" : "",
    isPreviewActive ? "stream-card--previewing" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={cardClass}>
      {/* Thumbnail / preview area */}
      <Link
        ref={thumbLinkRef}
        to={`/watch/${stream.id}`}
        className="stream-thumb"
        aria-label={`Смотреть эфир ${stream.title}`}
        onMouseEnter={() => setIsPointerActive(true)}
        onMouseLeave={() => setIsPointerActive(false)}
        onFocus={() => setIsPointerActive(true)}
        onBlur={() => setIsPointerActive(false)}
      >
        <div className="stream-thumb-bg" />
        <video
          ref={videoRef}
          className="stream-thumb-video"
          muted
          playsInline
          preload="none"
          disablePictureInPicture
        />
        {/* gradient overlay */}
        <div className="stream-thumb-overlay-bottom" />
        {/* top badges */}
        <div className="stream-thumb-top">
          <span className="badge-live-sm">
            <span className="badge-live-dot" />
            LIVE
          </span>
          <span className="badge-viewers">
            <Eye size={11} strokeWidth={2.5} />
            {stream.viewer_count}
          </span>
        </div>
        {/* bottom track */}
        {stream.current_track ? (
          <div className="stream-thumb-track">
            <Music size={10} strokeWidth={2.5} />
            <span>{stream.current_track}</span>
          </div>
        ) : null}
      </Link>

      {/* Meta area */}
      <div className="stream-meta">
        <Link to={`/watch/${stream.id}`} className="stream-title-link">
          <h3 className="stream-title">{stream.title}</h3>
        </Link>
        <p className="stream-dj-name">@{stream.owner_username || stream.owner_name}</p>
        <p className="stream-viewer-count"><Eye size={12} strokeWidth={2} />{stream.viewer_count} зрителей</p>

        {stream.genre ? (
          <div className="stream-tags">
            <span className="badge-genre">{stream.genre}</span>
          </div>
        ) : null}

        <Link to={`/watch/${stream.id}`} className="stream-cta-btn">
          Смотреть эфир
        </Link>
      </div>
    </article>
  );
}
