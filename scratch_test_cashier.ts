import dotenv from "dotenv";
dotenv.config();

import { prisma } from "./lib/prisma";

async function main() {
  const deposit = await prisma.depositRequest.findFirst({
    where: {
      note: { contains: '"gateway":"sunpays"' }
    },
    orderBy: { createdAt: "desc" }
  });

  if (!deposit) {
    console.log("No sunpays deposits found");
    return;
  }

  console.log("Found deposit:", deposit.id, "Status:", deposit.status);
  let note: any = {};
  try {
    note = JSON.parse(deposit.note || "{}");
  } catch {}

  console.log("Checkout URL:", note.checkoutUrl);
  if (!note.checkoutUrl) return;

  try {
    const res = await fetch(note.checkoutUrl, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      }
    });
    console.log("Response status:", res.status);
    const html = await res.text();
    console.log("HTML length:", html.length);
    console.log("Contains 'successful'?", html.toLowerCase().includes("successful"));
    console.log("Contains 'success'?", html.toLowerCase().includes("success"));
    console.log("Contains 'paid'?", html.toLowerCase().includes("paid"));
    console.log("Contains 'complete'?", html.toLowerCase().includes("complete"));
    // Print first 500 chars
    console.log("Start:", html.substring(0, 500));
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
