const fs = require('fs');

// 1. Update theme.css to Blue
let themeCss = fs.readFileSync('app/theme.css', 'utf8');
themeCss = themeCss.replace(/--theme-green:\s*#[a-zA-Z0-9]+;/g, '--theme-green: #4781FF;');
themeCss = themeCss.replace(/--theme-green-light:\s*#[a-zA-Z0-9]+;/g, '--theme-green-light: #6DA0FF;');
themeCss = themeCss.replace(/--theme-green-dark:\s*#[a-zA-Z0-9]+;/g, '--theme-green-dark: #2D65DC;');
themeCss = themeCss.replace(/--theme-green-deep:\s*#[a-zA-Z0-9]+;/g, '--theme-green-deep: #1A4BB8;');
themeCss = themeCss.replace(/--theme-green-glow:\s*[^;]+;/g, '--theme-green-glow: rgba(71, 129, 255, 0.1);');
themeCss = themeCss.replace(/--gradient-primary:\s*[^;]+;/g, '--gradient-primary: linear-gradient(90deg, #6DA0FF, #4781FF);');
themeCss = themeCss.replace(/--gradient-cta:\s*[^;]+;/g, '--gradient-cta: linear-gradient(90deg, #6DA0FF, #4781FF);');
fs.writeFileSync('app/theme.css', themeCss);

// 2. Fix inline styles in JS files that were set to RED (#FF5A5F) -> BLUE (#4781FF)
function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = require('path').join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!['node_modules', '.next', '.git'].includes(file)) {
        processDir(fullPath);
      }
    } else if (/\.(js|jsx|ts|tsx)$/.test(fullPath)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let original = content;
      content = content.replace(/#FF5A5F/gi, '#4781FF');
      content = content.replace(/#FF7B80/gi, '#6DA0FF');
      if (content !== original) {
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}
processDir('components');
processDir('app');

console.log('Fixed theme to Blue');
