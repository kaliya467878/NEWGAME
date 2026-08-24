import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/jwt";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Not authorized, token invalid or expired" }, { status: 401 });
    }

    const { id } = await params;

    const account = await prisma.withdrawalAccount.findUnique({
      where: { id },
    });

    if (!account) {
      return NextResponse.json({ message: "Withdrawal account not found" }, { status: 404 });
    }

    if (account.userId !== user.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await prisma.withdrawalAccount.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Withdrawal account unlinked successfully",
    });
  } catch (error: any) {
    console.error("DELETE wallet/withdraw/accounts/[id] API error:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
