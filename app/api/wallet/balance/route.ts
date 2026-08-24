import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/jwt";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Not authorized, token invalid or expired" }, { status: 401 });
    }

    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
    });

    return NextResponse.json({
      success: true,
      data: {
        balance: wallet ? wallet.balance : 0,
        commissionBalance: 0,
        requiredWager: user.requiredWager,
      },
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      }
    });
  } catch (error: any) {
    console.error("GET wallet/balance API error:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
