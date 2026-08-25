const fs = require('fs');
let clubCss = fs.readFileSync('app/club.css', 'utf8');

// Add padding-bottom to club-app so content is not hidden by bottom nav
clubCss = clubCss.replace(/\.club-app\s*\{/, '.club-app {\n    padding-bottom: 90px !important;');

fs.writeFileSync('app/club.css', clubCss);
console.log('Fixed padding');
