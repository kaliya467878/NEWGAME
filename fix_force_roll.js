const fs = require('fs');
let path = 'components/k3/K3GameScreen.js';
if (fs.existsSync(path)) {
  let code = fs.readFileSync(path, 'utf8');
  // force rolling to true
  code = code.replace(/rolling=\{isRolling\}/g, 'rolling={true}');
  fs.writeFileSync(path, code);
  console.log('Forced rolling=true');
}
