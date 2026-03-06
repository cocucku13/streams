import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { browseApi, clubApi, djApi } from "../api";
import { useAuth } from "../shared/hooks/useAuth";
import { Button } from "../shared/ui/Button";
import { Card } from "../shared/ui/Card";
import { Input } from "../shared/ui/Input";
import { Modal } from "../shared/ui/Modal";
import { Select } from "../shared/ui/Select";
import { Textarea } from "../shared/ui/Textarea";
import { ClubCard } from "../widgets/stream/ClubCard";
import { Link, useNavigate } from "react-router-dom";

export function ClubsPage() {
  const { isAuthed } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ["clubs"],
    queryFn: browseApi.clubs,
  });

  const { data: myProfile } = useQuery({
    queryKey: ["dj-me"],
    queryFn: djApi.me,
    enabled: isAuthed,
  });

  const createClubMutation = useMutation({
    mutationFn: clubApi.create,
    onSuccess: async (club) => {
      setCreateOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["dj-me"] });
      navigate(`/club-studio/${club.id}`);
    },
  });

  return (
    <section className="page-stack">
      <div className="row between">
        <div>
          <h1>Клубы</h1>
          <p className="muted">Посмотри, что играет в клубе перед тем, как выйти из дома.</p>
        </div>
        {isAuthed ? <Button onClick={() => setCreateOpen(true)}>Создать клуб</Button> : null}
      </div>

      {isAuthed ? (
        <Card>
          <h3>Мои роли в клубах</h3>
          {!myProfile?.clubs.length ? (
            <p className="muted">Вы пока не состоите ни в одном клубе.</p>
          ) : (
            <div className="profile-clubs-grid">
              {myProfile.clubs.map((club) => (
                <div key={club.id} className="profile-club-item">
                  <strong>{club.title}</strong>
                  <span className="muted">Роль: {club.role}</span>
                  <div className="row gap">
                    <Link to={`/club/${club.slug}`}>
                      <Button variant="secondary">Профиль клуба</Button>
                    </Link>
                    {["owner", "admin"].includes(club.role) ? (
                      <Link to={`/club-studio/${club.id}`}>
                        <Button>Club Studio</Button>
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : null}

      {isLoading && <p>Загружаем клубы…</p>}
      {error && <p className="error">Не удалось загрузить клубы.</p>}

      <div className="club-grid">
        {data?.map((club) => (
          <ClubCard key={club.id} club={club} />
        ))}
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Создать клуб"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="create-club-form" disabled={createClubMutation.isPending}>
              Create
            </Button>
          </>
        }
      >
        <form
          id="create-club-form"
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            createClubMutation.mutate(
              {
                slug: String(form.get("slug") || "").trim().toLowerCase(),
                title: String(form.get("title") || ""),
                city: String(form.get("city") || ""),
                address: String(form.get("address") || ""),
                description: String(form.get("description") || ""),
                avatar_url: String(form.get("avatar_url") || ""),
                cover_url: String(form.get("cover_url") || ""),
                visibility: String(form.get("visibility") || "public") as "public" | "unlisted",
                socials: {
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
                },
              },
              {
                onSuccess: () => {
                  event.currentTarget.reset();
                },
              }
            );
          }}
        >
          <label>
            Slug
            <Input name="slug" placeholder="my-club-moscow" required />
          </label>
          <label>
            Title
            <Input name="title" placeholder="My Club" required />
          </label>
          <label>
            City
            <Input name="city" placeholder="Москва" />
          </label>
          <label>
            Address
            <Input name="address" placeholder="ул. ..." />
          </label>
          <label>
            Description
            <Textarea name="description" rows={4} />
          </label>
          <label>
            Avatar URL
            <Input name="avatar_url" />
          </label>
          <label>
            Cover URL
            <Input name="cover_url" />
          </label>
          <label>
            Visibility
            <Select name="visibility" defaultValue="public">
              <option value="public">public</option>
              <option value="unlisted">unlisted</option>
            </Select>
          </label>
        </form>
      </Modal>
    </section>
  );
}
