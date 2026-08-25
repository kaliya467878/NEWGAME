const fs = require('fs');

let pbPath = 'components/home/PromoBanner.js';
let pbCode = fs.readFileSync(pbPath, 'utf8');

// The ultimate fallback: completely bypass the API and use hardcoded images if the DB returns the wrong ones
pbCode = pbCode.replace(
  /if \(activeFetch && resData\?\.success && Array\.isArray\(resData\?\.data\?\.carousel\)\) \{/,
  `if (activeFetch && resData?.success && Array.isArray(resData?.data?.carousel)) {
          // FORCE OVERRIDE DB DATA
          const defaultImages = ["/design/banners/wingo-payout.png", "/design/banners/first-deposit-bonus.png", "/design/banners/login-bonus.png"];
          resData.data.carousel = resData.data.carousel.map((b, index) => ({
            ...b,
            image: defaultImages[index % defaultImages.length]
          }));`
);

fs.writeFileSync(pbPath, pbCode);
console.log('Force overridden the frontend images directly');
