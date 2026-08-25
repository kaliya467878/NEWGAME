const fs = require('fs');
let path = 'app/k3/k3.css';
if (fs.existsSync(path)) {
  let css = fs.readFileSync(path, 'utf8');
  
  // Strip out everything from /* EXACT TIRANGA PNG DICE STAGE */ to the end
  css = css.replace(/\/\* EXACT TIRANGA PNG DICE STAGE \*\/[\s\S]*/, '');
  
  // Add the perfect container styling back
  css += `/* EXACT TIRANGA PNG DICE STAGE */
.k3-dice-stage {
  position: relative;
  background: #ffffff !important;
  border: 8px solid #5cacf3 !important;
  border-radius: 18px !important;
  padding: 12px 8px !important;
  margin: 16px !important;
  box-shadow: none !important;
  overflow: visible !important;
}

/* Left blue triangle */
.k3-dice-stage::before {
  content: "";
  position: absolute;
  top: 50%;
  left: -9px;
  transform: translateY(-50%);
  border-top: 10px solid transparent;
  border-bottom: 10px solid transparent;
  border-left: 14px solid #5cacf3;
  z-index: 2;
}

/* Left white notch */
.k3-dice-stage::after {
  content: "";
  position: absolute;
  top: 50%;
  left: -14px;
  transform: translateY(-50%);
  width: 14px;
  height: 36px;
  background: #ffffff;
  border-radius: 4px;
  z-index: 1;
}

/* We hide the old SVG arrows entirely */
.k3-dice-arrow--left {
  display: none !important;
}

/* Right blue triangle and notch */
.k3-dice-arrow--right {
  right: -9px !important;
  border-top: 10px solid transparent !important;
  border-bottom: 10px solid transparent !important;
  border-right: 14px solid #5cacf3 !important;
  background: transparent !important;
  box-shadow: none !important;
  z-index: 2;
  width: 0 !important;
  height: 0 !important;
}
.k3-dice-arrow--right::before {
  display: none !important;
}
.k3-dice-arrow--right::after {
  content: "";
  position: absolute;
  top: 50%;
  right: -14px;
  transform: translateY(-50%);
  width: 14px;
  height: 36px;
  background: #ffffff;
  border-radius: 4px;
  z-index: -1;
}

/* The slots container */
.k3-dice-slots-container {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 12px !important;
  align-items: stretch !important;
  justify-content: center;
  padding: 0 4px !important;
  width: 100% !important;
  height: 100% !important;
}

/* The dark grey slots */
.k3-dice-slot {
  background: #363636 !important;
  border-radius: 8px !important;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none !important;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.5) !important;
  padding: 6px;
}
`;
  fs.writeFileSync(path, css);
  console.log('Cleaned and fixed k3.css container');
}
