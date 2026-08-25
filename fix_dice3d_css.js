const fs = require('fs');
let path = 'app/k3/dice3d.css';
if (fs.existsSync(path)) {
  let css = fs.readFileSync(path, 'utf8');

  // Replace backgrounds for faces to be golden
  css = css.replace(/background: radial-gradient\(125% 120%.*?;/g, 'background: linear-gradient(135deg, #FFDF73 0%, #E8B430 100%);');
  css = css.replace(/background: linear-gradient\(\s*155deg,\s*var\(--theme-border\).*?;/g, 'background: linear-gradient(135deg, #FFDF73 0%, #E8B430 100%);');
  css = css.replace(/background: linear-gradient\(\s*155deg,\s*#fff.*?;/gs, 'background: linear-gradient(135deg, #FFDF73 0%, #E8B430 100%);');
  
  // Give all faces a consistent border and gold gradient
  const faceCss = `
.k3d-face {
  position: absolute;
  width: var(--die);
  height: var(--die);
  background: radial-gradient(circle at top left, #fff6c2 0%, #ffd54a 40%, #e0a520 70%, #b07e14 100%);
  border: 1px solid #8B6914;
  border-radius: 20%;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 2px;
  padding: 8px;
  box-shadow: inset 0 0 10px rgba(139, 105, 20, 0.5);
  backface-visibility: hidden;
}`;
  
  css = css.replace(/\.k3d-face \{[\s\S]*?backface-visibility: hidden;\s*\n\}/, faceCss);

  // Add black pip
  css += `
.k3d-pip-black {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #444 0%, #111 70%, #000 100%);
  box-shadow: 0 1px 2px rgba(255,255,255,0.4), inset 0 2px 4px rgba(0,0,0,0.8);
}
`;
  fs.writeFileSync(path, css);
  console.log('Fixed dice3d.css to gold');
}
