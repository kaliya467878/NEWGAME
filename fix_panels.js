const fs = require('fs');
let path = 'app/wingo/wingo.css';
if (fs.existsSync(path)) {
  let css = fs.readFileSync(path, 'utf8');
  
  const additionalCSS = `
/* Unify Bet Zone and Panel into a single clean container */
.wg-bet-panel {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
}

.wg-bet-zone {
    background: #FFFFFF !important;
    border-radius: 16px !important;
    padding: 20px !important;
    margin: 16px !important;
    box-shadow: 0 8px 24px rgba(0,0,0,0.04) !important;
}
`;
  css += additionalCSS;
  fs.writeFileSync(path, css);
  console.log('Fixed Bet Zone panels');
}
