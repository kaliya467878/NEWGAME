"use client";

import { useEffect, useRef, useState } from "react";

// Clean 2D vector K3 die — glossy red rounded square, bright yellow pips, a
// slight isometric tilt, soft grounded shadow, idle float, and a face-cycling
// roll (spins + flips through faces, then pops onto the final value). No WebGL,
// no 3D cube — pure CSS, mobile-friendly.

const PIPS = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8] };

const clamp = (v) => Math.min(6, Math.max(1, Math.round(Number(v)) || 1));

export default function Dice2D({ value = 1, rolling = false, index = 0 }) {
  // `rollFace` only drives the rapid face-flip while rolling; when idle we just
  // render the real `value` (derived), so no state has to be synced in an effect.
  const [rollFace, setRollFace] = useState(1);
  const [popping, setPopping] = useState(false);
  const prevRolling = useRef(rolling);

  useEffect(() => {
    if (!rolling) return undefined;
    const id = setInterval(() => setRollFace(1 + Math.floor(Math.random() * 6)), 85);
    return () => clearInterval(id);
  }, [rolling]);

  // One-shot bounce the instant a roll finishes.
  useEffect(() => {
    let t;
    if (prevRolling.current && !rolling) {
      setPopping(true);
      t = setTimeout(() => setPopping(false), 450);
    }
    prevRolling.current = rolling;
    return () => clearTimeout(t);
  }, [rolling]);

  const face = rolling ? rollFace : clamp(value);
  const pips = PIPS[face] || [];

  return (
    <div className="k3d2-slot">
      <span className="k3d2-shadow" />
      <div className="k3d2-float" style={{ "--i": index }}>
        <div className={`k3d2-die ${rolling ? "rolling" : ""} ${popping ? "pop" : ""}`}>
          <img src={`/k3/images/${face}.png`} alt={`Dice ${face}`} className="w-16 h-16 object-contain drop-shadow-md" />
        </div>
      </div>
    </div>
  );
}
