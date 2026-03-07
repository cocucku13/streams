import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Virtuoso } from "react-virtuoso";
import { streamApi } from "../../api";
import type { ChatMessage } from "../../types";
import { Button } from "../../shared/ui/Button";
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
    if (!historyQuery.data) return;
    setMessages(historyQuery.data);
  }, [historyQuery.data]);

  function appendUniqueMessages(prev: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
    const byKey = new Set(prev.map((item) => `${item.at}|${item.user}|${item.message}`));
    const merged = [...prev];
    incoming.forEach((item) => {
      const key = `${item.at}|${item.user}|${item.message}`;
      if (byKey.has(key)) return;
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
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      ws.close();
    };
  }, [streamId, reconnectAttempt]);

  function send(event: FormEvent) {
    event.preventDefault();
    if (!socket || socket.readyState !== WebSocket.OPEN || !text.trim()) return;
    socket.send(JSON.stringify({ user: nick || "Guest", message: text.trim() }));
    setText("");
  }

  const participantsApprox = useMemo(() => Math.max(1, Math.floor(messages.length / 5)), [messages.length]);

  const statusDot =
    connectionState === "connected"
      ? "chat-status-dot--connected"
      : connectionState === "connecting"
        ? "chat-status-dot--connecting"
        : "chat-status-dot--disconnected";

  const statusLabel =
    connectionState === "connected" ? "онлайн" : connectionState === "connecting" ? "подключение…" : "отключён";

  return (
    <div className="chat-panel">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-left">
          <span className={`chat-status-dot ${statusDot}`} />
          <h3 className="chat-title">Чат&nbsp;<span className="chat-title-status">• {statusLabel}</span></h3>
        </div>
        <span className="chat-participants">~{participantsApprox} в чате</span>
      </div>

      {/* Error bar (connection errors only) */}
      {connectionError && (
        <div className="chat-error-bar">{connectionError}</div>
      )}

      {/* Messages */}
      <div className="chat-messages-area">
        {historyQuery.isLoading ? (
          <p className="chat-hint">Загружаем историю…</p>
        ) : !messages.length ? (
          <p className="chat-hint">Сообщений пока нет. Будьте первым!</p>
        ) : (
          <Virtuoso
            style={{ height: "100%" }}
            totalCount={messages.length}
            followOutput="smooth"
            itemContent={(index) => {
              const message = messages[index];
              return (
                <div className="chat-message" key={`${message.at}-${index}`}>
                  <span className="chat-username">{message.user}</span>
                  <span className="chat-text">{message.message}</span>
                  <time className="chat-time">{dayjs(message.at).format("HH:mm")}</time>
                </div>
              );
            }}
          />
        )}
      </div>

      {/* Composer / Guest lock */}
      {disabled ? (
        <div className="chat-guest-lock">
          <p className="chat-guest-text">Войдите, чтобы писать в чат</p>
        </div>
      ) : (
        <form onSubmit={send} className="chat-composer">
          <Input
            value={nick}
            onChange={(event) => setNick(event.target.value)}
            placeholder="Ник"
            maxLength={24}
            className="chat-nick-input"
          />
          <div className="chat-composer-row">
            <Input
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Написать сообщение…"
              maxLength={300}
            />
            <Button type="submit" variant="primary" disabled={!text.trim() || connectionState !== "connected"}>
              →
            </Button>
          </div>
        </form>
      )}

      {connectionState === "disconnected" ? (
        <button
          className="chat-reconnect-btn"
          onClick={() => setReconnectAttempt((value) => value + 1)}
        >
          Переподключить
        </button>
      ) : null}
    </div>
  );
}