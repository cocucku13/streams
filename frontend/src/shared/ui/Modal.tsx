import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./Button";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

export function Modal({ open, title, onClose, children, footer }: Props) {
  if (!open) {
    return null;
  }

  return (
    <div className="ui-modal-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <div className="ui-modal">
        <header className="ui-modal-header">
          <h3>{title}</h3>
          <Button variant="ghost" onClick={onClose} aria-label="Закрыть">
            <X size={16} />
          </Button>
        </header>
        <div className="ui-modal-body">{children}</div>
        {footer ? <footer className="ui-modal-footer">{footer}</footer> : null}
      </div>
    </div>
  );
}
