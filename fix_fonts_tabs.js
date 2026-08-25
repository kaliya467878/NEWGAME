const fs = require('fs');
let path = 'app/globals.css';
if (fs.existsSync(path)) {
  let css = fs.readFileSync(path, 'utf8');
  
  const additional = `
.grid-cols-4 span {
  font-family: 'Poppins', sans-serif !important;
}
`;
  css += additional;
  fs.writeFileSync(path, css);
}
