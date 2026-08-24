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
      where: { userId: user.id },
    });

    const mappedRole = user.role === "SUPER_ADMIN" ? "admin" : "player";

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        uid: user.uid,
        name: user.displayName,
        mobile: user.phone,
        inviteCode: user.referralCode,
        role: mappedRole,
        kycStatus: "approved",
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        wallet: {
          balance: wallet ? wallet.balance : 0,
          commissionBalance: 0,
        },
      },
    });
  } catch (error: any) {
    console.error("GET users/me API error:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
