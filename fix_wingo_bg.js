const fs = require('fs');
let path = 'app/wingo/wingo.css';
if (fs.existsSync(path)) {
  let code = fs.readFileSync(path, 'utf8');
  
  // Fix wingo-game background
  code = code.replace(/var\(--theme-primary\);/g, 'var(--theme-bg-soft);');
  
  // Fix dark header
  code = code.replace(/background:\s*rgba\(8,8,8,\.72\);/g, 'background: #FFFFFF;');
  
  // Back button should be dark now
  code = code.replace(/\.wg-back\s*\{[\s\S]*?\}/, match => {
    return match.replace(/color:\s*var\(--theme-text\);/, 'color: var(--theme-text);');
  });

  fs.writeFileSync(path, code);
  console.log('Fixed wingo css');
}
