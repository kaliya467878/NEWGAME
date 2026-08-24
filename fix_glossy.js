const fs = require('fs');
const path = require('path');

function removeGlossy(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!['node_modules', '.next', '.git'].includes(file)) {
        removeGlossy(fullPath);
      }
    } else if (/\.(css)$/.test(fullPath)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let original = content;

      // Disable glossy pseudo elements
      content = content.replace(/\.wg-color-btn::before\s*\{[^}]+\}/g, '.wg-color-btn::before { display: none; }');
      content = content.replace(/\.wg-num-btn::before\s*\{[^}]+\}/g, '.wg-num-btn::before { display: none; }');
      content = content.replace(/\.wg-mini-ball::before\s*\{[^}]+\}/g, '.wg-mini-ball::before { display: none; }');
      content = content.replace(/\.wg-table-num::before\s*\{[^}]+\}/g, '.wg-table-num::before { display: none; }');
      content = content.replace(/\.wg-chart-ball::before\s*\{[^}]+\}/g, '.wg-chart-ball::before { display: none; }');
      
      // K3 ones
      content = content.replace(/\.k3-dice::before\s*\{[^}]+\}/g, '.k3-dice::before { display: none; }');
      content = content.replace(/\.k3-chip-btn::before\s*\{[^}]+\}/g, '.k3-chip-btn::before { display: none; }');
      content = content.replace(/\.k3-chip-square::before\s*\{[^}]+\}/g, '.k3-chip-square::before { display: none; }');
      
      // 5D ones
      content = content.replace(/\.fived-ball::before\s*\{[^}]+\}/g, '.fived-ball::before { display: none; }');

      // Add a catch all for any other btn::before if it has height: 6px or similar glossy things
      content = content.replace(/height:\s*[4-9]px;\s*background:\s*linear-gradient[^}]*#fff/gi, 'display: none;');

      if (content !== original) {
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}
removeGlossy('app');
console.log('Removed glossy overlays');
