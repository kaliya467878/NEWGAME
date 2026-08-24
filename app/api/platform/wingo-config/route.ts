import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    data: {
      minBetAmount: 1,
      maxBetAmount: 100000,
      payouts: null, // use default Wingo multipliers
    },
  });
}
