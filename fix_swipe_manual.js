const fs = require('fs');

let path = 'components/home/GameGrid.js';
if (fs.existsSync(path)) {
  let code = fs.readFileSync(path, 'utf8');

  // Fix imports
  if (!code.includes('import { useRef, useState, useEffect }')) {
    code = code.replace('import { useRef, useState } from "react";', 'import { useRef, useState, useEffect } from "react";');
  }

  const searchStr = `function HomeGameSection({ catKey, label, games, onComingSoon }) {
  if (games.length === 0) return null;
  const Icon = CATEGORY_ICONS[catKey] || CircleDashed;

  return (
    <div id={\`section-\${catKey}\`} className="mb-8 animate-fade-in" style={{ padding: "0 16px" }}>
      <div className="club-section-header" style={{ display: "flex", alignItems: "center", marginBottom: "16px", padding: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "var(--theme-green)", display: "flex", alignItems: "center" }}>
            <Icon size={18} />
          </span>
          <h2 style={{ fontSize: "16px", fontWeight: "800", color: "var(--theme-text)", margin: 0, letterSpacing: "0.2px" }}>{label}</h2>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">`;
      
  const replaceStr = `function HomeGameSection({ catKey, label, games, onComingSoon }) {
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

  if (games.length === 0) return null;
  const Icon = CATEGORY_ICONS[catKey] || CircleDashed;

  return (
    <div id={\`section-\${catKey}\`} className="mb-8 animate-fade-in" style={{ padding: "0 16px", overflow: "hidden" }}>
      <div className="club-section-header" style={{ display: "flex", alignItems: "center", marginBottom: "16px", padding: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "var(--theme-green)", display: "flex", alignItems: "center" }}>
            <Icon size={18} />
          </span>
          <h2 style={{ fontSize: "16px", fontWeight: "800", color: "var(--theme-text)", margin: 0, letterSpacing: "0.2px" }}>{label}</h2>
        </div>
      </div>

      <div 
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

  code = code.replace(searchStr, replaceStr);

  code = code.replace(
    /className="club-game-item coming-soon"\s*style=\{\{\s*display:\s*"flex",\s*flexDirection:\s*"column",\s*width:\s*"100%",/g,
    'className="club-game-item coming-soon"\n                style={{ display: "flex", flexDirection: "column", flex: "0 0 calc(33.333% - 8px)", scrollSnapAlign: "start",'
  );
  
  code = code.replace(
    /className="club-game-item"\s*style=\{\{\s*display:\s*"flex",\s*flexDirection:\s*"column",\s*width:\s*"100%",/g,
    'className="club-game-item"\n              style={{ display: "flex", flexDirection: "column", flex: "0 0 calc(33.333% - 8px)", scrollSnapAlign: "start",'
  );

  fs.writeFileSync(path, code);
  console.log('Fixed HomeGameSection swipe successfully');
}
