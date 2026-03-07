import { useEffect, useState } from "react";

export function useSafeImageUrl(url: string): string {
  const [safeUrl, setSafeUrl] = useState(url);

  useEffect(() => {
    if (!url) {
      setSafeUrl("");
      return;
    }

    let active = true;
    const image = new Image();
    image.onload = () => {
      if (active) {
        setSafeUrl(url);
      }
    };
    image.onerror = () => {
      if (active) {
        setSafeUrl("");
      }
    };
    image.src = url;

    return () => {
      active = false;
    };
  }, [url]);

  return safeUrl;
}