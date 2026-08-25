const fs = require('fs');
let path = 'components/k3/K3GameScreen.js';
if (fs.existsSync(path)) {
  let code = fs.readFileSync(path, 'utf8');
  code = code.replace(/setIsRolling\(true\);/g, 'console.log("Rolling started!"); setIsRolling(true);');
  fs.writeFileSync(path, code);
  console.log('Added log');
}
