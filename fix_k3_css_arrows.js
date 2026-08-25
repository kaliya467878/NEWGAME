const fs = require('fs');
let path = 'app/k3/k3.css';
if (fs.existsSync(path)) {
  let css = fs.readFileSync(path, 'utf8');

  // Fix the arrows
  css = css.replace(/\.k3-dice-arrow \{\s*display: none !important;\s*\}/, `
.k3-dice-arrow.left {
  display: none !important;
}
.k3-dice-arrow.right {
  display: block !important;
  position: absolute;
  top: 50%;
  right: -9px;
  transform: translateY(-50%);
  border-top: 10px solid transparent;
  border-bottom: 10px solid transparent;
  border-right: 14px solid #5cacf3;
  z-index: 2;
  width: 0 !important;
  height: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}
.k3-dice-arrow.right::before {
  display: none !important;
}
.k3-dice-arrow.right::after {
  content: "";
  position: absolute;
  top: 50%;
  right: -14px; /* relative to the arrow itself */
  transform: translateY(-50%);
  width: 14px;
  height: 36px;
  background: #ffffff;
  border-radius: 4px;
  z-index: -1;
}`);

  fs.writeFileSync(path, css);
  console.log('Fixed arrows');
}
