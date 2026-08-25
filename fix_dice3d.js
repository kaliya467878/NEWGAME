const fs = require('fs');
let path = 'components/k3/Dice3D.js';
if (fs.existsSync(path)) {
  let code = fs.readFileSync(path, 'utf8');

  const searchStr = `function Face({ value, variant }) {
  const pips = PIPS[value] || [];
  const isYellow = value === 1 || value === 4 || value === 5;
  return (
    <div className={\`k3d-face k3d-face--\${variant}\`}>
      {Array.from({ length: 9 }).map((_, i) => (
        <span key={i} className={pips.includes(i) ? \`k3d-pip \${isYellow ? "k3d-pip--yellow" : "k3d-pip--white"}\` : "k3d-pip-empty"} />
      ))}
    </div>
  );
}`;

  const replaceStr = `function Face({ value, variant }) {
  return (
    <div className={\`k3d-face k3d-face--\${variant}\`}>
      <img src={\`/k3/images/\${value}.png\`} alt={\`Dice \${value}\`} style={{width: '100%', height: '100%', objectFit: 'contain', background: '#e7384a', borderRadius: '16%'}} />
    </div>
  );
}`;

  code = code.replace(searchStr, replaceStr);
  fs.writeFileSync(path, code);
  console.log('Fixed Dice3D');
}
