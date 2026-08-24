"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function SortSelector({ currentSort }: { currentSort: "asc" | "desc" }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", e.target.value);
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground text-zinc-400">Sort by:</span>
      <select
        value={currentSort}
        onChange={handleChange}
        className="bg-zinc-800 text-sm text-[var(--theme-text)] border border-zinc-700 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-gold"
      >
        <option value="desc">Newest First</option>
        <option value="asc">Oldest First</option>
      </select>
    </div>
  );
}
