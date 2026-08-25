const fs = require('fs');
let path = 'components/k3/K3GameScreen.js';
if (fs.existsSync(path)) {
  let code = fs.readFileSync(path, 'utf8');
  code = code.replace(/rolling=\{true\}/g, 'rolling={isRolling}');
  fs.writeFileSync(path, code);
  console.log('Unforced rolling');
}
