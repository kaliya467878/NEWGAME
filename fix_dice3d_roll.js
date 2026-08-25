const fs = require('fs');
let path = 'components/k3/Dice3D.js';
if (fs.existsSync(path)) {
  let code = fs.readFileSync(path, 'utf8');
  code = code.replace(/const rollClass = rolling \? `rolling-3d-\$\{index\}` : "";/, 'const rollClass = rolling ? "k3d-die--rolling" : "";');
  fs.writeFileSync(path, code);
  console.log('Fixed rollClass');
}
