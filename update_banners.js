require('dotenv').config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const banners = await prisma.cmsContent.findMany({
    where: { type: "HOMEPAGE_BANNER" }
  });
  
  if (banners.length > 0) {
    console.log("Found", banners.length, "banners in DB. Replacing their URLs with the new SkyBlue ones.");
    const newImages = [
      "/design/banners/wingo-payout.png",
      "/design/banners/first-deposit-bonus.png",
      "/design/banners/login-bonus.png"
    ];
    
    for (let i = 0; i < banners.length; i++) {
      await prisma.cmsContent.update({
        where: { id: banners[i].id },
        data: { imageUrl: newImages[i % newImages.length] }
      });
    }
    console.log("Successfully updated banners in database!");
  } else {
    console.log("No banners found in DB. The default ones should be working.");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
