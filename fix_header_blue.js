const fs = require('fs');
let css = fs.readFileSync('app/club.css', 'utf8');

// The top header is BLUE in Goa Game
css = css.replace(/\.club-header\s*\{[^}]+\}/g, `
.club-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--theme-blue);
  color: #FFFFFF !important;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.club-header h1, .club-header span, .club-header div, .club-header a, .club-header svg {
  color: #FFFFFF !important;
}
`);
fs.writeFileSync('app/club.css', css);
