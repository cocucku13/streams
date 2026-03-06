import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError, clubApi } from "../api";
import { Button } from "../shared/ui/Button";
import { Card } from "../shared/ui/Card";

type InviteState = "initial" | "pending" | "accepted" | "declined" | "invalid" | "forbidden" | "error";

function mapErrorState(error: unknown, fallback: InviteState = "error"): InviteState {
  if (!(error instanceof ApiError)) {
    return "error";
  }

  if (error.status === 403) {
    return "forbidden";
  }
  if (error.status === 404 || error.status === 410) {
    return "invalid";
  }
  return fallback;
}

export function InviteDecisionPage() {
  const { token = "" } = useParams();
  const [state, setState] = useState<InviteState | null>(null);
  const [actionError, setActionError] = useState<string>("");

  const preflightQuery = useQuery({
    queryKey: ["invite-preflight", token],
    queryFn: () => clubApi.inviteMeta(token),
    enabled: Boolean(token),
    retry: false,
  });

  const resolvedState: InviteState = useMemo(() => {
    if (state) {
      return state;
    }
    if (!preflightQuery.data) {
      return "initial";
    }
    if (preflightQuery.data.status === "accepted") {
      return "accepted";
    }
    if (preflightQuery.data.status === "declined") {
      return "declined";
    }
    if (preflightQuery.data.status === "expired") {
      return "invalid";
    }
    return "initial";
  }, [preflightQuery.data, state]);

  const acceptMutation = useMutation({
    mutationFn: () => clubApi.acceptInvite(token),
    onMutate: () => {
      setState("pending");
      setActionError("");
    },
    onSuccess: () => setState("accepted"),
    onError: (error) => {
      setState(mapErrorState(error));
      setActionError(error instanceof Error ? error.message : "Не удалось принять инвайт");
    },
  });

  const declineMutation = useMutation({
    mutationFn: () => clubApi.declineInvite(token),
    onMutate: () => {
      setState("pending");
      setActionError("");
    },
    onSuccess: () => setState("declined"),
    onError: (error) => {
      setState(mapErrorState(error));
      setActionError(error instanceof Error ? error.message : "Не удалось отклонить инвайт");
    },
  });

  const title = useMemo(() => {
    if (resolvedState === "accepted") {
      return "Инвайт принят";
    }
    if (resolvedState === "declined") {
      return "Инвайт отклонен";
    }
    if (resolvedState === "invalid") {
      return "Инвайт недействителен";
    }
    if (resolvedState === "forbidden") {
      return "Инвайт недоступен для этого аккаунта";
    }
    if (resolvedState === "error") {
      return "Не удалось обработать инвайт";
    }
    return "Приглашение в клуб";
  }, [resolvedState]);

  const metadataErrorState = useMemo<InviteState | null>(() => {
    if (!preflightQuery.error) {
      return null;
    }
    return mapErrorState(preflightQuery.error, "error");
  }, [preflightQuery.error]);

  const isBusy = acceptMutation.isPending || declineMutation.isPending || resolvedState === "pending";

  if (preflightQuery.isLoading) {
    return (
      <main className="container stack" style={{ paddingTop: 48 }}>
        <Card>
          <h1>Проверяем приглашение…</h1>
          <p className="muted">Загружаем метаданные инвайта.</p>
        </Card>
      </main>
    );
  }

  if (metadataErrorState && resolvedState === "initial") {
    return (
      <main className="container stack" style={{ paddingTop: 48 }}>
        <Card>
          <h1>{metadataErrorState === "forbidden" ? "Инвайт недоступен" : "Инвайт недействителен"}</h1>
          <p className="muted">
            {metadataErrorState === "forbidden"
              ? "Это приглашение привязано к другому пользователю."
              : "Токен приглашения не найден или уже недействителен."}
          </p>
          <div className="row gap" style={{ marginTop: 16 }}>
            <Button onClick={() => preflightQuery.refetch()} disabled={preflightQuery.isFetching}>
              Попробовать снова
            </Button>
            <Link to="/">
              <Button variant="secondary">На главную</Button>
            </Link>
          </div>
        </Card>
      </main>
    );
  }

  const invite = preflightQuery.data;

  return (
    <main className="container stack" style={{ paddingTop: 48 }}>
      <Card>
        <h1>{title}</h1>

        {invite ? (
          <div className="form-grid" style={{ marginBottom: 12 }}>
            <p className="muted">Клуб: {invite.club.title}</p>
            <p className="muted">Роль в инвайте: {invite.role_to_assign}</p>
            <p className="muted">Пригласил: {invite.invited_by.display_name}</p>
            <p className="muted">Статус: {invite.status}</p>
          </div>
        ) : null}

        {resolvedState === "initial" && <p className="muted">Выберите действие для приглашения.</p>}

        {resolvedState === "pending" && <p className="muted">Обрабатываем действие…</p>}
        {resolvedState === "accepted" && <p className="muted">Вы стали участником клуба. Переходите в рабочие разделы платформы.</p>}
        {resolvedState === "declined" && <p className="muted">Приглашение отклонено. Вы можете вернуться к просмотру эфиров.</p>}
        {resolvedState === "invalid" && (
          <p className="muted">Токен не найден или срок действия приглашения истек. Запросите новый инвайт у клуба.</p>
        )}
        {resolvedState === "forbidden" && (
          <p className="muted">Этот инвайт привязан к другому пользователю или у вас нет прав на это действие.</p>
        )}
        {resolvedState === "error" && <p className="muted">Сетевая ошибка или временная проблема сервера. Попробуйте еще раз.</p>}

        {actionError ? <p className="error">{actionError}</p> : null}

        <div className="row gap" style={{ marginTop: 16 }}>
          {resolvedState === "initial" && invite?.can_act ? (
            <>
              <Button disabled={isBusy} onClick={() => acceptMutation.mutate()}>
                Accept invite
              </Button>
              <Button variant="secondary" disabled={isBusy} onClick={() => declineMutation.mutate()}>
                Decline invite
              </Button>
            </>
          ) : null}

          {resolvedState === "accepted" ? (
            <>
              <Link to="/dashboard">
                <Button>Go to dashboard</Button>
              </Link>
              <Link to="/clubs">
                <Button variant="secondary">Go to clubs</Button>
              </Link>
            </>
          ) : null}

          {resolvedState === "declined" ? (
            <>
              <Link to="/">
                <Button>Go to home</Button>
              </Link>
              <Link to="/clubs">
                <Button variant="secondary">Go to clubs</Button>
              </Link>
            </>
          ) : null}

          {resolvedState === "invalid" || resolvedState === "forbidden" || resolvedState === "error" ? (
            <>
              <Button
                onClick={() => {
                  setState(null);
                  setActionError("");
                  void preflightQuery.refetch();
                }}
              >
                Try again
              </Button>
              <Link to="/">
                <Button variant="secondary">Go to home</Button>
              </Link>
            </>
          ) : null}
        </div>
      </Card>
    </main>
  );
}
