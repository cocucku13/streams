import { Link } from "react-router-dom";
import { Button } from "../shared/ui/Button";
import { Card } from "../shared/ui/Card";

export function NotFoundPage() {
  return (
    <main className="container stack" style={{ paddingTop: 48 }}>
      <Card>
        <h1>Страница не найдена</h1>
        <p className="muted">Ссылка недействительна или страница была перемещена.</p>
        <div className="row gap">
          <Link to="/">
            <Button>На главную</Button>
          </Link>
          <Link to="/clubs">
            <Button variant="secondary">К клубам</Button>
          </Link>
        </div>
      </Card>
    </main>
  );
}
