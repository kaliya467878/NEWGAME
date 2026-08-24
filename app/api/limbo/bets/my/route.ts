import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ success: false, message: "Not authorized, token invalid or expired" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(100, Number(searchParams.get("limit") || 30));

    const bets = await prisma.limboBet.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: bets.map((bet) => ({
        id: bet.id,
        amount: bet.amount,
        targetMultiplier: bet.targetMultiplier,
        rolledMultiplier: bet.crashPoint,
        status: bet.won ? "won" : "lost",
        winAmount: bet.payout,
        createdAt: bet.createdAt.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error("GET limbo/bets/my API error:", error);
    return NextResponse.json({ success: false, message: error.message || "Internal server error" }, { status: 500 });
  }
}
