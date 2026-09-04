import { resolveDragonTigerRound, settleDragonTigerBets } from "../../lib/game-engine/dragon-tiger/engine";
import { resolveBlackjackRound, evaluateBlackjackHand } from "../../lib/game-engine/blackjack/engine";
import { resolveRouletteRound, settleRouletteBets } from "../../lib/game-engine/roulette/engine";
import { resolveBaccaratRound, settleBaccaratBets } from "../../lib/game-engine/baccarat/engine";
import { resolveSicBoRound, settleSicBoBets } from "../../lib/game-engine/sicbo/engine";
import { resolveSevenUpDownRound, settleSevenUpDownBets } from "../../lib/game-engine/seven-up-down/engine";
import { resolveAndarBaharRound, settleAndarBaharBets } from "../../lib/game-engine/andar-bahar/engine";
import { resolveTeenPattiRound, settleTeenPattiBets, evaluateTeenPattiHand } from "../../lib/game-engine/teen-patti/engine";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`TEST FAILED: ${msg}`);
  }
}

console.log("==========================================");
console.log("RUNNING CASINO PLATFORM GAME ENGINE TESTS");
console.log("==========================================");

// 1. Dragon Tiger Test
console.log("\n[1/8] Testing Dragon Tiger Engine...");
const dtResult = resolveDragonTigerRound("dragon_win");
assert(dtResult.outcome === "dragon", "Dragon win scenario failed");
const dtSettlement = settleDragonTigerBets(dtResult, [
  { id: "b1", userId: "u1", betType: "dragon", amount: 100 },
  { id: "b2", userId: "u1", betType: "tiger", amount: 100 },
]);
assert(dtSettlement[0].payout === 200, "Dragon payout 2:1 failed");
assert(dtSettlement[1].payout === 0, "Tiger lost bet failed");
console.log("✓ Dragon Tiger Engine Passed!");

// 2. Blackjack Test
console.log("\n[2/8] Testing Blackjack Engine...");
const bjResult = resolveBlackjackRound([], [], "player_blackjack");
assert(bjResult.outcome === "PLAYER_BLACKJACK", "Blackjack natural scenario failed");
assert(bjResult.payoutMultiplier === 2.5, "3:2 Blackjack payout failed");
const handEval = evaluateBlackjackHand([{ rank: "10", suit: "S" }, { rank: "8", suit: "D" }, { rank: "6", suit: "C" }]);
assert(handEval.isBust === true && handEval.value === 24, "Blackjack hand evaluation bust failed");
console.log("✓ Blackjack Engine Passed!");

// 3. European Roulette Test
console.log("\n[3/8] Testing European Roulette Engine...");
const rResult = resolveRouletteRound("red_32");
assert(rResult.winningNumber === 32 && rResult.color === "red", "Red 32 scenario failed");
const rSettlement = settleRouletteBets(rResult, [
  { id: "b1", userId: "u1", betType: "straight", selection: "32", amount: 100 },
  { id: "b2", userId: "u1", betType: "color", selection: "red", amount: 100 },
  { id: "b3", userId: "u1", betType: "color", selection: "black", amount: 100 },
]);
assert(rSettlement[0].payout === 3600, "Straight 35:1 payout failed (36x return)");
assert(rSettlement[1].payout === 200, "Red 1:1 payout failed");
assert(rSettlement[2].payout === 0, "Black lost failed");
console.log("✓ European Roulette Engine Passed!");

// 4. Baccarat Test
console.log("\n[4/8] Testing Baccarat Engine...");
const bResult = resolveBaccaratRound("player_win");
assert(bResult.outcome === "player" && bResult.isNatural === true, "Baccarat Player natural win failed");
const bSettlement = settleBaccaratBets(bResult, [
  { id: "b1", userId: "u1", betType: "player", amount: 100 },
]);
assert(bSettlement[0].payout === 200, "Baccarat Player 1:1 payout failed");
console.log("✓ Baccarat Engine Passed!");

// 5. Sic Bo Test
console.log("\n[5/8] Testing Sic Bo Engine...");
const sbResult = resolveSicBoRound("triple_fours");
assert(sbResult.isTriple === true && sbResult.dice[0] === 4, "Triple 4s scenario failed");
const sbSettlement = settleSicBoBets(sbResult, [
  { id: "b1", userId: "u1", betType: "triple_any", selection: "any_triple", amount: 100 },
  { id: "b2", userId: "u1", betType: "small", selection: "small", amount: 100 }, // Triples lose small/big
]);
assert(sbSettlement[0].payout === 3100, "Any Triple 30:1 payout failed");
assert(sbSettlement[1].payout === 0, "Triple small loss rule failed");
console.log("✓ Sic Bo Engine Passed!");

// 6. 7 Up Down Test
console.log("\n[6/8] Testing 7 Up Down Engine...");
const sevenResult = resolveSevenUpDownRound("seven_exact");
assert(sevenResult.outcome === "seven_exact" && sevenResult.sum === 7, "Exact 7 scenario failed");
const sevenSettlement = settleSevenUpDownBets(sevenResult, [
  { id: "b1", userId: "u1", betType: "seven_exact", amount: 100 },
  { id: "b2", userId: "u1", betType: "seven_down", amount: 100 },
  { id: "b3", userId: "u1", betType: "number", selection: "7", amount: 100 },
]);
assert(sevenSettlement[0].payout === 500, "Exact 7 (5x) payout failed");
assert(sevenSettlement[1].payout === 0, "7 Down loss failed");
assert(sevenSettlement[2].payout >= 500, "Exact number 7 payout failed");
console.log("✓ 7 Up Down Engine Passed (including Extra Pay & Exact Number Bets)!");

// 7. Andar Bahar Test
console.log("\n[7/8] Testing Andar Bahar Engine...");
const abResult = resolveAndarBaharRound("andar_first_match");
assert(abResult.winningSide === "andar" && abResult.matchingCardCount === 1, "Andar first card match scenario failed");
const abSettlement = settleAndarBaharBets(abResult, [
  { id: "b1", userId: "u1", betType: "andar", amount: 100 },
]);
assert(abSettlement[0].payout === 190, "Andar 1.9x payout failed");
console.log("✓ Andar Bahar Engine Passed!");

// 8. Teen Patti Test
console.log("\n[8/8] Testing Teen Patti Engine...");
const tpResult = resolveTeenPattiRound("trio_win");
assert(tpResult.winner === "player" && tpResult.playerEval.type === "TRAIL", "Teen Patti Trio scenario failed");
const tpSettlement = settleTeenPattiBets(tpResult, [
  { id: "b1", userId: "u1", betType: "ante", amount: 100 },
  { id: "b2", userId: "u1", betType: "pair_plus", amount: 100 },
]);
assert(tpSettlement[0].payout === 200, "Teen Patti Ante win payout failed");
assert(tpSettlement[1].payout === 4100, "Teen Patti Pair Plus Trail 40:1 payout failed");
console.log("✓ Teen Patti Engine Passed!");

console.log("\n==========================================");
console.log("ALL 8 CASINO ENGINE VERIFICATION TESTS PASSED SUCCESSFULLY!");
console.log("==========================================");
