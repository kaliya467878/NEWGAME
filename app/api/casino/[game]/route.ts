import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/jwt";
import { processBetDebit, processBetSettlement } from "@/lib/game-engine/settlement";

import { resolveBlackjackRound } from "@/lib/game-engine/blackjack/engine";
import { resolveRouletteRound, settleRouletteBets } from "@/lib/game-engine/roulette/engine";
import { resolveBaccaratRound, settleBaccaratBets } from "@/lib/game-engine/baccarat/engine";
import { resolveSicBoRound, settleSicBoBets } from "@/lib/game-engine/sicbo/engine";
import { resolveSevenUpDownRound, settleSevenUpDownBets } from "@/lib/game-engine/seven-up-down/engine";
import { resolveAndarBaharRound, settleAndarBaharBets } from "@/lib/game-engine/andar-bahar/engine";
import { resolveDragonTigerRound, settleDragonTigerBets } from "@/lib/game-engine/dragon-tiger/engine";
import { resolveTeenPattiRound, settleTeenPattiBets } from "@/lib/game-engine/teen-patti/engine";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ game: string }> }
) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ message: "Authentication required" }, { status: 401 });
    }

    const { game } = await params;
    const gameId = game.toLowerCase();
    const body = await req.json();
    const action = String(body.action || "settle").toLowerCase();

    if (action === "bet") {
      const amount = Math.floor(Number(body.amount || 0));
      if (amount <= 0) {
        return NextResponse.json({ message: "Invalid bet amount" }, { status: 400 });
      }

      let wallet;
      try {
        wallet = await processBetDebit(user.id, amount, gameId, { betType: body.betType });
      } catch (err: any) {
        if (err.message === "INSUFFICIENT_BALANCE") {
          return NextResponse.json({ message: "Insufficient balance" }, { status: 400 });
        }
        throw err;
      }

      return NextResponse.json({
        success: true,
        data: {
          betId: `bet_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          amount,
          balance: wallet.balance,
        },
      });
    }

    if (action === "settle" || action === "play") {
      const bets = Array.isArray(body.bets) ? body.bets : [];
      const scenario = body.scenario ? String(body.scenario) : undefined;

      let result: any = null;
      let settlements: any[] = [];

      switch (gameId) {
        case "blackjack": {
          const pCards = body.playerCards || [];
          const dCards = body.dealerCards || [];
          result = resolveBlackjackRound(pCards, dCards, scenario);
          const betAmount = Number(body.amount || 100);
          const payout = Math.floor(betAmount * result.payoutMultiplier);
          settlements = [
            {
              betId: `bj_${Date.now()}`,
              userId: user.id,
              amount: betAmount,
              payout,
              profit: payout - betAmount,
              status: payout > betAmount ? "WON" : payout === betAmount ? "PUSH" : "LOST",
            },
          ];
          break;
        }

        case "roulette": {
          result = resolveRouletteRound(scenario);
          settlements = settleRouletteBets(result, bets.map((b: any, idx: number) => ({
            id: b.id || `r_${idx}`,
            userId: user.id,
            betType: b.betType || b.type || "straight",
            selection: String(b.selection || b.value || "0"),
            amount: Number(b.amount || 10),
          })));
          break;
        }

        case "baccarat": {
          result = resolveBaccaratRound(scenario);
          settlements = settleBaccaratBets(result, bets.map((b: any, idx: number) => ({
            id: b.id || `bac_${idx}`,
            userId: user.id,
            betType: b.betType || "player",
            amount: Number(b.amount || 10),
          })));
          break;
        }

        case "sicbo": {
          result = resolveSicBoRound(scenario);
          settlements = settleSicBoBets(result, bets.map((b: any, idx: number) => ({
            id: b.id || `sb_${idx}`,
            userId: user.id,
            betType: b.betType || "small",
            selection: String(b.selection || "small"),
            amount: Number(b.amount || 10),
          })));
          break;
        }

        case "seven-up-down":
        case "seven_up_down": {
          result = resolveSevenUpDownRound(scenario);
          settlements = settleSevenUpDownBets(result, bets.map((b: any, idx: number) => ({
            id: b.id || `7up_${idx}`,
            userId: user.id,
            betType: b.betType || "seven_exact",
            amount: Number(b.amount || 10),
          })));
          break;
        }

        case "andar-bahar":
        case "andar_bahar": {
          result = resolveAndarBaharRound(scenario);
          settlements = settleAndarBaharBets(result, bets.map((b: any, idx: number) => ({
            id: b.id || `ab_${idx}`,
            userId: user.id,
            betType: b.betType || "andar",
            amount: Number(b.amount || 10),
          })));
          break;
        }

        case "dragon-tiger":
        case "dragon_tiger": {
          result = resolveDragonTigerRound(scenario);
          settlements = settleDragonTigerBets(result, bets.map((b: any, idx: number) => ({
            id: b.id || `dt_${idx}`,
            userId: user.id,
            betType: b.betType || "dragon",
            amount: Number(b.amount || 10),
          })));
          break;
        }

        case "teen-patti":
        case "teen_patti": {
          result = resolveTeenPattiRound(scenario);
          settlements = settleTeenPattiBets(result, bets.map((b: any, idx: number) => ({
            id: b.id || `tp_${idx}`,
            userId: user.id,
            betType: b.betType || "ante",
            amount: Number(b.amount || 10),
          })));
          break;
        }

        default:
          return NextResponse.json({ message: "Unknown casino game requested" }, { status: 400 });
      }

      const balance = await processBetSettlement(user.id, settlements, gameId, { scenario });

      return NextResponse.json({
        success: true,
        data: {
          result,
          settlements,
          balance,
        },
      });
    }

    return NextResponse.json({ message: "Unsupported action" }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/casino/[game] error:", error);
    return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
