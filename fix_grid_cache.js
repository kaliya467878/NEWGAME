const fs = require('fs');
let path = 'components/home/GameGrid.js';
if (fs.existsSync(path)) {
  let code = fs.readFileSync(path, 'utf8');
  
  // Replace .png", or .jpg", with .png?v=3", or .jpg?v=3",
  // But be careful not to keep adding ?v=3 multiple times.
  code = code.replace(/(\.(png|jpg))(\?v=\d+)?",/g, '$1?v=3",');
  
  fs.writeFileSync(path, code);
  console.log('Fixed GameGrid.js image cache');
}
