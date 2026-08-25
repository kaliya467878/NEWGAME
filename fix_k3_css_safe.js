const fs = require('fs');
let path = 'app/k3/k3.css';
if (fs.existsSync(path)) {
  let css = fs.readFileSync(path, 'utf8');

  // Safely remove the old .k3-dice-stage block
  css = css.replace(/\.k3-dice-stage\s*\{[\s\S]*?padding:\s*0\s*16px;\s*\}/, `/* REPLACED K3 DICE STAGE */`);

  // Append our correct styling to the VERY BOTTOM of the file so it overrides, without deleting anything else
  css += `\n
/* EXACT TIRANGA PNG DICE STAGE - SAFE */
.k3-dice-stage {
  position: relative;
  height: 132px;
  background: #ffffff !important;
  border: 8px solid #5cacf3 !important;
  border-radius: 18px !important;
  padding: 12px 8px !important;
  margin: 16px !important;
  box-shadow: none !important;
  overflow: visible !important;
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
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
.k3-dice-arrow {
  display: none !important;
}

/* Right blue triangle and notch */
.k3-dice-stage-right-arrow {
  position: absolute;
  top: 50%;
  right: -9px;
  transform: translateY(-50%);
  border-top: 10px solid transparent;
  border-bottom: 10px solid transparent;
  border-right: 14px solid #5cacf3;
  z-index: 2;
}
.k3-dice-stage-right-notch {
  position: absolute;
  top: 50%;
  right: -14px;
  transform: translateY(-50%);
  width: 14px;
  height: 36px;
  background: #ffffff;
  border-radius: 4px;
  z-index: 1;
}

/* The slots container */
.k3-dice-slots-container {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 8px !important;
  align-items: stretch !important;
  justify-content: center;
  padding: 0 8px !important;
  width: 100% !important;
  height: 100% !important;
}

/* The dark grey slots */
.k3-dice-slot {
  background: #363636 !important;
  border-radius: 6px !important;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none !important;
  box-shadow: none !important;
  padding: 4px;
}

.dice-png-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}
.dice-png-img {
  width: 95%;
  height: auto;
  object-fit: contain;
}
`;

  fs.writeFileSync(path, css);
  console.log('Restored K3 CSS and added safe styling');
}
