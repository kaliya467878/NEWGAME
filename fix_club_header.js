const fs = require('fs');

let clubCss = fs.readFileSync('app/club.css', 'utf8');

// Fix header colors
clubCss = clubCss.replace(/\.club-header\s*\{[^}]+\}/g, `
.club-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--theme-primary);
  color: #FFFFFF !important;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.club-header a, .club-header button, .club-header .club-header-title {
  color: #FFFFFF !important;
}
`);

// The "Account" page header shouldn't double up if there is a main header
// Wait, actually Account uses its own header sometimes.

fs.writeFileSync('app/club.css', clubCss);
console.log('Fixed club header');
