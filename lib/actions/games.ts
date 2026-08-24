"use server";

import { z } from "zod";
import { randomInt } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/actions/auth";
import { debitBet, creditWin } from "@/lib/games/wallet";
import {
  diceMultiplier,
  diceIsWin,
  normalizeDiceDirection,
  WHEEL_SEGMENTS,
  minesMultiplier,
  MINES_GRID_SIZE,
  crashPointFromRandom,
  crashMultiplierAt,
} from "@/lib/games/logic";

function insufficient(err: unknown) {
  return err instanceof Error && err.message === "INSUFFICIENT_BALANCE";
}

// ---------------- Dice ----------------
const diceSchema = z.object({
  amount: z.number().int().min(1).max(100_000),
  target: z.number().int().min(2).max(99),
  direction: z.enum(["OVER", "UNDER"]),
});

export type DiceResult =
  | { error: string }
  | { won: boolean; roll: number; multiplier: number; payout: number; balance: number };

export async function playDiceAction(input: {
  amount: number;
  target: number;
  direction: string;
}): Promise<DiceResult> {
  const user = await requireUser();
  const normalizedInput = {
    ...input,
    direction: normalizeDiceDirection(input.direction),
  };
  const parsed = diceSchema.safeParse(normalizedInput);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid bet" };

  const { amount, target, direction } = parsed.data;
  const roll = randomInt(1, 101);
  const won = diceIsWin(roll, target, direction);
  const multiplier = diceMultiplier(target, direction);
  const payout = won ? Math.floor(amount * multiplier) : 0;

  try {
    const balance = await prisma.$transaction(async (tx) => {
      await debitBet(tx, user.id, amount, "DICE", { target, direction });
      await tx.diceBet.create({
        data: { userId: user.id, amount, target, direction, roll, multiplier, payout, won },
      });
      if (payout > 0) {
        const w = await creditWin(tx, user.id, payout, "DICE", { roll });
        return w.balance;
      }
      const wallet = await tx.wallet.findUnique({ where: { userId: user.id } });
      return wallet?.balance ?? 0;
    });

    return { won, roll, multiplier, payout, balance };
  } catch (err) {
    if (insufficient(err)) return { error: "Insufficient balance" };
    throw err;
  }
}

// ---------------- Lucky Wheel ----------------
const wheelSchema = z.object({ amount: z.number().int().min(1).max(100_000) });

export type WheelResult =
  | { error: string }
  | { segmentIndex: number; multiplier: number; payout: number; balance: number };

export async function playWheelAction(input: { amount: number }): Promise<WheelResult> {
  const user = await requireUser();
  const parsed = wheelSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid bet" };

  const { amount } = parsed.data;
  const segmentIndex = randomInt(0, WHEEL_SEGMENTS.length);
  const multiplier = WHEEL_SEGMENTS[segmentIndex];
  const payout = Math.floor(amount * multiplier);

  try {
    const balance = await prisma.$transaction(async (tx) => {
      await debitBet(tx, user.id, amount, "WHEEL", { segmentIndex });
      await tx.wheelSpin.create({ data: { userId: user.id, amount, segmentIndex, multiplier, payout } });
      if (payout > 0) {
        const w = await creditWin(tx, user.id, payout, "WHEEL", { multiplier });
        return w.balance;
      }
      const wallet = await tx.wallet.findUnique({ where: { userId: user.id } });
      return wallet?.balance ?? 0;
    });

    return { segmentIndex, multiplier, payout, balance };
  } catch (err) {
    if (insufficient(err)) return { error: "Insufficient balance" };
    throw err;
  }
}

// ---------------- Mines ----------------
const startMinesSchema = z.object({
  amount: z.number().int().min(1).max(100_000),
  mineCount: z.number().int().min(1).max(24),
});

function sampleMines(mineCount: number): number[] {
  const positions = new Set<number>();
  while (positions.size < mineCount) {
    positions.add(randomInt(0, MINES_GRID_SIZE));
  }
  return [...positions];
}

type StartMinesResult = { error: string } | { gameId: string };

export async function startMinesAction(input: { amount: number; mineCount: number }): Promise<StartMinesResult> {
  const user = await requireUser();
  const parsed = startMinesSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  // One active game per user at a time keeps the model simple.
  const active = await prisma.minesGame.findFirst({ where: { userId: user.id, status: "ACTIVE" } });
  if (active) return { error: "Finish your current mines game first" };

  const { amount, mineCount } = parsed.data;
  const minePositions = sampleMines(mineCount);

  try {
    const game = await prisma.$transaction(async (tx) => {
      await debitBet(tx, user.id, amount, "MINES", { mineCount });
      return tx.minesGame.create({
        data: { userId: user.id, amount, mineCount, minePositions, revealed: [], multiplier: 1 },
      });
    });
    return { gameId: game.id };
  } catch (err) {
    if (insufficient(err)) return { error: "Insufficient balance" };
    throw err;
  }
}

type RevealResult =
  | { error: string }
  | { hitMine: true; minePositions: number[] }
  | { cashedOut: true; multiplier: number; payout: number; balance: number; minePositions: number[] }
  | { revealed: number[]; multiplier: number };

export async function revealMineTileAction(gameId: string, tile: number): Promise<RevealResult> {
  const user = await requireUser();
  if (!Number.isInteger(tile) || tile < 0 || tile >= MINES_GRID_SIZE) return { error: "Invalid tile" };

  const game = await prisma.minesGame.findUnique({ where: { id: gameId } });
  if (!game || game.userId !== user.id || game.status !== "ACTIVE") return { error: "No active game" };
  if (game.revealed.includes(tile)) return { error: "Tile already revealed" };

  if (game.minePositions.includes(tile)) {
    await prisma.minesGame.update({
      where: { id: gameId },
      data: { status: "LOST", multiplier: 0, payout: 0, endedAt: new Date() },
    });
    return { hitMine: true, minePositions: game.minePositions };
  }

  const revealed = [...game.revealed, tile];
  const multiplier = minesMultiplier(game.mineCount, revealed.length);
  const safeTiles = MINES_GRID_SIZE - game.mineCount;

  // Auto cash-out when every safe tile is revealed.
  if (revealed.length === safeTiles) {
    const payout = Math.floor(game.amount * multiplier);
    const balance = await prisma.$transaction(async (tx) => {
      await tx.minesGame.update({
        where: { id: gameId },
        data: { revealed, multiplier, status: "CASHED_OUT", payout, endedAt: new Date() },
      });
      const w = await creditWin(tx, user.id, payout, "MINES", { multiplier, autoCashout: true });
      return w.balance;
    });
    return { cashedOut: true, multiplier, payout, balance, minePositions: game.minePositions };
  }

  await prisma.minesGame.update({ where: { id: gameId }, data: { revealed, multiplier } });
  return { revealed, multiplier };
}

type CashOutMinesResult =
  | { error: string }
  | { cashedOut: true; multiplier: number; payout: number; balance: number; minePositions: number[] };

export async function cashOutMinesAction(gameId: string): Promise<CashOutMinesResult> {
  const user = await requireUser();
  const game = await prisma.minesGame.findUnique({ where: { id: gameId } });
  if (!game || game.userId !== user.id || game.status !== "ACTIVE") return { error: "No active game" };
  if (game.revealed.length === 0) return { error: "Reveal at least one tile first" };

  const payout = Math.floor(game.amount * game.multiplier);
  const balance = await prisma.$transaction(async (tx) => {
    await tx.minesGame.update({
      where: { id: gameId },
      data: { status: "CASHED_OUT", payout, endedAt: new Date() },
    });
    const w = await creditWin(tx, user.id, payout, "MINES", { multiplier: game.multiplier });
    return w.balance;
  });
  return { cashedOut: true, multiplier: game.multiplier, payout, balance, minePositions: game.minePositions };
}

// ---------------- Crash ----------------
const startCrashSchema = z.object({ amount: z.number().int().min(1).max(100_000) });

type StartCrashResult = { error: string } | { gameId: string; startedAt: number; serverTime: number };

export async function startCrashAction(input: { amount: number }): Promise<StartCrashResult> {
  const user = await requireUser();
  const parsed = startCrashSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const active = await prisma.crashGame.findFirst({ where: { userId: user.id, status: "ACTIVE" } });
  if (active) return { error: "Finish your current crash round first" };

  const crashPoint = crashPointFromRandom(randomInt(0, 1_000_000) / 1_000_000);

  try {
    const game = await prisma.$transaction(async (tx) => {
      await debitBet(tx, user.id, parsed.data.amount, "CRASH", {});
      return tx.crashGame.create({
        data: { userId: user.id, amount: parsed.data.amount, crashPoint },
      });
    });
    return { gameId: game.id, startedAt: game.createdAt.getTime(), serverTime: Date.now() };
  } catch (err) {
    if (insufficient(err)) return { error: "Insufficient balance" };
    throw err;
  }
}

type CashOutCrashResult =
  | { error: string }
  | { crashed: true; crashPoint: number }
  | { cashedOut: true; multiplier: number; payout: number; balance: number; crashPoint: number };

export async function cashOutCrashAction(gameId: string, atMultiplier: number): Promise<CashOutCrashResult> {
  const user = await requireUser();
  const game = await prisma.crashGame.findUnique({ where: { id: gameId } });
  if (!game || game.userId !== user.id || game.status !== "ACTIVE") return { error: "No active round" };

  // The client sends the multiplier it cashed out at. We validate it isn't a
  // future value (can't exceed the multiplier the round has actually reached by
  // now — server-action latency only makes "now" larger, so an honest click is
  // always accepted). This makes cash-out latency-proof without trusting the
  // client to know the hidden crash point.
  const elapsedNow = Date.now() - game.createdAt.getTime();
  const maxReached = crashMultiplierAt(elapsedNow);
  const claimed = Math.max(1, Math.min(atMultiplier, maxReached));

  if (claimed >= game.crashPoint) {
    await prisma.crashGame.update({
      where: { id: gameId },
      data: { status: "LOST", payout: 0, endedAt: new Date() },
    });
    return { crashed: true, crashPoint: game.crashPoint };
  }

  const payout = Math.floor(game.amount * claimed);
  const balance = await prisma.$transaction(async (tx) => {
    await tx.crashGame.update({
      where: { id: gameId },
      data: { status: "CASHED_OUT", cashOutMultiplier: claimed, payout, endedAt: new Date() },
    });
    const w = await creditWin(tx, user.id, payout, "CRASH", { multiplier: claimed });
    return w.balance;
  });
  return { cashedOut: true, multiplier: claimed, payout, balance, crashPoint: game.crashPoint };
}
