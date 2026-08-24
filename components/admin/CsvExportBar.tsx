"use client";

import { useState } from "react";
import { format, subDays } from "date-fns";

/** Date-range picker + "Export CSV" button that hits the given API route with from/to/extra params. */
export function CsvExportBar({
  href,
  extraParams,
}: {
  /** e.g. "/api/admin/activity/export" */
  href: string;
  extraParams?: Record<string, string>;
}) {
  const [from, setFrom] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [to, setTo] = useState(format(new Date(), "yyyy-MM-dd"));

  const params = new URLSearchParams({ from, to, ...extraParams });
  const url = `${href}?${params.toString()}`;

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-muted">From</span>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-lg bg-surface-2 border border-border px-2.5 py-1.5 text-sm outline-none focus:border-gold/60"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-muted">To</span>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-lg bg-surface-2 border border-border px-2.5 py-1.5 text-sm outline-none focus:border-gold/60"
        />
      </label>
      <a
        href={url}
        download
        className="rounded-lg bg-gold-gradient text-[var(--theme-text)] text-sm font-semibold px-4 py-2 hover:brightness-105"
      >
        Export CSV
      </a>
    </div>
  );
}
