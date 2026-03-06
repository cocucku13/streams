import { Button } from "../shared/ui/Button";
import { Card } from "../shared/ui/Card";
import { Input } from "../shared/ui/Input";

export function SettingsPage() {
  return (
    <Card>
      <h2>Настройки аккаунта</h2>
      <div className="form-grid">
        <label>
          Email (позже)
          <Input disabled value="not-available@djstreams.local" readOnly />
        </label>
        <label>
          Новый пароль
          <Input type="password" placeholder="********" disabled />
        </label>
        <Button disabled>Сохранить</Button>
      </div>
    </Card>
  );
}
