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

      // Dark grey hex colors that I missed
      content = content.replace(/(background(-color)?:\s*)(["']?)#6b7280\3/gi, '$1$3var(--theme-bg-card)$3');
      content = content.replace(/(background(-color)?:\s*)(["']?)#71717a\3/gi, '$1$3var(--theme-bg-card)$3');
      content = content.replace(/(background(-color)?:\s*)(["']?)#4b5563\3/gi, '$1$3var(--theme-bg-card)$3');
      content = content.replace(/(background(-color)?:\s*)(["']?)#374151\3/gi, '$1$3var(--theme-bg-card)$3');
      content = content.replace(/(background(-color)?:\s*)(["']?)#52525b\3/gi, '$1$3var(--theme-bg-card)$3');
      
      // bg-gray-500, bg-gray-600, bg-gray-700
      content = content.replace(/bg-gray-500/gi, 'bg-[var(--theme-bg-card)]');
      content = content.replace(/bg-gray-600/gi, 'bg-[var(--theme-bg-card)]');
      content = content.replace(/bg-gray-700/gi, 'bg-[var(--theme-bg-card)]');
      
      content = content.replace(/bg-\[#6b7280\]/gi, 'bg-[var(--theme-bg-card)]');
      content = content.replace(/bg-\[#71717a\]/gi, 'bg-[var(--theme-bg-card)]');
      content = content.replace(/bg-\[#4b5563\]/gi, 'bg-[var(--theme-bg-card)]');
      content = content.replace(/bg-\[#374151\]/gi, 'bg-[var(--theme-bg-card)]');
      content = content.replace(/bg-\[#52525b\]/gi, 'bg-[var(--theme-bg-card)]');

      // Also there seems to be a grey border/shadow issue making text unreadable
      // Text visibility fixes:
      content = content.replace(/(color:\s*)(["']?)#000(?:000)?\2/gi, '$1$2var(--theme-text)$2');

      if (content !== original) {
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}
processDir('app');
processDir('components');
console.log('Fixed mid-grey dark boxes');
