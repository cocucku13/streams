import { Card } from "../shared/ui/Card";

export function DashboardModerationPage() {
  return (
    <Card>
      <h2>Chat Moderation</h2>
      <p className="muted">Этот раздел пока в режиме подготовки. Настройки чата появятся после подключения backend-политик модерации.</p>
      <ul className="muted" style={{ marginTop: 12, paddingLeft: 18 }}>
        <li>Управление banned users</li>
        <li>Blocklist слов и выражений</li>
        <li>Slow mode и followers-only режим</li>
      </ul>
    </Card>
  );
}
