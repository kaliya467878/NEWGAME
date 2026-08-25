const fs = require('fs');

let pbPath = 'components/home/PromoBanner.js';
let pbCode = fs.readFileSync(pbPath, 'utf8');

pbCode = pbCode.replace(/\/design\/banners\/wingo-payout\.png/g, '/design/banners/wingo-payout-v2.png');
pbCode = pbCode.replace(/\/design\/banners\/first-deposit-bonus\.png/g, '/design/banners/first-deposit-bonus-v2.png');
pbCode = pbCode.replace(/\/design\/banners\/login-bonus\.png/g, '/design/banners/login-bonus-v2.png');

fs.writeFileSync(pbPath, pbCode);
console.log('Fixed PromoBanner image urls');
