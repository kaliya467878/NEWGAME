import "dotenv/config";
import { prisma } from "../lib/prisma";

async function main() {
  const all = await prisma.depositChannel.findMany();
  console.log(JSON.stringify(all, null, 2));
}

main().catch(console.error);
