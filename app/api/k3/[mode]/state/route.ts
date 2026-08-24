export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import type { K3Mode } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { getRoundNumber, getRoundWindow, MODE_DURATIONS_SECONDS } from "@/lib/k3/rounds";
import { settleRoundIfDue } from "@/lib/k3/settle";

const MODE_MAP: Record<string, K3Mode> = {
  m1: "M1",
  m3: "M3",
  m5: "M5",
  m10: "M10",
  "30s": "S30",
  s30: "S30",
  "1m": "M1",
  "3m": "M3",
  "5m": "M5",
  "10m": "M10",
  "1min": "M1",
  "3min": "M3",
  "5min": "M5",
  "10min": "M10",
};

// Global cache for recent K3 results to prevent database read spikes under high traffic
const recentResultsCache: Record<string, { data: any[]; expiresAt: number }> = {};
const CACHE_TTL_MS = 1000; // 1 second cache

async function getCachedRecentResults(mode: K3Mode, currentRound: bigint): Promise<any[]> {
  const now = Date.now();
  const cache = recentResultsCache[mode];
  if (cache && cache.expiresAt > now) {
    return cache.data;
  }
  const results = await prisma.k3Result.findMany({
    where: { mode, roundNumber: { lt: currentRound } },
    orderBy: { roundNumber: "desc" },
    take: 50,
  });
  recentResultsCache[mode] = {
    data: results,
    expiresAt: now + CACHE_TTL_MS,
  };
  return results;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ mode: string }> }) {
  const { mode: modeParam } = await params;
  const mode = MODE_MAP[modeParam] || MODE_MAP[modeParam.toLowerCase()];
  if (!mode) {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }

  const now = Date.now();
  const roundNumber = getRoundNumber(mode, now);
  const { startsAt, endsAt, locksAt } = getRoundWindow(mode, roundNumber);

  try {
    await settleRoundIfDue(mode, roundNumber - BigInt(1));
  } catch (settleError) {
    console.error("Failed to settle K3 round in state endpoint:", settleError);
  }

  const [recentResultsRaw, user] = await Promise.all([
    getCachedRecentResults(mode, roundNumber),
    getCurrentUser(),
  ]);

  const myBetsRaw = user
    ? await prisma.k3Bet.findMany({
        where: { mode, roundNumber: { in: [roundNumber, roundNumber - BigInt(1)] }, userId: user.id },
        orderBy: { createdAt: "desc" },
      })
    : [];

  // roundNumber is a BigInt in the DB (values exceed Number.MAX_SAFE_INTEGER);
  // stringify it explicitly here rather than letting JSON serialization fall
  // back to a lossy Number conversion.
  const recentResults = recentResultsRaw.map((r) => ({ ...r, roundNumber: r.roundNumber.toString() }));
  const myBets = myBetsRaw.map((b) => ({ ...b, roundNumber: b.roundNumber.toString() }));

  return NextResponse.json({
    mode: modeParam,
    roundNumber: roundNumber.toString(),
    serverTime: now,
    startsAt,
    endsAt,
    locksAt,
    locked: now >= locksAt,
    durationSeconds: MODE_DURATIONS_SECONDS[mode],
    recentResults,
    myBets,
  });
}
