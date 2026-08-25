const fs = require('fs');
let path = 'components/k3/Dice3D.js';
if (fs.existsSync(path)) {
  let code = fs.readFileSync(path, 'utf8');
  code = code.replace(/"k3d-pip-black"/g, '"k3d-pip k3d-pip-black"');
  fs.writeFileSync(path, code);
  console.log('Fixed pips');
}
