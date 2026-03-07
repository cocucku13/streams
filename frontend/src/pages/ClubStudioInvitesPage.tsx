import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { clubApi } from "../api";
import { Button } from "../shared/ui/Button";
import { Card } from "../shared/ui/Card";
import { Input } from "../shared/ui/Input";
import { Select } from "../shared/ui/Select";
import { WorkspaceStateCard } from "../shared/ui/WorkspaceStateCard";

export function ClubStudioInvitesPage() {
  const { clubId = "" } = useParams();
  const id = Number(clubId);
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["club-invites", id],
    queryFn: () => clubApi.invites(id),
    enabled: Number.isFinite(id) && id > 0,
  });

  const createInvite = useMutation({
    mutationFn: (payload: { invited_username?: string; invited_email?: string; role_to_assign: "dj" | "moderator" | "admin" }) =>
      clubApi.invite(id, payload),
    onSuccess: async () => {
      toast.success("Инвайт создан");
      await queryClient.invalidateQueries({ queryKey: ["club-invites", id] });
    },
    onError: () => toast.error("Не удалось создать инвайт"),
  });

  const revokeInvite = useMutation({
    mutationFn: (inviteId: number) => clubApi.revokeInvite(inviteId),
    onSuccess: async () => {
      toast.success("Инвайт отозван");
      await queryClient.invalidateQueries({ queryKey: ["club-invites", id] });
    },
    onError: () => toast.error("Не удалось отозвать инвайт"),
  });

  return (
    <div className="page-stack">
      <Card>
        <h3>Создать инвайт</h3>
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const username = String(form.get("invited_username") || "").trim();
            const email = String(form.get("invited_email") || "").trim();
            createInvite.mutate({
              invited_username: username || undefined,
              invited_email: email || undefined,
              role_to_assign: String(form.get("role_to_assign") || "dj") as "dj" | "moderator" | "admin",
            });
            event.currentTarget.reset();
          }}
        >
          <label>
            Username
            <Input name="invited_username" placeholder="dj_username" />
          </label>
          <label>
            Email
            <Input name="invited_email" placeholder="dj@club.com" />
          </label>
          <label>
            Роль
            <Select name="role_to_assign" defaultValue="dj">
              <option value="dj">dj</option>
              <option value="moderator">moderator</option>
              <option value="admin">admin</option>
            </Select>
          </label>
          <Button type="submit" disabled={createInvite.isPending}>
            {createInvite.isPending ? "Создаем..." : "Создать инвайт"}
          </Button>
        </form>
      </Card>

      <Card>
        <h3>Список инвайтов</h3>
        {isLoading ? <WorkspaceStateCard title="Инвайты" description="Загружаем список инвайтов..." /> : null}
        {isError ? <WorkspaceStateCard title="Инвайты" description="Не удалось загрузить инвайты. Попробуйте позже." tone="error" /> : null}
        {!isLoading && !isError && !data?.length ? <p className="muted">Инвайтов пока нет</p> : null}
        {data?.length ? (
          <div className="table-wrap">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Кому</th>
                  <th>Роль</th>
                  <th>Статус</th>
                  <th>Истекает</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.map((invite) => (
                  <tr key={invite.id}>
                    <td>{invite.invited_email || `user:${invite.invited_user_id}`}</td>
                    <td>{invite.role_to_assign}</td>
                    <td>{invite.status}</td>
                    <td>{new Date(invite.expires_at).toLocaleDateString()}</td>
                    <td>
                      <Button
                        variant="ghost"
                        disabled={invite.status !== "pending" || revokeInvite.isPending}
                        onClick={() => revokeInvite.mutate(invite.id)}
                      >
                        Отозвать
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
