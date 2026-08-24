import { prisma } from "@/lib/prisma";
import { formatAmount } from "@/lib/format";
import { Avatar } from "@/components/Avatar";
import { ArtImg } from "@/components/ArtImg";
import { Trophy, Medal } from "lucide-react";

const GAME_LABELS: Record<string, string> = {
  k3: "K3",
  fived: "5D",
  crash: "Crash",
  mines: "Mines",
  dice: "Dice",
  wheel: "Lucky Wheel",
};

function maskName(name: string) {
  if (name.length <= 4) return name + "***";
  return name.slice(0, 6) + "***";
}

function gameLabel(meta: unknown): string {
  if (meta && typeof meta === "object") {
    const m = meta as Record<string, unknown>;
    if (typeof m.game === "string") {
      const label = GAME_LABELS[m.game.toLowerCase()];
      if (label) return label;
    }
    if (typeof m.mode === "string") return "Wingo";
  }
  return "Game";
}

const MEDAL_COLORS = ["text-yellow-400", "text-[var(--theme-text-muted)]", "text-amber-700"];

export async function WinnersWidgets() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [topGroups, recentWins] = await Promise.all([
    prisma.ledgerEntry.groupBy({
      by: ["walletId"],
      where: { type: "BET_WON", createdAt: { gte: since } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 3,
    }),
    prisma.ledgerEntry.findMany({
      where: { type: "BET_WON" },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { wallet: { include: { user: true } } },
    }),
  ]);

  const topWallets = await prisma.wallet.findMany({
    where: { id: { in: topGroups.map((g) => g.walletId) } },
    include: { user: true },
  });
  const topWinners = topGroups.flatMap((g) => {
    const wallet = topWallets.find((w) => w.id === g.walletId);
    return wallet ? [{ user: wallet.user, total: g._sum.amount ?? 0 }] : [];
  });

  if (topWinners.length === 0 && recentWins.length === 0) return null;

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {topWinners.length > 0 && (
        <section className="card-surface rounded-2xl p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <ArtImg name="trophy" className="h-6 w-auto object-contain" fallback={<Trophy size={20} className="text-gold" />} />
            Top Winners <span className="text-xs text-muted font-normal">last 24h</span>
          </h2>
          <div className="flex flex-col gap-3">
            {topWinners.map((w, i) => (
              <div key={w.user.id} className="flex items-center gap-3">
                <Medal size={20} className={MEDAL_COLORS[i] || "text-gold"} />
                <Avatar seed={w.user.avatarSeed} name={w.user.displayName} size={32} />
                <p className="text-sm font-medium flex-1 truncate">{maskName(w.user.displayName)}</p>
                <p className="text-sm font-semibold text-gold">{formatAmount(w.total)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {recentWins.length > 0 && (
        <section className="card-surface rounded-2xl p-6">
          <h2 className="font-semibold mb-4 flex items-center justify-between">
            Recent Wins
            <span className="text-[10px] font-semibold text-red border border-red/40 bg-red/10 rounded-full px-2 py-0.5 animate-pulse">
              ● LIVE
            </span>
          </h2>
          <div className="flex flex-col gap-3">
            {recentWins.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3">
                <Avatar seed={entry.wallet.user.avatarSeed} name={entry.wallet.user.displayName} size={32} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{maskName(entry.wallet.user.displayName)}</p>
                  <p className="text-xs text-muted">{gameLabel(entry.meta)}</p>
                </div>
                <p className="text-sm font-semibold text-green">+{formatAmount(entry.amount)}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
