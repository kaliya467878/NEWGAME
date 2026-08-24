import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Not authorized" }, { status: 401 });
    }

    const referredUsers = await prisma.user.findMany({
      where: { referredById: user.id },
      select: { id: true },
    });
    const userIds = referredUsers.map((u) => u.id);

    // Sum up direct referrals' deposits
    const depositSummary = await prisma.depositRequest.aggregate({
      where: {
        userId: { in: userIds },
        status: "APPROVED",
      },
      _sum: {
        amount: true,
      },
    });

    const totalDeposits = depositSummary._sum.amount || 0;

    return NextResponse.json({
      success: true,
      data: {
        commissionBalance: 0,
        totalReferrals: userIds.length,
        downlineDepositsVolume: totalDeposits,
      },
    });
  } catch (error: any) {
    console.error("GET agents/me dashboard error:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
