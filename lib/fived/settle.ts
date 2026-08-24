import type { FiveDMode } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { getRoundWindow, resolveBetMultiplier, rollDigits } from "@/lib/fived/rounds";

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
 * Settles the just-ended 5D round (and, best-effort, any older unsettled
 * rounds) — same lazy + idempotent pattern as Wingo/K3 (Redis lock + DB unique
 * constraint), so it needs no background scheduler.
 *
 * Critically, the target `roundNumber` is settled FIRST — before any backfill.
 * It is the round the player most likely just bet on, so its result must appear
 * and its bets must resolve on this very poll. The previous implementation
 * settled oldest-first and only reached the live round at the end of the loop;
 * once a large backlog existed it would grind through hundreds of stale rounds
 * first and the request would time out before ever settling the live round —
 * leaving results frozen and every bet stuck PENDING.
 */
export async function settleRoundIfDue(mode: FiveDMode, roundNumber: bigint) {
  const { endsAt } = getRoundWindow(mode, roundNumber);
  if (Date.now() < endsAt) return null;

  const cacheKey = `fived:settled-cache:${mode}:${roundNumber}`;
  let cached = null;
  try {
    cached = await redis.get(cacheKey);
  } catch (err) {
    console.error("Redis get error in 5D settleRoundIfDue:", err);
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
    console.error("5D sync backfill error in settleRoundIfDue:", err);
  }

  // 2 & 3 are best-effort backlog cleanup, not needed to answer this request.
  // They used to run awaited, in-line, on every single poll (this endpoint is
  // polled every 1s) — up to 50 sequential DB/Redis round-trips per request
  // whenever a mode had any backlog, which is exactly what made the page feel
  // like it hung for ~10s on first load. Firing them off without awaiting lets
  // the response return as soon as the round the player is looking at is
  // settled; the backlog still drains, just across background runs instead of
  // blocking the request that triggered them.
  runBacklogCleanup(mode, roundNumber).catch((err) => {
    console.error("5D backlog cleanup error in settleRoundIfDue:", err);
  });

  return result;
}

async function backfillOlderRounds(mode: FiveDMode, roundNumber: bigint, maxRounds: bigint) {
  const lastBelow = await prisma.fiveDResult.findFirst({
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

async function runBacklogCleanup(mode: FiveDMode, roundNumber: bigint) {
  // 2. Best-effort, bounded, oldest-first catch-up of older rounds still
  //    missing a result. Runs AFTER the target round so it can never delay it,
  //    and is capped per request so each poll stays fast; the backlog drains
  //    over successive polls without leaving permanent gaps.
  try {
    await backfillOlderRounds(mode, roundNumber, MAX_BACKFILL_ROUNDS);
  } catch (err) {
    console.error("5D backfill error in settleRoundIfDue:", err);
  }

  // 3. Sweep any lingering PENDING bets on already-ended rounds and settle
  //    those rounds directly. This catches bets stranded on rounds that already
  //    have a result (which the backfill above would skip). settleOneRound is
  //    idempotent + self-healing, so this simply resolves them. Bounded per
  //    request to stay fast.
  try {
    const stuckRounds = await prisma.fiveDBet.findMany({
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
    console.error("5D stuck-bet sweep error in settleRoundIfDue:", err);
  }
}

async function settleOneRound(mode: FiveDMode, roundNumber: bigint) {
  const existing = await prisma.fiveDResult.findUnique({
    where: { mode_roundNumber: { mode, roundNumber } },
  });
  if (existing) {
    // Self-heal: a prior settlement may have created the result row but failed
    // (or been killed by a request timeout) before resolving that round's bets,
    // leaving them PENDING forever. Resolving here — idempotent, since already
    // settled bets are no longer PENDING — guarantees no bet stays stuck once a
    // result exists. Run alongside the cache write (independent of it) instead
    // of after it — every round trip here adds to how long a backfilled round
    // takes to settle, which is what makes a backlog visibly trickle in.
    await Promise.all([
      resolvePendingBets(mode, roundNumber, [existing.a, existing.b, existing.c, existing.d, existing.e]),
      redis.set(`fived:settled-cache:${mode}:${roundNumber}`, "1", "EX", 7200).catch((err) => {
        console.error("Redis set error in 5D settleOneRound existing:", err);
      }),
    ]);
    return existing;
  }

  const lockKey = `fived:settle-lock:${mode}:${roundNumber}`;
  let gotLock = "1";
  try {
    gotLock = await redis.set(lockKey, "1", "EX", 10, "NX") || "";
  } catch (err) {
    console.error("Redis lock error in 5D settleOneRound:", err);
  }
  if (!gotLock) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return prisma.fiveDResult.findUnique({ where: { mode_roundNumber: { mode, roundNumber } } });
  }

  try {
    const again = await prisma.fiveDResult.findUnique({
      where: { mode_roundNumber: { mode, roundNumber } },
    });
    if (again) return again;

    const [override, winPctSetting, brahmastraSetting] = await Promise.all([
      prisma.fiveDResultOverride.findFirst({
        where: { mode, roundNumber },
        orderBy: { createdAt: "desc" },
      }),
      prisma.setting.findUnique({ where: { key: "winningPercentage" } }),
      prisma.setting.findUnique({ where: { key: "brahmastraProfits" } }),
    ]);

    let a: number, b: number, c: number, d: number, e: number;

    if (override) {
      [a, b, c, d, e] = [override.a, override.b, override.c, override.d, override.e];
    } else {
      const pendingBets = await prisma.fiveDBet.findMany({
        where: { mode, roundNumber, status: "PENDING" },
      });

      if (pendingBets.length === 0) {
        [a, b, c, d, e] = rollDigits();
      } else {
        const { resolveBetMultiplier } = await import("@/lib/fived/rounds");

        // Smart greedy solver to find digits that minimize payout
        const posLabels: ("A" | "B" | "C" | "D" | "E")[] = ["A", "B", "C", "D", "E"];
        const bestDigits = posLabels.map(pos => {
          let minPayout = Infinity;
          let bestDigit = 0;
          for (let digit = 0; digit <= 9; digit++) {
            const payoutForDigit = pendingBets
              .filter(bet => bet.betType === "POSITION_NUMBER" && bet.selection.startsWith(`${pos}:${digit}`))
              .reduce((sum, bet) => sum + Math.round(bet.amount * (9 * 0.98)), 0);
            if (payoutForDigit < minPayout) {
              minPayout = payoutForDigit;
              bestDigit = digit;
            }
          }
          return bestDigit;
        });

        const baseResult: [number, number, number, number, number] = [bestDigits[0], bestDigits[1], bestDigits[2], bestDigits[3], bestDigits[4]];
        const candidates: [number, number, number, number, number][] = [baseResult];
        const sumGoals = [
          { big: true, odd: true },
          { big: true, odd: false },
          { big: false, odd: true },
          { big: false, odd: false }
        ];

        for (const goal of sumGoals) {
          const variant = [...baseResult] as [number, number, number, number, number];
          for (let lastDigit = 0; lastDigit <= 9; lastDigit++) {
            variant[4] = lastDigit;
            const currentSum = variant.reduce((x, y) => x + y, 0);
            const isBig = currentSum >= 23;
            const isOdd = currentSum % 2 !== 0;
            if (isBig === goal.big && isOdd === goal.odd) {
              candidates.push([...variant]);
              break;
            }
          }
        }

        const candidatePayouts = candidates.map(digits => {
          const totalPayout = pendingBets.reduce((sum, bet) => {
            const mult = resolveBetMultiplier(bet, digits);
            return sum + Math.round(bet.amount * mult);
          }, 0);
          return { digits, totalPayout };
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
          [a, b, c, d, e] = minPayoutOutcome.digits;
        } else {
          if (roll < winPct) {
            [a, b, c, d, e] = rollDigits();
          } else {
            [a, b, c, d, e] = minPayoutOutcome.digits;
          }
        }
      }
    }
    const sum = a + b + c + d + e;

    const result = await prisma.fiveDResult.create({
      data: { mode, roundNumber, a, b, c, d, e, sum, source: override ? "MANUAL" : "RANDOM" },
    });

    await Promise.all([
      resolvePendingBets(mode, roundNumber, [a, b, c, d, e]),
      redis.set(`fived:settled-cache:${mode}:${roundNumber}`, "1", "EX", 7200).catch((err) => {
        console.error("Redis set error in 5D settleOneRound success:", err);
      }),
    ]);

    return result;
  } finally {
    try {
      await redis.del(lockKey);
    } catch (err) {
      console.error("Redis del error in 5D settleOneRound finally:", err);
    }
  }
}

function getFiveDBetWinningMultiplier(bet: { betType: string; selection: string }): number {
  if (bet.betType === "POSITION_NUMBER") return 9 * 0.98;
  if (bet.betType === "SUM_BIG_SMALL") return 2 * 0.98;
  if (bet.betType === "SUM_ODD_EVEN") return 2 * 0.98;
  return 0;
}

async function resolvePendingBets(mode: FiveDMode, roundNumber: bigint, digits: [number, number, number, number, number]) {
  const pendingBets = await prisma.fiveDBet.findMany({
    where: { mode, roundNumber, status: "PENDING" },
  });

  const { resolveBetMultiplier } = await import("@/lib/fived/rounds");

  for (const bet of pendingBets) {
    const multiplier = resolveBetMultiplier(bet, digits);
    const payout = multiplier > 0 ? Math.round(bet.amount * multiplier) : 0;

    try {
      await prisma.$transaction(async (tx) => {
        // Status-guarded transition: only the run that actually flips this bet
        // out of PENDING credits the wallet. Because self-heal + the sweep can
        // call this outside the per-round settle lock, an unconditional update
        // could let two concurrent polls both credit the same win (double
        // payout); updateMany returning 0 means another run already settled it.
        const updated = await tx.fiveDBet.updateMany({
          where: { id: bet.id, status: "PENDING" },
          data: { status: payout > 0 ? "WON" : "LOST", payout },
        });
        if (updated.count === 0) return;

        if (payout > 0) {
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
              meta: { betId: bet.id, mode, roundNumber: roundNumber.toString(), game: "fived" },
            },
          });
        }
      });
    } catch (err) {
      console.error(`5D bet ${bet.id} settlement failed (will retry):`, err);
    }
  }
}
