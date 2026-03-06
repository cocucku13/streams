import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { browseApi } from "../api";
import { Badge } from "../shared/ui/Badge";
import { Button } from "../shared/ui/Button";
import { Card } from "../shared/ui/Card";

export function ChannelPage() {
  const { username = "" } = useParams();

  const { data: stream } = useQuery({
    queryKey: ["channel-stream", username],
    queryFn: () => browseApi.streamByUsername(username),
  });

  return (
    <section className="page-stack">
      <div className="channel-header ui-card">
        <div className="channel-banner" />
        <div className="channel-profile">
          <div className="avatar-placeholder">{(stream?.owner_name || "DJ").slice(0, 1)}</div>
          <div>
            <h1>{stream?.owner_name || username}</h1>
            <p className="muted">{stream?.club || "Клуб не указан"}</p>
            {stream ? <Badge tone="live">Live</Badge> : <Badge tone="neutral">Offline</Badge>}
          </div>
          <Button>Follow</Button>
        </div>
      </div>

      {stream && (
        <Card>
          <h2>Live сейчас</h2>
          <p>{stream.title}</p>
          <Link to={`/watch/${stream.id}`}>
            <Button>Смотреть</Button>
          </Link>
        </Card>
      )}

      <Card>
        <h3>About</h3>
        <p className="muted">{stream?.description || "Описание появится скоро"}</p>
      </Card>

      <Card>
        <h3>Recent sets / VOD</h3>
        <p className="muted">Скоро будет доступно</p>
      </Card>
    </section>
  );
}
