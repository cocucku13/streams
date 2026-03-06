import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { profileApi, streamApi } from "../api";
import type { Profile, Stream } from "../types";

export function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stream, setStream] = useState<Stream | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    Promise.all([profileApi.me(), streamApi.mine()])
      .then(([p, s]) => {
        setProfile(p);
        setStream(s);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Ошибка загрузки"));
  }, []);

  async function updateProfile(event: FormEvent) {
    event.preventDefault();
    if (!profile) {
      return;
    }
    try {
      const updated = await profileApi.update(profile);
      setProfile(updated);
      setStatus("Профиль сохранен");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    }
  }

  async function updateStream(event: FormEvent) {
    event.preventDefault();
    if (!stream) {
      return;
    }
    try {
      const updated = await streamApi.updateMine({
        title: stream.title,
        description: stream.description,
        genre: stream.genre,
        current_track: stream.current_track,
      });
      setStream(updated);
      setStatus("Настройки эфира сохранены");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения стрима");
    }
  }

  function logout() {
    localStorage.removeItem("token");
    window.location.href = "/auth";
  }

  return (
    <main className="container stack">
      <header className="row between">
        <h1>Кабинет диджея</h1>
        <div className="row gap">
          <Link to="/">Лайвы</Link>
          <button className="secondary" onClick={logout}>
            Выйти
          </button>
        </div>
      </header>

      {error && <p className="error">{error}</p>}
      {status && <p className="ok">{status}</p>}

      {profile && (
        <section className="card">
          <h2>Профиль</h2>
          <form onSubmit={updateProfile} className="form-grid">
            <label>
              Публичное имя
              <input value={profile.display_name} onChange={(e) => setProfile({ ...profile, display_name: e.target.value })} />
            </label>
            <label>
              Клуб
              <input value={profile.club_name} onChange={(e) => setProfile({ ...profile, club_name: e.target.value })} />
            </label>
            <label>
              Аватар URL
              <input value={profile.avatar_url} onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })} />
            </label>
            <label>
              Описание
              <textarea value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} />
            </label>
            <button type="submit">Сохранить профиль</button>
          </form>
        </section>
      )}

      {stream && (
        <section className="card">
          <h2>Стрим</h2>
          <form onSubmit={updateStream} className="form-grid">
            <label>
              Название эфира
              <input value={stream.title} onChange={(e) => setStream({ ...stream, title: e.target.value })} />
            </label>
            <label>
              Жанр
              <input value={stream.genre} onChange={(e) => setStream({ ...stream, genre: e.target.value })} />
            </label>
            <label>
              Играющий трек сейчас
              <input value={stream.current_track} onChange={(e) => setStream({ ...stream, current_track: e.target.value })} />
            </label>
            <label>
              Описание
              <textarea value={stream.description} onChange={(e) => setStream({ ...stream, description: e.target.value })} />
            </label>
            <label className="checkbox">
              <input type="checkbox" checked={stream.is_live} onChange={(e) => setStream({ ...stream, is_live: e.target.checked })} />
              Эфир активен
            </label>
            <button type="submit">Сохранить настройки эфира</button>
          </form>

          <div className="obs-block">
            <h3>Как запустить через OBS</h3>
            <p>1. Открой OBS → Настройки → Трансляция.</p>
            <p>2. Сервис: Custom / Пользовательский.</p>
            <p>
              3. Сервер: <strong>{stream.ingest_server}</strong>
            </p>
            <p>
              4. Ключ трансляции: <strong>{stream.stream_key}</strong>
            </p>
            <p>5. Нажми «Начать трансляцию», затем включи флаг «Эфир активен» и сохрани.</p>
            <p className="muted">Плеер у зрителя сначала пробует WebRTC для минимальной задержки, затем fallback на LL-HLS.</p>
          </div>
        </section>
      )}
    </main>
  );
}
