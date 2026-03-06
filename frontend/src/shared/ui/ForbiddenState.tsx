import { Link } from "react-router-dom";
import { Button } from "./Button";
import { Card } from "./Card";

export function ForbiddenState({
  title = "Доступ ограничен",
  description,
  clubSlug,
}: {
  title?: string;
  description: string;
  clubSlug?: string;
}) {
  return (
    <Card>
      <h2>{title}</h2>
      <p className="muted">{description}</p>
      <div className="row gap" style={{ marginTop: 12 }}>
        <Link to="/clubs">
          <Button>К клубам</Button>
        </Link>
        <Link to="/">
          <Button variant="secondary">На главную</Button>
        </Link>
        {clubSlug ? (
          <Link to={`/club/${clubSlug}`}>
            <Button variant="ghost">Профиль клуба</Button>
          </Link>
        ) : null}
      </div>
    </Card>
  );
}
