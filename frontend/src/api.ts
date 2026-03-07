import dayjs from "dayjs";
import type {
  ActiveStreamLookup,
  Club,
  ClubInvite,
  ClubMember,
  ClubPermissionsMe,
  DJProfile,
  Genre,
  DiscoverStream,
  InvitePreflight,
  Profile,
  PublicStream,
  Stream,
  StreamFilters,
  StreamPatchPayload,
  StreamSort,
  StreamWithMeta,
  TokenResponse,
  ViewerCountResponse,
} from "./types";
import { slugify } from "./shared/lib/utils";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

function getToken() {
  return localStorage.getItem("token");
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(response.status, body.detail || "Request failed");
  }

  return response.json() as Promise<T>;
}

export const authApi = {
  register: (payload: { username: string; password: string; display_name: string }) =>
    request<TokenResponse>("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload: { username: string; password: string }) =>
    request<TokenResponse>("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
};

export const profileApi = {
  me: () => request<Profile>("/me"),
  update: (payload: { display_name: string; bio: string; avatar_url: string; club_name: string }) =>
    request<Profile>("/profile/me", { method: "PUT", body: JSON.stringify(payload) }),
};

export const djApi = {
  byUsername: (username: string) => request<DJProfile>(`/dj/${username}`),
  me: () => request<DJProfile>("/dj/me"),
  patchMe: (payload: {
    display_name: string;
    bio: string;
    avatar_url: string;
    cover_url: string;
    socials: DJProfile["socials"];
  }) => request<DJProfile>("/dj/me", { method: "PATCH", body: JSON.stringify(payload) }),
};

type ClubResponse = {
  id: number;
  slug: string;
  title: string;
  city: string;
  address: string;
  description: string;
  avatar_url: string;
  cover_url: string;
  socials: DJProfile["socials"];
  owner_user_id: number;
  visibility: "public" | "unlisted";
  gallery: Club["gallery"];
  dj_members: ClubMember[];
  live_streams: PublicStream[];
};

function mapClubResponse(club: ClubResponse): Club {
  return {
    id: club.id,
    slug: club.slug,
    name: club.title,
    city: club.city,
    address: club.address,
    description: club.description,
    avatar_url: club.avatar_url,
    cover_url: club.cover_url,
    socials: club.socials,
    visibility: club.visibility,
    owner_user_id: club.owner_user_id,
    isLive: club.live_streams.length > 0,
    nowPlaying: club.live_streams[0]?.current_track || "Track not available",
    gallery: club.gallery,
    djs: club.dj_members,
    live_streams: club.live_streams,
  };
}

export const clubApi = {
  bySlug: async (slug: string) => mapClubResponse(await request<ClubResponse>(`/clubs/${slug}`)),
  byId: async (clubId: number) => mapClubResponse(await request<ClubResponse>(`/clubs/id/${clubId}`)),
  create: async (payload: {
    slug: string;
    title: string;
    city: string;
    address: string;
    description: string;
    avatar_url: string;
    cover_url: string;
    socials: DJProfile["socials"];
    visibility: "public" | "unlisted";
  }) => mapClubResponse(await request<ClubResponse>("/clubs", { method: "POST", body: JSON.stringify(payload) })),
  update: async (
    clubId: number,
    payload: {
      title: string;
      city: string;
      address: string;
      description: string;
      avatar_url: string;
      cover_url: string;
      socials: DJProfile["socials"];
      visibility: "public" | "unlisted";
    }
  ) => mapClubResponse(await request<ClubResponse>(`/clubs/${clubId}`, { method: "PATCH", body: JSON.stringify(payload) })),
  members: (clubId: number) => request<ClubMember[]>(`/clubs/${clubId}/members`),
  invite: (clubId: number, payload: { invited_username?: string; invited_email?: string; role_to_assign: "dj" | "moderator" | "admin" }) =>
    request<ClubInvite>(`/clubs/${clubId}/invites`, { method: "POST", body: JSON.stringify(payload) }),
  invites: (clubId: number) => request<ClubInvite[]>(`/clubs/${clubId}/invites`),
  inviteMeta: (token: string) => request<InvitePreflight>(`/invites/${token}`),
  revokeInvite: (inviteId: number) => request<ClubInvite>(`/invites/${inviteId}`, { method: "DELETE" }),
  acceptInvite: (token: string) => request<ClubMember>(`/invites/${token}/accept`, { method: "POST" }),
  declineInvite: (token: string) => request<ClubInvite>(`/invites/${token}/decline`, { method: "POST" }),
  permissionsMe: (clubId: number) => request<ClubPermissionsMe>(`/clubs/${clubId}/permissions/me`),
};

export const streamApi = {
  mine: () => request<Stream>("/streams/me"),
  updateMine: (payload: {
    title: string;
    description: string;
    genre: string;
    current_track: string;
  }) => request<Stream>("/streams/me", { method: "PUT", body: JSON.stringify(payload) }),
  byId: (id: number) => request<PublicStream>(`/streams/${id}`),
  activeByUsername: (username: string) => request<ActiveStreamLookup>(`/streams/by-username/${username}/active`),
  patchById: (id: number, payload: StreamPatchPayload) => request<Stream>(`/streams/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  live: () => request<PublicStream[]>("/streams/live"),
  discover: (limit = 20) => request<DiscoverStream[]>(`/streams/discover?limit=${limit}`),
  viewerCount: (id: number) => request<ViewerCountResponse>(`/streams/${id}/viewer-count`),
};

const cities = ["Москва", "Санкт-Петербург", "Казань", "Минск", "Берлин"];
const languages = ["RU", "EN", "DE"];

const genreArtwork: Record<string, string> = {
  techno: "linear-gradient(135deg, #9146ff, #00d1ff)",
  house: "linear-gradient(135deg, #772ce8, #ff4ddb)",
  trance: "linear-gradient(135deg, #6e56cf, #00f593)",
  default: "linear-gradient(135deg, #1f1f23, #18181b)",
};

function normalizeGenre(genre: string) {
  const cleaned = genre.trim().toLowerCase();
  return cleaned || "open-format";
}

function enrichStream(stream: PublicStream, index: number): StreamWithMeta {
  const city = cities[index % cities.length];
  const language = languages[index % languages.length];
  const viewers = 35 + index * 17;
  const startedAt = dayjs().subtract(15 + index * 7, "minute").toISOString();

  return {
    ...stream,
    username: stream.owner_username || slugify(stream.owner_name),
    city,
    viewers,
    startedAt,
    latency: index % 3 === 0 ? "normal" : "low",
    language,
    club: stream.club_title || (stream.owner_name.includes("Club") ? stream.owner_name : stream.description.split("@")[1]?.trim() || "Unknown Club"),
  };
}

function filterStreams(streams: StreamWithMeta[], filters: StreamFilters): StreamWithMeta[] {
  return streams.filter((stream) => {
    if (filters.genre && normalizeGenre(stream.genre) !== normalizeGenre(filters.genre)) {
      return false;
    }
    if (filters.city && stream.city !== filters.city) {
      return false;
    }
    if (filters.club && !stream.club.toLowerCase().includes(filters.club.toLowerCase())) {
      return false;
    }
    if (filters.latency && stream.latency !== filters.latency) {
      return false;
    }
    if (filters.language && stream.language !== filters.language) {
      return false;
    }
    return true;
  });
}

function sortStreams(streams: StreamWithMeta[], sort: StreamSort): StreamWithMeta[] {
  if (sort === "viewers") {
    return [...streams].sort((a, b) => b.viewers - a.viewers);
  }
  if (sort === "recent") {
    return [...streams].sort((a, b) => dayjs(b.startedAt).valueOf() - dayjs(a.startedAt).valueOf());
  }
  return [...streams].sort((a, b) => (a.latency === "low" ? -1 : 1) - (b.latency === "low" ? -1 : 1));
}

export const browseApi = {
  async discoverStreams(limit = 20): Promise<StreamWithMeta[]> {
    const ranked = await streamApi.discover(limit);
    return ranked.map((item, index) => ({
      id: item.stream_id,
      owner_id: 0,
      owner_username: item.dj_username,
      owner_name: item.dj_username,
      owner_avatar: "",
      title: `Live set by ${item.dj_username}`,
      description: "",
      genre: "",
      current_track: "",
      visibility: "public",
      club_id: null,
      club_slug: null,
      club_title: null,
      is_live: true,
      viewer_count: item.viewer_count,
      hls_url: "",
      whep_url: "",
      created_at: item.started_at,
      updated_at: item.started_at,
      username: item.dj_username,
      city: cities[index % cities.length],
      viewers: item.viewer_count,
      peakViewers: item.peak_viewers,
      score: item.score,
      startedAt: item.started_at,
      latency: "normal",
      language: languages[index % languages.length],
      club: "Unknown Club",
    }));
  },

  async refreshViewerCounts(streamIds: number[]): Promise<Record<number, number>> {
    const uniqueIds = Array.from(new Set(streamIds));
    const rows = await Promise.all(
      uniqueIds.map(async (streamId) => {
        const response = await streamApi.viewerCount(streamId);
        return [streamId, response.viewer_count] as const;
      })
    );
    return Object.fromEntries(rows);
  },

  async streams(filters: StreamFilters = {}, sort: StreamSort = "recommended") {
    const list = await streamApi.live();
    const enriched = list.map(enrichStream);
    return sortStreams(filterStreams(enriched, filters), sort);
  },

  async streamByUsername(username: string) {
    const streams = await this.streams();
    return streams.find((stream) => stream.username === username) || null;
  },

  async streamById(streamId: number) {
    const stream = await streamApi.byId(streamId);
    return enrichStream(stream, 0);
  },

  async genres(): Promise<Genre[]> {
    const streams = await this.streams();
    const byGenre = new Map<string, number>();
    streams.forEach((stream) => {
      const key = normalizeGenre(stream.genre);
      byGenre.set(key, (byGenre.get(key) || 0) + 1);
    });

    return Array.from(byGenre.entries()).map(([slug, liveCount]) => ({
      slug,
      name: slug[0].toUpperCase() + slug.slice(1),
      liveCount,
      image: genreArtwork[slug] || genreArtwork.default,
    }));
  },

  async clubs(): Promise<Club[]> {
    const streams = await this.streams();
    const byClub = new Map<string, { slug: string; streams: StreamWithMeta[] }>();
    streams.forEach((stream) => {
      const key = stream.club || "Unknown Club";
      const slug = stream.club_slug || slugify(key);
      if (!byClub.has(key)) {
        byClub.set(key, { slug, streams: [] });
      }
      byClub.get(key)?.streams.push(stream);
    });

    return Array.from(byClub.entries()).map(([name, clubData], index) => ({
      id: index + 1,
      slug: clubData.slug,
      name: name || `Club ${index + 1}`,
      city: clubData.streams[0]?.city || cities[index % cities.length],
      isLive: clubData.streams.length > 0,
      nowPlaying: clubData.streams[0]?.current_track || "Track not available",
      image: genreArtwork.default,
    }));
  },
};
