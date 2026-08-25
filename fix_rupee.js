const fs = require('fs');
let path = 'components/games/GameHeader.tsx';
if (fs.existsSync(path)) {
  let code = fs.readFileSync(path, 'utf8');
  code = code.replace(/,1/g, '?');
  fs.writeFileSync(path, code);
  console.log('Fixed Rupee symbol');
}
