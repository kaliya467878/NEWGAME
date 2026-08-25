const fs = require('fs');
let path = 'app/k3/dice3d.css';
if (fs.existsSync(path)) {
  let css = fs.readFileSync(path, 'utf8');
  css = css.replace(/filter:\s*drop-shadow[^;]+;/g, '');
  fs.writeFileSync(path, css);
  console.log('Removed flattening filters');
}
