import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/jwt";
import { prisma } from "@/lib/prisma";
import type { RewardStatus } from "@/generated/prisma/client";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Not authorized, token invalid or expired" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 10)));
    const statusParam = searchParams.get("status");

    const where = {
      userId: user.id,
      type: "REFERRAL" as const,
      ...(statusParam === "credited"
        ? { status: "CLAIMED" as RewardStatus }
        : statusParam === "pending"
        ? { status: "AVAILABLE" as RewardStatus }
        : {}),
    };

    const [rewards, total] = await Promise.all([
      prisma.reward.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.reward.count({ where }),
    ]);

    const earnings = rewards.map((r) => {
      const meta = (r.meta as Record<string, unknown> | null) ?? {};
      return {
        id: r.id,
        referredUser: meta.referredDisplayName ? { name: meta.referredDisplayName as string } : undefined,
        title: meta.referredDisplayName ? undefined : "Referral reward",
        status: r.status === "CLAIMED" ? "credited" : "pending",
        amount: r.amount,
        createdAt: r.createdAt.toISOString(),
        creditedAt: r.claimedAt ? r.claimedAt.toISOString() : null,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        earnings,
        pagination: { page, totalPages: Math.max(1, Math.ceil(total / limit)) },
      },
    });
  } catch (error) {
    console.error("GET referrals/me/earnings API error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
