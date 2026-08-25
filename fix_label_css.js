const fs = require('fs');

let cssPath = 'app/club.css';
if (fs.existsSync(cssPath)) {
  let css = fs.readFileSync(cssPath, 'utf8');
  
  const startIndex = css.indexOf('.club-category-label{');
  if (startIndex !== -1) {
    const endIndex = css.indexOf('}', startIndex);
    
    const newCss = `.club-category-label {
    color: #64748b;
    font-size: 11px;
    font-weight: 600;
    text-align: center;
    line-height: 1.3;
    white-space: normal;
    word-break: break-word;
    margin-top: 2px;
`;
    
    css = css.substring(0, startIndex) + newCss + css.substring(endIndex);
    fs.writeFileSync(cssPath, css);
    console.log('Replaced .club-category-label successfully.');
  }
}
