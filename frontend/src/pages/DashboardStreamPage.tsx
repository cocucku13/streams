import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { streamApi } from "../api";
import { CopyField } from "../shared/ui/CopyField";
import { Button } from "../shared/ui/Button";
import { Card } from "../shared/ui/Card";
import { Input } from "../shared/ui/Input";
import { Textarea } from "../shared/ui/Textarea";

export function DashboardStreamPage() {
  const { data, refetch } = useQuery({
    queryKey: ["stream-me"],
    queryFn: streamApi.mine,
    refetchInterval: 3000,
  });

  const mutation = useMutation({
    mutationFn: streamApi.updateMine,
    onSuccess: () => {
      toast.success("Настройки стрима сохранены");
      refetch();
    },
  });

  if (!data) {
    return <p>Загружаем настройки стрима…</p>;
  }

  const status: "live" | "offline" = data.is_live ? "live" : "offline";

  return (
    <div className="page-stack">
      <Card>
        <h2>Stream status</h2>
        <p className="muted">Управляйте эфиром и ingest-подключением.</p>
        <div className="form-grid">
          <div className={`stream-status-indicator stream-status-indicator--${status}`}>
            <span className="status-dot" />
            <strong>{status === "live" ? "LIVE" : "OFFLINE"}</strong>
          </div>
          <p className="muted">Статус определяется автоматически по входящему потоку из OBS.</p>
          <p className="muted">Ingest status: {data.is_live ? "Live" : "No signal"}</p>
          <CopyField label="RTMP URL" value={data.ingest_server} />
          <CopyField label="Stream Key" value={data.stream_key} />
        </div>
      </Card>

      <Card className="danger-zone">
        <h3>Danger Zone</h3>
        <p className="muted">Сброс stream key завершит текущие подключения OBS.</p>
        <Button variant="danger" disabled title="Скоро">
          Сбросить ключ
        </Button>
      </Card>

      <Card>
        <h3>OBS Setup</h3>
        <ol className="obs-steps">
          <li>Откройте OBS → Настройки → Трансляция.</li>
          <li>Выберите сервис: Custom.</li>
          <li>Вставьте RTMP URL и Stream Key.</li>
          <li>Нажмите Start Streaming.</li>
          <li>Статус LIVE включится автоматически, когда поток пойдет в ingest.</li>
        </ol>
      </Card>

      <Card>
        <h3>Stream metadata</h3>
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            mutation.mutate({
              title: String(formData.get("title") || ""),
              description: String(formData.get("description") || ""),
              genre: String(formData.get("genre") || ""),
              current_track: String(formData.get("current_track") || ""),
            });
          }}
        >
          <label>
            Title
            <Input name="title" defaultValue={data.title} />
          </label>
          <label>
            Genre
            <Input name="genre" defaultValue={data.genre} />
          </label>
          <label>
            Now Playing
            <Input name="current_track" defaultValue={data.current_track} />
          </label>
          <label>
            Description
            <Textarea name="description" defaultValue={data.description} rows={4} />
          </label>
          <Button type="submit">Сохранить</Button>
        </form>
      </Card>
    </div>
  );
}
