import { Button } from "../shared/ui/Button";
import { Card } from "../shared/ui/Card";
import { Input } from "../shared/ui/Input";
import { Switch } from "../shared/ui/Switch";

export function DashboardModerationPage() {
  return (
    <Card>
      <h2>Chat Moderation</h2>
      <p className="muted">Минимальный набор для контроля чата на старте.</p>

      <div className="form-grid">
        <label>
          Banned users
          <Input defaultValue="@spam-account, @toxic-user" />
        </label>

        <label>
          Blocked words
          <Input defaultValue="spam, scam, insult" />
        </label>

        <Switch checked={false} label="Slow mode (позже)" onChange={() => undefined} />
        <Switch checked={false} label="Followers only (позже)" onChange={() => undefined} />

        <Button>Сохранить правила</Button>
      </div>
    </Card>
  );
}
