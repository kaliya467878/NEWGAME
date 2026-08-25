const fs = require('fs');
let cssPath = 'app/club.css';
let jsPath = 'components/home/GameGrid.js';

if (fs.existsSync(jsPath)) {
  let jsCode = fs.readFileSync(jsPath, 'utf8');
  jsCode = jsCode.replace(/className=""/g, 'className="club-game-item"');
  jsCode = jsCode.replace(/className="coming-soon"/g, 'className="club-game-item coming-soon"');
  fs.writeFileSync(jsPath, jsCode);
  console.log('Added club-game-item class');
}

if (fs.existsSync(cssPath)) {
  let cssCode = fs.readFileSync(cssPath, 'utf8');
  if (!cssCode.includes('.club-game-item')) {
    cssCode += `
.club-game-item {
    transition: transform 0.25s ease;
    cursor: pointer;
}
.club-game-item:hover {
    transform: translateY(-5px);
}
.club-game-item:active {
    transform: translateY(-2px) scale(0.99);
}
`;
    fs.writeFileSync(cssPath, cssCode);
    console.log('Added hover effects to club.css');
  }
}
