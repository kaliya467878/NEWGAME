const fs = require('fs');
let path = 'components/k3/Dice2D.js';
if (fs.existsSync(path)) {
  let code = fs.readFileSync(path, 'utf8');
  
  const searchStr = `          <div className="k3d2-face" role="img" aria-label={\`Dice showing \${face}\`}>
            {Array.from({ length: 9 }).map((_, i) => (
              <span key={i} className={pips.includes(i) ? "k3d2-pip" : "k3d2-pip-empty"} />
            ))}
          </div>`;
          
  const replaceStr = `          <img src={\`/k3/images/\${face}.png\`} alt={\`Dice \${face}\`} className="w-16 h-16 object-contain drop-shadow-md" />`;

  code = code.replace(searchStr, replaceStr);
  fs.writeFileSync(path, code);
  console.log('Fixed Dice2D');
}
