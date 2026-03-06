import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./Button";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function Drawer({ open, title, onClose, children }: Props) {
  if (!open) {
    return null;
  }

  return (
    <div className="ui-modal-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <aside className="ui-drawer">
        <header className="ui-modal-header">
          <h3>{title}</h3>
          <Button variant="ghost" onClick={onClose} aria-label="Закрыть">
            <X size={16} />
          </Button>
        </header>
        <div className="ui-modal-body">{children}</div>
      </aside>
    </div>
  );
}
