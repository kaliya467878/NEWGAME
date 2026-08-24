"use client";

import { useQuery } from "@tanstack/react-query";
import { Odometer } from "@/components/Odometer";

async function fetchBalance(): Promise<number> {
  const res = await fetch("/api/wallet/summary", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load balance");
  const data = await res.json();
  return data.balance;
}

/**
 * Subscribes to the same ["wallet-balance"] query every game board
 * invalidates after a bet settles, so the header balance updates live —
 * on the game page itself and anywhere else the header is mounted —
 * without a full page reload.
 */
export function HeaderBalance({ initialBalance, className }: { initialBalance: number; className?: string }) {
  const { data } = useQuery({
    queryKey: ["wallet-balance"],
    queryFn: fetchBalance,
    initialData: initialBalance,
    refetchInterval: 5000,
  });

  return <Odometer value={data ?? initialBalance} decimals={2} className={className} />;
}
