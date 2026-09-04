import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/jwt";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Login required" }, { status: 401 });
    }

    const url = new URL(req.url);
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || 10)));
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));

    return NextResponse.json({
      success: true,
      data: {
        bets: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 1,
        },
      },
    });
  } catch (error: any) {
    console.error("GET dragon-tiger bets/my API error:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
