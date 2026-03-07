import Hls from "hls.js";
import {
  Maximize,
  Minimize2,
  Pause,
  Play,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

type PlayerMode = "hidden" | "full" | "mini";

type ActiveStream = {
  streamId: string;
  hlsUrl: string;
  title?: string;
  djName?: string;
};

type GlobalPlayerContextValue = {
  mode: PlayerMode;
  activeStream: ActiveStream | null;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  latencySec: number;
  isAtLiveEdge: boolean;
  attachStream: (stream: ActiveStream) => void;
  setFullMountNode: (node: HTMLElement | null) => void;
  handleWatchUnmount: () => void;
};

const CONTROL_HIDE_DELAY_MS = 2000;
const LATENCY_TICK_MS = 1000;
const LIVE_SYNC_INTERVAL_MS = 3000;
const LIVE_DRIFT_THRESHOLD_SEC = 5;
const RECOVERY_RETRY_MS = 800;
const VOLUME_STEP = 0.1;
const DEFAULT_VOLUME = 0.5;
const VOLUME_KEY = "djstreams.player.volume";
const MUTE_KEY = "djstreams.player.muted";

const GlobalPlayerContext = createContext<GlobalPlayerContextValue | null>(null);

function getLiveEdge(video: HTMLVideoElement): number | null {
  if (!video.seekable || video.seekable.length === 0) return null;
  return video.seekable.end(video.seekable.length - 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || target.isContentEditable;
}

function readPersistedVolume(): number {
  try {
    const raw = window.localStorage.getItem(VOLUME_KEY);
    if (!raw) return DEFAULT_VOLUME;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return DEFAULT_VOLUME;
    return clamp(parsed, 0, 1);
  } catch {
    return DEFAULT_VOLUME;
  }
}

function readPersistedMuted(): boolean {
  try {
    return window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

function persistAudio(volume: number, muted: boolean) {
  try {
    window.localStorage.setItem(VOLUME_KEY, String(clamp(volume, 0, 1)));
    window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    // ignore storage errors
  }
}

export function GlobalLivePlayerProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<PlayerMode>("hidden");
  const [activeStream, setActiveStream] = useState<ActiveStream | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(DEFAULT_VOLUME);
  const [latencySec, setLatencySec] = useState(0);
  const [isAtLiveEdge, setIsAtLiveEdge] = useState(true);
  const [fullMountNode, setFullMountNodeState] = useState<HTMLElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  const parkingNodeRef = useRef<HTMLDivElement | null>(null);
  const lastAudibleVolumeRef = useRef<number>(DEFAULT_VOLUME);
  const activeStreamRef = useRef<ActiveStream | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const currentStreamUrlRef = useRef<string | null>(null);
  const controlsTimerRef = useRef<number | null>(null);
  const recoveryTimerRef = useRef<number | null>(null);
  const latencyTimerRef = useRef<number | null>(null);
  const liveSyncTimerRef = useRef<number | null>(null);

  useEffect(() => {
    activeStreamRef.current = activeStream;
  }, [activeStream]);

  useEffect(() => {
    const video = document.createElement("video");
    video.className = "video-frame";
    video.playsInline = true;
    video.autoplay = true;
    video.controls = false;
    video.preload = "auto";

    const persistedVolume = readPersistedVolume();
    const persistedMuted = readPersistedMuted();
    video.volume = persistedVolume;
    video.muted = persistedMuted;
    if (persistedVolume > 0) {
      lastAudibleVolumeRef.current = persistedVolume;
    }

    videoElRef.current = video;
    setVolume(persistedVolume);
    setIsMuted(persistedMuted);

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onVolume = () => {
      setVolume(video.volume);
      setIsMuted(video.muted || video.volume === 0);
      if (video.volume > 0) {
        lastAudibleVolumeRef.current = video.volume;
      }
      persistAudio(video.volume, video.muted || video.volume === 0);
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("volumechange", onVolume);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("volumechange", onVolume);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      video.pause();
      video.removeAttribute("src");
      video.load();
      videoElRef.current = null;
    };
  }, []);

  const clearControlsTimer = useCallback(() => {
    if (controlsTimerRef.current !== null) {
      window.clearTimeout(controlsTimerRef.current);
      controlsTimerRef.current = null;
    }
  }, []);

  const clearRecoveryTimer = useCallback(() => {
    if (recoveryTimerRef.current !== null) {
      window.clearTimeout(recoveryTimerRef.current);
      recoveryTimerRef.current = null;
    }
  }, []);

  const scheduleControlsHide = useCallback(() => {
    clearControlsTimer();
    controlsTimerRef.current = window.setTimeout(() => {
      setControlsVisible(false);
    }, CONTROL_HIDE_DELAY_MS);
  }, [clearControlsTimer]);

  const destroyEngine = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const video = videoElRef.current;
    if (!video) return;

    video.pause();
    video.removeAttribute("src");
    video.load();
    currentStreamUrlRef.current = null;
    setIsPlaying(false);
  }, []);

  const safelyPlay = useCallback(async () => {
    const video = videoElRef.current;
    if (!video) return;

    const preferredVolume = clamp(volume, 0, 1);
    video.volume = preferredVolume;

    try {
      video.muted = false;
      await video.play();
      setIsMuted(false);
      setIsPlaying(true);
      persistAudio(video.volume, false);
    } catch {
      video.muted = true;
      await video.play().catch(() => undefined);
      setIsMuted(true);
      setIsPlaying(!video.paused);
      persistAudio(video.volume, true);
    }
  }, [volume]);

  const initEngineForUrl = useCallback(
    async (url: string, force = false) => {
      const video = videoElRef.current;
      if (!video) return;

      if (!force && currentStreamUrlRef.current === url) {
        const hasAttachedSource = Boolean(hlsRef.current) || video.currentSrc.includes(url) || video.src.includes(url);
        if (hasAttachedSource) {
          return;
        }
      }

      destroyEngine();
      currentStreamUrlRef.current = url;

      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = url;
        await safelyPlay();
        return;
      }

      if (!Hls.isSupported()) {
        setMode("hidden");
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
      hls.attachMedia(video);
      hls.loadSource(url);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        clearRecoveryTimer();
        void safelyPlay();
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;
        clearRecoveryTimer();
        recoveryTimerRef.current = window.setTimeout(() => {
          const retryUrl = activeStreamRef.current?.hlsUrl;
          if (!retryUrl) {
            destroyEngine();
            setActiveStream(null);
            setMode("hidden");
            return;
          }
          void initEngineForUrl(retryUrl, true);
        }, RECOVERY_RETRY_MS);
      });
    },
    [clearRecoveryTimer, destroyEngine, safelyPlay]
  );

  const recoverPlayback = useCallback(() => {
    clearRecoveryTimer();
    recoveryTimerRef.current = window.setTimeout(() => {
      const retryUrl = activeStreamRef.current?.hlsUrl;
      if (!retryUrl) return;
      void initEngineForUrl(retryUrl, true);
    }, RECOVERY_RETRY_MS);
  }, [clearRecoveryTimer, initEngineForUrl]);

  const setVideoVolume = useCallback((nextVolume: number) => {
    const normalized = clamp(nextVolume, 0, 1);
    const video = videoElRef.current;
    if (!video) return;

    video.volume = normalized;
    video.muted = normalized === 0;
    setVolume(normalized);
    setIsMuted(normalized === 0);
    if (normalized > 0) {
      lastAudibleVolumeRef.current = normalized;
    }
    persistAudio(normalized, normalized === 0);
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoElRef.current;
    if (!video) return;

    if (video.muted || video.volume === 0) {
      const restoreVolume = lastAudibleVolumeRef.current > 0 ? lastAudibleVolumeRef.current : DEFAULT_VOLUME;
      video.muted = false;
      video.volume = restoreVolume;
      setIsMuted(false);
      setVolume(restoreVolume);
      persistAudio(restoreVolume, false);
      return;
    }

    video.muted = true;
    setIsMuted(true);
    persistAudio(video.volume, true);
  }, []);

  const updateLatencyState = useCallback(() => {
    const video = videoElRef.current;
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
    const video = videoElRef.current;
    if (!video) return;

    const liveEdge = getLiveEdge(video);
    if (liveEdge === null) return;

    video.currentTime = Math.max(0, liveEdge - 0.12);
    updateLatencyState();
  }, [updateLatencyState]);

  const resumeAtLive = useCallback(async () => {
    if (hlsRef.current) {
      hlsRef.current.stopLoad();
      hlsRef.current.startLoad(-1);
    }

    jumpToLiveEdge();
    await safelyPlay();
  }, [jumpToLiveEdge, safelyPlay]);

  const togglePlayPause = useCallback(async () => {
    const video = videoElRef.current;
    if (!video) return;

    if (!video.paused) {
      video.pause();
      setIsPlaying(false);
      return;
    }

    const activeUrl = activeStreamRef.current?.hlsUrl;
    if (activeUrl) {
      const missingSource =
        !currentStreamUrlRef.current ||
        video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE ||
        video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA;

      if (missingSource) {
        await initEngineForUrl(activeUrl, true);
      }
    }

    await resumeAtLive();
  }, [initEngineForUrl, resumeAtLive]);

  const toggleFullscreen = useCallback(async () => {
    const currentContainer =
      mode === "full" ? fullMountNode : document.querySelector<HTMLElement>(".floating-mini-player");

    if (!currentContainer) return;

    if (!document.fullscreenElement) {
      await currentContainer.requestFullscreen().catch(() => undefined);
      return;
    }

    await document.exitFullscreen().catch(() => undefined);
  }, [fullMountNode, mode]);

  const closePlayer = useCallback(() => {
    clearRecoveryTimer();
    destroyEngine();
    setActiveStream(null);
    setMode("hidden");
  }, [clearRecoveryTimer, destroyEngine]);

  const attachStream = useCallback((stream: ActiveStream) => {
    setActiveStream((prev) => {
      if (prev && prev.streamId === stream.streamId && prev.hlsUrl === stream.hlsUrl) {
        return {
          ...prev,
          title: stream.title ?? prev.title,
          djName: stream.djName ?? prev.djName,
        };
      }
      return stream;
    });
    setMode("full");
  }, []);

  const handleWatchUnmount = useCallback(() => {
    if (!activeStream) return;
    setMode("mini");
  }, [activeStream]);

  const setFullMountNode = useCallback((node: HTMLElement | null) => {
    setFullMountNodeState(node);
  }, []);

  useEffect(() => {
    if (!activeStream?.hlsUrl || mode === "hidden") return;
    void initEngineForUrl(activeStream.hlsUrl);
  }, [activeStream?.hlsUrl, initEngineForUrl, mode]);

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
    const video = videoElRef.current;
    if (!video) return;

    const onStallLike = () => {
      if (!activeStreamRef.current?.hlsUrl) return;
      recoverPlayback();
    };

    const onPlaying = () => {
      clearRecoveryTimer();
    };

    video.addEventListener("stalled", onStallLike);
    video.addEventListener("waiting", onStallLike);
    video.addEventListener("emptied", onStallLike);
    video.addEventListener("error", onStallLike);
    video.addEventListener("playing", onPlaying);

    return () => {
      video.removeEventListener("stalled", onStallLike);
      video.removeEventListener("waiting", onStallLike);
      video.removeEventListener("emptied", onStallLike);
      video.removeEventListener("error", onStallLike);
      video.removeEventListener("playing", onPlaying);
    };
  }, [clearRecoveryTimer, recoverPlayback]);

  useEffect(() => {
    if (mode === "hidden") return;

    latencyTimerRef.current = window.setInterval(updateLatencyState, LATENCY_TICK_MS);
    liveSyncTimerRef.current = window.setInterval(() => {
      const video = videoElRef.current;
      if (!video || video.paused) return;

      const liveEdge = getLiveEdge(video);
      if (liveEdge === null) return;

      const delay = liveEdge - video.currentTime;
      if (delay > LIVE_DRIFT_THRESHOLD_SEC) {
        jumpToLiveEdge();
      }
    }, LIVE_SYNC_INTERVAL_MS);

    return () => {
      if (latencyTimerRef.current !== null) window.clearInterval(latencyTimerRef.current);
      if (liveSyncTimerRef.current !== null) window.clearInterval(liveSyncTimerRef.current);
    };
  }, [jumpToLiveEdge, mode, updateLatencyState]);

  useEffect(() => {
    if (mode === "hidden") return;

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
  }, [mode, scheduleControlsHide, setVideoVolume, toggleFullscreen, toggleMute, togglePlayPause, volume]);

  useEffect(() => {
    if (mode === "hidden") return;
    setControlsVisible(true);
    scheduleControlsHide();
    return () => {
      clearControlsTimer();
      clearRecoveryTimer();
    };
  }, [clearControlsTimer, clearRecoveryTimer, mode, scheduleControlsHide]);

  const contextValue = useMemo<GlobalPlayerContextValue>(
    () => ({
      mode,
      activeStream,
      isPlaying,
      isMuted,
      volume,
      latencySec,
      isAtLiveEdge,
      attachStream,
      setFullMountNode,
      handleWatchUnmount,
    }),
    [
      activeStream,
      attachStream,
      handleWatchUnmount,
      isAtLiveEdge,
      isMuted,
      isPlaying,
      latencySec,
      mode,
      setFullMountNode,
      volume,
    ]
  );

  return (
    <GlobalPlayerContext.Provider value={contextValue}>
      {children}
      <div ref={parkingNodeRef} className="global-player-parking" />

      {activeStream && mode === "full" && fullMountNode
        ? createPortal(
            <PlayerSurface
              variant="full"
              title={activeStream.title}
              isAtLiveEdge={isAtLiveEdge}
              isPlaying={isPlaying}
              isMuted={isMuted}
              volume={volume}
              controlsVisible={controlsVisible}
              showVolumeSlider={showVolumeSlider}
              setShowVolumeSlider={setShowVolumeSlider}
              setControlsVisible={setControlsVisible}
              scheduleControlsHide={scheduleControlsHide}
              onTogglePlayPause={togglePlayPause}
              onToggleMute={toggleMute}
              onSetVolume={setVideoVolume}
              onJumpToLive={jumpToLiveEdge}
              onToggleFullscreen={toggleFullscreen}
              onClose={closePlayer}
              isFullscreen={isFullscreen}
              videoEl={videoElRef.current}
              parkingNode={parkingNodeRef.current}
            />,
            fullMountNode
          )
        : null}

      {activeStream && mode === "mini" ? (
        <FloatingMiniShell>
          <PlayerSurface
            variant="mini"
            title={activeStream.title}
            isAtLiveEdge={isAtLiveEdge}
            isPlaying={isPlaying}
            isMuted={isMuted}
            volume={volume}
            controlsVisible={true}
            showVolumeSlider={showVolumeSlider}
            setShowVolumeSlider={setShowVolumeSlider}
            setControlsVisible={setControlsVisible}
            scheduleControlsHide={scheduleControlsHide}
            onTogglePlayPause={togglePlayPause}
            onToggleMute={toggleMute}
            onSetVolume={setVideoVolume}
            onJumpToLive={jumpToLiveEdge}
            onToggleFullscreen={toggleFullscreen}
            onClose={closePlayer}
            isFullscreen={isFullscreen}
            videoEl={videoElRef.current}
            parkingNode={parkingNodeRef.current}
            streamId={activeStream.streamId}
          />
        </FloatingMiniShell>
      ) : null}
    </GlobalPlayerContext.Provider>
  );
}

export function useGlobalLivePlayer() {
  const context = useContext(GlobalPlayerContext);
  if (!context) {
    throw new Error("useGlobalLivePlayer must be used within GlobalLivePlayerProvider");
  }
  return context;
}

function FloatingMiniShell({ children }: { children: ReactNode }) {
  return <div className="floating-mini-player">{children}</div>;
}

type PlayerSurfaceProps = {
  variant: "full" | "mini";
  title?: string;
  streamId?: string;
  isAtLiveEdge: boolean;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  controlsVisible: boolean;
  showVolumeSlider: boolean;
  setShowVolumeSlider: (value: boolean) => void;
  setControlsVisible: (value: boolean) => void;
  scheduleControlsHide: () => void;
  onTogglePlayPause: () => Promise<void> | void;
  onToggleMute: () => void;
  onSetVolume: (value: number) => void;
  onJumpToLive: () => void;
  onToggleFullscreen: () => Promise<void> | void;
  onClose: () => void;
  isFullscreen: boolean;
  videoEl: HTMLVideoElement | null;
  parkingNode: HTMLElement | null;
};

function PlayerSurface(props: PlayerSurfaceProps) {
  const {
    variant,
    title,
    streamId,
    isAtLiveEdge,
    isPlaying,
    isMuted,
    volume,
    controlsVisible,
    showVolumeSlider,
    setShowVolumeSlider,
    setControlsVisible,
    scheduleControlsHide,
    onTogglePlayPause,
    onToggleMute,
    onSetVolume,
    onJumpToLive,
    onToggleFullscreen,
    onClose,
    isFullscreen,
    videoEl,
    parkingNode,
  } = props;

  const slotRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!videoEl || !slotRef.current) return;
    slotRef.current.appendChild(videoEl);

    return () => {
      if (parkingNode && videoEl.parentElement !== parkingNode) {
        parkingNode.appendChild(videoEl);
      }
    };
  }, [parkingNode, videoEl]);

  const liveLabel = isAtLiveEdge ? "LIVE" : "LIVE (delayed)";
  if (variant === "mini") {
    return (
      <div className="player-card player-card--mini">
        <div className="player-video-slot" ref={slotRef} />
        <div className="player-hover-gradient" />

        <div className="mini-player-topbar">
          <button
            className={isAtLiveEdge ? "player-live-indicator" : "player-live-indicator is-delayed"}
            onClick={onJumpToLive}
            aria-label="Jump to live"
            title="К live"
          >
            <span className="player-live-dot" />
            LIVE
          </button>
          <button className="player-icon-btn" onClick={onClose} aria-label="Закрыть мини-плеер" title="Закрыть">
            <X size={14} />
          </button>
        </div>

        <div className="mini-player-title" title={title || "Активный эфир"}>{title || "Активный эфир"}</div>

        <div className="mini-player-controls">
          <button className="player-icon-btn" onClick={() => void onTogglePlayPause()} aria-label="Play/Pause">
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button className="player-icon-btn" onClick={onToggleMute} aria-label="Mute">
            {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <button
            className="mini-open-stream-btn"
            onClick={() => {
              if (!streamId) return;
              navigate(`/watch/${streamId}`);
            }}
            aria-label="Вернуться к эфиру"
            title="Открыть стрим"
          >
            К эфиру
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={controlsVisible ? "player-card" : "player-card player-card--cursor-hidden"}
      onMouseEnter={() => {
        setControlsVisible(true);
        scheduleControlsHide();
      }}
      onMouseMove={() => {
        setControlsVisible(true);
        scheduleControlsHide();
      }}
      onMouseLeave={scheduleControlsHide}
    >
      <div
        className="player-video-slot"
        ref={slotRef}
        onClick={() => {
          void onTogglePlayPause();
        }}
        onDoubleClick={() => {
          void onToggleFullscreen();
        }}
      />

      <div className={controlsVisible ? "player-overlay is-visible" : "player-overlay"}>
        <div className="player-controls-row player-controls-row--full">
          <div className="player-controls-left">
            <button className="player-icon-btn" onClick={() => void onTogglePlayPause()} aria-label="Play/Pause">
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>

            <div
              className="player-volume-wrap"
              onMouseEnter={() => setShowVolumeSlider(true)}
              onMouseLeave={() => setShowVolumeSlider(false)}
            >
              <button className="player-icon-btn" onClick={onToggleMute} aria-label="Mute">
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
                  onChange={(event) => onSetVolume(Number(event.target.value))}
                  aria-label="Volume"
                />
              </div>
            </div>

            <button
              className={isAtLiveEdge ? "player-live-indicator" : "player-live-indicator is-delayed"}
              onClick={onJumpToLive}
              aria-label="Jump to live"
            >
              <span className="player-live-dot" />
              {liveLabel}
            </button>
          </div>

          <div className="player-controls-right">
            <button className="player-icon-btn" onClick={() => void onToggleFullscreen()} aria-label="Fullscreen">
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize size={16} />}
            </button>
          </div>
        </div>
      </div>

      <div className="player-hover-gradient" />
    </div>
  );
}
