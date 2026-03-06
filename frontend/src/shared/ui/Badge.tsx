import type { HTMLAttributes } from "react";
import { cn } from "../lib/utils";

type Tone = "live" | "low" | "neutral" | "club";

export function Badge({ tone = "neutral", className, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return <span className={cn("ui-badge", `ui-badge--${tone}`, className)} {...props} />;
}
