const fs = require('fs');
let path = 'components/k3/Dice3D.js';
if (fs.existsSync(path)) {
  let code = fs.readFileSync(path, 'utf8');

  const searchStr = `      <img src={\`/k3/images/\${value}.png\`} alt={\`Dice \${value}\`} style={{width: '100%', height: '100%', objectFit: 'contain', background: '#e7384a', borderRadius: '16%'}} />`;

  const replaceStr = `      <img src={\`/k3/images/\${value}.png\`} alt={\`Dice \${value}\`} style={{width: '100%', height: '100%', objectFit: 'contain', border: 'none'}} />`;

  code = code.replace(searchStr, replaceStr);
  fs.writeFileSync(path, code);
  console.log('Fixed Dice3D Background');
}
