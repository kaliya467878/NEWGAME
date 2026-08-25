const fs = require('fs');

let cssPath = 'app/club.css';
if (fs.existsSync(cssPath)) {
  let css = fs.readFileSync(cssPath, 'utf8');
  
  // Replace .club-categories block
  css = css.replace(
    /\.club-categories\s*\{\s*display:flex;\s*gap:14px;\s*margin:0 18px 20px;\s*padding:14px 18px;\s*overflow-x:auto;/g,
    `.club-categories {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin: 0;
    padding: 14px 8px;
    overflow-y: auto;`
  );
  
  // We also need to fix .club-categories width since margin was overridden.
  fs.writeFileSync(cssPath, css);
  console.log('Updated club.css for club-categories');
}
