import { randomInt } from "crypto";
import type { WingoMode, ResultSource } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { getColorAndSize, getRoundWindow, resolveBetMultiplier } from "@/lib/wingo/rounds";

// Per-request cap on the best-effort backfill of older, still-unsettled rounds.
// The target round is always settled separately (see below), so this only
// bounds how much historical backlog a single poll drains — keeping each
// request fast while the backlog empties over successive polls.
const MAX_BACKFILL_ROUNDS = BigInt(25);

// The full bounded backlog is awaited synchronously (see settleRoundIfDue) so
// a lull of up to MAX_BACKFILL_ROUNDS missed rounds is completely caught up
// before the response is sent. This only works because backfillOlderRounds
// settles every missing round IN PARALLEL (different round numbers never
// contend for the same lock) — a sequential loop over ~20 rounds at several
// DB/Redis round-trips each was slow enough that the client's 1s poll saw the
// history's top period tick up one at a time over many seconds instead of
// already being caught up.
const SYNC_BACKFILL_ROUNDS = MAX_BACKFILL_ROUNDS;

/**
 * Settles the just-ended round (and, best-effort, any older unsettled rounds).
 * This is what lets Wingo run on stateless serverless routes with no scheduler:
 * rounds are derived from wall-clock time, and settlement is lazy + idempotent
 * (guarded by a Redis lock + the DB unique constraint).
 *
 * Critically, the target `roundNumber` is settled FIRST — before any backfill.
 * It is the round the player most likely just bet on, so its result must appear
 * and its bets must resolve on this very poll. The previous implementation
 * settled oldest-first and only reached the live round at the end of the loop;
 * once a large backlog existed it would grind through hundreds of stale rounds
 * first and the request would time out before ever settling the live round —
 * leaving results frozen and every bet stuck PENDING.
 */
export async function settleRoundIfDue(mode: WingoMode, roundNumber: bigint) {
  const { endsAt } = getRoundWindow(mode, roundNumber);
  if (Date.now() < endsAt) return null;

  const cacheKey = `wingo:settled-cache:${mode}:${roundNumber}`;
  let cached = null;
  try {
    cached = await redis.get(cacheKey);
  } catch (err) {
    console.error("Redis get error in Wingo settleRoundIfDue:", err);
  }
  if (cached === "1") return null;

  // 1. Settle the live/just-ended round first so it can never be starved.
  const result = await settleOneRound(mode, roundNumber);

  // 1b. Drain a small slice of any older backlog synchronously so a short
  // lull is fully caught up before this response is sent, instead of leaking
  // into the UI as a visible one-round-per-second catch-up (see
  // SYNC_BACKFILL_ROUNDS above).
  try {
    await backfillOlderRounds(mode, roundNumber, SYNC_BACKFILL_ROUNDS);
  } catch (err) {
    console.error("Wingo sync backfill error in settleRoundIfDue:", err);
  }

  // 2 & 3 are best-effort backlog cleanup, not needed to answer this request.
  // They used to run awaited, in-line, on every single poll — up to 50
  // sequential DB/Redis round-trips per request whenever a mode had any
  // backlog. Firing them off without awaiting lets the response return as
  // soon as the round the player is looking at is settled; the backlog still
  // drains, just across background runs instead of blocking the request.
  runBacklogCleanup(mode, roundNumber).catch((err) => {
    console.error("Wingo backlog cleanup error in settleRoundIfDue:", err);
  });

  return result;
}

async function backfillOlderRounds(mode: WingoMode, roundNumber: bigint, maxRounds: bigint) {
  const lastBelow = await prisma.wingoResult.findFirst({
    where: { mode, roundNumber: { lt: roundNumber } },
    orderBy: { roundNumber: "desc" },
  });
  if (!lastBelow) return;
  const rounds: bigint[] = [];
  for (
    let round = lastBelow.roundNumber + BigInt(1);
    round < roundNumber && BigInt(rounds.length) < maxRounds;
    round++
  ) {
    rounds.push(round);
  }
  // Settled in parallel, not sequentially — each round has its own lock key
  // and unique-constraint-guarded row, so they never contend with each other.
  // A sequential await-per-round loop is what made a real backlog take one
  // visible second per round to drain.
  await Promise.all(rounds.map((round) => settleOneRound(mode, round)));
}

async function runBacklogCleanup(mode: WingoMode, roundNumber: bigint) {
  // 2. Best-effort, bounded, oldest-first catch-up of older rounds still
  //    missing a result (server restart, low traffic, host cold-start). Runs
  //    AFTER the target round so it can never delay it, and is capped per
  //    request so each poll stays fast; the backlog drains over successive
  //    polls without leaving permanent gaps.
  try {
    await backfillOlderRounds(mode, roundNumber, MAX_BACKFILL_ROUNDS);
  } catch (err) {
    console.error("Wingo backfill error in settleRoundIfDue:", err);
  }

  // 3. Sweep any lingering PENDING bets on already-ended rounds and settle
  //    those rounds directly. This catches bets stranded on rounds that already
  //    have a result (so the backfill above, which only fills result-less
  //    rounds, would skip them). settleOneRound is idempotent + self-healing, so
  //    this simply resolves them. Bounded per request to stay fast.
  try {
    const stuckRounds = await prisma.wingoBet.findMany({
      where: { mode, status: "PENDING", roundNumber: { lt: roundNumber } },
      distinct: ["roundNumber"],
      orderBy: { roundNumber: "asc" },
      take: Number(MAX_BACKFILL_ROUNDS),
      select: { roundNumber: true },
    });
    for (const { roundNumber: stuck } of stuckRounds) {
      const { endsAt: stuckEndsAt } = getRoundWindow(mode, stuck);
      if (Date.now() >= stuckEndsAt) await settleOneRound(mode, stuck);
    }
  } catch (err) {
    console.error("Wingo stuck-bet sweep error in settleRoundIfDue:", err);
  }
}

async function settleOneRound(mode: WingoMode, roundNumber: bigint) {
  const existing = await prisma.wingoResult.findUnique({
    where: { mode_roundNumber: { mode, roundNumber } },
  });
  if (existing) {
    // Self-heal: a prior settlement may have created the result row but failed
    // (or was killed by a request timeout) before resolving that round's bets,
    // leaving them PENDING forever. Resolving here — idempotent, since already
    // settled bets are no longer PENDING — guarantees no bet stays stuck once a
    // result exists. Run alongside the cache write (independent of it) instead
    // of after it — every round trip here adds to how long a backfilled round
    // takes to settle, which is what makes a backlog visibly trickle in.
    await Promise.all([
      resolvePendingBets(mode, roundNumber, existing.number),
      redis.set(`wingo:settled-cache:${mode}:${roundNumber}`, "1", "EX", 7200).catch((err) => {
        console.error("Redis set error in Wingo settleOneRound existing:", err);
      }),
    ]);
    return existing;
  }

  const lockKey = `wingo:settle-lock:${mode}:${roundNumber}`;
  let gotLock = "1";
  try {
    gotLock = await redis.set(lockKey, "1", "EX", 10, "NX") || "";
  } catch (err) {
    console.error("Redis lock error in Wingo settleOneRound:", err);
  }
  if (!gotLock) {
    for (let i = 0; i < 15; i++) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const cached = await redis.get(`wingo:settled-cache:${mode}:${roundNumber}`).catch(() => null);
      if (cached === "1") break;
    }
    return prisma.wingoResult.findUnique({ where: { mode_roundNumber: { mode, roundNumber } } });
  }

  try {
    const again = await prisma.wingoResult.findUnique({
      where: { mode_roundNumber: { mode, roundNumber } },
    });
    if (again) return again;

    // Independent lookups, fetched in parallel — halves the round trips this
    // step used to cost (they were previously sequential awaits).
    const [override, setting, winPctSetting, brahmastraSetting] = await Promise.all([
      prisma.resultOverride.findFirst({
        where: { mode, roundNumber },
        orderBy: { createdAt: "desc" },
      }),
      prisma.setting.findUnique({ where: { key: "resultMode" } }),
      prisma.setting.findUnique({ where: { key: "winningPercentage" } }),
      prisma.setting.findUnique({ where: { key: "brahmastraProfits" } }),
    ]);

    let number: number;
    let source: ResultSource;

    if (override) {
      number = override.number;
      source = "MANUAL";
    } else {
      const pregenerated =
        setting?.value === "SCHEDULED"
          ? await prisma.pregeneratedResult.findUnique({ where: { mode_roundNumber: { mode, roundNumber } } })
          : null;

      if (pregenerated) {
        number = pregenerated.number;
        source = "SCHEDULED";
      } else {
        const pendingBets = await prisma.wingoBet.findMany({
          where: { mode, roundNumber, status: "PENDING" },
        });

        if (pendingBets.length === 0) {
          number = randomInt(0, 10);
        } else {
          const { resolveBetMultiplier } = await import("@/lib/wingo/rounds");
          
          // Calculate total payout for each possible winning number (0 to 9)
          const candidatePayouts = Array.from({ length: 10 }, (_, n) => {
            const totalPayout = pendingBets.reduce((sum, bet) => {
              const mult = resolveBetMultiplier(bet, n);
              return sum + Math.round(bet.amount * mult);
            }, 0);
            return { number: n, totalPayout };
          });

          // Find the minimum payout value and get all outcomes with this minimum payout
          const minPayout = Math.min(...candidatePayouts.map((c) => c.totalPayout));
          const bestOutcomes = candidatePayouts.filter((c) => c.totalPayout === minPayout);
          // Randomly select one of the best outcomes to vary the results
          const minPayoutOutcome = bestOutcomes[Math.floor(Math.random() * bestOutcomes.length)];

          const isBrahmastra = brahmastraSetting?.value === "true";
          const winPct = winPctSetting ? Number(winPctSetting.value) : 30;
          const roll = Math.random() * 100;

          if (isBrahmastra) {
            number = minPayoutOutcome.number;
          } else {
            if (roll < winPct) {
              number = randomInt(0, 10);
            } else {
              number = minPayoutOutcome.number;
            }
          }
        }
        source = "RANDOM";
      }
    }

    const { color, size } = getColorAndSize(number);

    const result = await prisma.wingoResult.create({
      data: { mode, roundNumber, number, color, size, source },
    });

    await Promise.all([
      resolvePendingBets(mode, roundNumber, number),
      redis.set(`wingo:settled-cache:${mode}:${roundNumber}`, "1", "EX", 7200).catch((err) => {
        console.error("Redis set error in Wingo settleOneRound success:", err);
      }),
    ]);

    return result;
  } finally {
    try {
      await redis.del(lockKey);
    } catch (err) {
      console.error("Redis del error in Wingo settleOneRound finally:", err);
    }
  }
}

/**
 * Resolves every still-PENDING bet on `roundNumber` against the winning
 * `number`. Idempotent (already-settled bets are no longer PENDING) and
 * fault-isolated: each bet settles in its own transaction wrapped in try/catch,
 * so one failing bet can't abort the rest or the surrounding settlement — it
 * simply stays PENDING and is retried on a later poll.
 */
async function resolvePendingBets(mode: WingoMode, roundNumber: bigint, number: number) {
  const pendingBets = await prisma.wingoBet.findMany({
    where: { mode, roundNumber, status: "PENDING" },
  });

  const wonBets: { bet: any; payout: number }[] = [];
  const lostBetIds: string[] = [];

  for (const bet of pendingBets) {
    const multiplier = resolveBetMultiplier(bet, number);
    const payout = multiplier > 0 ? Math.round(bet.amount * multiplier) : 0;
    if (payout > 0) wonBets.push({ bet, payout });
    else lostBetIds.push(bet.id);
  }

  if (lostBetIds.length > 0) {
    try {
      await prisma.wingoBet.updateMany({
        where: { id: { in: lostBetIds }, status: "PENDING" },
        data: { status: "LOST", payout: 0 },
      });
    } catch (err) {
      console.error("Wingo lost bets bulk settlement failed:", err);
    }
  }

  for (const { bet, payout } of wonBets) {
    try {
      await prisma.$transaction(async (tx) => {
        const updated = await tx.wingoBet.updateMany({
          where: { id: bet.id, status: "PENDING" },
          data: { status: "WON", payout },
        });
        if (updated.count === 0) return;

        const wallet = await tx.wallet.update({
          where: { userId: bet.userId },
          data: { balance: { increment: payout } },
        });
        await tx.ledgerEntry.create({
          data: {
            walletId: wallet.id,
            type: "BET_WON",
            amount: payout,
            balanceAfter: wallet.balance,
            meta: { betId: bet.id, mode, roundNumber: roundNumber.toString() },
          },
        });
      });
    } catch (err) {
      console.error(`Wingo bet ${bet.id} settlement failed (will retry):`, err);
    }
  }
}
