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
    } else if (/\.(js|jsx)$/.test(fullPath)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let original = content;

      // Nuke ANY background inline style completely and replace with nothing or white
      content = content.replace(/style=\{\{([^}]*?)background:\s*['"][^'"]+['"]([^}]*?)\}\}/gi, 'style={{$1$2}}');
      content = content.replace(/style=\{\{([^}]*?)backgroundColor:\s*['"][^'"]+['"]([^}]*?)\}\}/gi, 'style={{$1$2}}');
      
      // Clean up empty style={{}}
      content = content.replace(/style=\{\{\s*\}\}/g, '');

      if (content !== original) {
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}
processDir('components');
processDir('app');
console.log('Nuked all inline background styles that were overriding CSS');
