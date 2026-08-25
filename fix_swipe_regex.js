const fs = require('fs');

let path = 'components/home/GameGrid.js';
if (fs.existsSync(path)) {
  let code = fs.readFileSync(path, 'utf8');

  // Fix imports
  if (!code.includes('import { useRef, useState, useEffect }')) {
    code = code.replace('import { useRef, useState } from "react";', 'import { useRef, useState, useEffect } from "react";');
  }

  // 1. Add hook inside HomeGameSection
  const funcStart = 'function HomeGameSection({ catKey, label, games, onComingSoon }) {';
  const hookCode = `
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || games.length <= 3) return;
    
    let isTouching = false;
    let touchTimeout;
    
    const handleTouch = () => {
      isTouching = true;
      clearTimeout(touchTimeout);
      touchTimeout = setTimeout(() => isTouching = false, 3000);
    };
    
    el.addEventListener('touchstart', handleTouch, {passive: true});
    el.addEventListener('wheel', handleTouch, {passive: true});
    
    const interval = setInterval(() => {
      if (isTouching) return;
      const itemWidth = el.scrollWidth / games.length;
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 10) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: itemWidth, behavior: 'smooth' });
      }
    }, 4000);

    return () => {
      clearInterval(interval);
      clearTimeout(touchTimeout);
      el.removeEventListener('touchstart', handleTouch);
      el.removeEventListener('wheel', handleTouch);
    };
  }, [games.length]);
`;
  if (!code.includes('const scrollRef = useRef(null);')) {
    code = code.replace(funcStart, funcStart + hookCode);
  }

  // 2. Change grid wrapper
  const oldGrid = '<div className="grid grid-cols-3 gap-3">';
  const newGrid = `<div 
        ref={scrollRef}
        className="horizontal-swipe-grid" 
        style={{ 
          display: "flex", 
          gap: "12px", 
          overflowX: "auto", 
          scrollSnapType: "x mandatory", 
          scrollbarWidth: "none",
          paddingBottom: "10px"
        }}
      >`;
  code = code.replace(oldGrid, newGrid);

  // 3. Update the flex items
  code = code.replace(
    /className="club-game-item coming-soon"\s*style=\{\{\s*display:\s*"flex",\s*flexDirection:\s*"column",\s*width:\s*"100%",/g,
    'className="club-game-item coming-soon"\n                style={{ display: "flex", flexDirection: "column", flex: "0 0 calc(33.333% - 8px)", scrollSnapAlign: "start",'
  );
  
  code = code.replace(
    /className="club-game-item"\s*style=\{\{\s*display:\s*"flex",\s*flexDirection:\s*"column",\s*width:\s*"100%",/g,
    'className="club-game-item"\n              style={{ display: "flex", flexDirection: "column", flex: "0 0 calc(33.333% - 8px)", scrollSnapAlign: "start",'
  );
  
  // 4. Update the outer padding to include overflow hidden
  code = code.replace(
    /<div className="mb-8 animate-fade-in" style=\{\{\s*padding:\s*"0 16px"\s*\}\}>/g,
    '<div className="mb-8 animate-fade-in" style={{ padding: "0 16px", overflow: "hidden" }}>'
  );

  fs.writeFileSync(path, code);
  console.log('Fixed HomeGameSection swipe successfully using targeted replace');
}
