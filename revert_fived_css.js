const fs = require('fs');
let path = 'app/fived/fived.css';
if (fs.existsSync(path)) {
  let css = fs.readFileSync(path, 'utf8');
  const marker = '/* ==========================================================\n   5D PREMIUM LIGHT THEME (WINGO-STYLE)\n========================================================== */';
  const index = css.indexOf(marker);
  if (index !== -1) {
    css = css.substring(0, index);
    fs.writeFileSync(path, css);
    console.log('Reverted 5D Light Theme');
  }
}
