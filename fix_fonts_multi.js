const fs = require('fs');
let path = 'app/globals.css';
if (fs.existsSync(path)) {
  let css = fs.readFileSync(path, 'utf8');
  
  const additional = `
.wg-multi-btn, .wg-random-btn {
  font-family: 'Poppins', sans-serif !important;
}
`;
  css += additional;
  fs.writeFileSync(path, css);
}
