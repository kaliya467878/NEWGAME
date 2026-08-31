import dotenv from "dotenv";
dotenv.config();

if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

import { getRoundNumber } from "../lib/wingo/rounds";

async function main() {
  const { prisma } = await import("../lib/prisma");
  const currentRound = getRoundNumber("S30", Date.now());
  console.log("Current Round in lib/wingo/rounds.ts:", currentRound.toString());
  
  const count = await prisma.wingoResult.count({
    where: { mode: "S30" }
  });
  console.log("Count of WingoResult for S30 in DB:", count);
  
  const sample = await prisma.wingoResult.findMany({
    where: { mode: "S30" },
    orderBy: { roundNumber: "desc" },
    take: 5
  });
  
  console.log("Sample records in DB:");
  sample.forEach(r => {
    console.log(`- Round: ${r.roundNumber.toString()}, Number: ${r.number}, Mode: ${r.mode}`);
  });
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
