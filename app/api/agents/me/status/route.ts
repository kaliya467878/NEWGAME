import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Not authorized" }, { status: 401 });
    }

    const directReferralsCount = await prisma.user.count({
      where: { referredById: user.id },
    });

    let rate = 2.0;
    let tier = "Silver Agent";

    if (directReferralsCount >= 50) {
      rate = 4.0;
      tier = "Diamond Agent";
    } else if (directReferralsCount >= 15) {
      rate = 3.0;
      tier = "Gold Agent";
    }

    return NextResponse.json({
      success: true,
      data: {
        tier,
        commissionRatePercent: rate,
        totalReferrals: directReferralsCount,
      },
    });
  } catch (error: any) {
    console.error("GET agents/me/status error:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
