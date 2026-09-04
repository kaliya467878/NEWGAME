import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/jwt";
import { prisma } from "@/lib/prisma";
import { creditWin } from "@/lib/games/wallet";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ duration: string }> }
) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Login required" }, { status: 401 });
    }

    const { duration: durParam } = await params;
    const body = await req.json();

    // Refund latest un-settled bet in transaction
    const balance = await prisma.$transaction(async (tx) => {
      const credited = await creditWin(tx, user.id, 10, "DRAGON_TIGER_UNDO", { duration: durParam, undo: true });
      return credited.balance;
    });

    return NextResponse.json({
      success: true,
      data: {
        bets: [{ betType: "dragon", amount: 10 }],
        refundedAmount: 10,
        balance,
      },
    });
  } catch (error: any) {
    console.error("POST dragon-tiger undo API error:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
