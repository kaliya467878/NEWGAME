const fs = require('fs');
let path = 'app/wingo/wingo.css';
if (fs.existsSync(path)) {
  let css = fs.readFileSync(path, 'utf8');
  css = css.replace(/min-width: 32px !important;/g, 'min-width: 36px !important;');
  fs.writeFileSync(path, css);
}
