import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { browseApi } from "../api";
import { StreamGrid } from "../widgets/stream/StreamGrid";

export function GenrePage() {
  const { genre } = useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ["genre-streams", genre],
    queryFn: () => browseApi.streams({ genre }),
  });

  return (
    <section className="page-stack">
      <div>
        <h1>{genre} live</h1>
        <p className="muted">Сортировка по жанру и клубам.</p>
      </div>
      {error && <p className="error">Ошибка загрузки жанра.</p>}
      <StreamGrid streams={data || []} loading={isLoading} />
    </section>
  );
}
