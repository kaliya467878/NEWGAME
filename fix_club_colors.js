const fs = require('fs');
let css = fs.readFileSync('app/club.css', 'utf8');

css = css.replace(/radial-gradient\(circle, #FF9B44, #FF5A5F\)/g, 'var(--theme-primary)');
css = css.replace(/#FF5A5F/g, 'var(--theme-primary)');
css = css.replace(/#FF9B44/g, 'var(--theme-primary)');
css = css.replace(/#d4af37/gi, 'var(--theme-primary)');

fs.writeFileSync('app/club.css', css);
console.log('Fixed club.css colors');
