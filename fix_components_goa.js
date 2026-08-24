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

      // In Goa Game, the primary text is dark grey, backgrounds are white or #F7F8FA
      
      // Replace dark backgrounds
      content = content.replace(/background:\s*['"]#(080808|141414|191919|101010|1a1a1a|1e1e24)['"]/gi, 'background: "#FFFFFF"');
      content = content.replace(/background:\s*['"]#(1a1a1e|161b22)['"]/gi, 'background: "#FFFFFF"');
      content = content.replace(/backgroundColor:\s*['"]#(080808|141414|191919|101010|1a1a1a|1e1e24)['"]/gi, 'backgroundColor: "#FFFFFF"');

      // Replace text colors from white to dark grey
      content = content.replace(/color:\s*['"]#(ffffff|fff)['"]/gi, 'color: "inherit"');
      // For specific hardcoded light text
      content = content.replace(/color:\s*['"]#ececec['"]/gi, 'color: "#646566"');

      // Replace gold accents with Goa Game Red/Coral
      content = content.replace(/color:\s*['"]#(FACC15|FCD34D|EAB308|D6AF37)['"]/gi, 'color: "#FF5A5F"');
      content = content.replace(/className=["']([^"']*)text-gold([^"']*)["']/g, 'className="$1text-[#FF5A5F]$2"');
      content = content.replace(/text-gold-light/g, 'text-[#FF7B80]');

      // Fix transparent borders and shadows from dark mode
      content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.\d+\)/gi, 'rgba(0, 0, 0, 0.05)');
      content = content.replace(/box-shadow:\s*0\s+0\s+20px\s+rgba\(214,\s*175,\s*55,\s*0\.15\)/gi, 'box-shadow: 0 4px 12px rgba(255, 90, 95, 0.2)');

      if (content !== original) {
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}

processDir('components');
processDir('app');
console.log('Fixed inline styles for GoaGame');
