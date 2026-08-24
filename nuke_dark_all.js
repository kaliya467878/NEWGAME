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

      // Nuke dark hex (optional quotes)
      // from #000000 to #4fffff
      content = content.replace(/(background(-color)?:\s*)(["']?)#[0-4][0-9a-fA-F]{5}\3/g, '$1$3var(--theme-bg-card)$3');
      content = content.replace(/(background(-color)?:\s*)(["']?)#[0-4][0-9a-fA-F]{2}\3/g, '$1$3var(--theme-bg-card)$3');

      // Nuke dark rgba (optional quotes)
      content = content.replace(/(background(-color)?:\s*)(["']?)rgba\(\s*[0-5]\d?\s*,\s*[0-5]\d?\s*,\s*[0-5]\d?\s*,\s*0\.\d+\s*\)\3/g, '$1$3var(--theme-bg-card)$3');

      // Gradients with dark colors
      content = content.replace(/(background:\s*)(["']?)linear-gradient\([^)]+#0[0-9a-fA-F]{5}[^)]+\)\2/gi, '$1$2var(--theme-bg-card)$2');
      content = content.replace(/(background:\s*)(["']?)linear-gradient\([^)]+#1[0-9a-fA-F]{5}[^)]+\)\2/gi, '$1$2var(--theme-bg-card)$2');
      content = content.replace(/(background:\s*)(["']?)linear-gradient\([^)]+#2[0-9a-fA-F]{5}[^)]+\)\2/gi, '$1$2var(--theme-bg-card)$2');

      // Tailwind classes (e.g. bg-[#1c1c24])
      content = content.replace(/bg-\[#[0-4][0-9a-fA-F]{5}\]/gi, 'bg-[var(--theme-bg-card)]');
      content = content.replace(/bg-gray-800/gi, 'bg-[var(--theme-bg-card)]');
      content = content.replace(/bg-gray-900/gi, 'bg-[var(--theme-bg-card)]');
      
      // Fix arbitrary white text in tailwind or css
      content = content.replace(/text-white/gi, 'text-[var(--theme-text)]');
      content = content.replace(/text-gray-400/gi, 'text-[var(--theme-text-muted)]');
      content = content.replace(/text-gray-300/gi, 'text-[var(--theme-text-muted)]');
      content = content.replace(/text-gray-500/gi, 'text-[var(--theme-text-dim)]');
      content = content.replace(/(color:\s*)(["']?)#fff(?:fff)?\2/gi, '$1$2var(--theme-text)$2');

      if (content !== original) {
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}
processDir('app');
processDir('components');
console.log('Nuked absolutely everything');
