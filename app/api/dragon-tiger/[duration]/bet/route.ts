import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/jwt";
import { processBetDebit } from "@/lib/game-engine/settlement";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ duration: string }> }
) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Login required to place bet" }, { status: 401 });
    }

    const { duration: durParam } = await params;
    const body = await req.json();
    const amount = Math.floor(Number(body.amount || 0));
    const betType = String(body.betType || body.zone || "dragon").toLowerCase();

    if (amount <= 0) {
      return NextResponse.json({ message: "Invalid bet amount" }, { status: 400 });
    }

    if (!["dragon", "tiger", "tie"].includes(betType)) {
      return NextResponse.json({ message: "Invalid bet type. Expected dragon, tiger, or tie" }, { status: 400 });
    }

    let wallet;
    try {
      wallet = await processBetDebit(user.id, amount, "DRAGON_TIGER", { duration: durParam, betType });
    } catch (err: any) {
      if (err.message === "INSUFFICIENT_BALANCE") {
        return NextResponse.json({ message: "Insufficient wallet balance" }, { status: 400 });
      }
      throw err;
    }

    return NextResponse.json({
      success: true,
      data: {
        bet: {
          id: `dt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          amount,
          betType,
          status: "PENDING",
        },
        balance: wallet.balance,
      },
    });
  } catch (error: any) {
    console.error("POST dragon-tiger bet API error:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
