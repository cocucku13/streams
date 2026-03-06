import dayjs from "dayjs";
import { FormEvent, useEffect, useState } from "react";
import { Virtuoso } from "react-virtuoso";
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

  useEffect(() => {
    const ws = new WebSocket(`${WS_BASE}/ws/chat/${streamId}`);
    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data) as ChatMessage;
      setMessages((prev) => [...prev.slice(-499), payload]);
    };
    setSocket(ws);
    return () => ws.close();
  }, [streamId]);

  function send(event: FormEvent) {
    event.preventDefault();
    if (!socket || socket.readyState !== WebSocket.OPEN || !text.trim()) {
      return;
    }
    socket.send(JSON.stringify({ user: nick || "Guest", message: text.trim() }));
    setText("");
  }

  return (
    <Card className="chat-panel">
      <header className="chat-header">
        <h3>Чат</h3>
        <span className="muted">{Math.max(1, Math.floor(messages.length / 5))} участников</span>
      </header>

      <p className="chat-rules">Уважайте участников. Спам и токсичность удаляются модераторами.</p>

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
          <Button type="submit" disabled={!text.trim()}>
            Отправить
          </Button>
        </form>
      )}
    </Card>
  );
}
