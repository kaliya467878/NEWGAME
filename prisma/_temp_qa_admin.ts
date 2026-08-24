import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { hashPassword } from "../lib/auth/password";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const action = process.argv[2];
  const phone = "8000000001";
  const password = "TempAdmin_9911";

  if (action === "delete") {
    const u = await prisma.user.findUnique({ where: { phone } });
    if (u) {
      await prisma.auditLog.deleteMany({ where: { actorId: u.id } });
      await prisma.activityFeed.deleteMany({ where: { actorId: u.id } });
      await prisma.wallet.deleteMany({ where: { userId: u.id } });
      await prisma.user.delete({ where: { id: u.id } });
      console.log("Deleted temp admin and its audit/activity records");
    } else {
      console.log("No temp admin to delete");
    }
    return;
  }

  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    await prisma.user.update({ where: { id: existing.id }, data: { passwordHash: await hashPassword(password), role: "SUPER_ADMIN" } });
    console.log("Updated temp admin:", phone, password);
    return;
  }
  const admin = await prisma.user.create({
    data: {
      phone,
      passwordHash: await hashPassword(password),
      role: "SUPER_ADMIN",
      displayName: "TempQA",
      avatarSeed: "tempqa",
      referralCode: "TEMPQA01",
    },
  });
  await prisma.wallet.create({ data: { userId: admin.id, balance: 0 } });
  console.log("Created temp admin:", phone, password, admin.id);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
