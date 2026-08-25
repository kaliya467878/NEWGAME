const fs = require('fs');
let path = 'app/globals.css';
if (fs.existsSync(path)) {
  let css = fs.readFileSync(path, 'utf8');
  
  // Inject Google Fonts import at the top
  const importStatement = `@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700;800&display=swap');\n`;
  
  // Add base typography rules
  const baseRules = `
body, .club-body, html, * {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

h1, h2, h3, h4, h5, h6, 
.wg-wallet-amount, .wg-countdown-digit, 
.wg-color-btn, .wg-size-btn, .wg-num-btn, 
.wg-table-num, .wg-mini-ball, 
.text-3xl, .text-2xl, button {
  font-family: 'Poppins', sans-serif !important;
}

.wg-color-btn, .wg-size-btn, button {
  letter-spacing: 0.5px !important;
  text-transform: uppercase !important;
}

.wg-num-btn {
  font-weight: 700 !important;
}
`;

  // Prepend
  if (!css.includes('fonts.googleapis.com')) {
    css = importStatement + css;
  }
  
  // Append
  css += '\n' + baseRules;
  
  fs.writeFileSync(path, css);
  console.log('Fixed global typography');
}
