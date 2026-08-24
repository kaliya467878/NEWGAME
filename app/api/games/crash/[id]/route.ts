import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { crashMultiplierAt } from "@/lib/games/logic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const game = await prisma.crashGame.findUnique({ where: { id } });
  if (!game || game.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const elapsed = Date.now() - game.createdAt.getTime();
  const currentMultiplier = crashMultiplierAt(elapsed);

  if (game.status === "ACTIVE" && currentMultiplier >= game.crashPoint) {
    // The player never cashed out and the round has crashed: settle it as a loss.
    await prisma.crashGame.update({
      where: { id },
      data: { status: "LOST", payout: 0, endedAt: new Date() },
    });
    return NextResponse.json({ status: "LOST", crashed: true, crashPoint: game.crashPoint, currentMultiplier: game.crashPoint });
  }

  return NextResponse.json({
    status: game.status,
    crashed: game.status === "LOST",
    crashPoint: game.status === "ACTIVE" ? null : game.crashPoint,
    cashOutMultiplier: game.cashOutMultiplier,
    currentMultiplier,
  });
}
