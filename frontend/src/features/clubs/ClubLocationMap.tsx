import { useEffect, useMemo, useRef, useState } from "react";
import { loadYandexMapsApi } from "../../shared/lib/yandexMapsLoader";
import { Input } from "../../shared/ui/Input";

type LocationPayload = {
  lat: number;
  lng: number;
  city: string;
  address: string;
};

type Props = {
  onLocationChange: (payload: LocationPayload) => void;
  initialAddress?: string;
  initialLat?: number | null;
  initialLng?: number | null;
};

const DEFAULT_CENTER: [number, number] = [55.751574, 37.573856];

type YMapsInstance = any;

function parseCity(geoObject: any): string {
  const localities: string[] = geoObject?.getLocalities?.() || [];
  const adminAreas: string[] = geoObject?.getAdministrativeAreas?.() || [];
  if (localities.length) {
    return localities[0];
  }
  if (adminAreas.length) {
    return adminAreas[0];
  }

  const components = geoObject?.properties?.get?.("metaDataProperty.GeocoderMetaData.Address.Components") as
    | Array<{ kind: string; name: string }>
    | undefined;
  return components?.find((item) => ["locality", "province", "area"].includes(item.kind))?.name || "";
}

function parseAddress(geoObject: any): string {
  return geoObject?.getAddressLine?.() || geoObject?.properties?.get?.("text") || "";
}

export function ClubLocationMap({ onLocationChange, initialAddress = "", initialLat = null, initialLng = null }: Props) {
  const [address, setAddress] = useState(initialAddress);
  const [coords, setCoords] = useState<[number, number] | null>(
    initialLat != null && initialLng != null ? [initialLat, initialLng] : null
  );
  const [loading, setLoading] = useState(true);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [errorText, setErrorText] = useState("");

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const addressInputRef = useRef<HTMLInputElement | null>(null);
  const ymapsRef = useRef<YMapsInstance | null>(null);
  const mapRef = useRef<any>(null);
  const placemarkRef = useRef<any>(null);
  const suggestRef = useRef<any>(null);
  const isMountedRef = useRef(false);
  const geocodeDebounceRef = useRef<number | null>(null);
  const requestSeqRef = useRef(0);

  const yandexApiKey = useMemo(() => import.meta.env.VITE_YANDEX_MAPS_API_KEY as string | undefined, []);

  const emitLocation = (payload: LocationPayload) => {
    onLocationChange(payload);
  };

  const placeMarker = (coordsValue: [number, number], centerMap = true) => {
    const map = mapRef.current;
    const ymaps = ymapsRef.current;
    if (!map || !ymaps) {
      return;
    }

    if (placemarkRef.current) {
      map.geoObjects.remove(placemarkRef.current);
      placemarkRef.current.events.remove("dragend");
    }

    const placemark = new ymaps.Placemark(coordsValue, {}, { draggable: true });
    placemark.events.add("dragend", () => {
      const current = placemark.geometry.getCoordinates() as [number, number];
      void resolveByCoords(current);
    });
    placemarkRef.current = placemark;
    map.geoObjects.add(placemark);

    if (centerMap) {
      map.setCenter(coordsValue, Math.max(map.getZoom(), 14), { duration: 180 });
    }
  };

  const resolveByCoords = async (coordsValue: [number, number]) => {
    const ymaps = ymapsRef.current;
    if (!ymaps) {
      return;
    }

    const requestId = ++requestSeqRef.current;
    setIsGeocoding(true);
    setErrorText("");

    const applyGeoObject = (geoObject: any) => {
      if (!geoObject || requestId !== requestSeqRef.current || !isMountedRef.current) {
        return false;
      }

      const parsedAddress = parseAddress(geoObject);
      const parsedCity = parseCity(geoObject);
      if (!parsedAddress) {
        return false;
      }

      setCoords(coordsValue);
      setAddress(parsedAddress);
      emitLocation({
        lat: coordsValue[0],
        lng: coordsValue[1],
        city: parsedCity,
        address: parsedAddress,
      });
      return true;
    };

    try {
      const houseResult = await ymaps.geocode(coordsValue, { kind: "house", results: 1 });
      if (applyGeoObject(houseResult.geoObjects.get(0))) {
        return;
      }
    } catch {
      // fallback below
    }

    try {
      const fallbackResult = await ymaps.geocode(coordsValue, { results: 1 });
      if (applyGeoObject(fallbackResult.geoObjects.get(0))) {
        return;
      }
    } catch {
      // handled below
    } finally {
      if (requestId === requestSeqRef.current && isMountedRef.current) {
        setIsGeocoding(false);
      }
    }

    if (requestId === requestSeqRef.current && isMountedRef.current) {
      setErrorText("Не удалось получить адрес. Выберите другую точку или введите адрес вручную.");
    }
  };

  const resolveByAddress = async (addressValue: string) => {
    const ymaps = ymapsRef.current;
    if (!ymaps || !addressValue.trim()) {
      return;
    }

    const requestId = ++requestSeqRef.current;
    setIsGeocoding(true);
    setErrorText("");

    try {
      const result = await ymaps.geocode(addressValue, { results: 1 });
      const first = result.geoObjects.get(0);
      if (!first || requestId !== requestSeqRef.current || !isMountedRef.current) {
        return;
      }

      const rawCoords = first.geometry?.getCoordinates?.();
      if (!rawCoords || rawCoords.length < 2) {
        setErrorText("Адрес не найден.");
        return;
      }

      const nextCoords: [number, number] = [rawCoords[0], rawCoords[1]];
      placeMarker(nextCoords, true);

      const parsedAddress = parseAddress(first) || addressValue;
      const parsedCity = parseCity(first);

      setCoords(nextCoords);
      setAddress(parsedAddress);
      emitLocation({
        lat: nextCoords[0],
        lng: nextCoords[1],
        city: parsedCity,
        address: parsedAddress,
      });
    } catch {
      if (requestId === requestSeqRef.current && isMountedRef.current) {
        setErrorText("Не удалось обработать адрес.");
      }
    } finally {
      if (requestId === requestSeqRef.current && isMountedRef.current) {
        setIsGeocoding(false);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;

    const init = async () => {
      try {
        const ymaps = await loadYandexMapsApi(yandexApiKey);
        if (!ymaps || !mapContainerRef.current) {
          setLoading(false);
          setErrorText("Не удалось загрузить Яндекс Карты.");
          return;
        }

        ymaps.ready(() => {
          if (!isMountedRef.current || !mapContainerRef.current) {
            return;
          }

          ymapsRef.current = ymaps;
          const initialCenter = coords || DEFAULT_CENTER;
          const map = new ymaps.Map(mapContainerRef.current, {
            center: initialCenter,
            zoom: coords ? 14 : 10,
            controls: ["zoomControl"],
          });
          mapRef.current = map;

          map.events.add("click", (event: any) => {
            const clicked = event.get("coords") as [number, number];
            placeMarker(clicked, false);
            void resolveByCoords(clicked);
          });

          if (addressInputRef.current) {
            suggestRef.current = new ymaps.SuggestView(addressInputRef.current);
            suggestRef.current.events.add("select", (event: any) => {
              const value = event?.get?.("item")?.value || "";
              if (!value) {
                return;
              }
              setAddress(value);
              void resolveByAddress(value);
            });
          }

          if (coords) {
            placeMarker(coords, true);
          }

          setLoading(false);
        });
      } catch {
        setLoading(false);
        setErrorText("Не удалось загрузить Яндекс Карты.");
      }
    };

    void init();

    return () => {
      isMountedRef.current = false;
      if (geocodeDebounceRef.current) {
        window.clearTimeout(geocodeDebounceRef.current);
      }
      if (placemarkRef.current) {
        placemarkRef.current.events.remove("dragend");
      }
      if (suggestRef.current?.destroy) {
        suggestRef.current.destroy();
      }
      if (mapRef.current) {
        mapRef.current.destroy();
      }
    };
  }, []);

  return (
    <div className="club-location-map">
      <label>
        Адрес
        <Input
          ref={addressInputRef}
          value={address}
          placeholder="Начните вводить адрес или кликните по карте"
          onChange={(event) => {
            const nextAddress = event.target.value;
            setAddress(nextAddress);
            if (geocodeDebounceRef.current) {
              window.clearTimeout(geocodeDebounceRef.current);
            }
            geocodeDebounceRef.current = window.setTimeout(() => {
              void resolveByAddress(nextAddress);
            }, 500);
          }}
        />
      </label>

      <div className="club-create-map" ref={mapContainerRef} />

      {loading ? <p className="muted">Загрузка карты...</p> : null}
      {isGeocoding ? <p className="muted">Определяем адрес...</p> : null}
      {errorText ? <p className="error">{errorText}</p> : null}

      <input type="hidden" name="lat" value={coords?.[0] ?? ""} />
      <input type="hidden" name="lng" value={coords?.[1] ?? ""} />

      <p className="muted">
        Кликните по карте, чтобы поставить метку. Метку можно перетаскивать, адрес обновится автоматически.
        {coords ? ` Координаты: ${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}.` : ""}
      </p>
    </div>
  );
}
