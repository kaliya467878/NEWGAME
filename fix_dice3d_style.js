const fs = require('fs');
let path = 'components/k3/Dice3D.js';
if (fs.existsSync(path)) {
  let code = fs.readFileSync(path, 'utf8');
  code = code.replace(/style=\{!rolling \? \{ transform: finalTransform \} : \{\}\}/, 'style={!rolling ? { transform: finalTransform } : undefined}');
  fs.writeFileSync(path, code);
  console.log('Fixed style removal');
}
