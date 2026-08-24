"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import clsx from "clsx";
import { startCrashAction, cashOutCrashAction } from "@/lib/actions/games";
import { crashMultiplierAt, crashPlanePosition } from "@/lib/games/logic";
import { BetAmountInput } from "./BetAmountInput";
import { Button } from "@/components/ui/Button";
import { Odometer } from "@/components/Odometer";
import { useToasts, ToastStack } from "@/components/ui/Toast";

type Phase = "idle" | "running" | "crashed" | "cashed";

const ORIGIN = crashPlanePosition(1);

export function CrashGame({ initialBalance }: { initialBalance: number }) {
  const queryClient = useQueryClient();
  const [balance, setBalance] = useState(initialBalance);
  const [amount, setAmount] = useState(10);
  const [phase, setPhase] = useState<Phase>("idle");
  const [multiplier, setMultiplier] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const { toasts, push: pushToast } = useToasts();

  const gameRef = useRef<{ id: string; startedAt: number; clockOffset: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const planeRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<SVGLineElement>(null);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function stopLoops() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (pollRef.current) clearInterval(pollRef.current);
    rafRef.current = null;
    pollRef.current = null;
  }

  // Continuous position updates go straight to the DOM via refs — never through
  // setState — so the plane can move every rAF frame without paying for a React
  // re-render on each tick. Only the numeric multiplier label uses setState.
  function movePlaneTo(m: number) {
    const { leftPct, bottomPct, rotateDeg } = crashPlanePosition(m);
    if (planeRef.current) {
      planeRef.current.style.left = `${leftPct}%`;
      planeRef.current.style.bottom = `${bottomPct}%`;
      planeRef.current.style.transform = `translate(-50%, 50%) rotate(${rotateDeg}deg)`;
    }
    if (trailRef.current) {
      trailRef.current.setAttribute("x2", String(leftPct));
      trailRef.current.setAttribute("y2", String(100 - bottomPct));
    }
  }

  function tick() {
    const game = gameRef.current;
    if (!game) return;
    const elapsed = Date.now() + game.clockOffset - game.startedAt;
    const m = crashMultiplierAt(elapsed);
    setMultiplier(m);
    movePlaneTo(m);
    rafRef.current = requestAnimationFrame(tick);
  }

  async function start() {
    setPending(true);
    setError(null);
    setMessage(null);
    const res = await startCrashAction({ amount });
    setPending(false);
    if ("error" in res) {
      setError(res.error ?? "Something went wrong");
      return;
    }
    gameRef.current = {
      id: res.gameId,
      startedAt: res.startedAt,
      clockOffset: res.serverTime - Date.now(),
    };
    setBalance((b) => b - amount);
    setPhase("running");
    setMultiplier(1);
    movePlaneTo(1);
    queryClient.invalidateQueries({ queryKey: ["wallet-balance"] });
    rafRef.current = requestAnimationFrame(tick);

    // Poll the server so a round the player never cashes out still resolves.
    pollRef.current = setInterval(async () => {
      const game = gameRef.current;
      if (!game) return;
      const r = await fetch(`/api/games/crash/${game.id}`, { cache: "no-store" });
      if (!r.ok) return;
      const data = await r.json();
      if (data.crashed || data.status === "LOST") {
        stopLoops();
        const crashPoint = data.crashPoint ?? data.currentMultiplier;
        setMultiplier(crashPoint);
        movePlaneTo(crashPoint);
        setPhase("crashed");
        const msg = `Crashed at ${crashPoint.toFixed(2)}×. You lost this round.`;
        setMessage(msg);
        pushToast(msg, "error");
      }
    }, 500);
  }

  async function cashOut() {
    const game = gameRef.current;
    if (!game || phase !== "running") return;
    setPending(true);
    const elapsed = Date.now() + game.clockOffset - game.startedAt;
    const clickedMultiplier = crashMultiplierAt(elapsed);
    const res = await cashOutCrashAction(game.id, clickedMultiplier);
    setPending(false);

    if ("error" in res) {
      setError(res.error ?? "Something went wrong");
      return;
    }
    stopLoops();
    if ("crashed" in res && res.crashed) {
      setMultiplier(res.crashPoint);
      movePlaneTo(res.crashPoint);
      setPhase("crashed");
      const msg = `Crashed at ${res.crashPoint.toFixed(2)}×. Too late!`;
      setMessage(msg);
      pushToast(msg, "error");
      return;
    }
    if ("cashedOut" in res && res.cashedOut) {
      setMultiplier(res.multiplier);
      movePlaneTo(res.multiplier);
      setBalance(res.balance);
      setPhase("cashed");
      const msg = `Cashed out at ${res.multiplier.toFixed(2)}× — won ₹${res.payout}!`;
      setMessage(msg);
      pushToast(msg, "success");
      queryClient.invalidateQueries({ queryKey: ["wallet-balance"] });
    }
  }

  function reset() {
    gameRef.current = null;
    setPhase("idle");
    setMultiplier(1);
    movePlaneTo(1);
    setMessage(null);
    setError(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="card-surface rounded-2xl p-6 flex items-center justify-between">
        <div>
          <p className="text-muted text-sm">Balance</p>
          <Odometer value={balance} className="text-2xl font-semibold text-coin" />
        </div>
      </div>

      <div
        className={clsx(
          "relative card-surface rounded-2xl overflow-hidden transition-colors h-72 sm:h-80",
          phase === "crashed" && "border-red/50",
          phase === "cashed" && "border-green/50"
        )}
      >
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.25) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />

        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          <defs>
            <linearGradient id="crashTrailGrad" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--gold)" stopOpacity="0" />
              <stop offset="100%" stopColor="var(--gold-2)" stopOpacity="0.95" />
            </linearGradient>
          </defs>
          <line
            ref={trailRef}
            x1={ORIGIN.leftPct}
            y1={100 - ORIGIN.bottomPct}
            x2={ORIGIN.leftPct}
            y2={100 - ORIGIN.bottomPct}
            stroke="url(#crashTrailGrad)"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>

        <div
          ref={planeRef}
          className="absolute text-4xl sm:text-5xl select-none"
          style={{
            left: `${ORIGIN.leftPct}%`,
            bottom: `${ORIGIN.bottomPct}%`,
            transform: `translate(-50%, 50%) rotate(${ORIGIN.rotateDeg}deg)`,
          }}
        >
          {phase === "crashed" ? (
            <motion.span
              key="boom"
              initial={{ scale: 0.5, opacity: 0, rotate: 0 }}
              animate={{ scale: [0.6, 1.6, 1.1], opacity: 1, rotate: [0, 12, -12, 0] }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="block"
            >
              💥
            </motion.span>
          ) : (
            <motion.span
              animate={phase === "cashed" ? { scale: [1, 1.35, 1] } : { scale: 1 }}
              transition={{ duration: 0.4 }}
              className="block drop-shadow-[0_0_10px_rgba(225,29,72,0.55)]"
            >
              ✈️
            </motion.span>
          )}
        </div>

        {phase === "crashed" && (
          <motion.div
            className="absolute inset-0 bg-red/30 pointer-events-none"
            initial={{ opacity: 0.85 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          />
        )}

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p
            className={clsx(
              "text-6xl font-mono font-bold tabular-nums drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]",
              phase === "crashed" ? "text-red" : phase === "cashed" ? "text-green" : "text-gold"
            )}
          >
            {multiplier.toFixed(2)}×
          </p>
        </div>
      </div>

      <div className="card-surface rounded-2xl p-6 flex flex-col gap-4">
        {phase === "running" ? (
          <Button onClick={cashOut} disabled={pending}>
            Cash out at {multiplier.toFixed(2)}× (₹{Math.floor(amount * multiplier)})
          </Button>
        ) : phase === "idle" ? (
          <>
            <BetAmountInput amount={amount} setAmount={setAmount} disabled={pending} />
            {error && <p className="text-sm text-red">{error}</p>}
            <Button onClick={start} disabled={pending || amount > balance}>
              {pending ? "Starting…" : "Start round"}
            </Button>
          </>
        ) : (
          <>
            {message && (
              <p className={clsx("text-sm font-medium", phase === "cashed" ? "text-green" : "text-red")}>{message}</p>
            )}
            <Button onClick={reset}>Play again</Button>
          </>
        )}
      </div>

      <ToastStack toasts={toasts} />
    </div>
  );
}
