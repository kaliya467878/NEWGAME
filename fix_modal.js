const fs = require('fs');
let path = 'components/home/WelcomeModal.js';
if (fs.existsSync(path)) {
  let code = fs.readFileSync(path, 'utf8');
  code = code.replace(/color:\s*"#d1d5db"/g, 'color: "var(--theme-text)"');
  code = code.replace(/color:\s*"#a1a1aa"/g, 'color: "var(--theme-text-secondary)"');
  code = code.replace(/color:\s*"#c5a85c"/g, 'color: "var(--theme-primary)"');
  
  // Fix broken emoji/characters if any
  code = code.replace(/dY>\,\?/g, '???');
  code = code.replace(/o"/g, '?');
  code = code.replace(/o/g, '?');
  
  fs.writeFileSync(path, code);
  console.log('Fixed WelcomeModal');
}
