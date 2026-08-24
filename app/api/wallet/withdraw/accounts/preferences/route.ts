import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/jwt";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Not authorized, token invalid or expired" }, { status: 401 });
    }

    const { method, selected } = await req.json();

    if (method) {
      if (!["bank", "upi", "usdt"].includes(method)) {
        return NextResponse.json({ message: "Invalid method" }, { status: 400 });
      }

      // To change the preferred overall method:
      // We set the preferred account of the selected method type to isPreferred = true,
      // and set all other types to isPreferred = false.
      const firstPreferredOfMethod = await prisma.withdrawalAccount.findFirst({
        where: { userId: user.id, type: method },
        orderBy: { createdAt: "desc" },
      });

      if (firstPreferredOfMethod) {
        // Turn off preferred on all other accounts
        await prisma.withdrawalAccount.updateMany({
          where: { userId: user.id, NOT: { id: firstPreferredOfMethod.id } },
          data: { isPreferred: false },
        });

        // Set this account as preferred
        await prisma.withdrawalAccount.update({
          where: { id: firstPreferredOfMethod.id },
          data: { isPreferred: true },
        });
      }
    }

    if (selected && typeof selected === "object") {
      const type = Object.keys(selected)[0];
      const accountId = selected[type];

      if (accountId) {
        // Turn off preferred on all other accounts of this type for this user
        await prisma.withdrawalAccount.updateMany({
          where: { userId: user.id, type },
          data: { isPreferred: false },
        });

        // Turn off preferred on all other accounts of any type (if we want this to be the overall active one)
        // Note: the frontend usually sets the active tab. So making this account preferred is correct.
        await prisma.withdrawalAccount.updateMany({
          where: { userId: user.id, NOT: { id: accountId } },
          data: { isPreferred: false },
        });

        // Turn on preferred for this account
        await prisma.withdrawalAccount.update({
          where: { id: accountId },
          data: { isPreferred: true },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Withdrawal preferences updated successfully",
    });
  } catch (error: any) {
    console.error("PATCH wallet/withdraw/accounts/preferences API error:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
