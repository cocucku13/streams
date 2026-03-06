import { useQuery } from "@tanstack/react-query";
import { browseApi } from "../api";
import { GenreCard } from "../widgets/stream/GenreCard";

export function DirectoryPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["genres"],
    queryFn: browseApi.genres,
  });

  return (
    <section className="page-stack">
      <div>
        <h1>Категории / Жанры</h1>
        <p className="muted">Выбирайте жанр и открывайте лайвы с минимальной задержкой.</p>
      </div>

      {isLoading && <p>Загружаем жанры…</p>}
      {error && <p className="error">Не удалось загрузить жанры.</p>}

      <div className="genre-grid">
        {data?.map((genre) => (
          <GenreCard key={genre.slug} genre={genre} />
        ))}
      </div>
    </section>
  );
}
