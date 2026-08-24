import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Not authorized, token invalid or expired" }, { status: 401 });
    }

    const deposits = await prisma.depositRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: deposits.map((d) => {
        let txid = "";
        try {
          const parsed = JSON.parse(d.note || "{}");
          txid = parsed.txid || parsed.transactionId || "";
        } catch {}

        return {
          id: d.id,
          _id: d.id,
          amount: d.amount,
          status: d.status.toLowerCase(), // "pending", "approved", "rejected"
          txHash: txid,
          channel: d.channelKey || "",
          note: d.note,
          createdAt: d.createdAt,
          reviewedAt: d.reviewedAt,
        };
      }),
    });
  } catch (error: any) {
    console.error("GET wallet/deposits API error:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
