import clsx from "clsx";

export function TabBar<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: T; label: string }[];
  active: T;
  onChange: (key: T) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-xl bg-surface-2/70 p-1 border border-border">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={clsx(
            "flex-1 rounded-lg py-2 text-sm font-medium transition",
            active === t.key ? "bg-gold-gradient text-[var(--theme-text)] shadow-md shadow-gold/20" : "text-muted hover:text-foreground"
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
