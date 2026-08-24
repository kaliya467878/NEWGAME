const fs = require('fs');
const path = require('path');
function processCssDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!['node_modules', '.next', '.git'].includes(file)) {
        processCssDir(fullPath);
      }
    } else if (/\.css$/.test(fullPath)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      content = content.replace(/color:\s*#121212;/gi, 'color: #FFFFFF;');
      fs.writeFileSync(fullPath, content);
    }
  }
}
processCssDir('app');
processCssDir('components');
