import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "./Button";
import { Card } from "./Card";

export function StreamUnavailableState({
  title = "Эфир сейчас недоступен",
  description = "Лайв завершен, еще не начался или недоступен по ссылке.",
  djUsername,
  extraAction,
}: {
  title?: string;
  description?: string;
  djUsername?: string;
  extraAction?: ReactNode;
}) {
  return (
    <Card>
      <h2>{title}</h2>
      <p className="muted">{description}</p>
      <div className="row gap" style={{ marginTop: 12 }}>
        <Link to="/">
          <Button>На главную</Button>
        </Link>
        <Link to="/clubs">
          <Button variant="secondary">К клубам</Button>
        </Link>
        {djUsername ? (
          <Link to={`/dj/${djUsername}`}>
            <Button variant="ghost">Профиль DJ</Button>
          </Link>
        ) : null}
        {extraAction}
      </div>
    </Card>
  );
}
