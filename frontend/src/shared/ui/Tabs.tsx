import { cn } from "../lib/utils";

type Tab = { value: string; label: string };

export function Tabs({
  value,
  tabs,
  onChange,
}: {
  value: string;
  tabs: Tab[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="ui-tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          type="button"
          key={tab.value}
          role="tab"
          aria-selected={value === tab.value}
          className={cn("ui-tab", value === tab.value && "ui-tab--active")}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
