const fs = require('fs');
let path = 'app/k3/dice3d.css';
if (fs.existsSync(path)) {
  let css = fs.readFileSync(path, 'utf8');
  css += `

/* Remove white glare from 3D dice faces */
.k3d-face::before {
    display: none !important;
}
`;
  fs.writeFileSync(path, css);
  console.log('Fixed dice3d glare');
}
