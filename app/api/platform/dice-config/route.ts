import { NextResponse } from "next/server";
import { HOUSE_EDGE } from "@/lib/games/logic";

export const dynamic = "force-dynamic";

// Keeps the frontend's displayed multiplier/payout preview in sync with the
// actual constants app/api/dice/roll uses to settle bets — otherwise the UI's
// hardcoded fallback (see DEFAULT_CFG in DiceGameScreen) can silently diverge
// from what the backend really pays out.
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      minBetAmount: 10,
      maxBetAmount: 100000,
      minTarget: 2,
      maxTarget: 99,
      houseEdge: HOUSE_EDGE,
    },
  });
}
