import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const list = [
    { id: "notice-1", content: "Welcome to Lucky Nova! Deposits via USDT TRC20 are fully automated. Happy gaming!" },
    { id: "notice-2", content: "Mines multiplier values upgraded. Daily claims credited instantly." },
  ];
  return NextResponse.json({ success: true, data: list });
}
