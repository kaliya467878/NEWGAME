import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/jwt";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Not authorized, token invalid or expired" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const code = String(body.code || "").trim().toUpperCase();

    if (!code) {
      return NextResponse.json({ success: false, message: "Please enter a gift code." }, { status: 400 });
    }

    // Find the gift code
    const giftCode = await prisma.giftCode.findUnique({
      where: { code }
    });

    if (!giftCode) {
      return NextResponse.json({ success: false, message: "Invalid gift code." }, { status: 400 });
    }

    if (!giftCode.isActive) {
      return NextResponse.json({ success: false, message: "This gift code is no longer active." }, { status: 400 });
    }

    if (giftCode.expiresAt && giftCode.expiresAt < new Date()) {
      return NextResponse.json({ success: false, message: "This gift code has expired." }, { status: 400 });
    }

    if (giftCode.redeemedCount >= giftCode.maxRedemptions) {
      return NextResponse.json({ success: false, message: "This gift code has reached its maximum redemption limit." }, { status: 400 });
    }

    // Check if user already redeemed this code
    const alreadyRedeemed = await prisma.giftCodeRedemption.findUnique({
      where: {
        giftCodeId_userId: {
          giftCodeId: giftCode.id,
          userId: user.id
        }
      }
    });

    if (alreadyRedeemed) {
      return NextResponse.json({ success: false, message: "You have already redeemed this gift code." }, { status: 400 });
    }

    // Get user wallet
    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id }
    });

    if (!wallet) {
      return NextResponse.json({ success: false, message: "Wallet not found." }, { status: 400 });
    }

    // Execute redemption in a database transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Increment redeemedCount
      await tx.giftCode.update({
        where: { id: giftCode.id },
        data: { redeemedCount: { increment: 1 } }
      });

      // 2. Create redemption record
      await tx.giftCodeRedemption.create({
        data: {
          giftCodeId: giftCode.id,
          userId: user.id,
          amount: giftCode.amount
        }
      });

      // 3. Update wallet balance
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: giftCode.amount } }
      });

      // 4. Create ledger entry
      await tx.ledgerEntry.create({
        data: {
          walletId: wallet.id,
          type: "GIFT_CODE_REDEEMED",
          amount: giftCode.amount,
          balanceAfter: updatedWallet.balance,
          meta: {
            code: giftCode.code,
            description: `Gift Code Redeemed: ${giftCode.code}`
          }
        }
      });

      return { rewardAmount: giftCode.amount };
    });

    return NextResponse.json({
      success: true,
      message: `Successfully redeemed ₹${result.rewardAmount}!`,
      data: result
    });
  } catch (error) {
    console.error("POST redeem gift code error:", error);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}
