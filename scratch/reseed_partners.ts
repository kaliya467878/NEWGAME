import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";

const partners = [
  { uid: 529201, phone: "9341225312", pass: "navin467878", name: "Navin" },
  { uid: 529202, phone: "8401261755", pass: "PRInce@0098", name: "Prince" },
  { uid: 529203, phone: "6204480451", pass: "@#3558!&#", name: "Partner3" },
  { uid: 529204, phone: "6201765986", pass: "r0ld3x0p", name: "RoldexOP" },
];

function generateReferralCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function main() {
  console.log("Cleaning database of existing users with role 'USER'...");
  
  // Find all regular users
  const regularUsers = await prisma.user.findMany({
    where: { role: "USER" }
  });
  const regularUserIds = regularUsers.map(u => u.id);
  
  console.log(`Found ${regularUserIds.length} regular users to delete.`);
  
  if (regularUserIds.length > 0) {
    // Delete all related game records for these users
    await prisma.wingoBet.deleteMany({ where: { userId: { in: regularUserIds } } });
    await prisma.k3Bet.deleteMany({ where: { userId: { in: regularUserIds } } });
    await prisma.fiveDBet.deleteMany({ where: { userId: { in: regularUserIds } } });
    await prisma.diceBet.deleteMany({ where: { userId: { in: regularUserIds } } });
    await prisma.limboBet.deleteMany({ where: { userId: { in: regularUserIds } } });
    await prisma.wheelSpin.deleteMany({ where: { userId: { in: regularUserIds } } });
    await prisma.minesGame.deleteMany({ where: { userId: { in: regularUserIds } } });
    await prisma.crashGame.deleteMany({ where: { userId: { in: regularUserIds } } });
    
    // Delete deposits and withdrawals
    await prisma.depositRequest.deleteMany({ where: { userId: { in: regularUserIds } } });
    await prisma.withdrawRequest.deleteMany({ where: { userId: { in: regularUserIds } } });
    
    // Delete reset requests, rewards, notifications, accounts, agents
    await prisma.reward.deleteMany({ where: { userId: { in: regularUserIds } } });
    await prisma.passwordResetRequest.deleteMany({ where: { userId: { in: regularUserIds } } });
    await prisma.notification.deleteMany({ where: { userId: { in: regularUserIds } } });
    await prisma.withdrawalAccount.deleteMany({ where: { userId: { in: regularUserIds } } });
    await prisma.giftCodeRedemption.deleteMany({ where: { userId: { in: regularUserIds } } });
    await prisma.giftCode.deleteMany({ where: { createdById: { in: regularUserIds } } });
    await prisma.staffPermission.deleteMany({ where: { userId: { in: regularUserIds } } });
    
    // Clean agent network references
    await prisma.agent.deleteMany({ where: { linkedUserId: { in: regularUserIds } } });
    await prisma.agent.deleteMany({ where: { createdById: { in: regularUserIds } } });
    
    // Clean audit logs
    await prisma.auditLog.deleteMany({ where: { actorId: { in: regularUserIds } } });
    
    // Delete wallets and ledger entries
    const wallets = await prisma.wallet.findMany({ where: { userId: { in: regularUserIds } } });
    const walletIds = wallets.map(w => w.id);
    await prisma.ledgerEntry.deleteMany({ where: { walletId: { in: walletIds } } });
    await prisma.wallet.deleteMany({ where: { userId: { in: regularUserIds } } });
    
    // Dissolve referral references
    await prisma.user.updateMany({
      where: { referredById: { in: regularUserIds } },
      data: { referredById: null }
    });

    // Delete users
    await prisma.user.deleteMany({ where: { id: { in: regularUserIds } } });
    console.log("Database successfully cleaned of previous user accounts.");
  }

  console.log("Creating new partner accounts...");
  for (const partner of partners) {
    // Check if user already exists
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { uid: partner.uid },
          { phone: partner.phone }
        ]
      }
    });

    if (existing) {
      console.log(`User ${partner.name} (UID ${partner.uid}) already exists. Skipping.`);
      continue;
    }

    const passwordHash = await bcrypt.hash(partner.pass, 10);
    const referralCode = generateReferralCode();
    
    // Create partner user
    const createdUser = await prisma.user.create({
      data: {
        uid: partner.uid,
        phone: partner.phone,
        passwordHash,
        displayName: partner.name,
        avatarSeed: String(Math.floor(Math.random() * 1000)),
        referralCode,
        isPartner: true,
        role: "USER"
      }
    });

    // Create wallet with 50,000 balance
    const wallet = await prisma.wallet.create({
      data: {
        userId: createdUser.id,
        balance: 50000 // ₹50,000
      }
    });

    // Create ledger entry
    await prisma.ledgerEntry.create({
      data: {
        walletId: wallet.id,
        type: "WELCOME_BONUS",
        amount: 50000,
        balanceAfter: 50000,
        meta: { note: "Initial Partner Balance Setup" }
      }
    });

    console.log(`Created partner account: UID ${createdUser.uid} | Name: ${createdUser.displayName} | Phone: ${createdUser.phone} | Balance: ₹50,000`);
  }

  console.log("Done seeding partner accounts!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
