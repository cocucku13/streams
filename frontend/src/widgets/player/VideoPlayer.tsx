import Hls from "hls.js";
import {
  Maximize,
  Minimize2,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type PlayerMode = "hls" | "native" | "none";

const CONTROL_HIDE_DELAY_MS = 2000;
const LATENCY_TICK_MS = 1000;
const LIVE_SYNC_INTERVAL_MS = 3000;
const LIVE_DRIFT_THRESHOLD_SEC = 5;
const VOLUME_STEP = 0.1;

function getLiveEdge(video: HTMLVideoElement): number | null {
  if (!video.seekable || video.seekable.length === 0) return null;
  return video.seekable.end(video.seekable.length - 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || target.isContentEditable;
}

export function VideoPlayer({ hlsUrl, whepUrl: _whepUrl }: { hlsUrl: string; whepUrl: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimerRef = useRef<number | null>(null);
  const latencyTimerRef = useRef<number | null>(null);
  const liveSyncTimerRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [latencySec, setLatencySec] = useState(0);
  const [isAtLiveEdge, setIsAtLiveEdge] = useState(true);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [mode, setMode] = useState<PlayerMode>("none");

  const clearControlsTimer = useCallback(() => {
    if (controlsTimerRef.current !== null) {
      window.clearTimeout(controlsTimerRef.current);
      controlsTimerRef.current = null;
    }
  }, []);

  const scheduleControlsHide = useCallback(() => {
    clearControlsTimer();
    controlsTimerRef.current = window.setTimeout(() => {
      setControlsVisible(false);
    }, CONTROL_HIDE_DELAY_MS);
  }, [clearControlsTimer]);

  const updateLatencyState = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const liveEdge = getLiveEdge(video);
    if (liveEdge === null || !Number.isFinite(video.currentTime)) {
      setLatencySec(0);
      setIsAtLiveEdge(true);
      return;
    }

    const delay = Math.max(0, liveEdge - video.currentTime);
    setLatencySec(delay);
    setIsAtLiveEdge(delay <= 2.5);
  }, []);

  const jumpToLiveEdge = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const liveEdge = getLiveEdge(video);
    if (liveEdge === null) return;

    // Keep a tiny tail margin to avoid InvalidState in some browsers.
    video.currentTime = Math.max(0, liveEdge - 0.12);
    updateLatencyState();
  }, [updateLatencyState]);

  const safelyPlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    video.volume = volume;

    try {
      video.muted = false;
      await video.play();
      setIsMuted(false);
      setIsPlaying(true);
    } catch {
      // Browser blocked autoplay with sound: fallback to muted start.
      video.muted = true;
      setIsMuted(true);
      await video.play().catch(() => undefined);
      setIsPlaying(!video.paused);
    }
  }, [volume]);

  const stopEngine = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const video = videoRef.current;
    if (!video) return;

    video.pause();
    video.removeAttribute("src");
    video.load();
    setIsPlaying(false);
  }, []);

  const initEngine = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !hlsUrl) {
      setMode("none");
      return;
    }

    stopEngine();

    video.playsInline = true;
    video.preload = "auto";

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = hlsUrl;
      setMode("native");
      await safelyPlay();
      return;
    }

    if (!Hls.isSupported()) {
      setMode("none");
      return;
    }

    const hls = new Hls({
      lowLatencyMode: true,
      liveSyncDurationCount: 2,
      maxLiveSyncPlaybackRate: 1.5,
      enableWorker: true,
      backBufferLength: 30,
    });

    hlsRef.current = hls;
    setMode("hls");

    hls.attachMedia(video);
    hls.loadSource(hlsUrl);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      void safelyPlay();
    });

    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) {
        setMode("none");
        stopEngine();
      }
    });
  }, [hlsUrl, safelyPlay, stopEngine]);

  const resumeAtLive = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    if (hlsRef.current) {
      // Drop stale buffered segments and request latest chunks.
      hlsRef.current.stopLoad();
      hlsRef.current.startLoad(-1);
    }

    jumpToLiveEdge();
    await safelyPlay();
  }, [jumpToLiveEdge, safelyPlay]);

  const togglePlayPause = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    if (!video.paused) {
      video.pause();
      setIsPlaying(false);
      return;
    }

    await resumeAtLive();
  }, [resumeAtLive]);

  const setVideoVolume = useCallback((nextVolume: number) => {
    const normalized = clamp(nextVolume, 0, 1);
    const video = videoRef.current;
    if (!video) return;

    video.volume = normalized;
    video.muted = normalized === 0;

    setVolume(normalized);
    setIsMuted(normalized === 0);
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.muted || video.volume === 0) {
      const restoreVolume = volume > 0 ? volume : 1;
      video.muted = false;
      video.volume = restoreVolume;
      setVolume(restoreVolume);
      setIsMuted(false);
      return;
    }

    video.muted = true;
    setIsMuted(true);
  }, [volume]);

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      await container.requestFullscreen().catch(() => undefined);
      return;
    }

    await document.exitFullscreen().catch(() => undefined);
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  useEffect(() => {
    void initEngine();

    return () => {
      stopEngine();
    };
  }, [initEngine, stopEngine]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted || video.volume === 0);
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("volumechange", onVolumeChange);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("volumechange", onVolumeChange);
    };
  }, []);

  useEffect(() => {
    latencyTimerRef.current = window.setInterval(updateLatencyState, LATENCY_TICK_MS);
    liveSyncTimerRef.current = window.setInterval(() => {
      const video = videoRef.current;
      if (!video || video.paused) return;

      const liveEdge = getLiveEdge(video);
      if (liveEdge === null) return;

      const delay = liveEdge - video.currentTime;
      if (delay > LIVE_DRIFT_THRESHOLD_SEC) {
        jumpToLiveEdge();
      }
    }, LIVE_SYNC_INTERVAL_MS);

    return () => {
      if (latencyTimerRef.current !== null) {
        window.clearInterval(latencyTimerRef.current);
      }
      if (liveSyncTimerRef.current !== null) {
        window.clearInterval(liveSyncTimerRef.current);
      }
    };
  }, [jumpToLiveEdge, updateLatencyState]);

  useEffect(() => {
    scheduleControlsHide();
    return () => {
      clearControlsTimer();
    };
  }, [clearControlsTimer, scheduleControlsHide]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;

      const key = event.key.toLowerCase();
      if ([" ", "f", "m", "arrowup", "arrowdown"].includes(key)) {
        event.preventDefault();
      }

      if (key === " ") {
        void togglePlayPause();
      } else if (key === "f") {
        void toggleFullscreen();
      } else if (key === "m") {
        toggleMute();
      } else if (key === "arrowup") {
        setVideoVolume(volume + VOLUME_STEP);
      } else if (key === "arrowdown") {
        setVideoVolume(volume - VOLUME_STEP);
      }

      setControlsVisible(true);
      scheduleControlsHide();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [scheduleControlsHide, setVideoVolume, toggleFullscreen, toggleMute, togglePlayPause, volume]);

  const latencyLabel = useMemo(() => `Latency ~${latencySec.toFixed(1)}s`, [latencySec]);
  const liveLabel = isAtLiveEdge ? "LIVE" : "LIVE (delayed)";

  return (
    <div
      ref={containerRef}
      className={isFullscreen ? "player-card is-fullscreen" : "player-card"}
      onMouseEnter={() => {
        setControlsVisible(true);
        scheduleControlsHide();
      }}
      onMouseMove={() => {
        setControlsVisible(true);
        scheduleControlsHide();
      }}
      onMouseLeave={() => {
        scheduleControlsHide();
      }}
    >
      <video
        ref={videoRef}
        className="video-frame"
        controls={false}
        playsInline
        autoPlay
        onClick={() => {
          void togglePlayPause();
        }}
        onDoubleClick={() => {
          void toggleFullscreen();
        }}
      />

      <div className={controlsVisible ? "player-overlay is-visible" : "player-overlay"}>
        <div className="player-controls-row">
          <button className="player-icon-btn" onClick={() => void togglePlayPause()} aria-label="Play/Pause">
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>

          <div
            className="player-volume-wrap"
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => setShowVolumeSlider(false)}
          >
            <button className="player-icon-btn" onClick={toggleMute} aria-label="Mute">
              {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <div className={showVolumeSlider ? "player-volume-popover is-open" : "player-volume-popover"}>
              <input
                className="player-volume-slider"
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={isMuted ? 0 : volume}
                onChange={(event) => setVideoVolume(Number(event.target.value))}
                aria-label="Volume"
              />
            </div>
          </div>

          <button
            className={isAtLiveEdge ? "player-live-indicator" : "player-live-indicator is-delayed"}
            onClick={jumpToLiveEdge}
            aria-label="Jump to live"
          >
            <span className="player-live-dot" />
            {liveLabel}
          </button>

          <span className="player-latency-indicator">{latencyLabel}</span>

          <button className="player-icon-btn" onClick={() => void toggleFullscreen()} aria-label="Fullscreen">
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize size={16} />}
          </button>
        </div>
      </div>

      <div className="player-hover-gradient" />

      {mode === "none" ? (
        <div className="player-error-chip">Поток недоступен</div>
      ) : null}
    </div>
  );
}
