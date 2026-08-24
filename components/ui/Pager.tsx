import clsx from "clsx";

export function Pager({ page, pageCount, onChange }: { page: number; pageCount: number; onChange: (page: number) => void }) {
  if (pageCount <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-4 pt-1">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className={clsx(
          "h-8 w-8 rounded-lg border flex items-center justify-center transition",
          page <= 1 ? "border-border text-muted/40 cursor-not-allowed" : "border-gold/40 text-gold hover:bg-gold/10"
        )}
      >
        ‹
      </button>
      <span className="text-xs text-muted tabular-nums">
        {page} / {pageCount}
      </span>
      <button
        type="button"
        disabled={page >= pageCount}
        onClick={() => onChange(page + 1)}
        className={clsx(
          "h-8 w-8 rounded-lg border flex items-center justify-center transition",
          page >= pageCount ? "border-border text-muted/40 cursor-not-allowed" : "border-gold/40 text-gold hover:bg-gold/10"
        )}
      >
        ›
      </button>
    </div>
  );
}
