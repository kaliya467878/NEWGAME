"use client";

// Real 3D CSS-cube dice for K3. Faces are laid out so opposite sides sum to 7
// (1/6, 2/5, 3/4); the whole cube is rotated so the rolled value ends face-front.

const PIPS = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8] };

const ADJACENT_FACES = {
  1: { front: 3, right: 2 },
  2: { front: 1, right: 3 },
  3: { front: 2, right: 6 },
  4: { front: 6, right: 2 },
  5: { front: 1, right: 4 },
  6: { front: 5, right: 3 } };

function Face({ value, variant }) {
  const pips = PIPS[value] || [];
  const isYellow = value === 1 || value === 4 || value === 5;
  return (
    <div className={`k3d-face k3d-face--${variant}`}>
      {Array.from({ length: 9 }).map((_, i) => (
        <span key={i} className={pips.includes(i) ? `k3d-pip ${isYellow ? "k3d-pip--yellow" : "k3d-pip--white"}` : "k3d-pip-empty"} />
      ))}
    </div>
  );
}

export default function Dice3D({ value = 1, rolling = false, index = 0 }) {
  const v = Math.min(6, Math.max(1, Math.round(Number(value)) || 1));

  // When rolling, use static layout so the spinning animation is solid.
  // When resting, map the rolled value dynamically to the top face and its
  // physical neighbors to the visible front/right faces to guarantee a solid,
  // perfect isometric 3D cube projection.
  const faces = rolling
    ? { top: 2, bottom: 5, front: 1, back: 6, right: 3, left: 4 }
    : {
        top: v,
        bottom: 7 - v,
        front: ADJACENT_FACES[v].front,
        back: 7 - ADJACENT_FACES[v].front,
        right: ADJACENT_FACES[v].right,
        left: 7 - ADJACENT_FACES[v].right };

  return (
    <div className="k3d-scene" aria-label={`Dice showing ${v}`} role="img">
      <div
        className={`k3d-die ${rolling ? "k3d-die--rolling" : ""}`}
        style={
          rolling
            ? { animationDelay: `${index * -0.13}s` }
            : { transform: "rotateX(-35deg) rotateY(-45deg)" }
        }
      >
        <Face value={faces.front} variant="front" />
        <Face value={faces.back} variant="back" />
        <Face value={faces.right} variant="right" />
        <Face value={faces.left} variant="left" />
        <Face value={faces.top} variant="top" />
        <Face value={faces.bottom} variant="bottom" />
      </div>
    </div>
  );
}
