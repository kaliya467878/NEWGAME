const fs = require('fs');
let path = 'app/k3/k3.css';
if (fs.existsSync(path)) {
  let css = fs.readFileSync(path, 'utf8');
  
  const additional = `
/* Remove the ugly white glare caps from buttons */
.k3-wg-color-btn::before, .k3-wg-color-btn::after,
.k3-chip-btn::before, .k3-chip-btn::after,
.k3-chip-square::before, .k3-chip-square::after {
    display: none !important;
}

/* Fix the dice slots so they don't look like solid white boxes */
.k3-dice-slot {
    background: rgba(255, 255, 255, 0.2) !important;
    border: 1px solid rgba(255, 255, 255, 0.3) !important;
    box-shadow: inset 0 2px 6px rgba(0,0,0,0.1) !important;
}

/* Ensure BIG SMALL text is visible */
.k3-wg-color-btn {
    text-shadow: 0 1px 2px rgba(0,0,0,0.2) !important;
}
`;
  css += additional;
  fs.writeFileSync(path, css);
}
