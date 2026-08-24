const fs = require('fs');
const path = require('path');

const results = [];

function analyzeDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!['node_modules', '.next', '.git'].includes(file)) {
        analyzeDir(fullPath);
      }
    } else if (/\.(css)$/.test(fullPath)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach((line, i) => {
        // Look for stray dark hex colors #0xxx to #4xxx (ignoring #FFFFFF, #EAEAEA, etc)
        // Only if it's setting a background or background-color
        if (/(background|background-color|border)[^:]*:\s*[^;]*#[0-4][a-fA-F0-9]{5}/.test(line)) {
            // exclude game colors like green #10B981, #22c55e, #16a34a, #15803d
            if (!/(10B981|22c55e|16a34a|15803d|4ade80|059669|14532d|3b82f6)/i.test(line)) {
                results.push(`${fullPath}:${i+1}: ${line.trim()}`);
            }
        }
        
        // Look for stray #2a2a2a, #1a1a1a, #333 etc (3 char hex)
        if (/(background|background-color)[^:]*:\s*[^;]*#[0-4][a-fA-F0-9]{2}(?![a-fA-F0-9])/i.test(line)) {
            results.push(`${fullPath}:${i+1}: ${line.trim()}`);
        }
      });
    }
  }
}
analyzeDir('app');
analyzeDir('components');

fs.writeFileSync('css_analysis.txt', results.join('\n'));
console.log('Analysis written to css_analysis.txt with ' + results.length + ' warnings.');
