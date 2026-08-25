const fs = require('fs');
let path = 'components/fived/GameBoard.tsx';
if (fs.existsSync(path)) {
  let code = fs.readFileSync(path, 'utf8');

  // Fix BIG and SMALL buttons
  code = code.replace(/bg-blue text-\[var\(--theme-text\)\] shadow-lg shadow-blue\/20/g, 'bg-blue-500 text-white shadow-lg shadow-blue-500/30');
  code = code.replace(/bg-orange text-\[var\(--theme-text\)\] shadow-lg shadow-orange\/20/g, 'bg-orange-500 text-white shadow-lg shadow-orange-500/30');
  code = code.replace(/ring-gold\/70/g, 'ring-blue-500/50');
  code = code.replace(/ring-4 ring-gold\/70 border-blue-500/g, 'ring-4 ring-blue-500/50 border-blue-500');

  // Fix the BIG SMALL indicator in history
  code = code.replace(/bg-blue\/20 text-blue/g, 'bg-blue-500/20 text-blue-600');
  code = code.replace(/bg-orange\/20 text-orange/g, 'bg-orange-500/20 text-orange-600');
  
  // Fix ODD/EVEN buttons
  code = code.replace(/bg-gradient-to-b from-surface-2 to-surface/g, 'bg-slate-50 text-slate-700');
  
  // Also fix the active state of A B C D E tabs which still had text-dark
  code = code.replace(/border-blue-500 text-dark/g, 'border-blue-500 text-white');

  fs.writeFileSync(path, code);
  console.log('Fixed 5D SUM Tab UI');
}
