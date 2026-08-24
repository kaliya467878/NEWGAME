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

      // Nuke ANY dark hex color (from #000000 to #4f4f4f roughly)
      content = content.replace(/background:\s*#[0-4][0-9a-fA-F]{5};/g, 'background: var(--theme-bg-card);');
      content = content.replace(/background-color:\s*#[0-4][0-9a-fA-F]{5};/g, 'background-color: var(--theme-bg-card);');
      content = content.replace(/background:\s*#[0-4][0-9a-fA-F]{2};/g, 'background: var(--theme-bg-card);');

      // Nuke ANY rgba dark colors (e.g. rgba(15,15,15,0.7) or rgba(0,0,0,0.8))
      content = content.replace(/background:\s*rgba\(\s*[0-5]\d?\s*,\s*[0-5]\d?\s*,\s*[0-5]\d?\s*,\s*0\.\d+\s*\);/g, 'background: var(--theme-bg-card);');
      content = content.replace(/background-color:\s*rgba\(\s*[0-5]\d?\s*,\s*[0-5]\d?\s*,\s*[0-5]\d?\s*,\s*0\.\d+\s*\);/g, 'background-color: var(--theme-bg-card);');

      // Nuke ANY linear-gradient containing dark colors
      content = content.replace(/background:\s*linear-gradient\([^)]+#0[0-9a-fA-F]{5}[^)]+\);/gi, 'background: var(--theme-bg-card);');
      content = content.replace(/background:\s*linear-gradient\([^)]+#1[0-9a-fA-F]{5}[^)]+\);/gi, 'background: var(--theme-bg-card);');
      content = content.replace(/background:\s*linear-gradient\([^)]+#2[0-9a-fA-F]{5}[^)]+\);/gi, 'background: var(--theme-bg-card);');

      // Nuke ANY gold/orange/dark green colors left over
      content = content.replace(/rgba\(212,\s*175,\s*55[^)]+\)/g, 'rgba(71, 129, 255, 0.2)');
      content = content.replace(/rgba\(255,\s*255,\s*255[^)]+\)/g, 'var(--theme-border)'); // Convert white borders to standard border variable

      // Fix text colors for ANY remaining #fff or #a0a0a0
      content = content.replace(/color:\s*#fff(?:fff)?;/gi, 'color: var(--theme-text);');
      content = content.replace(/color:\s*#a0a0a0;/gi, 'color: var(--theme-text-muted);');
      content = content.replace(/color:\s*#94a3b8;/gi, 'color: var(--theme-text-muted);');
      content = content.replace(/color:\s*#e2e8f0;/gi, 'color: var(--theme-text);');
      content = content.replace(/color:\s*rgba\(255,\s*255,\s*255,\s*0\.\d+\);/g, 'color: var(--theme-text-muted);');

      if (content !== original) {
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}
processCssDir('app');
processCssDir('components');
console.log('Nuked all dark colors aggressively');
