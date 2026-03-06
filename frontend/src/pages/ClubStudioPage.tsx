import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, Outlet, useLocation, useParams } from "react-router-dom";
import { toast } from "sonner";
import { clubApi } from "../api";
import { cn } from "../shared/lib/utils";
import { Button } from "../shared/ui/Button";
import { Card } from "../shared/ui/Card";
import { ForbiddenState } from "../shared/ui/ForbiddenState";
import { Input } from "../shared/ui/Input";
import { Modal } from "../shared/ui/Modal";
import { Select } from "../shared/ui/Select";
import { Textarea } from "../shared/ui/Textarea";

export function ClubStudioPage() {
  const { clubId = "" } = useParams();
  const id = Number(clubId);
  const location = useLocation();
  const queryClient = useQueryClient();

  const permissionsQuery = useQuery({
    queryKey: ["club-permissions", id],
    queryFn: () => clubApi.permissionsMe(id),
    enabled: Number.isFinite(id) && id > 0,
    retry: false,
  });

  const { data: club, isLoading, isError } = useQuery({
    queryKey: ["club-studio", id],
    queryFn: () => clubApi.byId(id),
    enabled: Number.isFinite(id) && id > 0 && Boolean(permissionsQuery.data?.can_view_club_studio),
  });

  const profileMutation = useMutation({
    mutationFn: ([managedClubId, payload]: [number, Parameters<typeof clubApi.update>[1]]) => clubApi.update(managedClubId, payload),
    onSuccess: async () => {
      toast.success("Профиль клуба сохранен");
      await queryClient.invalidateQueries({ queryKey: ["club-studio", id] });
      await queryClient.invalidateQueries({ queryKey: ["club-profile", club?.slug] });
    },
    onError: () => toast.error("Не удалось сохранить профиль клуба"),
  });

  if (permissionsQuery.isLoading) {
    return <p>Проверяем права доступа…</p>;
  }

  if (permissionsQuery.isError) {
    return (
      <Card>
        <h2>Не удалось проверить доступ</h2>
        <p className="muted">Попробуйте обновить страницу или открыть клубы позже.</p>
        <div className="row gap" style={{ marginTop: 12 }}>
          <Link to="/clubs">
            <Button>К клубам</Button>
          </Link>
          <Button variant="secondary" onClick={() => permissionsQuery.refetch()} disabled={permissionsQuery.isFetching}>
            Повторить
          </Button>
        </div>
      </Card>
    );
  }

  if (!permissionsQuery.data?.can_view_club_studio) {
    const reason = permissionsQuery.data?.membership_found
      ? "Вы состоите в клубе, но ваша роль не дает доступ к Club Studio. Нужна роль owner/admin."
      : "Вы не состоите в этом клубе или членство неактивно. Доступ к Club Studio закрыт.";

    return <ForbiddenState description={reason} clubSlug={permissionsQuery.data?.club_slug} />;
  }

  if (isLoading) {
    return <p>Загружаем Club Studio…</p>;
  }

  if (isError || !club) {
    return <ForbiddenState description="Клуб не найден или недоступен для управления." clubSlug={permissionsQuery.data?.club_slug} />;
  }

  const isInvitesRoute = location.pathname.endsWith("/invites");

  return (
    <section className="page-stack">
      <div className="ui-card club-studio-hero">
        <h1>Club Studio · {club.name}</h1>
        <p className="muted">Управление профилем, участниками и инвайтами клуба.</p>
      </div>

      <div className="club-studio-nav ui-card">
        <Link to={`/club-studio/${club.id}`} className={cn("dashboard-menu-item", !isInvitesRoute && "dashboard-menu-item--active")}>
          Overview
        </Link>
        <Link to={`/club-studio/${club.id}/invites`} className={cn("dashboard-menu-item", isInvitesRoute && "dashboard-menu-item--active")}>
          Invites
        </Link>
      </div>

      {isInvitesRoute ? (
        <Outlet />
      ) : (
        <>
          <Card>
            <div className="row between">
              <div>
                <h3>Profile</h3>
                <p className="muted">Описание, соцсети, обложка и аватар.</p>
              </div>
              <ClubProfileEditModal
                clubId={club.id}
                title={club.name}
                city={club.city}
                address={club.address || ""}
                description={club.description || ""}
                avatarUrl={club.avatar_url || ""}
                coverUrl={club.cover_url || ""}
                visibility={club.visibility || "public"}
                socials={club.socials}
                isPending={profileMutation.isPending}
                onSave={(payload) => profileMutation.mutate([club.id, payload])}
              />
            </div>
          </Card>

          <Card>
            <h3>Members</h3>
            {!club.djs?.length ? (
              <p className="muted">Участников пока нет</p>
            ) : (
              <div className="table-wrap">
                <table className="ui-table">
                  <thead>
                    <tr>
                      <th>DJ</th>
                      <th>Role</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {club.djs.map((member) => (
                      <tr key={member.id}>
                        <td>{member.display_name}</td>
                        <td>{member.role}</td>
                        <td>{member.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <h3>Media</h3>
            <p className="muted">MVP: gallery URL-менеджмент подключим следующим шагом.</p>
          </Card>

          <Card>
            <h3>Settings</h3>
            <p className="muted">Visibility: {club.visibility}</p>
          </Card>
        </>
      )}
    </section>
  );
}

function ClubProfileEditModal({
  clubId,
  title,
  city,
  address,
  description,
  avatarUrl,
  coverUrl,
  visibility,
  socials,
  isPending,
  onSave,
}: {
  clubId: number;
  title: string;
  city: string;
  address: string;
  description: string;
  avatarUrl: string;
  coverUrl: string;
  visibility: "public" | "unlisted";
  socials:
    | {
        telegram: string;
        instagram: string;
        vk: string;
        tiktok: string;
        youtube: string;
        soundcloud: string;
        beatport: string;
        yandex_music: string;
        spotify: string;
        website: string;
      }
    | undefined;
  isPending: boolean;
  onSave: (payload: {
    title: string;
    city: string;
    address: string;
    description: string;
    avatar_url: string;
    cover_url: string;
    visibility: "public" | "unlisted";
    socials: {
      telegram: string;
      instagram: string;
      vk: string;
      tiktok: string;
      youtube: string;
      soundcloud: string;
      beatport: string;
      yandex_music: string;
      spotify: string;
      website: string;
    };
  }) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Редактировать профиль</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Редактирование клуба"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form={`club-edit-form-${clubId}`} disabled={isPending}>
              Save
            </Button>
          </>
        }
      >
        <form
          id={`club-edit-form-${clubId}`}
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            onSave({
              title: String(form.get("title") || ""),
              city: String(form.get("city") || ""),
              address: String(form.get("address") || ""),
              description: String(form.get("description") || ""),
              avatar_url: String(form.get("avatar_url") || ""),
              cover_url: String(form.get("cover_url") || ""),
              visibility: String(form.get("visibility") || "public") as "public" | "unlisted",
              socials: {
                telegram: String(form.get("telegram") || ""),
                instagram: String(form.get("instagram") || ""),
                vk: String(form.get("vk") || ""),
                tiktok: String(form.get("tiktok") || ""),
                youtube: String(form.get("youtube") || ""),
                soundcloud: String(form.get("soundcloud") || ""),
                beatport: String(form.get("beatport") || ""),
                yandex_music: String(form.get("yandex_music") || ""),
                spotify: String(form.get("spotify") || ""),
                website: String(form.get("website") || ""),
              },
            });
            setOpen(false);
          }}
        >
          <label>
            Title
            <Input name="title" defaultValue={title} />
          </label>
          <label>
            City
            <Input name="city" defaultValue={city} />
          </label>
          <label>
            Address
            <Input name="address" defaultValue={address} />
          </label>
          <label>
            Description
            <Textarea name="description" rows={4} defaultValue={description} />
          </label>
          <label>
            Avatar URL
            <Input name="avatar_url" defaultValue={avatarUrl} />
          </label>
          <label>
            Cover URL
            <Input name="cover_url" defaultValue={coverUrl} />
          </label>
          <label>
            Visibility
            <Select name="visibility" defaultValue={visibility}>
              <option value="public">public</option>
              <option value="unlisted">unlisted</option>
            </Select>
          </label>
          <label>
            Telegram
            <Input name="telegram" defaultValue={socials?.telegram || ""} />
          </label>
          <label>
            Instagram
            <Input name="instagram" defaultValue={socials?.instagram || ""} />
          </label>
          <label>
            VK
            <Input name="vk" defaultValue={socials?.vk || ""} />
          </label>
          <label>
            TikTok
            <Input name="tiktok" defaultValue={socials?.tiktok || ""} />
          </label>
          <label>
            YouTube
            <Input name="youtube" defaultValue={socials?.youtube || ""} />
          </label>
          <label>
            SoundCloud
            <Input name="soundcloud" defaultValue={socials?.soundcloud || ""} />
          </label>
          <label>
            Beatport
            <Input name="beatport" defaultValue={socials?.beatport || ""} />
          </label>
          <label>
            Yandex Music
            <Input name="yandex_music" defaultValue={socials?.yandex_music || ""} />
          </label>
          <label>
            Spotify
            <Input name="spotify" defaultValue={socials?.spotify || ""} />
          </label>
          <label>
            Website
            <Input name="website" defaultValue={socials?.website || ""} />
          </label>
        </form>
      </Modal>
    </>
  );
}
