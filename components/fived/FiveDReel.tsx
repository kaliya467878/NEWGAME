"use client";
 
import React, { useState, useEffect, useRef } from "react";
import clsx from "clsx";
 
interface FiveDReelProps {
  index: number;
  value: number;
  rolling: boolean;
  active: boolean;
}
 
export function FiveDReel({ index, value, rolling, active }: FiveDReelProps) {
  // We repeat 0-9 multiple times to support long continuous speedometer scrolling
  const digits = [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, // Loop 1 (0-9)
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, // Loop 2 (10-19)
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, // Loop 3 (20-29)
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9  // Loop 4 (30-39)
  ];
 
  const [localRolling, setLocalRolling] = useState(rolling);
  const [localValue, setLocalValue] = useState(value);
  const [useTransition, setUseTransition] = useState(true);
  const [currentY, setCurrentY] = useState(`calc(-${value} * var(--reel-item-height))`);
  
  const wasRollingRef = useRef(false);
 
  useEffect(() => {
    if (rolling) {
      setLocalRolling(true);
      wasRollingRef.current = true;
    } else {
      if (wasRollingRef.current) {
        // Stagger the stopping of the reels from left to right (300ms delay per reel)
        const stopDelay = index * 300;
        const timer = setTimeout(() => {
          // 1. Instantly stop infinite roll and snap to the starting position (old value)
          setLocalRolling(false);
          setUseTransition(false);
          setCurrentY(`calc(-${localValue} * var(--reel-item-height))`);
 
          // 2. Wait 50ms to ensure the browser has registered the start offset, then trigger the transition
          setTimeout(() => {
            setUseTransition(true);
            // Translate by value + 20 (2 full cycles + target value) for a long scrolling odometer deceleration
            setCurrentY(`calc(-${value + 20} * var(--reel-item-height))`);
            
            // 3. After the 2.0s transition completes, instantly snap back to base value (seamless loop wrap-around)
            setTimeout(() => {
              setUseTransition(false);
              setCurrentY(`calc(-${value} * var(--reel-item-height))`);
              setLocalValue(value);
              wasRollingRef.current = false;
            }, 2000); // Matches transition duration
            
          }, 50);
        }, stopDelay);
        return () => clearTimeout(timer);
      } else {
        // Mount or static update
        setLocalRolling(false);
        setUseTransition(true);
        setCurrentY(`calc(-${value} * var(--reel-item-height))`);
        setLocalValue(value);
      }
    }
  }, [rolling, value, index, localValue]);
 
  return (
    <div className="k5-reel-container">
      {/* Curved drum overlays */}
      <div className="k5-reel-overlay-top"></div>
      <div className="k5-reel-overlay-bottom"></div>
 
      <div
        className={clsx("k5-reel-strip", localRolling && "k5-reel-strip--rolling")}
        style={localRolling ? undefined : { 
          transform: `translateY(${currentY})`,
          transition: useTransition ? "transform 2.0s cubic-bezier(0.15, 0.85, 0.3, 1)" : "none"
        }}
      >
        {digits.map((digit, idx) => (
          <div key={idx} className="k5-reel-item">
            <div
              className={clsx(
                "k5-reel-circle",
                active ? "k5-reel-circle--active" : "k5-reel-circle--inactive"
              )}
            >
              {digit}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
