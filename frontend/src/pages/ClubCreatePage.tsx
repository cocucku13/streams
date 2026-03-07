import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { clubApi } from "../api";
import { ClubLocationMap } from "../features/clubs/ClubLocationMap";
import type { DJProfile } from "../types";
import { useSafeImageUrl } from "../shared/hooks/useSafeImageUrl";
import { Button } from "../shared/ui/Button";
import { Input } from "../shared/ui/Input";
import { Textarea } from "../shared/ui/Textarea";

type ClubCreateDraft = {
  slug: string;
  title: string;
  city: string;
  address: string;
  lat: number | null;
  lng: number | null;
  description: string;
};

function createInitialDraft(): ClubCreateDraft {
  return {
    slug: "",
    title: "",
    city: "",
    address: "",
    lat: null,
    lng: null,
    description: "",
  };
}

function emptySocials(): DJProfile["socials"] {
  return {
    telegram: "",
    instagram: "",
    vk: "",
    tiktok: "",
    youtube: "",
    soundcloud: "",
    beatport: "",
    yandex_music: "",
    spotify: "",
    website: "",
  };
}

export function ClubCreatePage() {
  const [draft, setDraft] = useState<ClubCreateDraft>(createInitialDraft());
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [coverPreview, setCoverPreview] = useState("");
  const [locationError, setLocationError] = useState("");
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview("");
      return;
    }
    const localUrl = URL.createObjectURL(avatarFile);
    setAvatarPreview(localUrl);
    return () => URL.revokeObjectURL(localUrl);
  }, [avatarFile]);

  useEffect(() => {
    if (!coverFile) {
      setCoverPreview("");
      return;
    }
    const localUrl = URL.createObjectURL(coverFile);
    setCoverPreview(localUrl);
    return () => URL.revokeObjectURL(localUrl);
  }, [coverFile]);

  const safeAvatarUrl = useSafeImageUrl(avatarPreview);
  const safeCoverUrl = useSafeImageUrl(coverPreview);
  const clubTitle = draft.title.trim() || "Новый клуб";
  const clubSlug = draft.slug.trim() || "new-club";

  const createClubMutation = useMutation({
    mutationFn: async () => {
      const club = await clubApi.create({
        slug: draft.slug.trim().toLowerCase(),
        title: draft.title.trim(),
        city: draft.city.trim(),
        address: draft.address.trim(),
        lat: draft.lat,
        lng: draft.lng,
        description: draft.description.trim(),
        avatar_url: "",
        cover_url: "",
        visibility: "public",
        socials: emptySocials(),
      });

      if (avatarFile) {
        await clubApi.uploadAvatar(club.id, avatarFile);
      }

      if (coverFile) {
        await clubApi.uploadCover(club.id, coverFile);
      }

      return club;
    },
    onSuccess: async (club) => {
      await queryClient.invalidateQueries({ queryKey: ["dj-me"] });
      await queryClient.invalidateQueries({ queryKey: ["club-profile", club.slug] });
      await queryClient.invalidateQueries({ queryKey: ["club-studio", club.id] });
      toast.success("Клуб создан");
      navigate(`/club-studio/${club.id}`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Не удалось создать клуб");
    },
  });

  const canCreateClub = Boolean(draft.slug.trim() && draft.title.trim());

  return (
    <section className="club-page-v2 club-create-page">
      <form
        className="club-page-v2 club-create-page"
        onSubmit={(event) => {
          event.preventDefault();
          if (draft.lat == null || draft.lng == null) {
            setLocationError("Выберите место клуба на карте");
            return;
          }
          setLocationError("");
          if (!canCreateClub || createClubMutation.isPending) {
            return;
          }
          createClubMutation.mutate();
        }}
      >
        <article className="clubv2-hero">
          <div className="clubv2-cover" style={safeCoverUrl ? { backgroundImage: `url(${safeCoverUrl})` } : undefined}>
            <div className="clubv2-cover-glow" />
          </div>

          <div className="clubv2-hero-body">
            <div className="clubv2-avatar" style={safeAvatarUrl ? { backgroundImage: `url(${safeAvatarUrl})` } : undefined}>
              {!safeAvatarUrl ? clubTitle.slice(0, 1).toUpperCase() : null}
            </div>

            <div className="clubv2-main">
              <div className="clubv2-kicker-row">
                <span className="clubv2-slug">club/{clubSlug}</span>
              </div>

              <h1 className="clubv2-title">{clubTitle}</h1>
              <p className="clubv2-city">{draft.address.trim() || "Адрес не указан"}</p>
              <p className="clubv2-description">{draft.description.trim() || "Добавьте описание клуба"}</p>
            </div>

            <div className="clubv2-actions">
              <Link to="/clubs">
                <Button variant="secondary">Назад к клубам</Button>
              </Link>
            </div>
          </div>
        </article>

        <div className="club-create-layout">
          <article className="clubv2-panel club-create-main-panel">
            <h3>Основные данные</h3>
            <div className="form-grid">
              <label>
                Слаг
                <Input
                  name="slug"
                  placeholder="moi-klub-moskva"
                  value={draft.slug}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      slug: event.target.value.replace(/\s+/g, "-").toLowerCase(),
                    }))
                  }
                  required
                />
              </label>
              <label>
                Название клуба
                <Input
                  name="title"
                  placeholder="My Club"
                  value={draft.title}
                  onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
                  required
                />
              </label>
              <label>
                Локация клуба
                <ClubLocationMap
                  initialAddress={draft.address}
                  initialLat={draft.lat}
                  initialLng={draft.lng}
                  onLocationChange={(location) => {
                    setLocationError("");
                    setDraft((prev) => ({
                      ...prev,
                      city: location.city,
                      address: location.address,
                      lat: location.lat,
                      lng: location.lng,
                    }));
                  }}
                />
                {locationError ? <span className="error">{locationError}</span> : null}
              </label>
              <label>
                Описание
                <Textarea
                  name="description"
                  rows={5}
                  value={draft.description}
                  onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
                />
              </label>
            </div>
          </article>

          <article className="clubv2-panel club-create-side-panel">
            <h3>Оформление и запуск</h3>
            <div className="form-grid">
              <label>
                Аватар
                <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <label className="dp-upload-btn" style={{ position: "static" }}>
                    <Camera size={15} />
                    Выбрать файл
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      hidden
                      onChange={(event) => {
                        const file = event.target.files?.[0] || null;
                        setAvatarFile(file);
                      }}
                    />
                  </label>
                  <span className="muted">{avatarFile ? avatarFile.name : "Файл не выбран"}</span>
                </div>
              </label>
              <label>
                Обложка
                <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <label className="dp-upload-btn" style={{ position: "static" }}>
                    <Camera size={15} />
                    Выбрать файл
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      hidden
                      onChange={(event) => {
                        const file = event.target.files?.[0] || null;
                        setCoverFile(file);
                      }}
                    />
                  </label>
                  <span className="muted">{coverFile ? coverFile.name : "Файл не выбран"}</span>
                </div>
              </label>

              <p className="muted">Проверьте данные и создайте клуб. После создания откроется Club Studio.</p>

              <div className="row between" style={{ gap: 10, flexWrap: "wrap" }}>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setDraft(createInitialDraft());
                    setAvatarFile(null);
                    setCoverFile(null);
                    setLocationError("");
                  }}
                  disabled={createClubMutation.isPending}
                >
                  Сбросить
                </Button>
                <Button type="submit" disabled={createClubMutation.isPending || !canCreateClub}>
                  {createClubMutation.isPending ? "Создаём..." : "Создать клуб"}
                </Button>
              </div>
            </div>
          </article>
        </div>
      </form>
    </section>
  );
}
