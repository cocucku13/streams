export type TokenResponse = {
  access_token: string;
  token_type: string;
};

export type Profile = {
  id: number;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  club_name: string;
  global_role?: "viewer" | "dj";
};

export type SocialLinks = {
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

export type MediaAsset = {
  id: number;
  owner_type: "dj" | "club";
  owner_id: number;
  type: "avatar" | "cover" | "gallery";
  url: string;
  created_at: string;
};

export type ClubListItem = {
  id: number;
  slug: string;
  title: string;
  city: string;
  avatar_url: string;
  role: "owner" | "admin" | "moderator" | "dj";
};

export type DJProfile = {
  id: number;
  user_id: number;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  cover_url: string;
  socials: SocialLinks;
  clubs: ClubListItem[];
  is_live: boolean;
  live_stream_id: number | null;
};

export type Stream = {
  id: number;
  owner_id: number;
  owner_username: string;
  owner_name: string;
  owner_avatar: string;
  title: string;
  description: string;
  genre: string;
  current_track: string;
  visibility?: "public" | "unlisted";
  club_id?: number | null;
  club_slug?: string | null;
  club_title?: string | null;
  is_live: boolean;
  viewer_count: number;
  created_at: string;
  updated_at: string;
  ingest_server: string;
  stream_key: string;
  hls_url: string;
  whep_url: string;
};

export type PublicStream = Omit<Stream, "ingest_server" | "stream_key">;

export type DiscoverStream = {
  stream_id: number;
  dj_username: string;
  viewer_count: number;
  peak_viewers: number;
  started_at: string;
  score: number;
};

export type ViewerCountResponse = {
  viewer_count: number;
};

export type StreamPatchPayload = {
  title: string;
  description: string;
  genre: string;
  current_track: string;
  club_id: number | null;
  visibility: "public" | "unlisted";
};

export type Genre = {
  slug: string;
  name: string;
  liveCount: number;
  image: string;
};

export type Club = {
  id: number;
  slug: string;
  name: string;
  city: string;
  address?: string;
  lat?: number | null;
  lng?: number | null;
  description?: string;
  avatar_url?: string;
  cover_url?: string;
  socials?: SocialLinks;
  visibility?: "public" | "unlisted";
  owner_user_id?: number;
  isLive: boolean;
  nowPlaying: string;
  image?: string;
  gallery?: MediaAsset[];
  djs?: ClubMember[];
  live_streams?: PublicStream[];
};

export type ClubMember = {
  id: number;
  user_id: number;
  username: string;
  display_name: string;
  role: "owner" | "admin" | "moderator" | "dj";
  status: "active" | "left" | "banned";
  joined_at: string;
};

export type ClubInvite = {
  id: number;
  club_id: number;
  invited_user_id: number | null;
  invited_email: string;
  invited_by_user_id: number;
  role_to_assign: "dj" | "moderator" | "admin";
  status: "pending" | "accepted" | "declined" | "expired";
  token: string;
  expires_at: string;
  created_at: string;
};

export type ActiveStreamLookup = {
  stream_id: number;
  owner_username: string;
  is_live: boolean;
  watch_path: string;
  title: string;
};

export type InvitePreflight = {
  token: string;
  status: "pending" | "accepted" | "declined" | "expired";
  validity: "valid" | "expired";
  can_act: boolean;
  role_to_assign: "dj" | "moderator" | "admin";
  expires_at: string;
  invited_user_id: number | null;
  invited_email: string;
  club: {
    id: number;
    slug: string;
    title: string;
  };
  invited_by: {
    id: number;
    username: string;
    display_name: string;
  };
};

export type ClubPermissionsMe = {
  club_id: number;
  club_slug: string;
  club_title: string;
  authenticated: boolean;
  membership_found: boolean;
  role: "owner" | "admin" | "moderator" | "dj" | null;
  can_view_club_studio: boolean;
  can_manage_members: boolean;
  can_manage_stream: boolean;
  can_edit_club_profile: boolean;
};

export type StreamWithMeta = PublicStream & {
  started_at: string;
  peak_viewers?: number;
  score?: number;
};

export type ChatMessage = {
  user: string;
  message: string;
  at: string;
};
