"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import { getAnnouncements } from "@/lib/platformApi";
import { getBalance } from "@/lib/walletApi";

export type DurationTab = { id: string; label: string };

type GameHeaderProps = {
  title: string;
  subtitle?: string;
  durations?: DurationTab[];
  activeDuration?: string;
  durationHrefPrefix?: string;
  onDurationChange?: (id: string) => void;
};

export function GameHeader({
  title,
  subtitle = "LuckyNova Fair Games",
  durations,
  activeDuration,
  durationHrefPrefix,
  onDurationChange,
}: GameHeaderProps) {
  const router = useRouter();

  const announcementQuery = useQuery({
    queryKey: ["platform-announcements"],
    queryFn: getAnnouncements,
    staleTime: 60_000,
  });
  const announcement = announcementQuery.data?.data?.[0]?.content;

  const balanceQuery = useQuery({
    queryKey: ["wallet-balance"],
    queryFn: async () => {
      try {
        const res = await getBalance();
        const val = (res?.balance ?? res?.data?.balance ?? 0) as number;
        if (typeof window !== "undefined") {
          window.localStorage.setItem("lastBalance", String(val));
        }
        return val;
      } catch (err: any) {
        console.error("GameHeader balance query error:", err);
        throw err;
      }
    },
    refetchInterval: 1000,
    initialData: () => {
      if (typeof window === "undefined") return undefined;
      const cached = Number(window.localStorage.getItem("lastBalance"));
      return Number.isFinite(cached) && cached > 0 ? cached : undefined;
    },
  });

  const balance = balanceQuery.data ?? 0;
  const refreshingBalance = balanceQuery.isFetching;

  const onRefreshBalance = () => {
    balanceQuery.refetch();
  };

  return (
    <>
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-surface border-b border-border px-4 py-3.5 flex items-center justify-between relative">
        <button
          onClick={() => router.push("/")}
          className="p-1 hover:bg-surface-2 rounded-full transition-colors text-muted z-10"
          aria-label="Back to home"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <img
            src="/design/logo_header.png"
            alt="LUCKY NOVA"
            style={{ height: "18px", width: "auto", objectFit: "contain" }}
          />
        </div>
        <div style={{ width: "28px" }} className="z-10" />
      </header>

      {/* DURATION TABS */}
      {durations && durations.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mx-4 my-4">
          {durations.map((d) => {
            const active = activeDuration === d.id;
            const content = (
              <div className="flex flex-col items-center gap-1.5 cursor-pointer">
                <div
                  className={`h-12 w-12 rounded-full flex items-center justify-center text-lg transition-all ${
                    active
                      ? "bg-gradient-to-br from-gold-light to-gold text-dark shadow-md shadow-gold/30 ring-2 ring-gold/40 ring-offset-2 ring-offset-background"
                      : "bg-surface-2 border border-border text-muted"
                  }`}
                >
                  <Clock size={22} />
                </div>
                <span className={`text-[11px] font-semibold ${active ? "text-gold" : "text-muted"}`}>
                  {d.label.replace(/5D Lot |Win Go |K3 /g, "")}
                </span>
              </div>
            );

            if (durationHrefPrefix) {
              return (
                <Link key={d.id} href={`${durationHrefPrefix}/${d.id}`}>
                  {content}
                </Link>
              );
            }

            return (
              <div key={d.id} onClick={() => onDurationChange?.(d.id)}>
                {content}
              </div>
            );
          })}
        </div>
      )}

      {/* WALLET & ANNOUNCEMENT */}
      <div className="flex flex-col gap-3 px-4 mb-4" style={{ marginTop: (!durations || durations.length === 0) ? "1rem" : "0" }}>
        <section className="card-surface rounded-2xl p-5 sm:p-6 flex flex-col items-center gap-4">
          <div className="w-full flex items-center justify-center relative">
            <div className="flex flex-col items-center gap-1">
              <span suppressHydrationWarning className="text-2xl font-bold text-gold flex flex-col items-center">
                <span>
                  ₹{balance.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                {balanceQuery.error && (
                  <span style={{ fontSize: "10px", color: "#ff4d4d", fontWeight: "normal", marginTop: "2px" }}>
                    ERR: {(balanceQuery.error as any).response?.data?.message || balanceQuery.error.message || String(balanceQuery.error)}
                  </span>
                )}
              </span>
              <span className="text-xs text-muted flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="6" width="20" height="14" rx="2" />
                  <path d="M16 12h.01M2 10h20" />
                </svg>
                Wallet balance
              </span>
            </div>
            <button
              type="button"
              onClick={onRefreshBalance}
              aria-label="Refresh balance"
              className="absolute right-0 top-0 text-gold hover:text-gold-light transition-colors"
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                stroke="currentColor"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={refreshingBalance ? "animate-spin" : ""}
              >
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </button>
          </div>
          <div className="w-full grid grid-cols-2 gap-3">
            <Link
              href="/wallet/withdraw"
              className="rounded-xl py-3 text-center text-sm font-semibold border border-red/40 text-red bg-red/10 hover:bg-red/15 transition"
            >
              Withdraw
            </Link>
            <Link
              href="/wallet/deposit"
              className="rounded-xl py-3 text-center text-sm font-semibold border border-gold/50 bg-gradient-to-r from-gold-light to-gold text-dark hover:brightness-105 transition"
            >
              Deposit
            </Link>
          </div>
        </section>

        {announcement && (
          <section className="card-surface rounded-2xl px-4 py-3 flex items-center gap-3" style={{ border: "1px solid rgba(212, 175, 55, 0.25)" }}>
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="var(--gold)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
            >
              <path d="M11 5 6 9H2v6h4l5 4z" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
            <div className="flex-1 overflow-hidden" style={{ display: "block" }}>
              {React.createElement(
                "marquee",
                {
                  scrollamount: "3.5",
                  style: { color: "#a1a1aa", fontSize: "12px", display: "block", whiteSpace: "nowrap" }
                },
                announcement
              )}
            </div>
            <span className="text-xs font-semibold text-gold shrink-0 cursor-pointer">Detail</span>
          </section>
        )}
      </div>
    </>
  );
}
