"use client";
import { useState, useEffect } from "react";
import Image from "next/image";

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

  // Use the exact PNGs from Tiranga source
  return (
    <div className="dice-png-container">
      <Image 
        src={`/k3-dice/${currentFace}.png`} 
        alt={`Die ${currentFace}`} 
        width={72} 
        height={72} 
        className="dice-png-img"
        priority
      />
    </div>
  );
}
