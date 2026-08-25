const fs = require('fs');
let path = 'app/k3/k3.css';
if (fs.existsSync(path)) {
  let css = fs.readFileSync(path, 'utf8');

  // Remove the old #111111 important override from bottom of file
  css = css.replace(/\.k3-dice-stage \{ background: #111111 !important; border: 2px solid #fff !important; border-radius: 12px !important; \}/g, '');
  css = css.replace(/\.k3-dice-slot \{ background: transparent !important; border: none !important; box-shadow: none !important; \}/g, '');
  
  // Also replace any inline hardcoded background `#111111` if there was a non-important one
  css = css.replace(/background:\s*#111111;/g, 'background: var(--theme-primary);');

  // Let's add the exact styling for the PNG version
  css += `
/* EXACT TIRANGA PNG DICE STAGE */
.k3-dice-stage {
  position: relative;
  background: #63a9f0 !important; /* light blue outer */
  border: none !important;
  border-radius: 14px !important;
  padding: 8px !important; /* padding creates the blue border effect */
  margin: 16px !important;
  box-shadow: none !important;
  overflow: visible !important;
}

/* The inner white box */
.k3-dice-stage::before {
  content: "";
  position: absolute;
  top: 8px;
  left: 8px;
  right: 8px;
  bottom: 8px;
  background: #ffffff;
  border-radius: 8px;
  z-index: 0;
}

/* The left blue triangle pointer */
.k3-dice-stage::after {
  content: "";
  position: absolute;
  top: 50%;
  left: -2px;
  transform: translateY(-50%);
  border-top: 10px solid transparent;
  border-bottom: 10px solid transparent;
  border-left: 14px solid #63a9f0;
  z-index: 2;
}

/* We need a separate element for the right triangle since we can't have two pseudo elements easily */
.k3-dice-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 14px;
  height: 20px;
  background: transparent !important; /* hide old arrows */
  box-shadow: none !important;
}
.k3-dice-arrow::before {
  display: none !important; /* hide SVG icon */
}
.k3-dice-arrow--left {
  display: none !important; /* we use ::after on stage for left arrow */
}
.k3-dice-arrow--right {
  right: -2px !important;
  border-top: 10px solid transparent !important;
  border-bottom: 10px solid transparent !important;
  border-right: 14px solid #63a9f0 !important;
}

/* The slots */
.k3-dice-slots-container {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 8px !important;
  align-items: stretch !important;
  justify-content: center;
  padding: 8px;
  width: 100% !important;
  height: 100% !important;
}

.k3-dice-slot {
  background: #363636 !important; /* dark grey inner */
  border-radius: 6px !important;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none !important;
  box-shadow: none !important;
}

/* Dice PNG wrapper */
.dice-png-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}
.dice-png-img {
  width: 70%;
  height: auto;
  object-fit: contain;
}
`;
  fs.writeFileSync(path, css);
  console.log('Fixed k3.css for PNGs');
}
