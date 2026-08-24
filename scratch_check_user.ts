import { prisma } from "./lib/prisma";

async function main() {
  const list = await prisma.withdrawRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { user: true }
  });

  list.forEach((w) => {
    console.log(`ID: ${w.id}`);
    console.log(`User: ${w.user.displayName} (UID: ${w.user.uid})`);
    console.log(`Status: ${w.status}, Amount: ${w.amount}`);
    console.log(`Note: ${w.note}`);
    console.log("-----------------------------------------");
  });
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
