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

      // The previous aggressive script replaced "background: '#xxxxxx'" with empty string, 
      // leaving stray commas like ", border: " or ",\n color: "
      content = content.replace(/\{\s*,\s*/g, '{ ');
      content = content.replace(/,\s*,/g, ',');
      content = content.replace(/,\s*\}/g, ' }');

      if (content !== original) {
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}
processDir('components');
processDir('app');
console.log('Fixed syntax errors caused by nuke script');
