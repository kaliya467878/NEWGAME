const fs = require('fs');
let path = 'components/fived/GameBoard.tsx';
if (fs.existsSync(path)) {
  let code = fs.readFileSync(path, 'utf8');

  // Replace gold gradients
  code = code.replace(/bg-gradient-to-r from-gold-light to-gold text-dark/g, 'bg-gradient-to-br from-cyan-400 to-blue-500 text-white');
  code = code.replace(/bg-gradient-to-r from-gold-light to-gold/g, 'bg-gradient-to-br from-cyan-400 to-blue-500 text-white');
  
  // Replace simple gold backgrounds
  code = code.replace(/bg-gold text-dark/g, 'bg-blue-500 text-white');
  code = code.replace(/bg-gold/g, 'bg-blue-500');
  
  // Replace text colors
  code = code.replace(/text-gold-light/g, 'text-cyan-400');
  code = code.replace(/text-gold/g, 'text-blue-500');
  
  // Replace borders and rings
  code = code.replace(/border-gold\/30/g, 'border-blue-500/30');
  code = code.replace(/border-gold\/50/g, 'border-blue-500/50');
  code = code.replace(/border-gold/g, 'border-blue-500');
  code = code.replace(/ring-gold\/40/g, 'ring-blue-500/40');
  code = code.replace(/shadow-gold\/20/g, 'shadow-blue-500/20');
  
  // Replace specific light mode backgrounds for numbers
  code = code.replace(/text-muted hover:text-\[var\(--theme-text\)\] bg-background\/40 hover:bg-background\/80/g, 'text-slate-500 hover:text-blue-600 bg-slate-100 hover:bg-slate-200');
  
  // Replace bg-surface-2 for A/B/C/D/E buttons
  code = code.replace(/border-border text-muted hover:text-foreground bg-surface-2/g, 'border-slate-200 text-slate-500 hover:text-blue-600 bg-slate-50');
  
  // Fix the "bg-surface-2 p-2 rounded-xl border border-border" grid container
  code = code.replace(/bg-surface-2 p-2 rounded-xl border border-border/g, 'bg-white p-2 rounded-xl border border-slate-200 shadow-sm');
  
  // SVG stroke fix
  code = code.replace(/stroke="var\(--gold\)"/g, 'stroke="#3b82f6"');

  fs.writeFileSync(path, code);
  console.log('Fixed GameBoard UI');
}
