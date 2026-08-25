const fs = require('fs');

let cssPath = 'app/club.css';
if (fs.existsSync(cssPath)) {
  let css = fs.readFileSync(cssPath, 'utf8');
  
  // Find index of .club-categories { and the closing }
  const startIndex = css.indexOf('.club-categories {');
  if (startIndex !== -1) {
    const endIndex = css.indexOf('}', startIndex);
    
    const newCss = `.club-categories {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin: 0;
    padding: 16px 6px;
    overflow-y: auto;
    scrollbar-width: none;
    background: rgba(255, 255, 255, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.6);
    border-radius: 18px;
    backdrop-filter: blur(12px);
    box-shadow: 0 8px 32px rgba(71, 129, 255, 0.08);`;
    
    css = css.substring(0, startIndex) + newCss + css.substring(endIndex);
    fs.writeFileSync(cssPath, css);
    console.log('Replaced .club-categories successfully.');
  }
}
