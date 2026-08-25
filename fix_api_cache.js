const fs = require('fs');

let apiPath = 'app/api/platform/promos/route.ts';
let apiCode = fs.readFileSync(apiPath, 'utf8');

apiCode = apiCode.replace(/\/design\/banners\/wingo-payout\.png/g, '/design/banners/wingo-payout-v2.png');
apiCode = apiCode.replace(/\/design\/banners\/first-deposit-bonus\.png/g, '/design/banners/first-deposit-bonus-v2.png');
apiCode = apiCode.replace(/\/design\/banners\/login-bonus\.png/g, '/design/banners/login-bonus-v2.png');

fs.writeFileSync(apiPath, apiCode);
console.log('Fixed API route image urls');
