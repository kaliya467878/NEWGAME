const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findUnique({
    where: { phone: '0000000000' }
  });
  
  if (existing) {
    console.log('Admin already exists with invite code:', existing.referralCode);
    return;
  }

  const passwordHash = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.create({
    data: {
      phone: '0000000000',
      email: 'admin@luckynova.com',
      passwordHash,
      displayName: 'System Admin',
      referralCode: 'VIP777', // The invite code for the user
      role: 'ADMIN',
    }
  });
  
  console.log('Created admin user with invite code: VIP777');
}

main().catch(console.error).finally(() => prisma.$disconnect());
