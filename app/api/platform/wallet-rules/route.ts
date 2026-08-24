import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const minWithdrawSetting = await prisma.setting.findUnique({ where: { key: "minWithdraw" } });
    const maxWithdrawSetting = await prisma.setting.findUnique({ where: { key: "maxWithdraw" } });
    const feeSetting = await prisma.setting.findUnique({ where: { key: "withdrawFeePercent" } });

    const minWithdraw = Number(minWithdrawSetting?.value || 100);
    const maxWithdraw = Number(maxWithdrawSetting?.value || 50000);
    const withdrawFeePercent = Number(feeSetting?.value || 0);

    return NextResponse.json({
      success: true,
      data: {
        minWithdraw,
        maxWithdraw,
        rules: [
          "Withdrawals are open 24/7.",
          `Minimum withdrawal amount is ₹${minWithdraw}.`,
          `Withdrawals are subject to a processing fee of ${withdrawFeePercent}%.`,
          "Funds are credited to your destination wallet address or card in 2-4 hours.",
        ],
      },
    });
  } catch (error: any) {
    console.error("GET platform/wallet-rules API error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
