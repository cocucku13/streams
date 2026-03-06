import { toast } from "sonner";
import { copyText } from "../lib/utils";
import { Button } from "./Button";
import { Input } from "./Input";

export function CopyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="copy-field">
      <label>{label}</label>
      <div className="copy-row">
        <Input value={value} readOnly />
        <Button
          type="button"
          variant="secondary"
          onClick={async () => {
            await copyText(value);
            toast.success("Скопировано");
          }}
        >
          Копировать
        </Button>
      </div>
    </div>
  );
}
