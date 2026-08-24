import "dotenv/config";
import { randomBytes } from "crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { hashPassword } from "../lib/auth/password";
import { generateDisplayName, generateAvatarSeed, generateReferralCode } from "../lib/auth/identity";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const existing = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
  if (existing) {
    console.log(`Super admin already exists: ${existing.phone}`);
    return;
  }

  const phone = process.env.ADMIN_PHONE || "9999999999";
  const password = process.env.ADMIN_PASSWORD || "z0MkT3A_Ag6x";
  const passwordHash = await hashPassword(password);

  const admin = await prisma.user.create({
    data: {
      phone,
      passwordHash,
      role: "SUPER_ADMIN",
      displayName: generateDisplayName(),
      avatarSeed: generateAvatarSeed(),
      referralCode: generateReferralCode(),
    },
  });

  await prisma.wallet.create({ data: { userId: admin.id, balance: 0 } });

  console.log("Created super admin account:");
  console.log(`  phone:    ${phone}`);
  console.log(`  password: ${password}`);
  console.log("Save this password now — it will not be shown again.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
