import { Card } from "../shared/ui/Card";

export function SettingsPage() {
  return (
    <Card>
      <h2>Настройки аккаунта</h2>
      <p className="muted">Управление email и паролем пока не подключено. Раздел будет активирован после появления backend-поддержки account security.</p>
    </Card>
  );
}
