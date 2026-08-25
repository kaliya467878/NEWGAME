const fs = require('fs');

let annPath = 'components/home/AnnouncementBar.js';
let annCode = fs.readFileSync(annPath, 'utf8');

// Change the SVG color to white so it contrasts against the blue background
annCode = annCode.replace(/color:\s*"var\(--theme-gold-bright\)"/g, 'color: "#FFFFFF"');
annCode = annCode.replace(/color:\s*"var\(--theme-warning\)"/g, 'color: "#FFFFFF"');

// And make sure the text color is not so grey on white background
annCode = annCode.replace(/color:\s*"#D8D8D8"/g, 'color: "var(--theme-text)"');

fs.writeFileSync(annPath, annCode);
console.log('Fixed announcement bar icon');
