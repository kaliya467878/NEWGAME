import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Not authorized, token invalid or expired" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 30)));

    const list = await prisma.diceBet.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const rolls = list.map((bet) => ({
      id: bet.id,
      result: bet.roll,
      target: bet.target,
      condition: bet.direction.toLowerCase(),
      state: bet.won ? "won" : "lost",
      amount: bet.amount,
      winAmount: bet.payout,
      profit: bet.won ? bet.payout - bet.amount : -bet.amount,
      multiplier: bet.multiplier,
      createdAt: bet.createdAt.toISOString(),
    }));

    return NextResponse.json({ success: true, data: { rolls } });
  } catch (error: any) {
    console.error("GET dice/rolls/my API error:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
