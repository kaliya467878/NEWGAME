import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  return NextResponse.json({
    success: true,
    data: [
      { level: 1, name: "Bronze Star", points: 0, cashbackPercent: 0.5 },
      { level: 2, name: "Silver Star", points: 1000, cashbackPercent: 0.8 },
      { level: 3, name: "Gold Star", points: 5000, cashbackPercent: 1.2 },
      { level: 4, name: "Diamond Star", points: 20000, cashbackPercent: 1.8 },
    ],
  });
}
