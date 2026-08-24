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
      let original = content;

      // Dark backgrounds to card backgrounds
      content = content.replace(/background:\s*#1[a-f0-9]{5};/gi, 'background: var(--theme-bg-card);');
      content = content.replace(/background-color:\s*#1[a-f0-9]{5};/gi, 'background-color: var(--theme-bg-card);');
      content = content.replace(/background:\s*#2[a-f0-9]{5};/gi, 'background: var(--theme-bg-elevated);');
      
      content = content.replace(/background:\s*rgba\(\s*18\s*,\s*18\s*,\s*18\s*,\s*0\.\d+\s*\);/gi, 'background: var(--theme-bg-card);');
      content = content.replace(/background:\s*rgba\(\s*24\s*,\s*24\s*,\s*24\s*,\s*0\.\d+\s*\);/gi, 'background: var(--theme-bg-elevated);');
      
      // Gradients (e.g. linear-gradient(135deg, #242424, #121212))
      content = content.replace(/background:\s*linear-gradient\([^)]+#121212[^)]+\);/gi, 'background: var(--theme-bg-card);');
      content = content.replace(/background:\s*linear-gradient\([^)]+#242424[^)]+\);/gi, 'background: var(--theme-bg-elevated);');

      // Text colors
      content = content.replace(/color:\s*#fff(?:fff)?;/gi, 'color: var(--theme-text);');
      content = content.replace(/color:\s*#a0a0a0;/gi, 'color: var(--theme-text-muted);');
      
      // Gold to Green (Blue now)
      content = content.replace(/color:\s*#d4af37;/gi, 'color: var(--theme-green);');
      content = content.replace(/border-color:\s*#d4af37;/gi, 'border-color: var(--theme-green);');
      content = content.replace(/border:\s*[^;]+rgba\(\s*212\s*,\s*175\s*,\s*55\s*,\s*0\.\d+\s*\);/gi, 'border: 1px solid var(--theme-border);');
      content = content.replace(/border:\s*[^;]+#d4af37;/gi, 'border: 1px solid var(--theme-green);');
      content = content.replace(/background:\s*linear-gradient\([^)]+#d4af37[^)]+\);/gi, 'background: var(--theme-green);');

      // Common light dark borders
      content = content.replace(/border:\s*[^;]+rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.\d+\s*\);/gi, 'border: 1px solid var(--theme-border);');
      content = content.replace(/border-bottom:\s*[^;]+rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.\d+\s*\);/gi, 'border-bottom: 1px solid var(--theme-border);');
      content = content.replace(/border-top:\s*[^;]+rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.\d+\s*\);/gi, 'border-top: 1px solid var(--theme-border);');

      if (content !== original) {
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}

processCssDir('app');
processCssDir('components');
console.log('Fixed CSS files.');
