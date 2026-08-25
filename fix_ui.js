const fs = require('fs');

// 1. Fix auth components (Login & Register)
const authFiles = ['components/auth/LoginScreen.js', 'components/auth/RegisterForm.js'];
authFiles.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    // Change gold colors to theme primary
    content = content.replace(/rgba\(255,\s*215,\s*80,\s*0\.2\)/g, 'rgba(71, 129, 255, 0.2)');
    content = content.replace(/color:\s*"var\(--theme-gold-bright\)"/g, 'color: "var(--theme-primary)"');
    // Make auth inputs look more premium
    content = content.replace(/border:\s*"1px solid rgba\(255, 215, 80, 0\.2\)"/g, 'border: "1px solid rgba(71, 129, 255, 0.2)"');
    fs.writeFileSync(file, content);
  }
});

// 2. Fix club.css overall UI improvements
let clubCss = fs.readFileSync('app/club.css', 'utf8');

// Replace any hardcoded ugly shadows with softer, more modern Apple-like shadows
clubCss = clubCss.replace(/box-shadow:\s*0 4px 10px rgba\([^)]+\)/g, 'box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05)');
clubCss = clubCss.replace(/box-shadow:\s*0 8px 24px rgba\([^)]+\)/g, 'box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06)');

// Ensure Promo button has blue shadow instead of red
clubCss = clubCss.replace(/\.club-nav-promo-btn-goa\s*\{[\s\S]*?\}/, match => {
  return match.replace(/box-shadow: 0 4px 15px rgba\(0, 0, 0, 0\.05\);/, 'box-shadow: 0 4px 15px rgba(71, 129, 255, 0.3);');
});

// Fix bottom nav border
clubCss = clubCss.replace(/border-top: 1px solid #EAEAEA;/, 'border-top: 1px solid rgba(0,0,0,0.04);');

// Fix buttons to look better
clubCss = clubCss.replace(/\.premium-register-btn\{[\s\S]*?\}/, match => {
    return match.replace(/background:.*?;/, 'background: var(--theme-primary);');
});

// Make headers look cleaner
clubCss = clubCss.replace(/\.club-header\s*\{[\s\S]*?\}/, match => {
    return match.replace(/background: var\(--theme-primary\);/, 'background: #FFFFFF;\n    color: var(--theme-text) !important;\n    border-bottom: 1px solid rgba(0,0,0,0.04);');
});

// Write it back
fs.writeFileSync('app/club.css', clubCss);

// 3. AppHeader component - replace white text classes with dark classes if the background is now white
let headerFile = 'components/home/AppHeader.js';
if (fs.existsSync(headerFile)) {
    let headerCode = fs.readFileSync(headerFile, 'utf8');
    // If the header is now white, the text needs to be dark
    headerCode = headerCode.replace(/color:\s*"#FFFFFF"/g, 'color: "var(--theme-text)"');
    // For logos or icons that might have white color
    headerCode = headerCode.replace(/fill="white"/gi, 'fill="var(--theme-primary)"');
    fs.writeFileSync(headerFile, headerCode);
}

console.log('UI improvements applied.');
