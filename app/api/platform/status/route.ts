import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  return NextResponse.json({
    success: true,
    data: {
      status: "online",
      message: "Platform is fully operational",
    },
  });
}
