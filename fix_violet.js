const fs = require('fs');

let wingoCss = fs.readFileSync('app/wingo/wingo.css', 'utf8');

wingoCss = wingoCss.replace(/background:\s*radial-gradient\([^)]+#c4b5fd[^)]+\)/gi, 'background: #8B5CF6');
fs.writeFileSync('app/wingo/wingo.css', wingoCss);
console.log('Fixed violet gradients');
