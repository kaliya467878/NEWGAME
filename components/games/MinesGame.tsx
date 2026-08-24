"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { startMinesAction, revealMineTileAction, cashOutMinesAction } from "@/lib/actions/games";
import { minesMultiplier, MINES_GRID_SIZE } from "@/lib/games/logic";
import { BetAmountInput } from "./BetAmountInput";
import { Button } from "@/components/ui/Button";
import { Odometer } from "@/components/Odometer";
import { Gem, Bomb, PartyPopper } from "lucide-react";

type ActiveGame = {
  id: string;
  amount: number;
  mineCount: number;
  revealed: number[];
  multiplier: number;
};

const TILES = Array.from({ length: MINES_GRID_SIZE }, (_, i) => i);

export function MinesGame({
  initialBalance,
  activeGame,
}: {
  initialBalance: number;
  activeGame: ActiveGame | null;
}) {
  const queryClient = useQueryClient();
  const [balance, setBalance] = useState(initialBalance);
  const [amount, setAmount] = useState(activeGame?.amount ?? 10);
  const [mineCount, setMineCount] = useState(activeGame?.mineCount ?? 3);
  const [game, setGame] = useState<ActiveGame | null>(activeGame);
  const [revealedMines, setRevealedMines] = useState<number[] | null>(null);
  const [outcome, setOutcome] = useState<{ type: "won" | "lost"; payout?: number } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextMultiplier = game ? minesMultiplier(game.mineCount, game.revealed.length + 1) : 0;

  async function start() {
    setPending(true);
    setError(null);
    setOutcome(null);
    setRevealedMines(null);
    const res = await startMinesAction({ amount, mineCount });
    setPending(false);
    if ("error" in res) {
      setError(res.error ?? "Something went wrong");
      return;
    }
    setGame({ id: res.gameId, amount, mineCount, revealed: [], multiplier: 1 });
    setBalance((b) => b - amount);
    queryClient.invalidateQueries({ queryKey: ["wallet-balance"] });
  }

  async function reveal(tile: number) {
    if (!game || pending || game.revealed.includes(tile)) return;
    setPending(true);
    setError(null);
    const res = await revealMineTileAction(game.id, tile);
    setPending(false);

    if ("error" in res) {
      setError(res.error ?? "Something went wrong");
      return;
    }
    if ("hitMine" in res && res.hitMine) {
      setRevealedMines(res.minePositions);
      setOutcome({ type: "lost" });
      setGame(null);
      return;
    }
    if ("cashedOut" in res && res.cashedOut) {
      setRevealedMines(res.minePositions);
      setOutcome({ type: "won", payout: res.payout });
      setBalance(res.balance);
      setGame(null);
      queryClient.invalidateQueries({ queryKey: ["wallet-balance"] });
      return;
    }
    if ("revealed" in res) {
      setGame({ ...game, revealed: res.revealed, multiplier: res.multiplier });
    }
  }

  async function cashOut() {
    if (!game || pending) return;
    setPending(true);
    const res = await cashOutMinesAction(game.id);
    setPending(false);
    if ("error" in res) {
      setError(res.error ?? "Something went wrong");
      return;
    }
    if ("cashedOut" in res) {
      setRevealedMines(res.minePositions);
      setOutcome({ type: "won", payout: res.payout });
      setBalance(res.balance);
      setGame(null);
      queryClient.invalidateQueries({ queryKey: ["wallet-balance"] });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="card-surface rounded-2xl p-6 flex items-center justify-between">
        <div>
          <p className="text-muted text-sm">Balance</p>
          <Odometer value={balance} className="text-2xl font-semibold text-coin" />
        </div>
        {game && (
          <div className="text-right">
            <p className="text-muted text-sm">Current multiplier</p>
            <p className="text-2xl font-bold text-gold">{game.multiplier.toFixed(2)}×</p>
          </div>
        )}
      </div>

      <div className="card-surface rounded-2xl p-6">
        <div className="grid grid-cols-5 gap-2 max-w-sm mx-auto">
          {TILES.map((tile) => {
            const isRevealed = game?.revealed.includes(tile) ?? false;
            const isMine = revealedMines?.includes(tile) ?? false;
            const wasSafe = revealedMines && !isMine;
            return (
              <button
                key={tile}
                disabled={!game || pending || isRevealed}
                onClick={() => reveal(tile)}
                className={clsx(
                  "aspect-square rounded-lg border text-lg font-semibold transition flex items-center justify-center",
                  isRevealed && "border-green/50 bg-green/15 text-green",
                  !isRevealed && !revealedMines && "border-border bg-surface-2 hover:border-gold/50",
                  isMine && "border-red/50 bg-red/15",
                  wasSafe && !isRevealed && "border-border bg-surface-2 opacity-40"
                )}
              >
                {isRevealed ? <Gem className="w-6 h-6 text-green-400" /> : isMine ? <Bomb className="w-6 h-6 text-red-500" /> : null}
              </button>
            );
          })}
        </div>
      </div>

      {game ? (
        <div className="card-surface rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Next tile multiplier</span>
            <span className="font-semibold text-gold">{nextMultiplier.toFixed(2)}×</span>
          </div>
          {error && <p className="text-sm text-red">{error}</p>}
          <Button onClick={cashOut} disabled={pending || game.revealed.length === 0}>
            Cash out ₹{Math.floor(game.amount * game.multiplier)}
          </Button>
        </div>
      ) : (
        <div className="card-surface rounded-2xl p-6 flex flex-col gap-4">
          <BetAmountInput amount={amount} setAmount={setAmount} disabled={pending} />
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted">Mines: {mineCount}</span>
            <input
              type="range"
              min={1}
              max={24}
              value={mineCount}
              onChange={(e) => setMineCount(Number(e.target.value))}
              className="w-full accent-[var(--gold)]"
            />
          </label>
          {error && <p className="text-sm text-red">{error}</p>}
          {outcome && (
            <p className={clsx("text-sm font-medium", outcome.type === "won" ? "text-green" : "text-red")}>
              {outcome.type === "won" ? (
                <span className="flex items-center gap-1">
                  You cashed out ₹{outcome.payout}! <PartyPopper className="w-4 h-4" />
                </span>
              ) : (
                "Boom! You hit a mine."
              )}
            </p>
          )}
          <Button onClick={start} disabled={pending || amount > balance}>
            {pending ? "Starting…" : "Start game"}
          </Button>
        </div>
      )}
    </div>
  );
}
