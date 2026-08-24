import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission, isStaffUser } from "@/lib/admin/permissions";
import { loadBetRows } from "@/lib/admin/bets";
import { toCsv, csvResponse, parseDateRange } from "@/lib/csv";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isStaffUser(user) || !(await hasPermission(user, "results.view"))) {
    return new Response("Not authorized", { status: 403 });
  }

  const createdAt = parseDateRange(req.nextUrl.searchParams);
  const game = req.nextUrl.searchParams.get("game") ?? "";
  const q = req.nextUrl.searchParams.get("q") ?? "";

  const rows = await loadBetRows({ game, q, take: 2000, createdAt });

  const csv = toCsv(
    rows.map((r) => ({
      id: r.id,
      user: r.user.displayName,
      phone: r.user.phone,
      game: r.game,
      round: r.round,
      bet: r.detail,
      stake: r.stake,
      payout: r.payout,
      pl: r.status === "PENDING" ? "" : r.payout - r.stake,
      status: r.status,
      createdAt: r.createdAt,
    })),
    [
      { key: "id", label: "Bet ID" },
      { key: "user", label: "User" },
      { key: "phone", label: "Phone" },
      { key: "game", label: "Game" },
      { key: "round", label: "Round" },
      { key: "bet", label: "Bet" },
      { key: "stake", label: "Stake" },
      { key: "payout", label: "Win" },
      { key: "pl", label: "P/L" },
      { key: "status", label: "Result" },
      { key: "createdAt", label: "Placed" },
    ]
  );

  return csvResponse(csv, `bets-${Date.now()}.csv`);
}
