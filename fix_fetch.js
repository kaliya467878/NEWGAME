const fs = require('fs');

let pbPath = 'components/home/PromoBanner.js';
let pbCode = fs.readFileSync(pbPath, 'utf8');

pbCode = pbCode.replace(/fetch\("\/api\/platform\/promos"\)/g, 'fetch("/api/platform/promos?v=" + Date.now(), { cache: "no-store" })');

fs.writeFileSync(pbPath, pbCode);
console.log('Fixed fetch in PromoBanner to avoid caching');
