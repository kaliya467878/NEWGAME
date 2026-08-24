import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Not authorized, token invalid or expired" }, { status: 401 });
    }

    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id }
    });

    if (!wallet) {
      return NextResponse.json({ success: true, data: [] });
    }

    const entries = await prisma.ledgerEntry.findMany({
      where: {
        walletId: wallet.id,
        type: "GIFT_CODE_REDEEMED"
      },
      orderBy: { createdAt: "desc" }
    });

    const data = entries.map((entry) => ({
      _id: entry.id,
      amount: entry.amount,
      createdAt: entry.createdAt,
      description: (entry.meta as any)?.description || `Gift Code Redeemed: ${(entry.meta as any)?.code || "Unknown"}`
    }));

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    console.error("GET gift redemption history error:", error);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}
