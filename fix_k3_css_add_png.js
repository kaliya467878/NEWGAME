const fs = require('fs');
let path = 'app/k3/k3.css';
if (fs.existsSync(path)) {
  let css = fs.readFileSync(path, 'utf8');
  css += `
.dice-png-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}
.dice-png-img {
  width: 90%;
  height: auto;
  object-fit: contain;
}
`;
  fs.writeFileSync(path, css);
  console.log('Added dice-png-img CSS');
}
