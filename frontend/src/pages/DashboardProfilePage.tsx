import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Pencil, Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { djApi } from "../api";
import type { DJProfile } from "../types";
import { Card } from "../shared/ui/Card";
import { Input } from "../shared/ui/Input";
import { SocialLinks } from "../shared/ui/SocialLinks";
import { Textarea } from "../shared/ui/Textarea";
import { WorkspaceHeader } from "../shared/ui/WorkspaceHeader";
import { WorkspaceStateCard } from "../shared/ui/WorkspaceStateCard";
import { useSafeImageUrl } from "../shared/hooks/useSafeImageUrl";

type EditableSection = "identity" | "bio" | "socials";

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

export function DashboardProfilePage() {
  const queryClient = useQueryClient();
  const { data, refetch } = useQuery({ queryKey: ["dj-me"], queryFn: djApi.me });

  const [draft, setDraft] = useState<{
    display_name: string;
    bio: string;
    avatar_url: string;
    cover_url: string;
    socials: DJProfile["socials"];
  }>({
    display_name: "",
    bio: "",
    avatar_url: "",
    cover_url: "",
    socials: emptySocials(),
  });

  const [editing, setEditing] = useState<Record<EditableSection, boolean>>({
    identity: false,
    bio: false,
    socials: false,
  });

  useEffect(() => {
    if (!data) return;
    setDraft({
      display_name: data.display_name,
      bio: data.bio,
      avatar_url: data.avatar_url,
      cover_url: data.cover_url,
      socials: { ...emptySocials(), ...data.socials },
    });
  }, [data]);

  const mutation = useMutation({
    mutationFn: djApi.patchMe,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["dj-me"] });
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      if (data?.username) {
        await queryClient.invalidateQueries({ queryKey: ["dj-profile", data.username] });
      }
      await refetch();
      toast.success("Профиль обновлен");
    },
  });

  const avatarUploadMutation = useMutation({
    mutationFn: djApi.uploadAvatar,
    onSuccess: async ({ url }) => {
      setDraft((prev) => ({ ...prev, avatar_url: url }));
      await queryClient.invalidateQueries({ queryKey: ["dj-me"] });
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      if (data?.username) {
        await queryClient.invalidateQueries({ queryKey: ["dj-profile", data.username] });
      }
      toast.success("Аватар обновлен");
    },
    onError: () => toast.error("Не удалось загрузить аватар"),
  });

  const coverUploadMutation = useMutation({
    mutationFn: djApi.uploadCover,
    onSuccess: async ({ url }) => {
      setDraft((prev) => ({ ...prev, cover_url: url }));
      await queryClient.invalidateQueries({ queryKey: ["dj-me"] });
      if (data?.username) {
        await queryClient.invalidateQueries({ queryKey: ["dj-profile", data.username] });
      }
      toast.success("Обложка обновлена");
    },
    onError: () => toast.error("Не удалось загрузить обложку"),
  });

  const resetAvatarMutation = useMutation({
    mutationFn: djApi.resetAvatar,
    onSuccess: async () => {
      setDraft((prev) => ({ ...prev, avatar_url: "" }));
      await queryClient.invalidateQueries({ queryKey: ["dj-me"] });
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      if (data?.username) {
        await queryClient.invalidateQueries({ queryKey: ["dj-profile", data.username] });
      }
      toast.success("Аватар сброшен");
    },
    onError: () => toast.error("Не удалось сбросить аватар"),
  });

  const resetCoverMutation = useMutation({
    mutationFn: djApi.resetCover,
    onSuccess: async () => {
      setDraft((prev) => ({ ...prev, cover_url: "" }));
      await queryClient.invalidateQueries({ queryKey: ["dj-me"] });
      if (data?.username) {
        await queryClient.invalidateQueries({ queryKey: ["dj-profile", data.username] });
      }
      toast.success("Обложка сброшена");
    },
    onError: () => toast.error("Не удалось сбросить обложку"),
  });

  const safeCoverUrl = useSafeImageUrl(draft.cover_url);
  const safeAvatarUrl = useSafeImageUrl(draft.avatar_url);

  if (!data) {
    return <WorkspaceStateCard title="Профиль DJ" description="Загружаем данные профиля..." />;
  }

  const setSection = (section: EditableSection, value: boolean) => {
    setEditing((prev) => ({ ...prev, [section]: value }));
  };

  const saveSection = (section: EditableSection) => {
    mutation.mutate(draft, {
      onSuccess: () => {
        setSection(section, false);
      },
    });
  };

  return (
    <section className="page-stack">
      <WorkspaceHeader
        title="Профиль DJ"
        description="Редактируйте профиль прямо в интерфейсе: аватар, обложку, био и соцсети."
      />

      <div className="ui-card dp-editor-hero">
        <div
          className="dp-editor-cover"
          style={safeCoverUrl ? { backgroundImage: `url(${safeCoverUrl})` } : undefined}
        >
          <label className="dp-upload-btn" title="Загрузить обложку">
            <Camera size={15} />
            Обложка
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                coverUploadMutation.mutate(file);
              }}
            />
          </label>
          {safeCoverUrl ? (
            <button className="dp-upload-btn dp-upload-btn--secondary" type="button" onClick={() => resetCoverMutation.mutate()}>
              Сбросить
            </button>
          ) : null}
        </div>

        <div className="dp-editor-head">
          <div
            className="dp-editor-avatar"
            style={safeAvatarUrl ? { backgroundImage: `url(${safeAvatarUrl})` } : undefined}
          >
            {!safeAvatarUrl ? draft.display_name.slice(0, 1).toUpperCase() : null}
            <label className="dp-upload-icon" title="Загрузить аватар">
              <Camera size={14} />
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  avatarUploadMutation.mutate(file);
                }}
              />
            </label>
            {safeAvatarUrl ? (
              <button className="dp-upload-icon dp-upload-icon--secondary" type="button" title="Сбросить аватар" onClick={() => resetAvatarMutation.mutate()}>
                <X size={14} />
              </button>
            ) : null}
          </div>

          <div className="dp-editor-main">
            <div className="dp-editor-title-row">
              {editing.identity ? (
                <Input
                  value={draft.display_name}
                  onChange={(event) => setDraft((prev) => ({ ...prev, display_name: event.target.value }))}
                  maxLength={100}
                />
              ) : (
                <h1>{draft.display_name}</h1>
              )}

              <div className="dp-inline-actions">
                {!editing.identity ? (
                  <button className="dp-icon-action" onClick={() => setSection("identity", true)} title="Изменить имя" type="button">
                    <Pencil size={14} />
                  </button>
                ) : (
                  <>
                    <button className="dp-icon-action" onClick={() => saveSection("identity")} title="Сохранить" type="button">
                      <Save size={14} />
                    </button>
                    <button
                      className="dp-icon-action"
                      onClick={() => {
                        setDraft((prev) => ({ ...prev, display_name: data.display_name }));
                        setSection("identity", false);
                      }}
                      title="Отменить"
                      type="button"
                    >
                      <X size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
            <p className="muted">@{data.username}</p>
          </div>
        </div>
      </div>

      <Card>
        <div className="dp-card-head">
          <h3>Bio</h3>
          <div className="dp-inline-actions">
            {!editing.bio ? (
              <button className="dp-icon-action" onClick={() => setSection("bio", true)} type="button" title="Редактировать bio">
                <Pencil size={14} />
              </button>
            ) : (
              <>
                <button className="dp-icon-action" onClick={() => saveSection("bio")} type="button" title="Сохранить">
                  <Save size={14} />
                </button>
                <button
                  className="dp-icon-action"
                  onClick={() => {
                    setDraft((prev) => ({ ...prev, bio: data.bio }));
                    setSection("bio", false);
                  }}
                  type="button"
                  title="Отменить"
                >
                  <X size={14} />
                </button>
              </>
            )}
          </div>
        </div>

        {editing.bio ? (
          <Textarea
            value={draft.bio}
            onChange={(event) => setDraft((prev) => ({ ...prev, bio: event.target.value }))}
            rows={4}
            maxLength={500}
          />
        ) : (
          <p className="muted">{draft.bio || "Био пока не заполнено"}</p>
        )}
      </Card>

      <Card>
        <div className="dp-card-head">
          <h3>Соцсети</h3>
          <div className="dp-inline-actions">
            {!editing.socials ? (
              <button className="dp-icon-action" onClick={() => setSection("socials", true)} type="button" title="Редактировать соцсети">
                <Pencil size={14} />
              </button>
            ) : (
              <>
                <button className="dp-icon-action" onClick={() => saveSection("socials")} type="button" title="Сохранить">
                  <Save size={14} />
                </button>
                <button
                  className="dp-icon-action"
                  onClick={() => {
                    setDraft((prev) => ({ ...prev, socials: { ...emptySocials(), ...data.socials } }));
                    setSection("socials", false);
                  }}
                  type="button"
                  title="Отменить"
                >
                  <X size={14} />
                </button>
              </>
            )}
          </div>
        </div>

        {editing.socials ? (
          <div className="dp-socials-grid">
            {Object.entries(draft.socials).map(([key, value]) => (
              <label key={key} className="dp-social-row">
                <span>{key}</span>
                <Input
                  value={value}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      socials: {
                        ...prev.socials,
                        [key]: event.target.value,
                      },
                    }))
                  }
                />
              </label>
            ))}
          </div>
        ) : (
          <SocialLinks socials={draft.socials} />
        )}
      </Card>
    </section>
  );
}
