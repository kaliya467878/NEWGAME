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

      // Replace all strong dark shadows with soft light shadows
      // e.g. rgba(0, 0, 0, 0.5) or rgba(0,0,0,.65) -> rgba(0,0,0,0.05)
      content = content.replace(/rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\.[3-9]\d*\s*\)/g, 'rgba(0, 0, 0, 0.05)');
      content = content.replace(/rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*\.\d+\s*\)/g, 'rgba(0, 0, 0, 0.05)');
      
      // Also drop shadows
      content = content.replace(/drop-shadow\([^)]+\)/g, 'drop-shadow(0 2px 4px rgba(0,0,0,0.05))');
      
      // For box-shadows that explicitly use #000 or similar
      content = content.replace(/box-shadow:\s*[^;]+#000000[^;]*;/gi, 'box-shadow: 0 2px 8px rgba(0,0,0,0.05);');
      content = content.replace(/box-shadow:\s*[^;]+#000[^;]*;/gi, 'box-shadow: 0 2px 8px rgba(0,0,0,0.05);');

      if (content !== original) {
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}
processDir('app');
processDir('components');
console.log('Fixed strong black shadows');
