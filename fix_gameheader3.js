const fs = require('fs');
let path = 'components/games/GameHeader.tsx';
if (fs.existsSync(path)) {
  let code = fs.readFileSync(path, 'utf8');

  // Fix the active duration tab
  const oldActive = 'bg-gradient-to-br from-gold-light to-gold text-dark shadow-md shadow-gold/30 ring-2 ring-gold/40 ring-offset-2 ring-offset-background';
  const newActive = 'bg-gradient-to-br from-cyan-400 to-blue-500 text-white shadow-md shadow-blue-500/30 ring-2 ring-blue-500/40 ring-offset-2 ring-offset-background';
  
  code = code.replace(oldActive, newActive);
  
  fs.writeFileSync(path, code);
  console.log('Fixed duration tabs active state in GameHeader');
}
