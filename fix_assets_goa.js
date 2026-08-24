const fs = require('fs');

let content = fs.readFileSync('lib/designAssets.js', 'utf8');

// Replace banner
content = content.replace(/\/design\/banners\/banner1\.jpg/g, '/design/goa_logo.jpg');
content = content.replace(/\/design\/game-tiles\/wingo\.jpg/g, '/design/goa_wingo.jpg');
content = content.replace(/\/design\/game-tiles\/k3\.jpg/g, '/design/goa_k3.jpg');

fs.writeFileSync('lib/designAssets.js', content);
console.log('Fixed assets for GoaGame');
