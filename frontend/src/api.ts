import type {
  ActiveStreamLookup,
  Club,
  ClubInvite,
  ClubMember,
  ClubPermissionsMe,
  DJProfile,
  DiscoverStream,
  ChatMessage,
  InvitePreflight,
  Profile,
  PublicStream,
  Stream,
  StreamPatchPayload,
  StreamWithMeta,
  TokenResponse,
  ViewerCountResponse,
} from "./types";

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

async function requestFormData<T>(path: string, formData: FormData): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: formData,
  });

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
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return requestFormData<{ url: string }>("/dj/me/avatar", formData);
  },
  uploadCover: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return requestFormData<{ url: string }>("/dj/me/cover", formData);
  },
  resetAvatar: () => request<{ url: string }>("/dj/me/avatar", { method: "DELETE" }),
  resetCover: () => request<{ url: string }>("/dj/me/cover", { method: "DELETE" }),
};

type ClubResponse = {
  id: number;
  slug: string;
  title: string;
  city: string;
  address: string;
  lat: number | null;
  lng: number | null;
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
    lat: club.lat,
    lng: club.lng,
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
    lat: number | null;
    lng: number | null;
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
      lat?: number | null;
      lng?: number | null;
      description: string;
      avatar_url: string;
      cover_url: string;
      socials: DJProfile["socials"];
      visibility: "public" | "unlisted";
    }
  ) => mapClubResponse(await request<ClubResponse>(`/clubs/${clubId}`, { method: "PATCH", body: JSON.stringify(payload) })),
  uploadAvatar: (clubId: number, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return requestFormData<{ url: string }>(`/clubs/${clubId}/avatar`, formData);
  },
  uploadCover: (clubId: number, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return requestFormData<{ url: string }>(`/clubs/${clubId}/cover`, formData);
  },
  resetAvatar: (clubId: number) => request<{ url: string }>(`/clubs/${clubId}/avatar`, { method: "DELETE" }),
  resetCover: (clubId: number) => request<{ url: string }>(`/clubs/${clubId}/cover`, { method: "DELETE" }),
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
  chatHistory: (id: number, limit = 50) => request<ChatMessage[]>(`/streams/${id}/chat/history?limit=${limit}`),
};

async function mapDiscoverStreamToMeta(item: DiscoverStream): Promise<StreamWithMeta> {
  const stream = await streamApi.byId(item.stream_id);
  return {
    ...stream,
    viewer_count: item.viewer_count,
    started_at: item.started_at,
    peak_viewers: item.peak_viewers,
    score: item.score,
  };
}

export const browseApi = {
  async discoverStreams(limit = 20): Promise<StreamWithMeta[]> {
    const ranked = await streamApi.discover(limit);
    return Promise.all(ranked.map(mapDiscoverStreamToMeta));
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

  async liveStreams(): Promise<PublicStream[]> {
    return streamApi.live();
  },

  async streamById(streamId: number): Promise<StreamWithMeta> {
    const stream = await streamApi.byId(streamId);
    return {
      ...stream,
      started_at: stream.updated_at || stream.created_at,
    };
  },
};
