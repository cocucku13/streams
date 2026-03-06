import { Globe } from "lucide-react";
import type { SocialLinks as SocialLinksType } from "../../types";

const labels: Record<keyof SocialLinksType, string> = {
  telegram: "Telegram",
  instagram: "Instagram",
  vk: "VK",
  tiktok: "TikTok",
  youtube: "YouTube",
  soundcloud: "SoundCloud",
  beatport: "Beatport",
  yandex_music: "Yandex Music",
  spotify: "Spotify",
  website: "Website",
};

export function SocialLinks({ socials }: { socials: SocialLinksType | undefined }) {
  if (!socials) {
    return <p className="muted">Соцсети не указаны</p>;
  }

  const entries = Object.entries(socials).filter(([, value]) => Boolean(value));
  if (!entries.length) {
    return <p className="muted">Соцсети не указаны</p>;
  }

  return (
    <div className="social-links-grid">
      {entries.map(([key, value]) => (
        <a key={key} href={value} target="_blank" rel="noreferrer" className="social-link-chip">
          <Globe size={14} />
          <span>{labels[key as keyof SocialLinksType]}</span>
        </a>
      ))}
    </div>
  );
}
