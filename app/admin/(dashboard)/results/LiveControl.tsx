"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { setResultOverrideAction, type AdminActionState } from "@/lib/actions/admin";
import { setK3OverrideAction, setFiveDOverrideAction } from "@/lib/actions/gameAdmin";
import { formatAmount } from "@/lib/format";
import { Button } from "@/components/ui/Button";

const GAMES = [
  { key: "wingo", label: "Wingo" },
  { key: "k3", label: "K3" },
  { key: "fived", label: "5D" },
];
const MODES = [
  { key: "s30", label: "30s", enum: "S30", wingoOnly: true },
  { key: "m1", label: "1m", enum: "M1" },
  { key: "m3", label: "3m", enum: "M3" },
  { key: "m5", label: "5m", enum: "M5" },
  { key: "m10", label: "10m", enum: "M10", hideForWingo: true },
];

type Option = { label: string; value: Record<string, number>; payout: number };
type PositionRow = { position: string; digits: { digit: number; payout: number }[] };
type StateDto = {
  game: string;
  mode: string;
  roundNumber: number;
  endsAt: number;
  serverTime: number;
  totalStake: number;
  betCount: number;
  options?: Option[];
  positions?: PositionRow[];
  selections?: Record<string, { amount: number; count: number }>;
};

async function fetchState(game: string, mode: string): Promise<StateDto> {
  const res = await fetch(`/api/admin/results/state?game=${game}&mode=${mode}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load state");
  return res.json();
}

export function LiveControl({ canOverride }: { canOverride: boolean }) {
  const queryClient = useQueryClient();
  const [game, setGame] = useState("wingo");
  const [mode, setMode] = useState("m1");
  const [digits, setDigits] = useState([0, 0, 0, 0, 0]);
  const [message, setMessage] = useState<AdminActionState>({});

  const { data } = useQuery({
    queryKey: ["admin-results-state", game, mode],
    queryFn: () => fetchState(game, mode),
    refetchInterval: 2000,
  });

  const remaining = data ? Math.max(0, Math.ceil((data.endsAt - data.serverTime) / 1000)) : null;
  const modeEnum = MODES.find((m) => m.key === mode)!.enum;

  const forceMutation = useMutation({
    mutationFn: async (value: Record<string, number>) => {
      if (!data) throw new Error("No round loaded");
      const fd = new FormData();
      fd.set("mode", modeEnum);
      fd.set("roundNumber", String(data.roundNumber));
      for (const [k, v] of Object.entries(value)) fd.set(k, String(v));
      if (game === "wingo") return setResultOverrideAction({}, fd);
      if (game === "k3") return setK3OverrideAction({}, fd);
      return setFiveDOverrideAction({}, fd);
    },
    onSuccess: (result) => {
      setMessage(result);
      queryClient.invalidateQueries({ queryKey: ["admin-results-state", game, mode] });
    },
    onError: (err) => setMessage({ error: err instanceof Error ? err.message : "Failed" }),
  });

  const bestPayout = useMemo(() => {
    if (!data?.options || data.options.length === 0) return 0;
    return Math.min(...data.options.map((o) => o.payout));
  }, [data]);

  return (
    <section className="card-surface rounded-2xl p-6 flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Live period — instant force result</h2>
          <p className="text-xs text-muted mt-0.5 font-mono">
            {data ? `${game.toUpperCase()} ${modeEnum} · round #${data.roundNumber}` : "loading…"}
          </p>
        </div>
        <div className="rounded-lg border border-gold/40 bg-gold/10 px-4 py-2 text-center">
          <p className="text-[10px] text-muted uppercase tracking-wide">Closes in</p>
          <p className="text-xl font-mono font-bold text-gold">
            {remaining !== null ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}` : "--:--"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {GAMES.map((g) => (
          <button
            key={g.key}
            onClick={() => {
              setGame(g.key);
              setMessage({});
              const stillValid = MODES.some(
                (m) => m.key === mode && !(g.key === "wingo" ? m.hideForWingo : m.wingoOnly)
              );
              if (!stillValid) setMode("m1");
            }}
            className={clsx(
              "rounded-full px-4 py-1.5 text-sm border",
              game === g.key ? "border-gold text-gold bg-gold/10 font-semibold" : "border-border text-muted hover:text-foreground"
            )}
          >
            {g.label}
          </button>
        ))}
        <span className="w-px bg-border mx-1" />
        {MODES.filter((m) => (game === "wingo" ? !m.hideForWingo : !m.wingoOnly)).map((m) => (
          <button
            key={m.key}
            onClick={() => { setMode(m.key); setMessage({}); }}
            className={clsx(
              "rounded-full px-3.5 py-1.5 text-sm border",
              mode === m.key ? "border-gold text-gold bg-gold/10 font-semibold" : "border-border text-muted hover:text-foreground"
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex gap-6 text-sm">
        <p className="text-muted">
          Pending bets: <span className="text-foreground font-semibold">{data?.betCount ?? "—"}</span>
        </p>
        <p className="text-muted">
          Total stake: <span className="text-coin font-semibold">{data ? formatAmount(data.totalStake) : "—"}</span>
        </p>
      </div>

      {data?.selections && Object.keys(data.selections).length > 0 && (
        <div className="border border-border bg-surface-2/40 rounded-xl p-4 flex flex-col gap-3">
          <p className="text-xs font-semibold text-gold uppercase tracking-wider">Active Bets Breakdown (लाइव बेट्स विवरण)</p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {Object.entries(data.selections).map(([sel, stat]) => {
              let colorClass = "border-border text-foreground bg-surface-3";
              if (sel.toUpperCase() === "GREEN") colorClass = "border-green/40 text-green bg-green/10";
              else if (sel.toUpperCase() === "RED") colorClass = "border-red/40 text-red bg-red/10";
              else if (sel.toUpperCase() === "VIOLET") colorClass = "border-purple-500/40 text-purple-400 bg-purple-500/10";
              else if (sel.toUpperCase() === "BIG") colorClass = "border-orange-500/40 text-orange-400 bg-orange-500/10";
              else if (sel.toUpperCase() === "SMALL") colorClass = "border-sky-500/40 text-sky-400 bg-sky-500/10";
              else if (/^\d+$/.test(sel)) {
                colorClass = "border-gold/40 text-gold bg-gold/5 font-mono";
              }

              return (
                <div key={sel} className={clsx("rounded-xl border p-3 flex flex-col justify-between gap-1", colorClass)}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm tracking-wide">{sel}</span>
                    <span className="text-[10px] text-muted opacity-80">{stat.count} bets</span>
                  </div>
                  <p className="text-base font-bold mt-1 text-right">{formatAmount(stat.amount)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {data?.options && (
        <div>
          <p className="text-xs text-muted mb-2">
            {game === "wingo"
              ? "Payout owed if each number wins — click a number to force it for this round."
              : "Payout owed if each dice sum wins — click a sum to force it (uses a matching dice combo)."}
          </p>
          <div className={clsx("grid gap-2", game === "wingo" ? "grid-cols-5 lg:grid-cols-10" : "grid-cols-4 lg:grid-cols-8")}>
            {data.options.map((opt) => (
              <button
                key={opt.label}
                disabled={!canOverride || forceMutation.isPending}
                onClick={() => forceMutation.mutate(opt.value)}
                className={clsx(
                  "relative rounded-xl border p-3 text-center transition disabled:opacity-60",
                  opt.payout === bestPayout
                    ? "border-green/60 bg-green/10 hover:bg-green/20"
                    : "border-border bg-surface-2 hover:border-gold/50"
                )}
              >
                {opt.payout === bestPayout && (
                  <span className="absolute top-1 right-1 text-[8px] font-bold text-green tracking-wide">BEST</span>
                )}
                <p className="text-xl font-bold">{opt.label}</p>
                <p className={clsx("text-[11px] mt-0.5", opt.payout === 0 ? "text-green" : "text-muted")}>
                  {formatAmount(opt.payout)}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {data?.positions && (
        <div className="flex flex-col gap-4">
          <p className="text-xs text-muted">
            Pick a digit for each position (payout owed per digit shown), then force the full result.
          </p>
          {data.positions.map((row, pi) => (
            <div key={row.position}>
              <p className="text-xs font-semibold text-muted mb-1">Position {row.position}</p>
              <div className="grid grid-cols-10 gap-1.5">
                {row.digits.map((d) => (
                  <button
                    key={d.digit}
                    onClick={() => setDigits((prev) => prev.map((v, i) => (i === pi ? d.digit : v)))}
                    className={clsx(
                      "rounded-lg border p-2 text-center text-sm transition",
                      digits[pi] === d.digit ? "border-gold text-gold bg-gold/10 font-bold" : "border-border bg-surface-2 hover:border-gold/40"
                    )}
                  >
                    <p>{d.digit}</p>
                    <p className={clsx("text-[9px]", d.payout === 0 ? "text-green" : "text-muted")}>{d.payout}</p>
                  </button>
                ))}
              </div>
            </div>
          ))}
          <Button
            variant="danger"
            disabled={!canOverride || forceMutation.isPending}
            onClick={() => forceMutation.mutate({ a: digits[0], b: digits[1], c: digits[2], d: digits[3], e: digits[4] })}
            className="self-start"
          >
            Force result {digits.join("")}
          </Button>
        </div>
      )}

      {!canOverride && (
        <p className="text-xs text-red">You have view access only — forcing results requires the override permission.</p>
      )}
      {message.error && <p className="text-sm text-red">{message.error}</p>}
      {message.success && <p className="text-sm text-green">{message.success}</p>}
    </section>
  );
}
