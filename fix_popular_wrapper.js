const fs = require('fs');
let path = 'components/home/GameGrid.js';
if (fs.existsSync(path)) {
  let code = fs.readFileSync(path, 'utf8');
  code = code.replace(
    /const cardClass = \[\n\s*"",/g,
    'const cardClass = [\n      "club-game-item",'
  );
  fs.writeFileSync(path, code);
  console.log('Fixed PopularGameCard wrapper');
}
