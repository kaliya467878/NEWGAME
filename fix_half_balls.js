const fs = require('fs');

let globalsCss = fs.readFileSync('app/globals.css', 'utf8');

globalsCss = globalsCss.replace(/linear-gradient\(135deg,\s*#450a0a,\s*#4c1d95\)/g, 'linear-gradient(135deg, #EF4444 50%, #8B5CF6 50%)');
globalsCss = globalsCss.replace(/linear-gradient\(135deg,\s*#064e3b,\s*#4c1d95\)/g, 'linear-gradient(135deg, #10B981 50%, #8B5CF6 50%)');

fs.writeFileSync('app/globals.css', globalsCss);
console.log('Fixed half-ball colors');
