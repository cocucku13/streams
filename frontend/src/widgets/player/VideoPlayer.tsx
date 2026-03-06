import Hls from "hls.js";
import { Maximize, Minimize2, Pause, Play, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "../../shared/ui/Badge";
import { Button } from "../../shared/ui/Button";
import { Select } from "../../shared/ui/Select";

type LatencyMode = "auto" | "low" | "normal";

export function VideoPlayer({ hlsUrl, whepUrl }: { hlsUrl: string; whepUrl: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [quality, setQuality] = useState("auto");
  const [mode, setMode] = useState<"webrtc" | "hls" | "none">("none");
  const [latencyMode, setLatencyMode] = useState<LatencyMode>("auto");

  useEffect(() => {
    const onFullscreen = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => document.removeEventListener("fullscreenchange", onFullscreen);
  }, []);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) {
      return;
    }
    const video = videoEl;

    let hls: Hls | null = null;
    let peer: RTCPeerConnection | null = null;
    let receivedTrack = false;
    let webrtcTimeout: ReturnType<typeof setTimeout> | null = null;

    async function start() {
      const startHls = async () => {
        video.srcObject = null;
        if (Hls.isSupported()) {
          hls = new Hls({ lowLatencyMode: latencyMode !== "normal", liveSyncDurationCount: 2 });
          hls.loadSource(hlsUrl);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, async () => {
            video.muted = true;
            await video.play().catch(() => undefined);
          });
        } else {
          video.src = hlsUrl;
          video.muted = true;
          await video.play().catch(() => undefined);
        }
        setMode("hls");
      };

      try {
        if (latencyMode !== "normal") {
          peer = new RTCPeerConnection();
          const remote = new MediaStream();
          video.srcObject = remote;
          video.muted = true;
          peer.addTransceiver("audio", { direction: "recvonly" });
          peer.addTransceiver("video", { direction: "recvonly" });
          peer.ontrack = (event) => {
            receivedTrack = true;
            event.streams[0].getTracks().forEach((track) => remote.addTrack(track));
          };
          peer.onconnectionstatechange = () => {
            if (!peer) {
              return;
            }
            if (peer.connectionState === "failed" || peer.connectionState === "disconnected" || peer.connectionState === "closed") {
              startHls().catch(() => setMode("none"));
            }
          };
          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);
          const response = await fetch(whepUrl, {
            method: "POST",
            headers: { "Content-Type": "application/sdp" },
            body: offer.sdp,
          });
          if (!response.ok) {
            throw new Error("WebRTC unavailable");
          }
          const answer = await response.text();
          await peer.setRemoteDescription({ type: "answer", sdp: answer });
          await video.play();
          webrtcTimeout = setTimeout(() => {
            if (!receivedTrack) {
              if (peer) {
                peer.close();
              }
              startHls().catch(() => setMode("none"));
            }
          }, 3500);
          setMode("webrtc");
          return;
        }
      } catch {
        if (peer) {
          peer.close();
          peer = null;
        }
      }

      try {
        await startHls();
      } catch {
        setMode("none");
      }
    }

    start();

    return () => {
      if (hls) {
        hls.destroy();
      }
      if (peer) {
        peer.close();
      }
      if (webrtcTimeout) {
        clearTimeout(webrtcTimeout);
      }
    };
  }, [hlsUrl, whepUrl, latencyMode]);

  const latencyLabel = mode === "webrtc" ? "~1.2s" : mode === "hls" ? "~3-5s" : "Auto";

  async function toggleFullscreen() {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    if (!document.fullscreenElement) {
      await container.requestFullscreen().catch(() => undefined);
      return;
    }

    await document.exitFullscreen().catch(() => undefined);
  }

  return (
    <div ref={containerRef} className={isFullscreen ? "player-card is-fullscreen" : "player-card"}>
      <video ref={videoRef} className="video-frame" controls={false} playsInline autoPlay />

      <div className="player-overlay">
        <div className="player-controls">
          <div className="row gap">
          <Button
            variant="ghost"
            onClick={() => {
              const video = videoRef.current;
              if (!video) {
                return;
              }
              if (video.paused) {
                video.play();
                setPlaying(true);
              } else {
                video.pause();
                setPlaying(false);
              }
            }}
          >
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </Button>
          <Button variant="ghost">
            <Volume2 size={16} />
          </Button>
          <Select value={quality} onChange={(event) => setQuality(event.target.value)}>
            <option value="auto">Auto</option>
            <option value="1080">1080p</option>
            <option value="720">720p</option>
          </Select>
          <Select value={latencyMode} onChange={(event) => setLatencyMode(event.target.value as LatencyMode)}>
            <option value="auto">Latency: Auto</option>
            <option value="low">Latency: Low</option>
            <option value="normal">Latency: Normal</option>
          </Select>
          </div>

          <div className="row gap">
            <Badge tone={mode === "webrtc" ? "low" : "neutral"}>Latency {latencyLabel}</Badge>
            <Button variant="ghost" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize size={16} />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
