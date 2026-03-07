type YMapsApi = any;

declare global {
  interface Window {
    ymaps?: YMapsApi;
    __ymapsApiLoaderPromise?: Promise<YMapsApi>;
  }
}

const SCRIPT_ID = "yandex-maps-sdk";

function buildScriptSrc(apiKey?: string): string {
  const params = new URLSearchParams({
    lang: "ru_RU",
  });

  if (apiKey) {
    params.set("apikey", apiKey);
  }

  return `https://api-maps.yandex.ru/2.1/?${params.toString()}`;
}

export function loadYandexMapsApi(apiKey?: string): Promise<YMapsApi> {
  if (window.ymaps) {
    return Promise.resolve(window.ymaps);
  }

  if (window.__ymapsApiLoaderPromise) {
    return window.__ymapsApiLoaderPromise;
  }

  window.__ymapsApiLoaderPromise = new Promise<YMapsApi>((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

    const onLoaded = () => {
      if (window.ymaps) {
        resolve(window.ymaps);
        return;
      }
      reject(new Error("Yandex Maps API loaded, but ymaps is unavailable."));
    };

    if (existing) {
      existing.addEventListener("load", onLoaded, { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Yandex Maps API.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = buildScriptSrc(apiKey);
    script.async = true;
    script.type = "text/javascript";
    script.onload = onLoaded;
    script.onerror = () => reject(new Error("Failed to load Yandex Maps API."));
    document.head.appendChild(script);
  });

  return window.__ymapsApiLoaderPromise;
}
