import Link from "next/link";
import clsx from "clsx";

export function DurationTabs({
  basePath,
  labels,
  active,
}: {
  basePath: string;
  labels: Record<string, string>;
  active: string;
}) {
  return (
    <div className="grid grid-cols-4 gap-2 mb-6">
      {Object.entries(labels).map(([slug, label]) => (
        <Link
          key={slug}
          href={`${basePath}/${slug}`}
          className={clsx(
            "rounded-xl px-2 py-2.5 text-sm font-medium border text-center flex items-center justify-center gap-1.5 transition",
            slug === active
              ? "border-gold text-gold bg-gold/10 shadow-md shadow-gold/10"
              : "border-border text-muted hover:text-foreground hover:border-gold/30"
          )}
        >
          <span aria-hidden>⏱</span>
          {label}
        </Link>
      ))}
    </div>
  );
}
