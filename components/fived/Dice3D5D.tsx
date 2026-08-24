"use client";

import React from "react";

function NumberFace({ digit, variant }: { digit: number; variant: string }) {
  return (
    <div className={`k3d-face k5d-face k3d-face--${variant}`}>
      <span className="text-lg sm:text-xl font-extrabold text-[#ffe600] drop-shadow-md select-none">
        {digit}
      </span>
    </div>
  );
}

export function Dice3D5D({ value, rolling }: { value: number; rolling: boolean }) {
  const v = Math.min(9, Math.max(0, Math.round(Number(value)) || 0));

  // When rolling, use a solid default layout.
  // When resting, map the value to top and adjacent numbers dynamically on a stable transform.
  const faces = rolling
    ? { top: 0, bottom: 5, front: 1, back: 4, right: 2, left: 3 }
    : {
        top: v,
        bottom: (v + 5) % 10,
        front: (v + 1) % 10,
        back: (v + 4) % 10,
        right: (v + 2) % 10,
        left: (v + 3) % 10,
      };

  return (
    <div className="k3d-scene">
      <div
        className={`k3d-die ${rolling ? "k3d-die--rolling" : ""}`}
        style={rolling ? undefined : { transform: "rotateX(-35deg) rotateY(-45deg)" }}
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

function Face({ value, variant }: { value: number; variant: string }) {
  return (
    <div className={`k3d-face k5d-face k3d-face--${variant}`}>
      <span className="text-lg sm:text-xl font-extrabold text-[#ffe600] drop-shadow-md select-none">
        {value}
      </span>
    </div>
  );
}
