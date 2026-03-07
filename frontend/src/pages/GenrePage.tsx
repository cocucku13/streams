import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { browseApi } from "../api";
import { StreamGrid } from "../widgets/stream/StreamGrid";

export function GenrePage() {
  const { genre = "all" } = useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ["directory-category-streams", genre],
    queryFn: browseApi.liveStreams,
  });

  const streams = useMemo(() => {
    const list = data || [];
    if (genre === "all") {
      return list;
    }
    if (genre === "popular") {
      return [...list].sort((a, b) => b.viewer_count - a.viewer_count);
    }
    if (genre === "just-started") {
      return [...list].sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());
    }
    return list.filter((stream) => stream.genre?.trim().toLowerCase() === genre.toLowerCase());
  }, [data, genre]);

  const title = genre === "all" ? "All live streams" : genre === "popular" ? "Popular live streams" : genre === "just-started" ? "Just started" : `${genre} live`;

  return (
    <section className="page-stack">
      <div>
        <h1>{title}</h1>
        <p className="muted">Список построен только на текущих активных эфирах.</p>
      </div>
      {error && <p className="error">Ошибка загрузки жанра.</p>}
      <StreamGrid streams={streams} loading={isLoading} />
    </section>
  );
}
