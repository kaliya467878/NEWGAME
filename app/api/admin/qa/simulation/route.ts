import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/jwt";
import { QA_SCENARIOS } from "@/lib/game-engine/simulation";
import { resolveBlackjackRound } from "@/lib/game-engine/blackjack/engine";
import { resolveRouletteRound } from "@/lib/game-engine/roulette/engine";
import { resolveBaccaratRound } from "@/lib/game-engine/baccarat/engine";
import { resolveSicBoRound } from "@/lib/game-engine/sicbo/engine";
import { resolveSevenUpDownRound } from "@/lib/game-engine/seven-up-down/engine";
import { resolveAndarBaharRound } from "@/lib/game-engine/andar-bahar/engine";
import { resolveDragonTigerRound } from "@/lib/game-engine/dragon-tiger/engine";
import { resolveTeenPattiRound } from "@/lib/game-engine/teen-patti/engine";

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      scenarios: QA_SCENARIOS,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Admin / QA authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const gameId = String(body.gameId || "blackjack").toLowerCase();
    const scenarioId = String(body.scenarioId || "").toLowerCase();

    let output: any = null;

    switch (gameId) {
      case "blackjack":
        output = resolveBlackjackRound([], [], scenarioId);
        break;
      case "roulette":
        output = resolveRouletteRound(scenarioId);
        break;
      case "baccarat":
        output = resolveBaccaratRound(scenarioId);
        break;
      case "sicbo":
        output = resolveSicBoRound(scenarioId);
        break;
      case "seven_up_down":
      case "seven-up-down":
        output = resolveSevenUpDownRound(scenarioId);
        break;
      case "andar_bahar":
      case "andar-bahar":
        output = resolveAndarBaharRound(scenarioId);
        break;
      case "dragon_tiger":
      case "dragon-tiger":
        output = resolveDragonTigerRound(scenarioId);
        break;
      case "teen_patti":
      case "teen-patti":
        output = resolveTeenPattiRound(scenarioId);
        break;
      default:
        return NextResponse.json({ message: "Invalid gameId for QA simulation" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        simulation: true,
        environment: "QA",
        gameId,
        scenarioId,
        output,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("POST /api/admin/qa/simulation error:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
