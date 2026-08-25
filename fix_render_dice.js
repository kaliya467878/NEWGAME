const fs = require('fs');
let path = 'components/k3/K3GameScreen.js';
if (fs.existsSync(path)) {
  let code = fs.readFileSync(path, 'utf8');

  const searchStr = `  const renderDiceValue = (val) => {
    const getDots = (v) => {
      switch (v) {
        case 1: return [4];
        case 2: return [0, 8];
        case 3: return [0, 4, 8];
        case 4: return [0, 2, 6, 8];
        case 5: return [0, 2, 4, 6, 8];
        case 6: return [0, 2, 3, 5, 6, 8];
        default: return [];
      }
    };
    const dots = getDots(val);
    const accentIndex = dots.includes(4) ? 4 : dots[0];
    return Array.from({ length: 9 }).map((_, i) => (
      <div
        key={i}
        className={dots.includes(i) ? \`k3-dot\${i === accentIndex ? " k3-dot-accent" : ""}\` : ""}
      ></div>
    ));
  };`;

  const replaceStr = `  const renderDiceValue = (val) => {
    return <img src={\`/k3/images/\${val}.png\`} alt={\`Dice \${val}\`} className="w-6 h-6 object-contain" />;
  };`;

  code = code.replace(searchStr, replaceStr);
  fs.writeFileSync(path, code);
  console.log('Fixed renderDiceValue');
}
