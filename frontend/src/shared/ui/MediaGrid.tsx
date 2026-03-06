import type { MediaAsset } from "../../types";

export function MediaGrid({ items, emptyText }: { items: MediaAsset[] | undefined; emptyText: string }) {
  if (!items?.length) {
    return <p className="muted">{emptyText}</p>;
  }

  return (
    <div className="media-grid">
      {items.map((item) => (
        <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="media-grid-item">
          <img src={item.url} alt="club-media" loading="lazy" />
        </a>
      ))}
    </div>
  );
}
