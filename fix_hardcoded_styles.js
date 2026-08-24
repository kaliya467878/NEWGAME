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
    } else if (/\.(js|jsx|ts|tsx)$/.test(fullPath)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let original = content;

      // Replace hardcoded dark backgrounds with theme CSS variables
      content = content.replace(/background:\s*["']#(080808|111827)["']/gi, 'background: "var(--theme-bg)"');
      content = content.replace(/background:\s*["']#(141414|1e1e24|1f2937)["']/gi, 'background: "var(--theme-bg-elevated)"');
      content = content.replace(/background:\s*["']#(1c1c24|191919|374151)["']/gi, 'background: "var(--theme-bg-card)"');
      content = content.replace(/backgroundColor:\s*["']#(080808|111827)["']/gi, 'backgroundColor: "var(--theme-bg)"');
      content = content.replace(/backgroundColor:\s*["']#(141414|1e1e24|1f2937)["']/gi, 'backgroundColor: "var(--theme-bg-elevated)"');
      content = content.replace(/backgroundColor:\s*["']#(1c1c24|191919|374151)["']/gi, 'backgroundColor: "var(--theme-bg-card)"');

      // Replace hardcoded white text with theme variable
      content = content.replace(/color:\s*["']#(ffffff|fff)["']/gi, 'color: "var(--theme-text)"');
      
      // Replace hardcoded gold colors
      content = content.replace(/color:\s*["']var\(--ln-gold,\s*#[a-zA-Z0-9]+\)["']/gi, 'color: "var(--theme-green)"');
      content = content.replace(/color:\s*["']#(d4af37|facc15|fcd34d)["']/gi, 'color: "var(--theme-green)"');
      
      // Fix borders and box shadows that were hardcoded
      content = content.replace(/border:\s*["']1px solid rgba\(0,\s*0,\s*0,\s*0\.05\)["']/gi, 'border: "1px solid var(--theme-border)"');
      content = content.replace(/border:\s*["']1px solid rgba\(255,\s*255,\s*255,\s*0\.[0-9]+\)["']/gi, 'border: "1px solid var(--theme-border)"');

      // Fix specific tailwind classes causing issues in referral/wallet
      content = content.replace(/bg-\[#1a1a1a\]/g, 'bg-[var(--theme-bg-card)]');
      content = content.replace(/bg-\[#141414\]/g, 'bg-[var(--theme-bg-elevated)]');
      content = content.replace(/bg-\[#080808\]/g, 'bg-[var(--theme-bg)]');
      content = content.replace(/bg-\[#222\]/g, 'bg-[var(--theme-bg-muted)]');
      content = content.replace(/text-white/g, 'text-[var(--theme-text)]');
      content = content.replace(/text-gray-400/g, 'text-[var(--theme-text-muted)]');
      content = content.replace(/text-gray-500/g, 'text-[var(--theme-text-dim)]');

      if (content !== original) {
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}

// FIRST: Let's restore from zip to wipe my previous messy script mutations!
const { execSync } = require('child_process');
console.log('Restoring from zip...');
try {
  // We use PowerShell Expand-Archive to extract over the current dir
  execSync('powershell -Command "Expand-Archive -Path C:\\Users\\praja\\Downloads\\11luckynovaaa-main.zip -DestinationPath C:\\Users\\praja\\Downloads\\temp_restore -Force"');
  // Copy everything back
  execSync('xcopy C:\\Users\\praja\\Downloads\\temp_restore\\11luckynovaaa-main\\* C:\\Users\\praja\\Downloads\\newgame\\new\\ /s /e /y /q');
  console.log('Restore complete.');
} catch (e) {
  console.log('Restore failed, proceeding anyway:', e.message);
}

console.log('Processing files...');
processDir('components');
processDir('app');
console.log('Done mapping inline styles to CSS variables.');
