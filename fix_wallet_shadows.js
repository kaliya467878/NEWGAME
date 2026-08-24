const fs = require('fs');
let css = fs.readFileSync('app/wallet/wallet.css', 'utf8');

// Fix dark box shadows
css = css.replace(/box-shadow:\s*0 20px 45px rgba\([^)]+\)/g, 'box-shadow: var(--theme-shadow-lg)');
css = css.replace(/rgba\(148, 163, 184, 0.\d+\)/g, 'var(--theme-border)');
css = css.replace(/rgba\(71, 129, 255, 0.2\)/g, 'var(--theme-green-border)');

fs.writeFileSync('app/wallet/wallet.css', css);
