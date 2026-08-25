const fs = require('fs');

// 1. Fix HomeScreen.js wrapper width
let homePath = 'components/home/HomeScreen.js';
if (fs.existsSync(homePath)) {
  let code = fs.readFileSync(homePath, 'utf8');
  code = code.replace(
    /<div style=\{\{ width: "72px", flexShrink: 0, position: "sticky", top: "70px", zIndex: 10 \}\}>/g,
    '<div style={{ width: "82px", flexShrink: 0, position: "sticky", top: "70px", zIndex: 10 }}>'
  );
  fs.writeFileSync(homePath, code);
  console.log('Updated HomeScreen.js wrapper width');
}

// 2. Fix club.css label styling
let cssPath = 'app/club.css';
if (fs.existsSync(cssPath)) {
  let css = fs.readFileSync(cssPath, 'utf8');
  
  css = css.replace(
    /\.club-category-label\{\s*color:#8A8A8A;\s*font-size:12px;\s*\}/g,
    `.club-category-label {
    color: #64748b;
    font-size: 11px;
    font-weight: 600;
    text-align: center;
    line-height: 1.2;
    white-space: normal;
    word-break: break-word;
}`
  );
  
  fs.writeFileSync(cssPath, css);
  console.log('Updated club.css label styling');
}
