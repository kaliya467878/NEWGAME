import "dotenv/config";
import { MongoClient, ObjectId } from "mongodb";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/luckynova";

async function main() {
  console.log("Starting data migration from MongoDB to PostgreSQL...");
  console.log(`Connecting to MongoDB at: ${MONGO_URI}`);

  const mongoClient = new MongoClient(MONGO_URI);
  await mongoClient.connect();
  console.log("Connected to MongoDB successfully.");

  const db = mongoClient.db();
  const mongoUsersCollection = db.collection("users");
  const mongoWalletsCollection = db.collection("wallets");

  console.log("Connecting to PostgreSQL...");
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  await prisma.$connect();
  console.log("Connected to PostgreSQL successfully.");

  console.log("Fetching legacy data from MongoDB...");
  const legacyUsers = await mongoUsersCollection.find({}).toArray();
  const legacyWallets = await mongoWalletsCollection.find({}).toArray();

  console.log(`Found ${legacyUsers.length} users and ${legacyWallets.length} wallets in MongoDB.`);

  // Map to store MongoDB ObjectId -> PostgreSQL UUID
  const mongoIdToPostgresIdMap = new Map<string, string>();

  let usersCreated = 0;
  let usersSkipped = 0;

  console.log("Migrating users...");
  for (const legUser of legacyUsers) {
    const phone = legUser.mobile;
    const existing = await prisma.user.findUnique({
      where: { phone },
    });

    if (existing) {
      console.log(`  User with phone ${phone} already exists in Postgres. Skipping creation.`);
      mongoIdToPostgresIdMap.set(legUser._id.toString(), existing.id);
      usersSkipped++;
      continue;
    }

    try {
      const mappedRole = legUser.role === "admin" ? "SUPER_ADMIN" : "USER";
      const mappedStatus = legUser.status === "suspended" ? "SUSPENDED" : "ACTIVE";

      const created = await prisma.user.create({
        data: {
          phone,
          passwordHash: legUser.password,
          displayName: legUser.name || `PLAYER_${phone.slice(-4)}`,
          avatarSeed: Math.random().toString(36).substring(7),
          referralCode: legUser.inviteCode.toUpperCase(),
          role: mappedRole,
          status: mappedStatus,
          createdAt: legUser.createdAt || new Date(),
        },
      });

      mongoIdToPostgresIdMap.set(legUser._id.toString(), created.id);
      usersCreated++;
    } catch (err: any) {
      console.error(`  Failed to migrate user ${phone}:`, err.message);
    }
  }

  console.log(`User migration completed. Created: ${usersCreated}, Skipped: ${usersSkipped}`);

  console.log("Linking referral hierarchy...");
  let referralsLinked = 0;
  for (const legUser of legacyUsers) {
    if (legUser.referredBy) {
      const childPgId = mongoIdToPostgresIdMap.get(legUser._id.toString());
      const parentPgId = mongoIdToPostgresIdMap.get(legUser.referredBy.toString());

      if (childPgId && parentPgId) {
        try {
          await prisma.user.update({
            where: { id: childPgId },
            data: { referredById: parentPgId },
          });
          referralsLinked++;
        } catch (err: any) {
          console.error(`  Failed to link referral child ${childPgId} -> parent ${parentPgId}:`, err.message);
        }
      }
    }
  }
  console.log(`Referral linking completed. Linked ${referralsLinked} relations.`);

  console.log("Migrating wallets...");
  let walletsCreated = 0;
  let walletsUpdated = 0;
  for (const legWallet of legacyWallets) {
    const ownerPgId = mongoIdToPostgresIdMap.get(legWallet.user.toString());
    if (!ownerPgId) {
      console.log(`  Skipping wallet for legacy user ${legWallet.user.toString()} (User was not migrated).`);
      continue;
    }

    // Convert balance from MongoDB float/decimal to integer format (Postgres balance is in cents/INR integers)
    // Legacy balance is float (e.g. 100.50). Convert to integer (e.g. 100) or check mapping.
    // In omegaPlay database, balance is Int. We can convert using Math.round().
    const balanceInt = Math.round(Number(legWallet.balance || 0));

    try {
      const existingWallet = await prisma.wallet.findUnique({
        where: { userId: ownerPgId },
      });

      if (existingWallet) {
        await prisma.wallet.update({
          where: { id: existingWallet.id },
          data: { balance: balanceInt },
        });
        walletsUpdated++;
      } else {
        await prisma.wallet.create({
          data: {
            userId: ownerPgId,
            balance: balanceInt,
          },
        });
        walletsCreated++;
      }
    } catch (err: any) {
      console.error(`  Failed to migrate wallet for user ${ownerPgId}:`, err.message);
    }
  }

  console.log(`Wallet migration completed. Created: ${walletsCreated}, Updated: ${walletsUpdated}`);
  
  await mongoClient.close();
  await prisma.$disconnect();
  console.log("Migration completed successfully!");
}

main().catch((err) => {
  console.error("Migration error occurred:", err);
  process.exitCode = 1;
});
