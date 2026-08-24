import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Not authorized, token invalid or expired" }, { status: 401 });
    }

    const withdrawals = await prisma.withdrawRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: withdrawals.map((w) => ({
        id: w.id,
        _id: w.id,
        amount: w.amount,
        status: w.status.toLowerCase(), // "pending", "approved", "rejected"
        note: w.note,
        createdAt: w.createdAt,
        reviewedAt: w.reviewedAt,
      })),
    });
  } catch (error: any) {
    console.error("GET wallet/withdrawals API error:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
