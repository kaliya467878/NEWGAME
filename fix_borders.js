const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!['node_modules', '.next', '.git'].includes(file)) {
        processDir(fullPath);
      }
    } else if (/\.(css)$/.test(fullPath)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let original = content;

      // Fix main border
      if (fullPath.includes('globals.css')) {
        content = content.replace(/--border:\s*#222222;/, '--border: rgba(0,0,0,0.08);');
        content = content.replace(/--surface:\s*#121212;/, '--surface: #FFFFFF;');
        content = content.replace(/--surface-2:\s*#1c1c1c;/, '--surface-2: #F3F4F6;');
      }

      // Replace hardcoded dark borders
      content = content.replace(/border(-[^:]+)?:\s*[^;]*#[2-4][a-fA-F0-9]{5}/g, 'border$1: 1px solid var(--theme-border)');
      
      // Fix K3 / 5D arrows pointing left/right
      content = content.replace(/border-(left|right):\s*\dpx solid #0d0d0d/gi, 'border-$1: 7px solid var(--theme-text)');

      // FiveDTrendChart dark borders
      content = content.replace(/border-[a-z]+:\s*1px solid #2B3244/gi, 'border: 1px solid var(--theme-border)');

      if (content !== original) {
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}
processDir('app');
processDir('components');
console.log('Fixed dark borders and surface colors');
