const fs = require('fs');
let path = 'components/games/GameHeader.tsx';
if (fs.existsSync(path)) {
  let code = fs.readFileSync(path, 'utf8');

  // Fix refresh button
  code = code.replace(
    /className="absolute right-0 top-0 text-blue-500 hover:text-blue-500-light transition-colors"/g,
    'className="absolute right-0 top-0 text-white hover:opacity-80 transition-opacity"'
  );
  
  // Fix header text
  code = code.replace(/text-3xl font-extrabold text-white tracking-tight text-blue-500/g, 'text-3xl font-extrabold text-white tracking-tight');
  
  fs.writeFileSync(path, code);
  console.log('Fixed more GameHeader UI');
}
