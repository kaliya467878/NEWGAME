const fs = require('fs');

let cssPath = 'app/club.css';
if (fs.existsSync(cssPath)) {
  let css = fs.readFileSync(cssPath, 'utf8');
  
  css = css.replace(
    /\.category-svg\s*\{\s*fill:\s*currentColor;\s*/g,
    '.category-svg {\n    fill: none;\n    '
  );
  
  fs.writeFileSync(cssPath, css);
  console.log('Fixed SVG fill in club.css');
}
