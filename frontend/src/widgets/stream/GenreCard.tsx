import { Link } from "react-router-dom";
import { Badge } from "../../shared/ui/Badge";
import type { Genre } from "../../types";

export function GenreCard({ genre }: { genre: Genre }) {
  return (
    <Link to={`/directory/${genre.slug}`} className="genre-card ui-card">
      <div className="genre-cover" style={{ background: genre.image }} />
      <h3>{genre.name}</h3>
      <Badge tone="neutral">{genre.liveCount} live сейчас</Badge>
    </Link>
  );
}
