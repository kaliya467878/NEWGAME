const fs = require('fs');

let content = fs.readFileSync('components/home/BottomNav.js', 'utf8');

// Replace "Invite" with "Activity"
content = content.replace(/label:\s*"Invite"/g, 'label: "Activity"');

// Fix the promo icon background/styles
// In GoaGame the promo button has a diamond diamond / red hexagon icon or similar.

fs.writeFileSync('components/home/BottomNav.js', content);
console.log('Fixed nav labels');
