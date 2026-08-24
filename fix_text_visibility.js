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
    } else if (/\.(js|jsx|ts|tsx|css)$/.test(fullPath)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let original = content;

      // Fix specific text color tailwind classes that might be making text invisible on white
      content = content.replace(/text-gray-100/g, 'text-gray-900');
      content = content.replace(/text-gray-200/g, 'text-gray-800');
      content = content.replace(/text-gray-300/g, 'text-gray-700');
      content = content.replace(/text-white/g, 'text-gray-900');

      if (content !== original) {
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}
processDir('app');
processDir('components');
console.log('Fixed text visibility issues');
