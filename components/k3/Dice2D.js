"use client";

import { useEffect, useState } from "react";

export default function Dice2D({ value = 1, rolling = false, index = 0 }) {
  const [currentFace, setCurrentFace] = useState(value);

  useEffect(() => {
    let id;
    if (rolling) {
      id = setInterval(() => {
        setCurrentFace(Math.floor(Math.random() * 6) + 1);
      }, 50); // Exactly Tiranga's 50ms sleep
    } else {
      setCurrentFace(value);
    }
    return () => clearInterval(id);
  }, [rolling, value]);

  return (
    <div className="flex items-center justify-center h-full w-full">
      <div 
        className="slot-num" 
        style={{
          width: '100%',
          height: '100%',
          backgroundImage: `url(/k3/images/${currentFace}.png)`,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          transition: 'none'
        }} 
      />
    </div>
  );
}
