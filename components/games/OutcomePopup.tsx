"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";

interface OutcomePopupProps {
  show: boolean;
  onClose: () => void;
  type: "win" | "lose";
  amount: number;
  gameName: string;
  periodId: string;
  resultDetails: React.ReactNode;
  balance: number;
  autoCloseSeconds?: number;
}

/** Smoothly counts a number up to `target` when `active`; otherwise shows it as-is. */
function useCountUp(target: number, active: boolean, duration = 1, startVal?: number) {
  const start = startVal !== undefined ? startVal : (active ? 0 : target);
  const [val, setVal] = useState(start);
  useEffect(() => {
    if (!active) return;
    // setState happens inside framer-motion's onUpdate callback (a subscription),
    // not synchronously in the effect body — so no cascading renders.
    const controls = animate(start, target, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setVal(v),
    });
    return () => controls.stop();
  }, [target, active, duration, start]);
  return active ? val : target;
}

const inr = (n: number) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function OutcomePopup({
  show,
  onClose,
  type,
  amount,
  gameName,
  periodId,
  resultDetails,
  balance,
  autoCloseSeconds = 3,
}: OutcomePopupProps) {
  const [countdown, setCountdown] = useState(autoCloseSeconds);
  const win = type === "win";

  const animatedAmount = useCountUp(amount, show && win, 1.1);
  const animatedBalance = useCountUp(balance, show, 1.1, win ? balance - amount : balance);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!show) return;
    setCountdown(autoCloseSeconds);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onCloseRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [show, autoCloseSeconds]);

  if (!show) return null;

  const wingFill = win ? "url(#lnWingGold)" : "url(#lnWingSilver)";
  const wingStroke = win ? "#FFE9A8" : "#DCE3EC";

  return (
    <div className="ln-pop-overlay" onClick={onClose}>
      <div className="ln-pop-container" onClick={(e) => e.stopPropagation()}>
        <div className={`ln-pop-card ${win ? "win" : "lose"}`}>
          <button type="button" className="ln-pop-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="5" y1="5" x2="19" y2="19" />
              <line x1="19" y1="5" x2="5" y2="19" />
            </svg>
          </button>

          {/* Emblem: halo, wings, crown, logo, ribbon */}
          <div className="ln-emblem">
            <svg viewBox="0 0 280 200" className="ln-emblem-svg" aria-hidden>
              <defs>
                <radialGradient id="lnHalo" cx="50%" cy="46%" r="50%">
                  <stop offset="0%" stopColor={win ? "rgba(255,201,61,0.55)" : "rgba(220,60,60,0.5)"} />
                  <stop offset="55%" stopColor={win ? "rgba(255,201,61,0.10)" : "rgba(200,40,40,0.10)"} />
                  <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                </radialGradient>
                <linearGradient id="lnWingGold" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFF0C0" />
                  <stop offset="45%" stopColor="#FFD54A" />
                  <stop offset="100%" stopColor="#A9821E" />
                </linearGradient>
                <linearGradient id="lnWingSilver" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F4F7FB" />
                  <stop offset="45%" stopColor="#C4CDDA" />
                  <stop offset="100%" stopColor="#6B7686" />
                </linearGradient>
                <linearGradient id="lnRibbon" x1="0%" y1="0%" x2="0%" y2="100%">
                  {win ? (
                    <>
                      <stop offset="0%" stopColor="#FCE39A" />
                      <stop offset="50%" stopColor="#F0C645" />
                      <stop offset="100%" stopColor="#B98E22" />
                    </>
                  ) : (
                    <>
                      <stop offset="0%" stopColor="#E24B4B" />
                      <stop offset="50%" stopColor="#B01E1E" />
                      <stop offset="100%" stopColor="#7C1515" />
                    </>
                  )}
                </linearGradient>
                <radialGradient id="lnRing" cx="50%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#20232b" />
                  <stop offset="100%" stopColor="#050506" />
                </radialGradient>
              </defs>

              {/* Soft halo glow */}
              <circle cx="140" cy="94" r="78" fill="url(#lnHalo)" />

              {/* Wings — right group, then mirrored to the left */}
              {[0, 1].map((side) => (
                <g
                  key={side}
                  transform={side === 0 ? undefined : "translate(280,0) scale(-1,1)"}
                  fill={wingFill}
                  stroke={wingStroke}
                  strokeWidth="0.6"
                  opacity="0.96"
                >
                  <path d="M141 96 Q202 62 252 58 Q206 84 141 103 Z" />
                  <path d="M141 98 Q202 80 250 78 Q206 96 141 105 Z" opacity="0.9" />
                  <path d="M141 100 Q198 96 240 98 Q202 106 141 106 Z" opacity="0.82" />
                  <path d="M141 101 Q194 110 224 116 Q198 112 141 107 Z" opacity="0.74" />
                  <path d="M141 102 Q188 122 206 130 Q192 120 141 108 Z" opacity="0.66" />
                </g>
              ))}

              {/* Crown (win only) */}
              {win && (
                <g transform="translate(140,50)">
                  <path d="M-17 12 L-13 -3 L-6 4 L0 -9 L6 4 L13 -3 L17 12 Z" fill="#FFE9A8" stroke="#A9821E" strokeWidth="1" strokeLinejoin="round" />
                  <circle cx="-13" cy="-3" r="1.6" fill="#fff" />
                  <circle cx="0" cy="-9" r="2" fill="#fff" />
                  <circle cx="13" cy="-3" r="1.6" fill="#fff" />
                  <circle cx="0" cy="7" r="2.2" fill="#E24B4B" />
                </g>
              )}

              {/* Logo ring */}
              <circle cx="140" cy="98" r="45" fill="url(#lnRing)" />
              <circle cx="140" cy="98" r="45" fill="none" stroke={win ? "#F0C645" : "#C4CDDA"} strokeWidth="2" opacity="0.9" />
              <circle cx="140" cy="98" r="40" fill="none" stroke={win ? "rgba(240,198,69,0.35)" : "rgba(196,205,218,0.3)"} strokeWidth="0.8" />

              {/* Floating particles / confetti */}
              <g className="ln-particles">
                {(win
                  ? ["#FFE9A8", "#F0C645", "#C69A2B", "#FFF0C0", "#F0C645", "#FFE9A8"]
                  : ["#E86A6A", "#B01E1E", "#DCE3EC", "#E24B4B", "#8892A0", "#E86A6A"]
                ).map((c, i) => {
                  const pts = [
                    [46, 44], [232, 50], [34, 96], [244, 100], [60, 30], [222, 28],
                  ][i];
                  return i % 2 === 0 ? (
                    <rect key={i} x={pts[0]} y={pts[1]} width="5" height="2.6" rx="1" fill={c} transform={`rotate(${i * 25} ${pts[0]} ${pts[1]})`} />
                  ) : (
                    <circle key={i} cx={pts[0]} cy={pts[1]} r="2" fill={c} />
                  );
                })}
              </g>

              {/* Ribbon */}
              <g>
                <path d={win ? "M44 150 L22 156 L30 176 L52 172 Z" : "M44 150 L22 156 L30 176 L52 172 Z"} fill={win ? "#8E6B18" : "#5C1010"} />
                <path d="M236 150 L258 156 L250 176 L228 172 Z" fill={win ? "#8E6B18" : "#5C1010"} />
                <path d="M52 148 Q140 142 228 148 L228 174 Q140 180 52 174 Z" fill="url(#lnRibbon)" stroke={win ? "#FCE39A" : "#E86A6A"} strokeWidth="1" />
                <text x="140" y="166" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontWeight="800" fontSize="14" fill={win ? "#3a2a06" : "#ffffff"} letterSpacing="0.3">
                  {win ? "Congratulations!" : "Better Luck Next Time!"}
                </text>
              </g>
            </svg>

            <div className="ln-emblem-logo">
              <img
                src="/images/logo-ln.png"
                alt="Lucky Nova"
                style={{ filter: win ? "none" : "grayscale(0.85) brightness(1.15)" }}
              />
            </div>
          </div>

          {/* Subtitle */}
          <div className="ln-pop-sub">
            <span className="ln-pop-sub-line" />
            <span className="ln-pop-sub-text">{win ? "YOU WON" : "YOU LOST"}</span>
            <span className="ln-pop-sub-line" />
          </div>

          {/* Main result */}
          <div className="ln-pop-main">
            {win ? (
              <strong className="ln-pop-amount">₹{inr(animatedAmount)}</strong>
            ) : (
              <div className="ln-pop-quote">
                <p>Don&apos;t give up.</p>
                <p>Every round is another opportunity.</p>
              </div>
            )}
          </div>

          {/* Details card */}
          <div className="ln-pop-details">
            <span className="ln-pop-details-tag">{win ? "Winning Details" : "Game Details"}</span>
            <div className="ln-pop-row">
              <span className="ln-pop-label">Game</span>
              <strong className="ln-pop-value">{gameName}</strong>
            </div>
            <div className="ln-pop-row">
              <span className="ln-pop-label">Result</span>
              <div className="ln-pop-value ln-pop-result">{resultDetails || <span className="ln-pop-dash">—</span>}</div>
            </div>
            <div className="ln-pop-row">
              <span className="ln-pop-label">Period</span>
              <strong className="ln-pop-value ln-pop-period">{periodId}</strong>
            </div>
          </div>

          {/* Secondary card */}
          <div className="ln-pop-secondary">
            {win ? (
              <div className="ln-pop-balance">
                <div className="ln-pop-balance-left">
                  <svg viewBox="0 0 40 32" width="34" height="28" fill="none" aria-hidden>
                    <ellipse cx="12" cy="24" rx="8" ry="3.5" fill="#9E7A1E" />
                    <ellipse cx="12" cy="22" rx="8" ry="3.5" fill="#C69A2B" stroke="#F0C645" strokeWidth="0.5" />
                    <ellipse cx="12" cy="18" rx="8" ry="3.5" fill="#C69A2B" />
                    <ellipse cx="12" cy="16" rx="8" ry="3.5" fill="#F0C645" stroke="#FFF0C0" strokeWidth="0.5" />
                    <ellipse cx="28" cy="25" rx="8" ry="3.5" fill="#8A6D1C" />
                    <ellipse cx="28" cy="23" rx="8" ry="3.5" fill="#9E7A1E" stroke="#F0C645" strokeWidth="0.5" />
                    <ellipse cx="28" cy="19" rx="8" ry="3.5" fill="#C69A2B" />
                    <ellipse cx="28" cy="17" rx="8" ry="3.5" fill="#F0C645" stroke="#FFF0C0" strokeWidth="0.5" />
                    <ellipse cx="20" cy="20" rx="9" ry="4" fill="#8A6D1C" />
                    <ellipse cx="20" cy="14" rx="9" ry="4" fill="#C69A2B" />
                    <ellipse cx="20" cy="10" rx="9" ry="4" fill="#F0C645" stroke="#FFF0C0" strokeWidth="0.5" />
                    <ellipse cx="20" cy="7" rx="9" ry="4" fill="#FCE39A" stroke="#FFFFFF" strokeWidth="0.5" />
                  </svg>
                  <div className="ln-pop-balance-text">
                    <span>Your Balance</span>
                    <strong>₹{inr(animatedBalance)}</strong>
                  </div>
                </div>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#F0C645" strokeWidth="2.5" className="ln-pop-balance-arrow">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            ) : (
              <div className="ln-pop-motivation">
                <svg viewBox="0 0 32 32" width="32" height="32" fill="none" aria-hidden>
                  <circle cx="16" cy="16" r="14" fill="#fff" stroke="#B01E1E" strokeWidth="1.5" />
                  <circle cx="16" cy="16" r="10" fill="#E24B4B" />
                  <circle cx="16" cy="16" r="7" fill="#fff" />
                  <circle cx="16" cy="16" r="4" fill="#E24B4B" />
                  <circle cx="16" cy="16" r="1.5" fill="#fff" />
                  <path d="M16 16 L28 4" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
                  <polygon points="28 4 29 1 26 2" fill="#E24B4B" />
                  <polygon points="28 4 25 5 26 8" fill="#E24B4B" />
                </svg>
                <span className="ln-pop-motivation-text">Stay consistent. Big wins are near.</span>
              </div>
            )}
          </div>

          {/* Button */}
          <button type="button" className={`ln-pop-btn ${win ? "win" : "lose"}`} onClick={onClose}>
            {win ? "Awesome! Keep Winning" : "Try Again"}
          </button>

          {/* Auto-close countdown */}
          <div className="ln-pop-countdown">
            <svg viewBox="0 0 20 20" style={{ width: 15, height: 15, transform: "rotate(-90deg)" }}>
              <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
              <circle
                cx="10" cy="10" r="8" fill="none"
                stroke={win ? "#F0C645" : "#E24B4B"}
                strokeWidth="2"
                strokeDasharray="50.24"
                strokeDashoffset={String(50.24 - (50.24 * countdown) / autoCloseSeconds)}
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
            </svg>
            <span className="ln-pop-countdown-text">{countdown} seconds auto close</span>
          </div>

          {/* Footer */}
          <div className="ln-pop-footer">
            <img src="/images/logo-ln.png" alt="LN" />
            <span>LUCKY NOVA</span>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .ln-pop-overlay {
          position: fixed;
          inset: 0;
          background: rgba(6, 6, 8, 0.82);
          backdrop-filter: blur(9px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
          padding: 18px;
          animation: ln-fade 0.25s ease-out forwards;
        }
        @keyframes ln-fade { from { opacity: 0; } to { opacity: 1; } }

        .ln-pop-container { perspective: 1200px; width: 100%; max-width: 360px; }

        .ln-pop-card {
          position: relative;
          width: 100%;
          border-radius: 24px;
          padding: 2rem 1.5rem 1.4rem;
          box-sizing: border-box;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          color: var(--theme-text);
          font-family: var(--font-inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
          border: 1px solid;
          box-shadow: 0 26px 70px rgba(0, 0, 0, 0.7);
          animation: ln-pop-in 0.42s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        @keyframes ln-pop-in {
          from { transform: scale(0.86) translateY(24px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }
        .ln-pop-card.win {
          border-color: rgba(240, 198, 69, 0.32);
          background:
            radial-gradient(120% 80% at 50% 0%, rgba(240, 198, 69, 0.14) 0%, rgba(17, 17, 17, 0.98) 55%),
            #111111;
          box-shadow: 0 0 44px rgba(240, 198, 69, 0.16), 0 26px 70px rgba(0, 0, 0, 0.7);
        }
        .ln-pop-card.lose {
          border-color: rgba(200, 40, 40, 0.32);
          background:
            radial-gradient(120% 80% at 50% 0%, rgba(176, 30, 30, 0.16) 0%, rgba(17, 17, 17, 0.98) 55%),
            #100b0b;
          box-shadow: 0 0 44px rgba(176, 30, 30, 0.16), 0 26px 70px rgba(0, 0, 0, 0.7);
        }

        .ln-pop-close {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: rgba(255, 255, 255, 0.55);
          cursor: pointer;
          transition: all 0.2s;
          z-index: 5;
        }
        .ln-pop-close:hover { background: rgba(255, 255, 255, 0.12); color: var(--theme-text); }

        .ln-emblem { position: relative; width: 240px; height: 172px; margin: 0 auto; }
        .ln-emblem-svg { width: 240px; height: 172px; overflow: visible; display: block; }
        .ln-emblem-logo {
          position: absolute;
          left: 50%;
          top: 49%;
          width: 58px;
          height: 58px;
          transform: translate(-50%, -50%);
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          border-radius: 50%;
          overflow: hidden;
        }
        .ln-emblem-logo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
          mix-blend-mode: screen;
        }
        .ln-particles { animation: ln-float 3.2s ease-in-out infinite; transform-origin: center; }
        @keyframes ln-float {
          0%, 100% { transform: translateY(0); opacity: 0.9; }
          50% { transform: translateY(-3px); opacity: 1; }
        }

        .ln-pop-sub {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          width: 100%;
          margin: 0.55rem 0 0.35rem;
        }
        .ln-pop-sub-line { flex: 1; height: 1px; }
        .win .ln-pop-sub-line { background: linear-gradient(90deg, transparent, rgba(240, 198, 69, 0.5), transparent); }
        .lose .ln-pop-sub-line { background: linear-gradient(90deg, transparent, rgba(226, 75, 75, 0.45), transparent); }
        .ln-pop-sub-text {
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.22em;
          text-transform: uppercase;
        }
        .win .ln-pop-sub-text { color: #FFD54A; text-shadow: 0 0 10px rgba(240, 198, 69, 0.35); }
        .lose .ln-pop-sub-text { color: #F19A9A; text-shadow: 0 0 10px rgba(226, 75, 75, 0.3); }

        .ln-pop-main { min-height: 48px; display: flex; align-items: center; justify-content: center; margin-bottom: 1.15rem; }
        .ln-pop-amount {
          font-size: 3rem;
          font-weight: 900;
          line-height: 1;
          letter-spacing: -0.02em;
          background: linear-gradient(180deg, #FFFFFF 8%, #FFE9A8 45%, #F0C645 78%, #C69A2B 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          filter: drop-shadow(0 3px 10px rgba(240, 198, 69, 0.4));
          font-variant-numeric: tabular-nums;
          animation: ln-pulse 2.4s ease-in-out infinite;
        }
        @keyframes ln-pulse {
          0%, 100% { filter: drop-shadow(0 3px 10px rgba(240, 198, 69, 0.4)); }
          50% { filter: drop-shadow(0 3px 16px rgba(240, 198, 69, 0.62)); }
        }
        .ln-pop-quote { color: #CFCFCF; font-size: 0.92rem; line-height: 1.55; font-weight: 500; }
        .ln-pop-quote p { margin: 0; }

        .ln-pop-details {
          position: relative;
          width: 100%;
          border-radius: 16px;
          padding: 1.15rem 1rem 0.75rem;
          box-sizing: border-box;
          text-align: left;
          margin-bottom: 0.85rem;
          background: rgba(255, 255, 255, 0.025);
          border: 1px solid;
        }
        .win .ln-pop-details { border-color: rgba(240, 198, 69, 0.16); }
        .lose .ln-pop-details { border-color: rgba(226, 75, 75, 0.16); }
        .ln-pop-details-tag {
          position: absolute;
          top: -9px;
          left: 16px;
          padding: 0 9px;
          background: var(--theme-bg-card);
          font-size: 0.66rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .win .ln-pop-details-tag { color: #F0C645; background: var(--theme-bg-card); }
        .lose .ln-pop-details-tag { color: #F19A9A; background: var(--theme-bg-card); }

        .ln-pop-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.5rem 0;
          border-bottom: 1px dashed rgba(255, 255, 255, 0.06);
        }
        .ln-pop-row:last-child { border-bottom: none; }
        .ln-pop-label { font-size: 0.75rem; color: #9aa0aa; }
        .ln-pop-value { font-size: 0.78rem; color: var(--theme-text); font-weight: 700; }
        .ln-pop-result { display: flex; align-items: center; gap: 7px; }
        .ln-pop-dash { color: #6b7280; }
        .ln-pop-period { font-variant-numeric: tabular-nums; letter-spacing: 0.02em; color: #E6E8EC; }

        /* Rounded result chips (used by callers via resultDetails) */
        .ln-chip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.72rem;
          padding: 2px 9px;
          border-radius: 999px;
        }
        .ln-chip-num {
          width: 20px;
          height: 20px;
          padding: 0;
          border-radius: 50%;
          color: var(--theme-text);
          font-size: 0.68rem;
        }
        .ln-chip-num.green { background: var(--theme-bg-card); }
        .ln-chip-num.red { background: #E24B4B; }
        .ln-chip-num.violet { background: #A855F7; }
        .ln-chip-txt.green { color: #1EC78A; background: rgba(30, 199, 138, 0.12); }
        .ln-chip-txt.red { color: #E24B4B; background: rgba(226, 75, 75, 0.12); }
        .ln-chip-txt.violet { color: #C084FC; background: rgba(192, 132, 252, 0.12); }
        .ln-chip-size { color: #E6E8EC; background: rgba(255, 255, 255, 0.06); }

        .ln-pop-secondary { width: 100%; margin-bottom: 1.1rem; }
        .ln-pop-balance {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.65rem 0.85rem;
          border-radius: 14px;
          background: rgba(240, 198, 69, 0.05);
          border: 1px solid rgba(240, 198, 69, 0.16);
        }
        .ln-pop-balance-left { display: flex; align-items: center; gap: 11px; text-align: left; }
        .ln-pop-balance-text span {
          display: block;
          font-size: 0.66rem;
          color: rgba(240, 198, 69, 0.8);
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 0.04em;
        }
        .ln-pop-balance-text strong { display: block; font-size: 0.95rem; color: #FFE9A8; font-weight: 800; margin-top: 1px; font-variant-numeric: tabular-nums; }
        .ln-pop-balance-arrow { border: 1px solid rgba(240, 198, 69, 0.4); border-radius: 50%; padding: 3px; box-sizing: content-box; }

        .ln-pop-motivation {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0.65rem 0.85rem;
          border-radius: 14px;
          text-align: left;
          background: rgba(176, 30, 30, 0.06);
          border: 1px solid rgba(176, 30, 30, 0.18);
        }
        .ln-pop-motivation-text { font-size: 0.8rem; font-weight: 700; color: #F19A9A; letter-spacing: 0.01em; }

        .ln-pop-btn {
          width: 100%;
          padding: 0.9rem;
          border: none;
          border-radius: 16px;
          font-size: 0.98rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          margin-bottom: 0.85rem;
        }
        .ln-pop-btn.win {
          background: linear-gradient(180deg, #FFE9A8 0%, #FFD54A 45%, #C69A2B 100%);
          color: #2c1f05;
          box-shadow: 0 6px 18px rgba(240, 198, 69, 0.3);
        }
        .ln-pop-btn.win:hover { transform: translateY(-2px); box-shadow: 0 9px 24px rgba(240, 198, 69, 0.4); filter: brightness(1.04); }
        .ln-pop-btn.lose {
          background: linear-gradient(180deg, #E24B4B 0%, #B01E1E 55%, #7C1515 100%);
          color: var(--theme-text);
          box-shadow: 0 6px 18px rgba(176, 30, 30, 0.3);
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
        }
        .ln-pop-btn.lose:hover { transform: translateY(-2px); box-shadow: 0 9px 24px rgba(176, 30, 30, 0.4); filter: brightness(1.05); }
        .ln-pop-btn:active { transform: translateY(0); }

        .ln-pop-countdown { display: inline-flex; align-items: center; justify-content: center; gap: 7px; margin-bottom: 0.9rem; }
        .ln-pop-countdown-text { font-size: 0.68rem; color: #7a828e; font-weight: 600; }

        .ln-pop-footer { display: flex; align-items: center; justify-content: center; gap: 6px; opacity: 0.55; }
        .ln-pop-footer img { width: 22px; height: 22px; object-fit: contain; }
        .ln-pop-footer span {
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          color: rgba(255, 255, 255, 0.75);
        }
      `}</style>
    </div>
  );
}
