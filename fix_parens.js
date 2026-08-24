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

      // Fix the extra parentheses caused by the previous regex
      content = content.replace(/drop-shadow\(0 2px 4px rgba\(0,0,0,0\.05\)\)\)+/g, 'drop-shadow(0 2px 4px rgba(0,0,0,0.05))');
      
      if (content !== original) {
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}
processDir('app');
processDir('components');
console.log('Fixed syntax error with parentheses');
