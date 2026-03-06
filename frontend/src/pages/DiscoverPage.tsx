import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { streamApi } from "../api";
import type { PublicStream } from "../types";

export function DiscoverPage() {
  const [streams, setStreams] = useState<PublicStream[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    streamApi
      .live()
      .then(setStreams)
      .catch((err) => setError(err instanceof Error ? err.message : "Не удалось загрузить эфиры"));
  }, []);

  return (
    <main className="container">
      <header className="row between">
        <h1>Сейчас в эфире</h1>
        <div className="row gap">
          <Link to="/auth">Войти</Link>
          <Link to="/dashboard">Мой кабинет</Link>
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      <section className="grid">
        {streams.length === 0 && <p>Пока никто не стримит.</p>}
        {streams.map((stream) => (
          <article key={stream.id} className="card">
            <h3>{stream.title}</h3>
            <p>{stream.owner_name}</p>
            <p className="muted">Жанр: {stream.genre || "не указан"}</p>
            <p className="muted">Трек сейчас: {stream.current_track || "не указан"}</p>
            <Link to={`/watch/${stream.id}`}>Открыть эфир</Link>
          </article>
        ))}
      </section>
    </main>
  );
}
