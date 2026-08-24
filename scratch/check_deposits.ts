import "dotenv/config";
import { prisma } from "../lib/prisma";

async function main() {
  const latest = await prisma.depositRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { user: true }
  });
  console.log(JSON.stringify(latest, null, 2));
}

main().catch(console.error);
