import { useQuery } from "@tanstack/react-query";
import { Navigate, useParams } from "react-router-dom";
import { ApiError, streamApi } from "../api";
import { Button } from "../shared/ui/Button";
import { StreamUnavailableState } from "../shared/ui/StreamUnavailableState";

export function LiveAliasPage() {
  const { username = "" } = useParams();

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["live-alias-by-username", username],
    queryFn: () => streamApi.activeByUsername(username),
    enabled: Boolean(username),
    retry: false,
  });

  if (isLoading) {
    return <p>Подбираем текущий эфир…</p>;
  }

  if (data?.stream_id) {
    return <Navigate to={`/watch/${data.stream_id}`} replace />;
  }

  if (isError && error instanceof ApiError && error.status === 404) {
    return <StreamUnavailableState djUsername={username} />;
  }

  return (
    <StreamUnavailableState
      title="Не удалось открыть эфир"
      description="Проблема сети или сервера. Попробуйте повторить запрос."
      djUsername={username}
      extraAction={
        <Button onClick={() => refetch()} disabled={isFetching}>
          Попробовать снова
        </Button>
      }
    />
  );
}
