const fs = require('fs');
let path = 'app/k3/dice3d.css';
if (fs.existsSync(path)) {
  let css = fs.readFileSync(path, 'utf8');

  // Strip all existing background: definitions for faces
  css = css.replace(/background:[\s\S]*?;/g, (match) => {
    if (match.includes('radial-gradient(125%') || match.includes('155deg') || match.includes('radial-gradient(circle at 34%')) {
      return '';
    }
    return match;
  });

  // Re-add the gold gradient to .k3d-face
  const faceTarget = 'backface-visibility: hidden;';
  if (css.includes(faceTarget) && !css.includes('linear-gradient(135deg, #FFDF73 0%, #E8B430 100%)')) {
    css = css.replace(faceTarget, 'backface-visibility: hidden;\n  background: linear-gradient(135deg, #FFDF73 0%, #E8B430 100%);\n  border: 1px solid #b38b1d;\n  box-shadow: inset 0 0 10px rgba(184, 134, 11, 0.4);');
  }

  fs.writeFileSync(path, css);
  console.log('Fixed dice3d.css colors properly');
}
