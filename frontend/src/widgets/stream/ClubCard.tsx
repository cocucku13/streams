import { Building2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "../../shared/ui/Badge";
import { Button } from "../../shared/ui/Button";
import type { Club } from "../../types";

export function ClubCard({ club }: { club: Club }) {
  return (
    <article className="ui-card club-card">
      <div className="club-cover" style={{ background: club.image }}>
        <Building2 size={20} />
      </div>
      <h3>{club.name}</h3>
      <p className="muted">{club.city}</p>
      <p className="muted">Сейчас играет: {club.nowPlaying}</p>
      <Badge tone={club.isLive ? "live" : "neutral"}>{club.isLive ? "В эфире" : "Офлайн"}</Badge>
      <Link to={`/club/${club.slug}`}>
        <Button className="full">Посмотреть, что играет</Button>
      </Link>
    </article>
  );
}
