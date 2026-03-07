import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { browseApi } from "../api";
import { Button } from "../shared/ui/Button";
import { Card } from "../shared/ui/Card";

export function DirectoryPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["directory-live-streams"],
    queryFn: browseApi.liveStreams,
  });

  const allCount = data?.length || 0;
  const popularCount = data?.filter((stream) => stream.viewer_count > 0).length || 0;
  const justStartedCount = data?.filter((stream) => {
    const startedAt = new Date(stream.updated_at || stream.created_at).getTime();
    return Date.now() - startedAt <= 30 * 60 * 1000;
  }).length || 0;

  return (
    <section className="page-stack">
      <div>
        <h1>Live streams by category</h1>
        <p className="muted">Временная категория на основе активных эфиров. Каталог жанров будет расширен в следующих волнах.</p>
      </div>

      {isLoading && <p>Загружаем категории…</p>}
      {error && <p className="error">Не удалось загрузить категории.</p>}

      <div className="profile-clubs-grid">
        <Card>
          <h3>All</h3>
          <p className="muted">{allCount} live streams</p>
          <Link to="/directory/all">
            <Button>Открыть</Button>
          </Link>
        </Card>
        <Card>
          <h3>Popular</h3>
          <p className="muted">{popularCount} streams with viewers</p>
          <Link to="/directory/popular">
            <Button>Открыть</Button>
          </Link>
        </Card>
        <Card>
          <h3>Just started</h3>
          <p className="muted">{justStartedCount} streams started recently</p>
          <Link to="/directory/just-started">
            <Button>Открыть</Button>
          </Link>
        </Card>
      </div>
    </section>
  );
}
