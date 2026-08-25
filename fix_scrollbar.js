const fs = require('fs');

let cssPath = 'app/club.css';
if (fs.existsSync(cssPath)) {
  let css = fs.readFileSync(cssPath, 'utf8');
  
  if (!css.includes('.horizontal-swipe-grid::-webkit-scrollbar')) {
    css += `
.horizontal-swipe-grid::-webkit-scrollbar {
    display: none;
}
`;
    fs.writeFileSync(cssPath, css);
    console.log('Added scrollbar hidden to CSS');
  }
}
