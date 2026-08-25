const fs = require('fs');
let path = 'app/k3/k3.css';
if (fs.existsSync(path)) {
  let css = fs.readFileSync(path, 'utf8');
  css += `

/* Remove white glare from 2D dice faces */
.k3d2-face::before {
    display: none !important;
}
`;
  fs.writeFileSync(path, css);
  console.log('Fixed k3d2 glare');
}
