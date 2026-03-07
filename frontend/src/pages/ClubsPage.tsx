import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { browseApi, clubApi, djApi } from "../api";
import { useAuth } from "../shared/hooks/useAuth";
import { useSafeImageUrl } from "../shared/hooks/useSafeImageUrl";
import { Badge } from "../shared/ui/Badge";
import { Button } from "../shared/ui/Button";
import { Card } from "../shared/ui/Card";
import { Input } from "../shared/ui/Input";
import { Modal } from "../shared/ui/Modal";
import { Select } from "../shared/ui/Select";
import { Textarea } from "../shared/ui/Textarea";
import { Link, useNavigate } from "react-router-dom";

type ActiveClubFromStreams = {
  slug: string;
  title: string;
  liveCount: number;
  viewerCount: number;
  nowPlaying: string;
};

type ClubCreateDraft = {
  slug: string;
  title: string;
  city: string;
  address: string;
  description: string;
  avatar_url: string;
  cover_url: string;
  visibility: "public" | "unlisted";
};

function createInitialDraft(): ClubCreateDraft {
  return {
    slug: "",
    title: "",
    city: "",
    address: "",
    description: "",
    avatar_url: "",
    cover_url: "",
    visibility: "public",
  };
}

function ClubCreateMockup({ draft }: { draft: ClubCreateDraft }) {
  const safeAvatar = useSafeImageUrl(draft.avatar_url || "");
  const safeCover = useSafeImageUrl(draft.cover_url || "");
  const clubTitle = draft.title.trim() || "My Club";
  const clubSlug = draft.slug.trim() || "my-club";

  return (
    <article className="club-create-mockup">
      <div className="club-create-mockup-cover" style={safeCover ? { backgroundImage: `url(${safeCover})` } : undefined}>
        <span className="club-create-mockup-badge">{draft.visibility === "public" ? "PUBLIC" : "UNLISTED"}</span>
      </div>
      <div className="club-create-mockup-body">
        <div className="club-create-mockup-head">
          <div className="club-create-mockup-avatar" style={safeAvatar ? { backgroundImage: `url(${safeAvatar})` } : undefined}>
            {!safeAvatar ? clubTitle.slice(0, 1).toUpperCase() : null}
          </div>
          <div>
            <h3>{clubTitle}</h3>
            <p>@{clubSlug}</p>
          </div>
        </div>

        <div className="club-create-mockup-meta">
          <span>{draft.city || "Город не указан"}</span>
          <span>{draft.address || "Адрес пока не указан"}</span>
        </div>

        <p className="club-create-mockup-description">
          {draft.description || "Опишите атмосферу клуба, стиль музыки и vibe вашего комьюнити."}
        </p>
      </div>
    </article>
  );
}

export function ClubsPage() {
  const { isAuthed } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState<ClubCreateDraft>(createInitialDraft());
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: liveStreams, isLoading, error } = useQuery({
    queryKey: ["live-streams-for-clubs"],
    queryFn: browseApi.liveStreams,
  });

  const activeClubs = useMemo<ActiveClubFromStreams[]>(() => {
    const grouped = new Map<string, ActiveClubFromStreams>();

    (liveStreams || []).forEach((stream) => {
      if (!stream.club_slug || !stream.club_title) {
        return;
      }
      const current = grouped.get(stream.club_slug);
      if (current) {
        current.liveCount += 1;
        current.viewerCount += stream.viewer_count;
        if (!current.nowPlaying && stream.current_track) {
          current.nowPlaying = stream.current_track;
        }
        return;
      }

      grouped.set(stream.club_slug, {
        slug: stream.club_slug,
        title: stream.club_title,
        liveCount: 1,
        viewerCount: stream.viewer_count,
        nowPlaying: stream.current_track || "Track not available",
      });
    });

    return Array.from(grouped.values()).sort((a, b) => b.viewerCount - a.viewerCount);
  }, [liveStreams]);

  const { data: myProfile } = useQuery({
    queryKey: ["dj-me"],
    queryFn: djApi.me,
    enabled: isAuthed,
  });

  const createClubMutation = useMutation({
    mutationFn: clubApi.create,
    onSuccess: async (club) => {
      setCreateOpen(false);
      setCreateDraft(createInitialDraft());
      await queryClient.invalidateQueries({ queryKey: ["dj-me"] });
      navigate(`/club-studio/${club.id}`);
    },
  });

  const canCreateClub = Boolean(createDraft.slug.trim() && createDraft.title.trim());

  return (
    <section className="page-stack">
      <div className="row between">
        <div>
          <h1>Клубы</h1>
          <p className="muted">Список клубов построен по текущим активным эфирам.</p>
        </div>
        {isAuthed ? (
          <Button
            onClick={() => {
              setCreateDraft(createInitialDraft());
              setCreateOpen(true);
            }}
          >
            Создать клуб
          </Button>
        ) : null}
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

      {isLoading && <p>Загружаем активные клубы…</p>}
      {error && <p className="error">Не удалось загрузить клубы.</p>}

      {!isLoading && !activeClubs.length ? <p className="muted">Сейчас нет активных клубных эфиров.</p> : null}

      <div className="profile-clubs-grid">
        {activeClubs.map((club) => (
          <Card key={club.slug}>
            <div className="row between" style={{ marginBottom: 8 }}>
              <h3>{club.title}</h3>
              <Badge tone="live">LIVE {club.liveCount}</Badge>
            </div>
            <p className="muted">Viewers: {club.viewerCount}</p>
            <p className="muted">Now playing: {club.nowPlaying}</p>
            <Link to={`/club/${club.slug}`}>
              <Button>Открыть клуб</Button>
            </Link>
          </Card>
        ))}
      </div>

      <Modal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setCreateDraft(createInitialDraft());
        }}
        title="Создать клуб"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setCreateOpen(false);
                setCreateDraft(createInitialDraft());
              }}
            >
              Отмена
            </Button>
            <Button
              onClick={() => {
                createClubMutation.mutate({
                  slug: createDraft.slug.trim().toLowerCase(),
                  title: createDraft.title.trim(),
                  city: createDraft.city.trim(),
                  address: createDraft.address.trim(),
                  description: createDraft.description.trim(),
                  avatar_url: createDraft.avatar_url.trim(),
                  cover_url: createDraft.cover_url.trim(),
                  visibility: createDraft.visibility,
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
                });
              }}
              disabled={createClubMutation.isPending || !canCreateClub}
            >
              {createClubMutation.isPending ? "Создаём..." : "Создать клуб"}
            </Button>
          </>
        }
      >
        <div className="club-create-modal-layout">
          <ClubCreateMockup draft={createDraft} />

          <form className="form-grid" onSubmit={(event) => event.preventDefault()}>
            <label>
              Slug
              <Input
                name="slug"
                placeholder="my-club-moscow"
                value={createDraft.slug}
                onChange={(event) =>
                  setCreateDraft((prev) => ({
                    ...prev,
                    slug: event.target.value.replace(/\s+/g, "-").toLowerCase(),
                  }))
                }
                required
              />
            </label>
            <label>
              Title
              <Input
                name="title"
                placeholder="My Club"
                value={createDraft.title}
                onChange={(event) => setCreateDraft((prev) => ({ ...prev, title: event.target.value }))}
                required
              />
            </label>
            <label>
              City
              <Input
                name="city"
                placeholder="Москва"
                value={createDraft.city}
                onChange={(event) => setCreateDraft((prev) => ({ ...prev, city: event.target.value }))}
              />
            </label>
            <label>
              Address
              <Input
                name="address"
                placeholder="ул. ..."
                value={createDraft.address}
                onChange={(event) => setCreateDraft((prev) => ({ ...prev, address: event.target.value }))}
              />
            </label>
            <label>
              Description
              <Textarea
                name="description"
                rows={4}
                value={createDraft.description}
                onChange={(event) => setCreateDraft((prev) => ({ ...prev, description: event.target.value }))}
              />
            </label>
            <label>
              Avatar URL
              <Input
                name="avatar_url"
                value={createDraft.avatar_url}
                onChange={(event) => setCreateDraft((prev) => ({ ...prev, avatar_url: event.target.value }))}
              />
            </label>
            <label>
              Cover URL
              <Input
                name="cover_url"
                value={createDraft.cover_url}
                onChange={(event) => setCreateDraft((prev) => ({ ...prev, cover_url: event.target.value }))}
              />
            </label>
            <label>
              Visibility
              <Select
                name="visibility"
                value={createDraft.visibility}
                onChange={(event) =>
                  setCreateDraft((prev) => ({
                    ...prev,
                    visibility: event.target.value as "public" | "unlisted",
                  }))
                }
              >
                <option value="public">public</option>
                <option value="unlisted">unlisted</option>
              </Select>
            </label>
          </form>
        </div>
      </Modal>
    </section>
  );
}
