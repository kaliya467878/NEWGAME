const fs = require('fs');
let css = fs.readFileSync('app/globals.css', 'utf8');

// Change body background to light grey instead of black
css = css.replace(/body\s*\{[^}]+\}/g, `
body {
  background-color: #EAEAEA;
  color: var(--theme-text);
  font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif;
  margin: 0;
  padding: 0;
  -webkit-font-smoothing: antialiased;
}
`);
fs.writeFileSync('app/globals.css', css);
