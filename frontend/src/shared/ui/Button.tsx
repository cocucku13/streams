import type { ButtonHTMLAttributes } from "react";
import { cn } from "../lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

export function Button({ className, variant = "primary", ...props }: Props) {
  return <button className={cn("ui-button", `ui-button--${variant}`, className)} {...props} />;
}
