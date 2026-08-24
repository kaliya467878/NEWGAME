import { format, startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/admin/permissions";
import { loadBetRows, GAME_FILTERS } from "@/lib/admin/bets";
import { formatAmount } from "@/lib/format";
import { CsvExportBar } from "@/components/admin/CsvExportBar";
import clsx from "clsx";

export default async function AdminBetsPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string; q?: string }>;
}) {
  await requirePermission("results.view");
  const { game = "", q = "" } = await searchParams;

  const midnight = startOfDay(new Date());
  const [placedAgg, wonAgg, rows, pendingWingo, pendingK3, pendingFived, activeMines, activeCrash] = await Promise.all([
    prisma.ledgerEntry.aggregate({ where: { type: "BET_PLACED", createdAt: { gte: midnight } }, _sum: { amount: true }, _count: true }),
    prisma.ledgerEntry.aggregate({ where: { type: "BET_WON", createdAt: { gte: midnight } }, _sum: { amount: true } }),
    loadBetRows({ game, q, take: game ? 60 : 25 }).then((r) => r.slice(0, 60)),
    prisma.wingoBet.count({ where: { status: "PENDING" } }),
    prisma.k3Bet.count({ where: { status: "PENDING" } }),
    prisma.fiveDBet.count({ where: { status: "PENDING" } }),
    prisma.minesGame.count({ where: { status: "ACTIVE" } }),
    prisma.crashGame.count({ where: { status: "ACTIVE" } }),
  ]);

  const volume = -(placedAgg._sum.amount ?? 0);
  const payouts = wonAgg._sum.amount ?? 0;
  const ggr = volume - payouts;
  const pending = pendingWingo + pendingK3 + pendingFived + activeMines + activeCrash;

  const stats = [
    { label: "Bets today", value: placedAgg._count.toLocaleString("en-US"), sub: "Placed since midnight" },
    { label: "Volume today", value: formatAmount(volume), sub: "Total stake amount" },
    { label: "Payouts today", value: formatAmount(payouts), sub: "Winning credits" },
    {
      label: "Platform GGR today", value: formatAmount(ggr), sub: "Volume minus payouts",
      tone: ggr >= 0 ? "text-green" : "text-red", highlight: true,
    },
    { label: "Pending bets", value: pending.toLocaleString("en-US"), sub: "Awaiting settlement" },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Bet management</h1>
        <p className="text-sm text-muted mt-1">Platform-wide bets across every game — search, audit, investigate</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className={clsx("card-surface rounded-2xl p-4", s.highlight && "border-gold/40")}
          >
            <p className="text-xs text-muted">{s.label}</p>
            <p className={clsx("text-xl font-semibold mt-1", s.tone ?? "text-foreground")}>{s.value}</p>
            <p className="text-[11px] text-muted mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      <form className="card-surface rounded-2xl p-4 flex flex-wrap items-end gap-3" method="GET">
        <label className="flex flex-col gap-1.5 text-sm flex-1 min-w-48">
          <span className="text-muted text-xs">Search user</span>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Phone or display name…"
            className="rounded-lg bg-surface-2 border border-border px-3.5 py-2.5 outline-none focus:border-gold/60"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted text-xs">Game</span>
          <select
            name="game"
            defaultValue={game}
            className="rounded-lg bg-surface-2 border border-border px-3.5 py-2.5 outline-none focus:border-gold/60"
          >
            {GAME_FILTERS.map((g) => (
              <option key={g.key} value={g.key}>{g.label}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded-xl bg-gold-gradient text-[var(--theme-text)] font-semibold px-6 py-2.5 text-sm">
          Apply
        </button>
        <div className="ml-auto">
          <CsvExportBar href="/api/admin/bets/export" extraParams={{ game, q }} />
        </div>
      </form>

      <section className="card-surface rounded-2xl overflow-x-auto">
        <table className="w-full text-sm min-w-[820px]">
          <thead>
            <tr className="text-left text-muted text-xs border-b border-border">
              <th className="px-4 py-3 font-medium">Bet ID</th>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Game</th>
              <th className="px-4 py-3 font-medium">Round</th>
              <th className="px-4 py-3 font-medium">Bet</th>
              <th className="px-4 py-3 font-medium text-right">Stake</th>
              <th className="px-4 py-3 font-medium text-right">Win</th>
              <th className="px-4 py-3 font-medium text-right">P/L</th>
              <th className="px-4 py-3 font-medium">Result</th>
              <th className="px-4 py-3 font-medium">Placed</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-muted">No bets found.</td></tr>
            )}
            {rows.map((r) => {
              const pl = r.status === "PENDING" ? null : r.payout - r.stake;
              return (
                <tr key={r.id} className="border-b border-border/50 hover:bg-surface-2/50">
                  <td className="px-4 py-3 font-mono text-xs text-muted">{r.id.slice(0, 8)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{r.user.displayName}</p>
                    <p className="text-xs text-muted">{r.user.phone}</p>
                  </td>
                  <td className="px-4 py-3">{r.game}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gold">{r.round}</td>
                  <td className="px-4 py-3">{r.detail}</td>
                  <td className="px-4 py-3 text-right">{formatAmount(r.stake)}</td>
                  <td className="px-4 py-3 text-right">{formatAmount(r.payout)}</td>
                  <td className={clsx("px-4 py-3 text-right font-semibold", pl === null ? "text-muted" : pl >= 0 ? "text-green" : "text-red")}>
                    {pl === null ? "—" : `${pl >= 0 ? "+" : ""}${formatAmount(pl)}`}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={clsx(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                        r.status === "PENDING" && "border-gold/40 text-gold bg-gold/10",
                        r.status === "WON" && "border-green/40 text-green bg-green/10",
                        r.status === "LOST" && "border-red/40 text-red bg-red/10"
                      )}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">
                    {format(r.createdAt, "d MMM, h:mm a")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
