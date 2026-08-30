"use client";

import React, { useState, useEffect, useRef } from "react";
import clsx from "clsx";

interface FiveDReelProps {
  index: number;
  value: number;
  rolling: boolean;
  active: boolean;
}

const INITIAL_DIGITS = [
  [1, 2, 0], // transform0
  [1, 0, 0], // transform1
  [4, 5, 0], // transform2
  [6, 7, 0], // transform3
  [0, 1, 0], // transform4
];

const STATIC_SUFFIX = [
  1, 2, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9
];

export function FiveDReel({ index, value, rolling, active }: FiveDReelProps) {
  const [digit0, setDigit0] = useState(() => INITIAL_DIGITS[index][0]);
  const [digit1, setDigit1] = useState(() => INITIAL_DIGITS[index][1]);
  const [digit2, setDigit2] = useState(() => value); // The centered index 2 element
  const [isScroll, setIsScroll] = useState(false);
  const isFirstMount = useRef(true);

  useEffect(() => {
    // Avoid animating on first mount/initial load
    if (isFirstMount.current) {
      isFirstMount.current = false;
      setDigit2(value);
      return;
    }

    if (rolling) {
      setIsScroll(true);
    } else {
      // Staggered stop delays: index 0 stops immediately, transform1 to 4 stop 300ms later (smooth stagger)
      const stopDelay = index === 0 ? 0 : 300;
      const timer = setTimeout(() => {
        // Set randomized filler digits above the target outcome digit
        const random0 = Math.floor(Math.random() * 10);
        const random1 = Math.floor(Math.random() * 10);
        setDigit0(random0);
        setDigit1(random1);
        setDigit2(value); // Set centered target outcome digit
        setIsScroll(false);
      }, stopDelay);
      return () => clearTimeout(timer);
    }
  }, [rolling, value, index]);

  // Sync static updates when not rolling
  useEffect(() => {
    if (!rolling) {
      setDigit2(value);
    }
  }, [value, rolling]);

  return (
    <div className="slot-column">
      <div className={clsx("slot-transform", `transform${index}`, isScroll && "slot-scroll")}>
        <div className="slot-num">{digit0}</div>
        <div className="slot-num">{digit1}</div>
        <div className="slot-num">{digit2}</div>
        {STATIC_SUFFIX.map((digit, idx) => (
          <div key={idx} className="slot-num">
            {digit}
          </div>
        ))}
      </div>
    </div>
  );
}
