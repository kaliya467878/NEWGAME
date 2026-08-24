const fs = require('fs');
const path = require('path');
function processJsDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!['node_modules', '.next', '.git'].includes(file)) {
        processJsDir(fullPath);
      }
    } else if (/\.(js|jsx|ts|tsx)$/.test(fullPath)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let original = content;

      content = content.replace(/background:\s*["']rgba\(\s*[0-5]\d?\s*,\s*[0-5]\d?\s*,\s*[0-5]\d?\s*,\s*0\.\d+\s*\)["']/g, 'background: "var(--theme-bg-card)"');
      content = content.replace(/backgroundColor:\s*["']rgba\(\s*[0-5]\d?\s*,\s*[0-5]\d?\s*,\s*[0-5]\d?\s*,\s*0\.\d+\s*\)["']/g, 'backgroundColor: "var(--theme-bg-card)"');

      // Specific hardcoded colors like #1c1c24
      content = content.replace(/background:\s*["']#[0-3][0-9a-fA-F]{5}["']/g, 'background: "var(--theme-bg-card)"');
      content = content.replace(/backgroundColor:\s*["']#[0-3][0-9a-fA-F]{5}["']/g, 'backgroundColor: "var(--theme-bg-card)"');

      if (content !== original) {
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}
processJsDir('app');
processJsDir('components');
console.log('Nuked all dark inline colors aggressively');
