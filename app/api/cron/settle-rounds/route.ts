import { NextRequest, NextResponse } from "next/server";
import type { WingoMode } from "@/generated/prisma/client";
import type { K3Mode } from "@/generated/prisma/client";
import type { FiveDMode } from "@/generated/prisma/client";
import { getRoundNumber as getWingoRoundNumber } from "@/lib/wingo/rounds";
import { settleRoundIfDue as settleWingoRoundIfDue } from "@/lib/wingo/settle";
import { getRoundNumber as getK3RoundNumber } from "@/lib/k3/rounds";
import { settleRoundIfDue as settleK3RoundIfDue } from "@/lib/k3/settle";
import { getRoundNumber as getFiveDRoundNumber } from "@/lib/fived/rounds";
import { settleRoundIfDue as settleFiveDRoundIfDue } from "@/lib/fived/settle";

const WINGO_MODES: WingoMode[] = ["S30", "M1", "M3", "M5"];
const K3_MODES: K3Mode[] = ["S30", "M1", "M3", "M5", "M10"];
const FIVED_MODES: FiveDMode[] = ["S30", "M1", "M3", "M5", "M10"];

/**
 * Settles every mode of Wingo/K3/5D on a schedule (see vercel.json), instead
 * of relying purely on player traffic to trigger settlement. Without this, a
 * duration nobody is viewing never settles at all until someone opens it —
 * that's what let backlogs of dozens of rounds build up on quiet tabs, which
 * then had to visibly "catch up" once a player finally loaded the page.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = Date.now();

  const jobs = [
    ...WINGO_MODES.map((mode) => ({
      game: "wingo",
      mode,
      run: () => settleWingoRoundIfDue(mode, getWingoRoundNumber(mode, now) - BigInt(1)),
    })),
    ...K3_MODES.map((mode) => ({
      game: "k3",
      mode,
      run: () => settleK3RoundIfDue(mode, getK3RoundNumber(mode, now) - BigInt(1)),
    })),
    ...FIVED_MODES.map((mode) => ({
      game: "fived",
      mode,
      run: () => settleFiveDRoundIfDue(mode, getFiveDRoundNumber(mode, now) - BigInt(1)),
    })),
  ];

  const outcomes = await Promise.allSettled(jobs.map((job) => job.run()));

  const failures = outcomes
    .map((outcome, i) => ({ outcome, job: jobs[i] }))
    .filter(({ outcome }) => outcome.status === "rejected");

  for (const { outcome, job } of failures) {
    console.error(`Cron settle-rounds failed for ${job.game}:${job.mode}:`, (outcome as PromiseRejectedResult).reason);
  }

  return NextResponse.json({
    ok: true,
    settledJobs: jobs.length,
    failures: failures.length,
  });
}
