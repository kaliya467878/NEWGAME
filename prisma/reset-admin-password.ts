import "dotenv/config";
import { randomBytes } from "crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { hashPassword } from "../lib/auth/password";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
  if (!admin) {
    console.log("No super admin exists yet — run the seed instead: npx prisma db seed");
    return;
  }

  // Pass your own password as an argument, or omit it to get a random one:
  //   npx tsx prisma/reset-admin-password.ts "MyNewPassword123"
  const chosen = process.argv[2];
  if (chosen && (chosen.length < 8 || chosen.length > 72)) {
    console.error("Password must be between 8 and 72 characters.");
    process.exitCode = 1;
    return;
  }

  const password = chosen ?? randomBytes(9).toString("base64url");
  const passwordHash = await hashPassword(password);
  await prisma.user.update({ where: { id: admin.id }, data: { passwordHash } });

  console.log("Super admin password has been reset:");
  console.log(`  phone:    ${admin.phone}`);
  console.log(`  password: ${password}`);
  if (!chosen) console.log("Save this password now — it will not be shown again.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
