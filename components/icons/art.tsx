/**
 * Gradient SVG art icons — self-contained (no image assets), styled to read
 * as glossy "casino app" artwork. All take a `size` in px and render square.
 */

type ArtProps = { size?: number; className?: string };

function Svg({ size = 48, className, children }: ArtProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/* ---------- shared gradient defs (fixed ids; duplicates are identical) ---------- */

function Defs() {
  return (
    <defs>
      <linearGradient id="g-red" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
        <stop stopColor="#ff5c7a" />
        <stop offset="1" stopColor="#d81b3f" />
      </linearGradient>
      <linearGradient id="g-orange" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
        <stop stopColor="#ffd166" />
        <stop offset="1" stopColor="#ff7a45" />
      </linearGradient>
      <linearGradient id="g-gold" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
        <stop stopColor="#ffe9a3" />
        <stop offset="1" stopColor="#f0a824" />
      </linearGradient>
      <linearGradient id="g-violet" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
        <stop stopColor="#b78cff" />
        <stop offset="1" stopColor="#6d3ae0" />
      </linearGradient>
      <linearGradient id="g-blue" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6fc4ff" />
        <stop offset="1" stopColor="#2563eb" />
      </linearGradient>
      <linearGradient id="g-cyan" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
        <stop stopColor="#8ff5e8" />
        <stop offset="1" stopColor="#0ea5b7" />
      </linearGradient>
      <linearGradient id="g-green" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
        <stop stopColor="#5eead4" />
        <stop offset="1" stopColor="#0f9d6e" />
      </linearGradient>
      <linearGradient id="g-white" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
        <stop stopColor="#ffffff" />
        <stop offset="1" stopColor="#cfd4e6" />
      </linearGradient>
    </defs>
  );
}

/* ---------------------------------- games ---------------------------------- */

/** Two overlapping lottery balls (WinGo). */
export function WingoArt(props: ArtProps) {
  return (
    <Svg {...props}>
      <Defs />
      <circle cx="25" cy="27" r="19" fill="url(#g-red)" />
      <ellipse cx="19" cy="19" rx="8" ry="6" fill="#fff" opacity="0.35" />
      <circle cx="25" cy="27" r="9.5" fill="#fff" />
      <text x="25" y="32" textAnchor="middle" fontSize="14" fontWeight="800" fill="#c01236" fontFamily="sans-serif">1</text>
      <circle cx="45" cy="43" r="15" fill="url(#g-violet)" />
      <ellipse cx="40" cy="37" rx="6" ry="4.5" fill="#fff" opacity="0.35" />
      <circle cx="45" cy="43" r="7.5" fill="#fff" />
      <text x="45" y="47.5" textAnchor="middle" fontSize="11" fontWeight="800" fill="#5b21b6" fontFamily="sans-serif">8</text>
    </Svg>
  );
}

/** Three stacked dice (K3). */
export function K3Art(props: ArtProps) {
  return (
    <Svg {...props}>
      <Defs />
      <rect x="8" y="26" width="24" height="24" rx="6" fill="url(#g-red)" transform="rotate(-8 8 26)" />
      <circle cx="15" cy="34" r="2.4" fill="#fff" transform="rotate(-8 8 26)" />
      <circle cx="25" cy="42" r="2.4" fill="#fff" transform="rotate(-8 8 26)" />
      <rect x="32" y="28" width="24" height="24" rx="6" fill="url(#g-white)" transform="rotate(7 32 28)" />
      <circle cx="40" cy="36" r="2.4" fill="#d81b3f" transform="rotate(7 32 28)" />
      <circle cx="47" cy="43" r="2.4" fill="#d81b3f" transform="rotate(7 32 28)" />
      <circle cx="40" cy="43" r="2.4" fill="#d81b3f" transform="rotate(7 32 28)" />
      <circle cx="47" cy="36" r="2.4" fill="#d81b3f" transform="rotate(7 32 28)" />
      <rect x="20" y="8" width="22" height="22" rx="6" fill="url(#g-violet)" />
      <circle cx="31" cy="19" r="2.6" fill="#fff" />
    </Svg>
  );
}

/** Five digit balls (5D). */
export function FiveDArt(props: ArtProps) {
  const balls = [
    { x: 14, y: 18, g: "url(#g-red)", d: "3" },
    { x: 34, y: 13, g: "url(#g-gold)", d: "7" },
    { x: 52, y: 20, g: "url(#g-violet)", d: "1" },
    { x: 22, y: 42, g: "url(#g-blue)", d: "9" },
    { x: 44, y: 44, g: "url(#g-green)", d: "5" },
  ];
  return (
    <Svg {...props}>
      <Defs />
      {balls.map((b) => (
        <g key={b.d}>
          <circle cx={b.x} cy={b.y} r="11" fill={b.g} />
          <ellipse cx={b.x - 3.5} cy={b.y - 4.5} rx="4" ry="3" fill="#fff" opacity="0.4" />
          <text x={b.x} y={b.y + 4} textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff" fontFamily="sans-serif">
            {b.d}
          </text>
        </g>
      ))}
    </Svg>
  );
}

/** Rocket with flame (Crash). */
export function CrashArt(props: ArtProps) {
  return (
    <Svg {...props}>
      <Defs />
      <path d="M20 50 C14 54 12 60 12 60 C12 60 18 58 22 52 Z" fill="url(#g-orange)" />
      <path d="M25 47 C20 56 10 58 10 58 C10 58 14 46 21 43 Z" fill="url(#g-red)" opacity="0.85" />
      <path
        d="M32 8 C44 14 50 28 46 42 L36 46 L26 40 C22 26 24 14 32 8 Z"
        fill="url(#g-red)"
      />
      <path d="M46 42 L52 52 L42 49 Z" fill="url(#g-violet)" />
      <path d="M27 39 L21 47 L30 47 Z" fill="url(#g-violet)" />
      <circle cx="35" cy="24" r="6.5" fill="url(#g-blue)" stroke="#fff" strokeWidth="2" />
      <ellipse cx="30" cy="14" rx="4" ry="7" fill="#fff" opacity="0.3" transform="rotate(20 30 14)" />
    </Svg>
  );
}

/** Faceted gem (Mines). */
export function MinesArt(props: ArtProps) {
  return (
    <Svg {...props}>
      <Defs />
      <path d="M18 14 L46 14 L56 28 L32 56 L8 28 Z" fill="url(#g-cyan)" />
      <path d="M18 14 L32 28 L8 28 Z" fill="#fff" opacity="0.25" />
      <path d="M46 14 L56 28 L32 28 Z" fill="#0b7285" opacity="0.35" />
      <path d="M32 28 L32 56 L8 28 Z" fill="#0b7285" opacity="0.25" />
      <path d="M18 14 L46 14 L32 28 Z" fill="#fff" opacity="0.45" />
      <circle cx="22" cy="20" r="2" fill="#fff" opacity="0.9" />
      <path d="M50 46 l1.8 4.2 L56 52 l-4.2 1.8 L50 58 l-1.8-4.2 L44 52 l4.2-1.8 Z" fill="url(#g-gold)" />
    </Svg>
  );
}

/** Single big die (Dice). */
export function DiceArt(props: ArtProps) {
  return (
    <Svg {...props}>
      <Defs />
      <rect x="10" y="10" width="44" height="44" rx="10" fill="url(#g-red)" transform="rotate(-6 10 10)" />
      <ellipse cx="22" cy="18" rx="10" ry="6" fill="#fff" opacity="0.25" transform="rotate(-6 10 10)" />
      {[
        [22, 22],
        [40, 22],
        [31, 31],
        [22, 40],
        [40, 40],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.6" fill="#fff" transform="rotate(-6 10 10)" />
      ))}
    </Svg>
  );
}

/** Roulette-style wheel (Lucky Wheel). */
export function WheelArt(props: ArtProps) {
  const segs = Array.from({ length: 8 }, (_, i) => i);
  return (
    <Svg {...props}>
      <Defs />
      <circle cx="32" cy="32" r="26" fill="url(#g-gold)" />
      {segs.map((i) => {
        const a0 = (i * Math.PI) / 4;
        const a1 = ((i + 1) * Math.PI) / 4;
        const x0 = 32 + 22 * Math.cos(a0);
        const y0 = 32 + 22 * Math.sin(a0);
        const x1 = 32 + 22 * Math.cos(a1);
        const y1 = 32 + 22 * Math.sin(a1);
        return (
          <path
            key={i}
            d={`M32 32 L${x0} ${y0} A22 22 0 0 1 ${x1} ${y1} Z`}
            fill={i % 2 === 0 ? "url(#g-red)" : "#2a1220"}
          />
        );
      })}
      <circle cx="32" cy="32" r="8" fill="url(#g-gold)" stroke="#fff" strokeWidth="2" />
      <path d="M32 2 L36 12 L28 12 Z" fill="url(#g-gold)" />
    </Svg>
  );
}

/* -------------------------------- categories -------------------------------- */

export function GamepadArt(props: ArtProps) {
  return (
    <Svg {...props}>
      <Defs />
      <path
        d="M18 20 h28 c8 0 14 8 14 16 c0 8 -5 12 -10 12 c-6 0 -8 -7 -14 -7 h-8 c-6 0 -8 7 -14 7 c-5 0 -10 -4 -10 -12 c0 -8 6 -16 14 -16 Z"
        fill="url(#g-violet)"
      />
      <rect x="16" y="28" width="12" height="4" rx="2" fill="#fff" />
      <rect x="20" y="24" width="4" height="12" rx="2" fill="#fff" />
      <circle cx="44" cy="27" r="3" fill="url(#g-gold)" />
      <circle cx="50" cy="33" r="3" fill="url(#g-red)" />
      <ellipse cx="26" cy="22" rx="10" ry="3" fill="#fff" opacity="0.25" />
    </Svg>
  );
}

export function StarArt(props: ArtProps) {
  return (
    <Svg {...props}>
      <Defs />
      <path
        d="M32 6 L39.8 22.9 L58 25.2 L44.6 37.8 L48.2 56 L32 46.9 L15.8 56 L19.4 37.8 L6 25.2 L24.2 22.9 Z"
        fill="url(#g-gold)"
      />
      <path d="M32 6 L39.8 22.9 L58 25.2 L44.6 37.8 L32 32 Z" fill="#fff" opacity="0.22" />
    </Svg>
  );
}

export function LotteryArt(props: ArtProps) {
  return (
    <Svg {...props}>
      <Defs />
      <circle cx="32" cy="32" r="24" fill="url(#g-violet)" />
      <ellipse cx="24" cy="22" rx="9" ry="6.5" fill="#fff" opacity="0.35" />
      <circle cx="32" cy="32" r="12" fill="#fff" />
      <text x="32" y="38" textAnchor="middle" fontSize="17" fontWeight="800" fill="#5b21b6" fontFamily="sans-serif">7</text>
    </Svg>
  );
}

export function CardsArt(props: ArtProps) {
  return (
    <Svg {...props}>
      <Defs />
      <rect x="10" y="14" width="26" height="38" rx="4" fill="url(#g-white)" transform="rotate(-12 10 14)" />
      <rect x="26" y="12" width="26" height="38" rx="4" fill="#fff" stroke="#e3e6f0" transform="rotate(8 26 12)" />
      <text x="38" y="30" textAnchor="middle" fontSize="13" fontWeight="800" fill="#d81b3f" fontFamily="sans-serif" transform="rotate(8 26 12)">A</text>
      <path d="M38 34 c-3 -4 -8 0 -3 4 l3 3 l3 -3 c5 -4 0 -8 -3 -4 Z" fill="#d81b3f" transform="rotate(8 26 12)" />
    </Svg>
  );
}

/* ------------------------------- quick actions ------------------------------- */

export function PeopleArt(props: ArtProps) {
  return (
    <Svg {...props}>
      <Defs />
      <circle cx="24" cy="22" r="9" fill="url(#g-red)" />
      <path d="M8 50 c0 -10 7 -16 16 -16 c9 0 16 6 16 16 v4 H8 Z" fill="url(#g-red)" />
      <circle cx="44" cy="24" r="7" fill="url(#g-violet)" />
      <path d="M34 52 c0 -8 4 -13 10 -13 c6 0 12 5 12 13 v2 H34 Z" fill="url(#g-violet)" />
    </Svg>
  );
}

export function GiftArt(props: ArtProps) {
  return (
    <Svg {...props}>
      <Defs />
      <rect x="10" y="26" width="44" height="30" rx="4" fill="url(#g-red)" />
      <rect x="8" y="18" width="48" height="12" rx="3" fill="url(#g-orange)" />
      <rect x="28" y="18" width="8" height="38" fill="url(#g-gold)" />
      <path d="M32 18 c-8 -12 -20 -6 -14 0 Z" fill="url(#g-gold)" />
      <path d="M32 18 c8 -12 20 -6 14 0 Z" fill="url(#g-gold)" />
      <ellipse cx="20" cy="32" rx="6" ry="2.5" fill="#fff" opacity="0.2" />
    </Svg>
  );
}

export function WalletArt(props: ArtProps) {
  return (
    <Svg {...props}>
      <Defs />
      <rect x="8" y="16" width="48" height="34" rx="7" fill="url(#g-violet)" />
      <rect x="8" y="22" width="48" height="6" fill="#2a1240" opacity="0.5" />
      <rect x="38" y="30" width="18" height="12" rx="4" fill="url(#g-gold)" />
      <circle cx="47" cy="36" r="2.5" fill="#7c3aed" />
      <ellipse cx="20" cy="20" rx="9" ry="2.5" fill="#fff" opacity="0.25" />
    </Svg>
  );
}

export function PercentArt(props: ArtProps) {
  return (
    <Svg {...props}>
      <Defs />
      <rect x="8" y="8" width="48" height="48" rx="12" fill="url(#g-violet)" />
      <line x1="20" y1="44" x2="44" y2="20" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      <circle cx="21" cy="22" r="6" fill="url(#g-gold)" />
      <circle cx="43" cy="42" r="6" fill="url(#g-red)" />
    </Svg>
  );
}

export function CrownArt(props: ArtProps) {
  return (
    <Svg {...props}>
      <Defs />
      <path d="M10 46 L8 20 L20 30 L32 14 L44 30 L56 20 L54 46 Z" fill="url(#g-gold)" />
      <rect x="10" y="46" width="44" height="7" rx="2.5" fill="url(#g-orange)" />
      <circle cx="32" cy="14" r="3.5" fill="url(#g-red)" />
      <circle cx="8" cy="20" r="3" fill="url(#g-violet)" />
      <circle cx="56" cy="20" r="3" fill="url(#g-violet)" />
      <circle cx="24" cy="38" r="2.5" fill="#d81b3f" />
      <circle cx="40" cy="38" r="2.5" fill="#7c3aed" />
    </Svg>
  );
}

export function CoinArt(props: ArtProps) {
  return (
    <Svg {...props}>
      <Defs />
      <circle cx="32" cy="32" r="24" fill="url(#g-gold)" />
      <circle cx="32" cy="32" r="17" fill="none" stroke="#b97b0e" strokeWidth="2.5" opacity="0.6" />
      <text x="32" y="41" textAnchor="middle" fontSize="26" fontWeight="800" fill="#9a6206" fontFamily="sans-serif">Ω</text>
      <ellipse cx="23" cy="20" rx="8" ry="4.5" fill="#fff" opacity="0.4" />
    </Svg>
  );
}

/* --------------------------------- hero art --------------------------------- */

/** Open treasure chest spilling coins (welcome-bonus hero). */
export function ChestArt(props: ArtProps) {
  return (
    <Svg {...props}>
      <Defs />
      <ellipse cx="32" cy="55" rx="26" ry="5" fill="#000" opacity="0.35" />
      <path d="M10 30 h44 v20 a4 4 0 0 1 -4 4 H14 a4 4 0 0 1 -4 -4 Z" fill="url(#g-red)" />
      <path d="M10 30 h44 l-3 -12 a6 6 0 0 0 -6 -4 H19 a6 6 0 0 0 -6 4 Z" fill="url(#g-violet)" />
      <rect x="27" y="28" width="10" height="12" rx="2" fill="url(#g-gold)" />
      <circle cx="32" cy="34" r="2" fill="#9a6206" />
      {[
        [18, 26],
        [26, 23],
        [38, 22],
        [46, 26],
        [32, 20],
      ].map(([cx, cy]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r="4.5" fill="url(#g-gold)" />
          <circle cx={cx} cy={cy} r="2.8" fill="none" stroke="#b97b0e" strokeWidth="1" opacity="0.6" />
        </g>
      ))}
      <path d="M52 12 l1.4 3.2 L56.6 16.6 l-3.2 1.4 L52 21.2 l-1.4 -3.2 L47.4 16.6 l3.2 -1.4 Z" fill="#fff" opacity="0.9" />
      <path d="M12 8 l1 2.4 L15.4 11.4 l-2.4 1 L12 14.8 l-1 -2.4 L8.6 11.4 l2.4 -1 Z" fill="#fff" opacity="0.7" />
    </Svg>
  );
}
