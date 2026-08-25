const fs = require('fs');
let path = 'app/k3/dice3d.css';
if (fs.existsSync(path)) {
  let css = fs.readFileSync(path, 'utf8');
  if (!css.includes('@-webkit-keyframes k3dRoll')) {
    css = css.replace('@keyframes k3dRoll', '@-webkit-keyframes k3dRoll {\n  0%   { -webkit-transform: rotateX(0deg)   rotateY(0deg); transform: rotateX(0deg)   rotateY(0deg); }\n  100% { -webkit-transform: rotateX(360deg) rotateY(540deg); transform: rotateX(360deg) rotateY(540deg); }\n}\n@keyframes k3dRoll');
    css = css.replace('animation: k3dRoll 0.55s linear infinite;', '-webkit-animation: k3dRoll 0.55s linear infinite;\n  animation: k3dRoll 0.55s linear infinite;');
    fs.writeFileSync(path, css);
    console.log('Added webkit prefixes');
  }
}
