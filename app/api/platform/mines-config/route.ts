import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  return NextResponse.json({
    success: true,
    data: {
      minBetAmount: 1,
      maxBetAmount: 100000,
      houseEdge: 0.01,
      mineCounts: [3, 5, 10, 15, 20],
    },
  });
}
