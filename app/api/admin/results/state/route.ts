import { NextRequest, NextResponse } from "next/server";
import type { FiveDMode, K3Mode, WingoMode } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission, isStaffUser } from "@/lib/admin/permissions";
import * as wingo from "@/lib/wingo/rounds";
import * as k3 from "@/lib/k3/rounds";
import * as fived from "@/lib/fived/rounds";

const MODE_MAP = { s30: "S30", m1: "M1", m3: "M3", m5: "M5", m10: "M10" } as const;

/** Canonical dice combos per sum — non-triples preferred so ANY_TRIPLE bets lose. */
const K3_COMBOS: Record<number, [number, number, number]> = {
  3: [1, 1, 1], 4: [1, 1, 2], 5: [1, 2, 2], 6: [1, 2, 3], 7: [1, 2, 4], 8: [1, 3, 4],
  9: [2, 3, 4], 10: [2, 3, 5], 11: [2, 4, 5], 12: [3, 4, 5], 13: [3, 4, 6], 14: [3, 5, 6],
  15: [4, 5, 6], 16: [4, 6, 6], 17: [5, 6, 6], 18: [6, 6, 6],
};

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isStaffUser(user) || !(await hasPermission(user, "results.view"))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const game = req.nextUrl.searchParams.get("game") ?? "wingo";
  const modeParam = (req.nextUrl.searchParams.get("mode") ?? "s30") as keyof typeof MODE_MAP;
  const mode = MODE_MAP[modeParam];
  if (!mode) return NextResponse.json({ error: "Invalid mode" }, { status: 400 });

  const now = Date.now();

  if (game === "wingo") {
    const roundNumber = wingo.getRoundNumber(mode as WingoMode, now);
    const { endsAt } = wingo.getRoundWindow(mode as WingoMode, roundNumber);
    const bets = await prisma.wingoBet.findMany({ where: { mode: mode as WingoMode, roundNumber, status: "PENDING" } });
    const totalStake = bets.reduce((s, b) => s + b.amount, 0);
    const options = Array.from({ length: 10 }, (_, n) => ({
      label: String(n),
      value: { number: n },
      payout: bets.reduce((s, b) => {
        const m = wingo.resolveBetMultiplier(b, n);
        return s + (m > 0 ? Math.round(b.amount * m) : 0);
      }, 0),
    }));

    const selections: Record<string, { amount: number; count: number }> = {};
    for (const b of bets) {
      if (!selections[b.selection]) {
        selections[b.selection] = { amount: 0, count: 0 };
      }
      selections[b.selection].amount += b.amount;
      selections[b.selection].count += 1;
    }

    return NextResponse.json({ game, mode: modeParam, roundNumber, endsAt, serverTime: now, totalStake, betCount: bets.length, options, selections });
  }

  if (game === "k3") {
    const roundNumber = k3.getRoundNumber(mode as K3Mode, now);
    const { endsAt } = k3.getRoundWindow(mode as K3Mode, roundNumber);
    const bets = await prisma.k3Bet.findMany({ where: { mode: mode as K3Mode, roundNumber, status: "PENDING" } });
    const totalStake = bets.reduce((s, b) => s + b.amount, 0);
    const options = Object.entries(K3_COMBOS).map(([sum, dice]) => ({
      label: sum,
      value: { dice1: dice[0], dice2: dice[1], dice3: dice[2] },
      payout: bets.reduce((s, b) => {
        const m = k3.resolveBetMultiplier(b, dice);
        return s + (m > 0 ? Math.round(b.amount * m) : 0);
      }, 0),
    }));

    const selections: Record<string, { amount: number; count: number }> = {};
    for (const b of bets) {
      if (!selections[b.selection]) {
        selections[b.selection] = { amount: 0, count: 0 };
      }
      selections[b.selection].amount += b.amount;
      selections[b.selection].count += 1;
    }

    return NextResponse.json({ game, mode: modeParam, roundNumber, endsAt, serverTime: now, totalStake, betCount: bets.length, options, selections });
  }

  if (game === "fived") {
    const roundNumber = fived.getRoundNumber(mode as FiveDMode, now);
    const { endsAt } = fived.getRoundWindow(mode as FiveDMode, roundNumber);
    const bets = await prisma.fiveDBet.findMany({ where: { mode: mode as FiveDMode, roundNumber, status: "PENDING" } });
    const totalStake = bets.reduce((s, b) => s + b.amount, 0);
    // Per-position digit exposure: payout added if that position settles on that digit.
    const positions = fived.POSITIONS.map((pos, pi) => ({
      position: pos,
      digits: Array.from({ length: 10 }, (_, d) => ({
        digit: d,
        payout: bets.reduce((s, b) => {
          if (b.betType !== "POSITION_NUMBER") return s;
          const [p, ds] = b.selection.split(":");
          return p === pos && Number(ds) === d ? s + b.amount * 9 : s;
        }, 0),
      })),
      _pi: pi,
    }));

    const selections: Record<string, { amount: number; count: number }> = {};
    for (const b of bets) {
      if (!selections[b.selection]) {
        selections[b.selection] = { amount: 0, count: 0 };
      }
      selections[b.selection].amount += b.amount;
      selections[b.selection].count += 1;
    }

    return NextResponse.json({ game, mode: modeParam, roundNumber, endsAt, serverTime: now, totalStake, betCount: bets.length, positions, selections });
  }

  return NextResponse.json({ error: "Invalid game" }, { status: 400 });
}
