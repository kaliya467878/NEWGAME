const fs = require('fs');
let path = 'app/globals.css';
if (fs.existsSync(path)) {
  let css = fs.readFileSync(path, 'utf8');
  css += `

/* Force Bottom Nav active color to Premium Blue */
.club-nav-item.active {
    color: #3b82f6 !important;
}
.club-nav-item.active svg {
    stroke: #3b82f6 !important;
}
`;
  fs.writeFileSync(path, css);
  console.log('Fixed nav active');
}
