import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  try {
    const banners = await prisma.cmsContent.findMany({
      where: {
        type: "HOMEPAGE_BANNER",
        status: "PUBLISHED",
      },
      orderBy: {
        sortOrder: "asc",
      },
    });

    const carousel = banners.map((b) => ({
      id: b.id,
      title: b.title,
      image: b.imageUrl || "/design/banners/wingo-payout.png",
      link: b.linkUrl || "#",
    }));

    if (carousel.length === 0) {
      carousel.push(
        { id: "slide-1", title: "Join Lucky Nova", image: "/design/banners/wingo-payout.png", link: "/wingo/30s" },
        { id: "slide-2", title: "First Deposit Bonus", image: "/design/banners/first-deposit-bonus.png", link: "/wallet/deposit" },
        { id: "slide-3", title: "Login Reward Tier", image: "/design/banners/login-bonus.png", link: "/account/vip" }
      );
    }

    return NextResponse.json({ success: true, data: { carousel } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
