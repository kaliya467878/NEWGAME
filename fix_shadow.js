const fs = require('fs');
let path = 'app/club.css';
let code = fs.readFileSync(path, 'utf8');

// Fix red shadow
code = code.replace(/rgba\(255, 90, 95, 0\.4\)/g, 'rgba(71, 129, 255, 0.4)');

// Fix goa-promo-go text color
code = code.replace(/\.goa-promo-go\s*\{[^}]*color:\s*var\(--theme-text\);/g, (match) => match.replace('var(--theme-text)', '#FFFFFF'));

fs.writeFileSync(path, code);
