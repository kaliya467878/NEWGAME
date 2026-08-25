const fs = require('fs');
let path = 'app/globals.css';
if (fs.existsSync(path)) {
  let css = fs.readFileSync(path, 'utf8');
  
  const additional = `
a[href*="/wallet/withdraw"], a[href*="/wallet/deposit"] {
  font-family: 'Poppins', sans-serif !important;
  text-transform: uppercase !important;
  letter-spacing: 0.5px !important;
}
`;
  css += additional;
  fs.writeFileSync(path, css);
}
