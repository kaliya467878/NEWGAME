const fs = require('fs');
let path = 'app/k3/k3.css';
if (fs.existsSync(path)) {
  let css = fs.readFileSync(path, 'utf8');

  // Adjust padding in slot container and dice img to match new screenshot
  css = css.replace(/.k3-dice-slots-container \{[\s\S]*?padding: 0 4px !important;/m, 
`.k3-dice-slots-container {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 8px !important;
  align-items: stretch !important;
  justify-content: center;
  padding: 0 8px !important;`);

  css = css.replace(/.k3-dice-slot \{[\s\S]*?padding: 6px;/m,
`.k3-dice-slot {
  background: #363636 !important;
  border-radius: 6px !important;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none !important;
  box-shadow: none !important;
  padding: 4px;`);
  
  css = css.replace(/.dice-png-img \{[\s\S]*?width: 90%;/m,
`.dice-png-img {
  width: 95%;`);

  fs.writeFileSync(path, css);
  console.log('Fixed dice padding and spacing to match exact original screenshot');
}
