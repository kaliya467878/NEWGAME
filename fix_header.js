const fs = require('fs');
let path = 'app/club.css';
let code = fs.readFileSync(path, 'utf8');

// Fix club-btn-gradient text color
code = code.replace(/\.club-btn-gradient\s*\{[\s\S]*?\}/, match => {
  return match.replace(/color:\s*#111111;/, 'color: #FFFFFF;');
});

// Fix club-btn-outline background
code = code.replace(/\.club-btn-outline\s*\{[\s\S]*?\}/, match => {
  return match.replace(/background:\s*var\(--theme-bg-card\);/, 'background: var(--theme-bg-pill);');
});

// Also fix Wingo history badges if they look cheap
code = code.replace(/\.wg-outcome-badge\s*\{[\s\S]*?\}/, match => {
  return match.replace(/border-radius:\s*4px;/, 'border-radius: 8px;');
});

fs.writeFileSync(path, code);
console.log('Fixed buttons and header UI');
