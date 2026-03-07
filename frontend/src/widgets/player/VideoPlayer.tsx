import { useEffect, useRef } from "react";
import { useGlobalLivePlayer } from "./GlobalLivePlayer";

type VideoPlayerProps = {
  streamId: string;
  hlsUrl: string;
  whepUrl: string;
  title?: string;
  djName?: string;
};

export function VideoPlayer({ streamId, hlsUrl, whepUrl: _whepUrl, title, djName }: VideoPlayerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const handleUnmountRef = useRef<() => void>(() => undefined);
  const { attachStream, setFullMountNode, handleWatchUnmount } = useGlobalLivePlayer();

  useEffect(() => {
    handleUnmountRef.current = handleWatchUnmount;
  }, [handleWatchUnmount]);

  useEffect(() => {
    if (mountRef.current) {
      setFullMountNode(mountRef.current);
    }

    attachStream({
      streamId,
      hlsUrl,
      title,
      djName,
    });

    return () => {
      setFullMountNode(null);
      handleUnmountRef.current();
    };
  }, [attachStream, djName, hlsUrl, setFullMountNode, streamId, title]);

  return <div ref={mountRef} className="global-player-full-slot" />;
}
