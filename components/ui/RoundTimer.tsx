import clsx from "clsx";
import { Odometer } from "@/components/Odometer";
import { Lock } from "lucide-react";

function timeDigits(ms: number) {
  const totalSeconds = Math.ceil(Math.max(0, ms) / 1000);
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, "0").split("");
  const s = String(totalSeconds % 60).padStart(2, "0").split("");
  return { m, s };
}

export function RoundTimer({
  roundNumber,
  remainingMs,
  locked,
  balance,
  onRefresh,
  refreshing = false,
  hideBalance = false,
  onHowToPlay,
}: {
  roundNumber: number | string;
  remainingMs: number;
  locked: boolean;
  balance: number;
  onRefresh?: () => void;
  refreshing?: boolean;
  // When the balance is already shown elsewhere on the page (e.g. a wallet
  // card above), hide the duplicate balance readout here and just show the
  // period + countdown.
  hideBalance?: boolean;
  onHowToPlay?: () => void;
}) {
  const { m, s } = timeDigits(remainingMs);

  return (
    <section className="card-surface rounded-2xl p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted font-medium flex items-center gap-2">
            Period
            {onHowToPlay && (
              <button
                type="button"
                onClick={onHowToPlay}
                className="inline-flex items-center gap-1 rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[10px] font-semibold text-gold hover:bg-gold/15 transition-colors normal-case tracking-normal"
              >
                <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                How to play
              </button>
            )}
          </p>
          <p className="font-mono text-xl sm:text-2xl font-bold text-foreground mt-1 tabular-nums">{roundNumber}</p>
        </div>
        {!hideBalance && (
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wider text-muted font-medium flex items-center justify-end gap-1.5">
              Balance
              {onRefresh && (
                <button
                  type="button"
                  onClick={onRefresh}
                  aria-label="Refresh balance"
                  title="Refresh balance"
                  className="text-gold hover:text-gold-light transition-colors"
                >
                  <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"
                    className={refreshing ? "animate-spin" : ""}>
                    <polyline points="23 4 23 10 17 10" />
                    <polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                </button>
              )}
            </p>
            <Odometer value={balance} decimals={2} className="text-xl sm:text-2xl font-bold mt-1" />
          </div>
        )}
      </div>

      <p className={clsx("text-[11px] uppercase tracking-wider font-medium mt-5", locked ? "text-red" : "text-muted")}>
        {locked ? <span className="flex items-center gap-1"><Lock size={12} /> Betting locked</span> : "Time remaining"}
      </p>

      <div className="mt-2 flex items-center gap-1 sm:gap-1.5">
        <div className="flex items-center gap-0.5 sm:gap-1">
          {m.map((d, i) => (
            <span
              key={`m${i}`}
              className={clsx(
                "digit-box rounded-lg w-9 h-11 sm:w-11 sm:h-14 flex items-center justify-center text-xl sm:text-2xl font-bold font-mono",
                locked ? "text-red" : "text-gold"
              )}
            >
              {d}
            </span>
          ))}
        </div>
        <span className={clsx("text-xl sm:text-2xl font-bold px-0.5", locked ? "text-red" : "text-gold")}>:</span>
        <div className="flex items-center gap-0.5 sm:gap-1">
          {s.map((d, i) => (
            <span
              key={`s${i}`}
              className={clsx(
                "digit-box rounded-lg w-9 h-11 sm:w-11 sm:h-14 flex items-center justify-center text-xl sm:text-2xl font-bold font-mono",
                locked ? "text-red" : "text-gold"
              )}
            >
              {d}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
