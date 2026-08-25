const fs = require('fs');

let clubCss = fs.readFileSync('app/club.css', 'utf8');

// Ensure image container doesn't have white background
clubCss = clubCss.replace(/\.club-popular-card-media\s*\{[^}]*background:\s*var\(--theme-bg-card\);/g, function(match) {
    return match.replace('background: var(--theme-bg-card);', 'background: var(--theme-primary);');
});

clubCss = clubCss.replace(/\.club-popular-card-img\s*\{[^}]*object-fit:cover;/g, function(match) {
    return match.replace('object-fit:cover;', 'object-fit:cover;\n    object-position:center;\n    border-radius:14px;\n    border:none;');
});

fs.writeFileSync('app/club.css', clubCss);
console.log('Fixed club CSS image fitting');
