const fs = require('fs');
let path = 'components/home/BottomNav.js';
let code = fs.readFileSync(path, 'utf8');
code = code.replace(/Get \?500/, 'Promotion');
fs.writeFileSync(path, code);
