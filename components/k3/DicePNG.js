"use client";
import { useState, useEffect } from "react";

export default function DicePNG({ value = 1, rolling = false }) {
  const [currentFace, setCurrentFace] = useState(value);

  useEffect(() => {
    let id;
    if (rolling) {
      id = setInterval(() => {
        setCurrentFace(Math.floor(Math.random() * 6) + 1);
      }, 50); // Fast flashing effect like original Tiranga
    } else {
      setCurrentFace(value);
    }
    return () => clearInterval(id);
  }, [rolling, value]);

  return (
    <div className="slot-column">
      <div className="slot-transform">
        <div className={`slot-num bg${currentFace}`}></div>
      </div>
    </div>
  );
}
