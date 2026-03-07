import type { ReactNode } from "react";
import { Card } from "./Card";

export function WorkspaceStateCard({
  title,
  description,
  actions,
  tone = "neutral",
}: {
  title: string;
  description: string;
  actions?: ReactNode;
  tone?: "neutral" | "error";
}) {
  return (
    <Card>
      <h2>{title}</h2>
      <p className={tone === "error" ? "error" : "muted"}>{description}</p>
      {actions ? <div className="row gap" style={{ marginTop: 12 }}>{actions}</div> : null}
    </Card>
  );
}
