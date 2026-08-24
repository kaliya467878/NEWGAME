const fs = require('fs');

// 1. Update theme.css to Blue GoaGame Replica
let themeCss = fs.readFileSync('app/theme.css', 'utf8');

// Replace dark colors with GoaGame colors
themeCss = themeCss.replace(/--theme-bg:\s*#[0-9a-fA-F]+;/g, '--theme-bg: #F7F8FA;');
themeCss = themeCss.replace(/--theme-bg-soft:\s*#[0-9a-fA-F]+;/g, '--theme-bg-soft: #FFFFFF;');
themeCss = themeCss.replace(/--theme-bg-elevated:\s*#[0-9a-fA-F]+;/g, '--theme-bg-elevated: #FFFFFF;');
themeCss = themeCss.replace(/--theme-bg-card:\s*#[0-9a-fA-F]+;/g, '--theme-bg-card: #FFFFFF;');
themeCss = themeCss.replace(/--theme-bg-muted:\s*#[0-9a-fA-F]+;/g, '--theme-bg-muted: #F2F3F5;');
themeCss = themeCss.replace(/--theme-bg-input:\s*#[0-9a-fA-F]+;/g, '--theme-bg-input: #F7F8FA;');

themeCss = themeCss.replace(/--theme-text:\s*#[0-9a-fA-F]+;/g, '--theme-text: #323233;');
themeCss = themeCss.replace(/--theme-text-secondary:\s*#[0-9a-fA-F]+;/g, '--theme-text-secondary: #646566;');
themeCss = themeCss.replace(/--theme-text-muted:\s*#[0-9a-fA-F]+;/g, '--theme-text-muted: #969799;');

themeCss = themeCss.replace(/--theme-green:\s*#[0-9a-fA-F]+;/g, '--theme-green: #4781FF;');
themeCss = themeCss.replace(/--theme-green-light:\s*#[0-9a-fA-F]+;/g, '--theme-green-light: #6DA0FF;');
themeCss = themeCss.replace(/--theme-green-dark:\s*#[0-9a-fA-F]+;/g, '--theme-green-dark: #2D65DC;');

themeCss = themeCss.replace(/--theme-border:\s*#[0-9a-fA-F]+;/g, '--theme-border: #EBEDF0;');
themeCss = themeCss.replace(/--theme-border-muted:\s*#[0-9a-fA-F]+;/g, '--theme-border-muted: #F2F3F5;');

themeCss = themeCss.replace(/--theme-shadow-[a-z]+:\s*[^;]+;/g, (match) => {
  if (match.includes('green') || match.includes('gold')) {
    return '--theme-shadow-green: 0 4px 14px rgba(71, 129, 255, 0.25);';
  }
  return match; // keep sm, md, lg
});

themeCss = themeCss.replace(/--gradient-primary:\s*[^;]+;/g, '--gradient-primary: linear-gradient(90deg, #6DA0FF, #4781FF);');
themeCss = themeCss.replace(/--gradient-cta:\s*[^;]+;/g, '--gradient-cta: linear-gradient(90deg, #6DA0FF, #4781FF);');
themeCss = themeCss.replace(/--color-primary:\s*var\(--theme-green\);/g, '--color-primary: #4781FF;');
themeCss = themeCss.replace(/--color-accent:\s*var\(--theme-gold\);/g, '--color-accent: #FF5A5F;'); // Red accent for some things
themeCss = themeCss.replace(/--theme-gold:\s*#[a-zA-Z0-9]+;/g, '--theme-gold: #FF5A5F;');

fs.writeFileSync('app/theme.css', themeCss);


// 2. Fix club.css
let clubCss = fs.readFileSync('app/club.css', 'utf8');

clubCss = clubCss.replace(/\.club-header\s*\{[^}]+\}/g, `
.club-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--theme-green);
  color: #FFFFFF !important;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.club-header h1, .club-header span, .club-header div, .club-header a, .club-header svg {
  color: #FFFFFF !important;
}
`);

// The background of body/app container
clubCss = clubCss.replace(/\.club-app\s*\{[^}]+\}/g, `
.club-app {
  background: var(--theme-bg);
  color: var(--theme-text);
  min-height: 100vh;
  max-width: 480px;
  margin: 0 auto;
  box-shadow: 0 0 10px rgba(0,0,0,0.1);
  position: relative;
  font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, sans-serif;
}
`);

// Bottom Nav
clubCss = clubCss.replace(/\.club-bottom-nav\s*\{[^}]+\}/g, `
.club-bottom-nav {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 480px;
  background: #FFFFFF;
  border-top: 1px solid #EAEAEA;
  display: flex;
  justify-content: space-around;
  padding: 8px 0;
  z-index: 50;
  box-shadow: 0 -2px 6px rgba(0,0,0,0.05);
  padding-bottom: env(safe-area-inset-bottom, 8px);
}
`);

clubCss = clubCss.replace(/\.club-nav-item\s*\{[^}]+\}/g, `
.club-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: #969799;
  font-size: 11px;
  font-weight: 400;
  gap: 4px;
  transition: color 0.2s;
}
.club-nav-item.active {
  color: var(--theme-green);
}
.club-nav-item.active svg {
  stroke: var(--theme-green);
}
`);

clubCss += `
/* Goa Game Center Promo Button */
.club-nav-promo-btn-goa {
  position: absolute;
  top: -24px;
  left: 50%;
  transform: translateX(-50%);
  width: 56px;
  height: 56px;
  background: radial-gradient(circle, #FF9B44, #FF5A5F);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 10px rgba(255, 90, 95, 0.4);
  border: 3px solid #FFFFFF;
}
.goa-promo-dial {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 2px dashed rgba(255,255,255,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}
.goa-promo-go {
  color: #FFFFFF;
  font-weight: 800;
  font-size: 16px;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
}
.goa-promo-text {
  margin-top: 24px;
  color: var(--theme-green);
  font-weight: 700;
  font-size: 11px;
}
`;

fs.writeFileSync('app/club.css', clubCss);
console.log('Fixed themes correctly.');
