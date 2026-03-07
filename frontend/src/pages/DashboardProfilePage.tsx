import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { djApi } from "../api";
import { Button } from "../shared/ui/Button";
import { Card } from "../shared/ui/Card";
import { Input } from "../shared/ui/Input";
import { Modal } from "../shared/ui/Modal";
import { SocialLinks } from "../shared/ui/SocialLinks";
import { Textarea } from "../shared/ui/Textarea";
import { WorkspaceHeader } from "../shared/ui/WorkspaceHeader";
import { WorkspaceStateCard } from "../shared/ui/WorkspaceStateCard";

export function DashboardProfilePage() {
  const [open, setOpen] = useState(false);
  const { data, refetch } = useQuery({ queryKey: ["dj-me"], queryFn: djApi.me });

  const mutation = useMutation({
    mutationFn: djApi.patchMe,
    onSuccess: () => refetch(),
  });

  if (!data) {
    return <WorkspaceStateCard title="Профиль DJ" description="Загружаем данные профиля..." />;
  }

  return (
    <section className="page-stack">
      <WorkspaceHeader
        title="Профиль DJ"
        description="Публичные данные, описание и социальные ссылки вашего DJ-профиля."
        actions={<Button onClick={() => setOpen(true)}>Редактировать профиль</Button>}
      />

      <div className="ui-card profile-hero">
        <div className="profile-cover" style={data.cover_url ? { backgroundImage: `url(${data.cover_url})` } : undefined} />
        <div className="profile-head">
          <div className="profile-avatar" style={data.avatar_url ? { backgroundImage: `url(${data.avatar_url})` } : undefined}>
            {!data.avatar_url ? data.display_name.slice(0, 1).toUpperCase() : null}
          </div>
          <div>
            <h1>{data.display_name}</h1>
            <p className="muted">@{data.username}</p>
          </div>
        </div>
      </div>

      <Card>
        <h3>Bio</h3>
        <p className="muted">{data.bio || "Био пока не заполнено"}</p>
      </Card>

      <Card>
        <h3>Соцсети</h3>
        <SocialLinks socials={data.socials} />
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Редактировать DJ профиль"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" form="dj-profile-form" disabled={mutation.isPending}>
              {mutation.isPending ? "Сохраняем..." : "Сохранить"}
            </Button>
          </>
        }
      >
        <form
          id="dj-profile-form"
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            mutation.mutate(
              {
                display_name: String(formData.get("display_name") || ""),
                bio: String(formData.get("bio") || ""),
                avatar_url: String(formData.get("avatar_url") || ""),
                cover_url: String(formData.get("cover_url") || ""),
                socials: {
                  telegram: String(formData.get("telegram") || ""),
                  instagram: String(formData.get("instagram") || ""),
                  vk: String(formData.get("vk") || ""),
                  tiktok: String(formData.get("tiktok") || ""),
                  youtube: String(formData.get("youtube") || ""),
                  soundcloud: String(formData.get("soundcloud") || ""),
                  beatport: String(formData.get("beatport") || ""),
                  yandex_music: String(formData.get("yandex_music") || ""),
                  spotify: String(formData.get("spotify") || ""),
                  website: String(formData.get("website") || ""),
                },
              },
              {
                onSuccess: () => {
                  setOpen(false);
                },
              }
            );
          }}
        >
          <label>
            Публичное имя
            <Input name="display_name" defaultValue={data.display_name} />
          </label>
          <label>
            Био
            <Textarea name="bio" defaultValue={data.bio} rows={4} />
          </label>
          <label>
            URL аватара
            <Input name="avatar_url" defaultValue={data.avatar_url} />
          </label>
          <label>
            URL обложки
            <Input name="cover_url" defaultValue={data.cover_url} />
          </label>
          <label>
            Telegram
            <Input name="telegram" defaultValue={data.socials.telegram} />
          </label>
          <label>
            Instagram
            <Input name="instagram" defaultValue={data.socials.instagram} />
          </label>
          <label>
            VK
            <Input name="vk" defaultValue={data.socials.vk} />
          </label>
          <label>
            TikTok
            <Input name="tiktok" defaultValue={data.socials.tiktok} />
          </label>
          <label>
            YouTube
            <Input name="youtube" defaultValue={data.socials.youtube} />
          </label>
          <label>
            SoundCloud
            <Input name="soundcloud" defaultValue={data.socials.soundcloud} />
          </label>
          <label>
            Beatport
            <Input name="beatport" defaultValue={data.socials.beatport} />
          </label>
          <label>
            Yandex Music
            <Input name="yandex_music" defaultValue={data.socials.yandex_music} />
          </label>
          <label>
            Spotify
            <Input name="spotify" defaultValue={data.socials.spotify} />
          </label>
          <label>
            Website
            <Input name="website" defaultValue={data.socials.website} />
          </label>
        </form>
      </Modal>
    </section>
  );
}
