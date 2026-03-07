import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { streamApi } from "../api";
import { CopyField } from "../shared/ui/CopyField";
import { Button } from "../shared/ui/Button";
import { Card } from "../shared/ui/Card";
import { Input } from "../shared/ui/Input";
import { Textarea } from "../shared/ui/Textarea";
import { WorkspaceHeader } from "../shared/ui/WorkspaceHeader";
import { WorkspaceStateCard } from "../shared/ui/WorkspaceStateCard";

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
    return <WorkspaceStateCard title="Стрим" description="Загружаем настройки эфира..." />;
  }

  const status: "live" | "offline" = data.is_live ? "live" : "offline";

  return (
    <div className="page-stack">
      <WorkspaceHeader title="Стрим" description="Управление метаданными эфира и параметрами ingest-подключения." />

      <Card>
        <h3>Статус эфира</h3>
        <div className="form-grid">
          <div className={`stream-status-indicator stream-status-indicator--${status}`}>
            <span className="status-dot" />
            <strong>{status === "live" ? "LIVE" : "OFFLINE"}</strong>
          </div>
          <p className="muted">Статус определяется автоматически по входящему потоку из OBS.</p>
          <p className="muted">Ingest: {data.is_live ? "Сигнал получен" : "Нет сигнала"}</p>
          <CopyField label="RTMP URL" value={data.ingest_server} />
          <CopyField label="Stream Key" value={data.stream_key} />
        </div>
      </Card>

      <Card className="danger-zone">
        <h3>Опасная зона</h3>
        <p className="muted">Сброс stream key завершит текущие подключения OBS.</p>
        <Button variant="danger" disabled title="Скоро">
          Сбросить ключ
        </Button>
      </Card>

      <Card>
        <h3>Подключение OBS</h3>
        <ol className="obs-steps">
          <li>Откройте OBS → Настройки → Трансляция.</li>
          <li>Выберите сервис: Custom.</li>
          <li>Вставьте RTMP URL и Stream Key.</li>
          <li>Нажмите Start Streaming.</li>
          <li>Статус LIVE включится автоматически, когда поток пойдет в ingest.</li>
        </ol>
      </Card>

      <Card>
        <h3>Метаданные стрима</h3>
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
            Название
            <Input name="title" defaultValue={data.title} />
          </label>
          <label>
            Жанр
            <Input name="genre" defaultValue={data.genre} />
          </label>
          <label>
            Сейчас играет
            <Input name="current_track" defaultValue={data.current_track} />
          </label>
          <label>
            Описание
            <Textarea name="description" defaultValue={data.description} rows={4} />
          </label>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Сохраняем..." : "Сохранить"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
