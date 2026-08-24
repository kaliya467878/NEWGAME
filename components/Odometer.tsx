"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";
import clsx from "clsx";

export function Odometer({
  value,
  className,
  decimals = 0,
  prefix = "₹",
}: {
  value: number;
  className?: string;
  /** Number of fraction digits to animate/display (e.g. 2 for wallet paise). */
  decimals?: number;
  /** Currency/label prefix; pass "" to omit. */
  prefix?: string;
}) {
  const [display, setDisplay] = useState(value);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const previous = useRef(value);

  useEffect(() => {
    if (previous.current === value) return;
    const direction = value > previous.current ? "up" : "down";
    setFlash(direction);
    let flashTimeout: ReturnType<typeof setTimeout>;
    const factor = Math.pow(10, decimals);
    const controls = animate(previous.current, value, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.round(v * factor) / factor),
      onComplete: () => {
        flashTimeout = setTimeout(() => setFlash(null), 350);
      },
    });
    previous.current = value;
    return () => {
      controls.stop();
      clearTimeout(flashTimeout);
    };
  }, [value, decimals]);

  return (
    <span
      className={clsx(
        "inline-block tabular-nums transition-[transform,filter] duration-300 ease-out",
        flash === "up" && "scale-[1.06] drop-shadow-[0_0_8px_rgba(30,199,138,0.55)] text-green",
        flash === "down" && "scale-[1.06] drop-shadow-[0_0_8px_rgba(239,69,96,0.55)] text-red",
        className
      )}
    >
      {prefix}
      {display.toLocaleString("en-IN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
    </span>
  );
}
