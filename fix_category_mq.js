const fs = require('fs');

let cssPath = 'app/club.css';
if (fs.existsSync(cssPath)) {
  let css = fs.readFileSync(cssPath, 'utf8');
  
  css = css.replace(
    /\.club-categories\{\s*margin-left:16px;\s*margin-right:16px;\s*\}/g,
    '/* Removed .club-categories mobile margins */'
  );
  
  fs.writeFileSync(cssPath, css);
  console.log('Fixed media query margins');
}
