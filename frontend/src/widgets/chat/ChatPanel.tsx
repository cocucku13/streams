import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Virtuoso } from "react-virtuoso";
import { streamApi } from "../../api";
import type { ChatMessage } from "../../types";
import { Button } from "../../shared/ui/Button";
import { Card } from "../../shared/ui/Card";
import { Input } from "../../shared/ui/Input";

const WS_BASE = import.meta.env.VITE_WS_BASE ?? "ws://localhost:8000";

export function ChatPanel({ streamId, disabled }: { streamId: number; disabled?: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [nick, setNick] = useState("Guest");
  const [text, setText] = useState("");
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [connectionState, setConnectionState] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const historyQuery = useQuery({
    queryKey: ["chat-history", streamId],
    queryFn: () => streamApi.chatHistory(streamId, 50),
    enabled: Number.isFinite(streamId) && streamId > 0,
    retry: 1,
  });

  useEffect(() => {
    if (!historyQuery.data) {
      return;
    }
    setMessages(historyQuery.data);
  }, [historyQuery.data]);

  function appendUniqueMessages(prev: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
    const byKey = new Set(prev.map((item) => `${item.at}|${item.user}|${item.message}`));
    const merged = [...prev];
    incoming.forEach((item) => {
      const key = `${item.at}|${item.user}|${item.message}`;
      if (byKey.has(key)) {
        return;
      }
      byKey.add(key);
      merged.push(item);
    });
    return merged.slice(-500);
  }

  useEffect(() => {
    let mounted = true;
    let reconnectTimer: number | undefined;
    const ws = new WebSocket(`${WS_BASE}/ws/chat/${streamId}`);
    setConnectionState("connecting");
    setConnectionError(null);

    ws.onopen = () => {
      if (!mounted) return;
      setConnectionState("connected");
      setConnectionError(null);
    };

    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data) as ChatMessage | { type?: string; detail?: string };

      if ("type" in payload && payload.type === "error") {
        if (!mounted) return;
        setConnectionError(payload.detail || "Ошибка чата");
        return;
      }

      const message = payload as ChatMessage;
      setMessages((prev) => appendUniqueMessages(prev, [message]));
    };

    ws.onerror = () => {
      if (!mounted) return;
      setConnectionError("Проблема подключения к чату");
    };

    ws.onclose = () => {
      if (!mounted) return;
      setConnectionState("disconnected");
      reconnectTimer = window.setTimeout(() => {
        setReconnectAttempt((value) => value + 1);
      }, 2000);
    };

    setSocket(ws);
    return () => {
      mounted = false;
      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer);
      }
      ws.close();
    };
  }, [streamId, reconnectAttempt]);

  function send(event: FormEvent) {
    event.preventDefault();
    if (!socket || socket.readyState !== WebSocket.OPEN || !text.trim()) {
      return;
    }
    socket.send(JSON.stringify({ user: nick || "Guest", message: text.trim() }));
    setText("");
  }

  const participantsApprox = useMemo(() => Math.max(1, Math.floor(messages.length / 5)), [messages.length]);

  return (
    <Card className="chat-panel">
      <header className="chat-header">
        <h3>Чат</h3>
        <span className="muted">
          {connectionState === "connected" ? "Online" : connectionState === "connecting" ? "Connecting" : "Disconnected"}
        </span>
      </header>

      <p className="chat-rules">Уважайте участников. Спам и токсичность удаляются модераторами.</p>
      <p className="muted">~{participantsApprox} участников</p>

      {historyQuery.isLoading ? <p className="muted">Загружаем историю чата…</p> : null}
      {historyQuery.isError ? <p className="error">Не удалось загрузить историю чата.</p> : null}
      {connectionError ? <p className="error">{connectionError}</p> : null}
      {!historyQuery.isLoading && !messages.length ? <p className="muted">История чата пуста. Будьте первым сообщением.</p> : null}

      <div className="chat-list">
        <Virtuoso
          totalCount={messages.length}
          itemContent={(index) => {
            const message = messages[index];
            return (
              <div className="chat-message" key={`${message.at}-${index}`}>
                <strong>{message.user}</strong>
                <span>{message.message}</span>
                <time>{dayjs(message.at).format("HH:mm")}</time>
              </div>
            );
          }}
        />
      </div>

      {disabled ? (
        <div className="chat-guest-lock">
          <p>Войдите, чтобы писать в чат</p>
          <Button disabled>Только просмотр</Button>
        </div>
      ) : (
        <form onSubmit={send} className="chat-composer">
          <Input value={nick} onChange={(event) => setNick(event.target.value)} placeholder="Ник" maxLength={24} />
          <Input value={text} onChange={(event) => setText(event.target.value)} placeholder="Написать сообщение" maxLength={300} />
          <Button type="submit" disabled={!text.trim() || connectionState !== "connected"}>
            Отправить
          </Button>
        </form>
      )}

      {connectionState === "disconnected" ? (
        <Button variant="ghost" onClick={() => setReconnectAttempt((value) => value + 1)}>
          Переподключить чат
        </Button>
      ) : null}
    </Card>
  );
}
