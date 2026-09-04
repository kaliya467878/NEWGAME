import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      payouts: {
        dragon: 2,
        tiger: 2,
        tie: 9,
      },
      chips: [1, 2, 5, 10, 25, 50, 100, 500],
      durations: ["30s", "1m"],
    },
  });
}
