import dotenv from "dotenv";
dotenv.config();

if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

const T_0 = 1783728000000; // 2026-07-11 00:00:00 UTC in ms

function getDeterministic9Digits(game: string, mode: string): number {
  const input = `${game}_${mode}_salt_v2`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33 + input.charCodeAt(i)) & 0xffffffff;
  }
  return 100000000 + Math.abs(hash) % 900000000;
}

function getStartRoundNumber(game: string, mode: string): bigint {
  const rand9 = getDeterministic9Digits(game, mode);
  return BigInt(`20260711${rand9}`);
}

function getRoundNumber(game: string, mode: string, durationSec: number, atMs: number): bigint {
  const durationMs = durationSec * 1000;
  const istMs = atMs + 5.5 * 60 * 60 * 1000;
  const date = new Date(istMs);
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const yyyymmdd = `${yyyy}${mm}${dd}`;

  const startOfDayMs = Date.UTC(yyyy, date.getUTCMonth(), date.getUTCDate()) - 5.5 * 60 * 60 * 1000;
  const diffToday = Math.floor((atMs - startOfDayMs) / durationMs);

  const rand9 = getDeterministic9Digits(game, mode);
  return BigInt(yyyymmdd + rand9) + BigInt(diffToday);
}

function getColorAndSize(number: number): { color: string; size: "BIG" | "SMALL" } {
  const size = number <= 4 ? "SMALL" : "BIG";
  let color: string;
  if (number === 0) color = "RED_VIOLET";
  else if (number === 5) color = "GREEN_VIOLET";
  else if ([1, 3, 7, 9].includes(number)) color = "GREEN";
  else color = "RED";
  return { color, size };
}

async function main() {
  const { prisma } = await import("../lib/prisma");
  console.log("Cleaning old game results...");
  
  await prisma.wingoResult.deleteMany({});
  await prisma.k3Result.deleteMany({});
  await prisma.fiveDResult.deleteMany({});
  
  console.log("Seeding game data...");
  const nowMs = Date.now();

  // 1. Seed Wingo & TRX Wingo
  const wingoModes: { mode: any; duration: number; isTrx: boolean }[] = [
    { mode: "S30", duration: 30, isTrx: false },
    { mode: "M1", duration: 60, isTrx: false },
    { mode: "M3", duration: 180, isTrx: false },
    { mode: "M5", duration: 300, isTrx: false },
    { mode: "TRX_M1", duration: 60, isTrx: true },
    { mode: "TRX_M3", duration: 180, isTrx: true },
  ];

  for (const { mode, duration, isTrx } of wingoModes) {
    const currentRound = getRoundNumber("wingo", mode, duration, nowMs);
    const data = [];
    console.log(`Generating 2000 rounds for Wingo mode ${mode}...`);
    for (let i = 1; i <= 2000; i++) {
      const roundNumber = currentRound - BigInt(i);
      const number = Math.floor(Math.random() * 10);
      const { color, size } = getColorAndSize(number);
      const settledAt = new Date(nowMs - i * duration * 1000);
      
      let blockId: string | null = null;
      let blockNumber: bigint | null = null;
      
      if (isTrx) {
        const alphabets = ["a", "b", "c", "d", "e", "f"];
        const randLetter = alphabets[Math.floor(Math.random() * alphabets.length)];
        blockId = "000000000" + Array.from({ length: 53 }, () => Math.floor(Math.random() * 16).toString(16)).join("") + number.toString() + randLetter;
        blockNumber = BigInt(85832000 - i);
      }

      data.push({
        mode,
        roundNumber,
        number,
        color,
        size,
        source: "RANDOM" as const,
        blockId,
        blockNumber,
        settledAt,
      });
    }
    
    const res = await prisma.wingoResult.createMany({
      data,
      skipDuplicates: true,
    });
    console.log(`Seeded ${res.count} rounds for Wingo mode ${mode}.`);
  }

  // 2. Seed K3
  const k3Modes: { mode: any; duration: number }[] = [
    { mode: "S30", duration: 30 },
    { mode: "M1", duration: 60 },
    { mode: "M3", duration: 180 },
    { mode: "M5", duration: 300 },
    { mode: "M10", duration: 600 },
  ];

  for (const { mode, duration } of k3Modes) {
    const currentRound = getRoundNumber("k3", mode, duration, nowMs);
    const data = [];
    console.log(`Generating 2000 rounds for K3 mode ${mode}...`);
    for (let i = 1; i <= 2000; i++) {
      const roundNumber = currentRound - BigInt(i);
      const dice1 = Math.floor(Math.random() * 6) + 1;
      const dice2 = Math.floor(Math.random() * 6) + 1;
      const dice3 = Math.floor(Math.random() * 6) + 1;
      const sum = dice1 + dice2 + dice3;
      const settledAt = new Date(nowMs - i * duration * 1000);

      data.push({
        mode,
        roundNumber,
        dice1,
        dice2,
        dice3,
        sum,
        source: "RANDOM" as const,
        settledAt,
      });
    }

    const res = await prisma.k3Result.createMany({
      data,
      skipDuplicates: true,
    });
    console.log(`Seeded ${res.count} rounds for K3 mode ${mode}.`);
  }

  // 3. Seed 5D
  const fivedModes: { mode: any; duration: number }[] = [
    { mode: "S30", duration: 30 },
    { mode: "M1", duration: 60 },
    { mode: "M3", duration: 180 },
    { mode: "M5", duration: 300 },
    { mode: "M10", duration: 600 },
  ];

  for (const { mode, duration } of fivedModes) {
    const currentRound = getRoundNumber("fived", mode, duration, nowMs);
    const data = [];
    console.log(`Generating 2000 rounds for 5D mode ${mode}...`);
    for (let i = 1; i <= 2000; i++) {
      const roundNumber = currentRound - BigInt(i);
      const a = Math.floor(Math.random() * 10);
      const b = Math.floor(Math.random() * 10);
      const c = Math.floor(Math.random() * 10);
      const d = Math.floor(Math.random() * 10);
      const e = Math.floor(Math.random() * 10);
      const sum = a + b + c + d + e;
      const settledAt = new Date(nowMs - i * duration * 1000);

      data.push({
        mode,
        roundNumber,
        a,
        b,
        c,
        d,
        e,
        sum,
        source: "RANDOM" as const,
        settledAt,
      });
    }

    const res = await prisma.fiveDResult.createMany({
      data,
      skipDuplicates: true,
    });
    console.log(`Seeded ${res.count} rounds for 5D mode ${mode}.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
