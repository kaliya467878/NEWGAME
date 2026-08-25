const fs = require('fs');
let path = 'components/games/GameHeader.tsx';
if (fs.existsSync(path)) {
  let code = fs.readFileSync(path, 'utf8');
  code = code.replace(/stroke="var\(--gold\)"/g, 'stroke="#3b82f6"');
  code = code.replace(/fill="var\(--gold\)"/g, 'fill="#3b82f6"');
  fs.writeFileSync(path, code);
  console.log('Fixed SVG gold stroke');
}
