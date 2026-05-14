import { cn } from "@/lib/utils";

type TabsProps = {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
};

export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="grid gap-2 rounded-lg border bg-card p-1 sm:flex">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={cn(
            "h-9 rounded-md px-4 text-sm font-bold transition-colors",
            active === tab ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
          )}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
