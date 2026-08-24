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
    } else if (/\.(js|jsx|css)$/.test(fullPath)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let original = content;

      // Kill dark hex gradients
      content = content.replace(/linear-gradient\([^)]+#0[a-f0-9]{5}[^)]+\)/gi, 'var(--theme-primary)');
      content = content.replace(/linear-gradient\([^)]+#1[a-f0-9]{5}[^)]+\)/gi, 'var(--theme-primary)');
      content = content.replace(/linear-gradient\([^)]+#2[a-f0-9]{5}[^)]+\)/gi, 'var(--theme-primary)');
      
      content = content.replace(/radial-gradient\([^)]+#0[a-f0-9]{5}[^)]+\)/gi, 'var(--theme-primary)');
      content = content.replace(/radial-gradient\([^)]+#1[a-f0-9]{5}[^)]+\)/gi, 'var(--theme-primary)');
      
      if (content !== original) {
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}
processDir('app');
processDir('components');
console.log('Fixed dark gradients');
