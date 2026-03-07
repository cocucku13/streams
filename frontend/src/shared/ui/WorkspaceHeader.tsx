import type { ReactNode } from "react";
import { Card } from "./Card";

export function WorkspaceHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <Card>
      <div className="row between">
        <div>
          <h2>{title}</h2>
          <p className="muted">{description}</p>
        </div>
        {actions}
      </div>
    </Card>
  );
}
