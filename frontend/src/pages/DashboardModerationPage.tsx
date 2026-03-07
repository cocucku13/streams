import { WorkspaceStateCard } from "../shared/ui/WorkspaceStateCard";

export function DashboardModerationPage() {
  return (
    <WorkspaceStateCard
      title="Модерация чата"
      description="Раздел доступен как навигационный модуль, но backend-настройки правил чата еще не подключены."
    />
  );
}
