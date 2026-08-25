const fs = require('fs');
let path = 'app/k3/k3.css';
if (fs.existsSync(path)) {
  let css = fs.readFileSync(path, 'utf8');

  // Add the white notches behind the blue triangles
  css += `
/* White notch left */
.k3-dice-stage::before {
  content: "";
  /* we already used before for the inner box! Let's use box-shadow on the stage for the blue border instead! */
}
`;
  // Let's rewrite the stage CSS
  const newStage = `
/* EXACT TIRANGA PNG DICE STAGE */
.k3-dice-stage {
  position: relative;
  background: #ffffff !important; /* white inner */
  border: 8px solid #5cacf3 !important; /* light blue outer */
  border-radius: 18px !important;
  padding: 8px !important;
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

/* Left white notch (behind the triangle) */
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

/* Right blue triangle and white notch */
.k3-dice-arrow--left {
  display: none !important;
}
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
  z-index: -1; /* behind the triangle */
}
`;
  
  // Replace the old EXACT TIRANGA block
  css = css.replace(/\/\* EXACT TIRANGA PNG DICE STAGE \*\/[\s\S]*?\.dice-png-img/m, newStage + '\n.dice-png-img');
  
  fs.writeFileSync(path, css);
  console.log('Fixed k3.css with notches');
}
