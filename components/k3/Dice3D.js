
"use client";
const PIPS = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8]
};

const ADJACENT_FACES = {
  1: { front: 3, right: 2 },
  2: { front: 1, right: 3 },
  3: { front: 2, right: 6 },
  4: { front: 6, right: 2 },
  5: { front: 1, right: 4 },
  6: { front: 5, right: 3 }
};

function Face({ value, variant }) {
  const pips = PIPS[value] || [];
  return (
    <div className={`k3d-face k3d-face--${variant}`}>
      {Array.from({ length: 9 }).map((_, i) => (
        <span key={i} className={pips.includes(i) ? "k3d-pip k3d-pip-black" : "k3d-pip-empty"} />
      ))}
    </div>
  );
}

export default function Dice3D({ value = 1, rolling = false, index = 0 }) {
  const tiltX = -15;
  const tiltY = -25;
  const baseTransform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
  const rotFor = {
    1: `rotateX(0deg) rotateY(0deg)`,
    6: `rotateX(180deg) rotateY(0deg)`,
    2: `rotateX(90deg) rotateY(0deg)`,
    5: `rotateX(-90deg) rotateY(0deg)`,
    3: `rotateX(0deg) rotateY(-90deg)`,
    4: `rotateX(0deg) rotateY(90deg)`
  };
  const rollClass = rolling ? "k3d-die--rolling" : "";
  const finalTransform = `${baseTransform} ${rotFor[value] || rotFor[1]}`;

  return (
    <div className="k3d-scene">
      <div 
        className={`k3d-die ${rollClass}`}
        style={!rolling ? { transform: finalTransform } : undefined}
      >
        <Face variant="front" value={1} />
        <Face variant="back" value={6} />
        <Face variant="right" value={3} />
        <Face variant="left" value={4} />
        <Face variant="top" value={2} />
        <Face variant="bottom" value={5} />
      </div>
    </div>
  );
}
