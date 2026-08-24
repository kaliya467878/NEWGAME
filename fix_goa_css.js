const fs = require('fs');

let css = fs.readFileSync('app/club.css', 'utf8');

// Replace dark background for main container
css = css.replace(/\.club-app\s*\{[^}]+\}/g, `
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

// The top header is RED in Goa Game
css = css.replace(/\.club-header\s*\{[^}]+\}/g, `
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

// General buttons are red
css = css.replace(/\.club-btn-gradient\s*\{[^}]+\}/g, `
.club-btn-gradient {
  background: var(--gradient-primary);
  color: #FFFFFF !important;
  border: none;
  box-shadow: 0 4px 8px rgba(255, 90, 95, 0.3);
  transition: opacity 0.2s ease;
  border-radius: 40px;
}
`);
css = css.replace(/\.club-btn-primary\s*\{[^}]+\}/g, `
.club-btn-primary {
  background: var(--theme-green);
  color: #FFFFFF !important;
  border: none;
  border-radius: 4px;
}
`);

// Cards should be white
css = css.replace(/\.club-game-card\s*\{[^}]+\}/g, `
.club-game-card {
  background: var(--theme-bg-card);
  border: 1px solid var(--theme-border);
  box-shadow: var(--theme-shadow-sm);
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}
`);

// Bottom Nav
css = css.replace(/\.club-bottom-nav\s*\{[^}]+\}/g, `
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

css = css.replace(/\.club-nav-item\s*\{[^}]+\}/g, `
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

// Fix headings color globally
css = css.replace(/h1, h2, h3, h4 \{ color: #FFFFFF; \}/g, `h1, h2, h3, h4 { color: var(--theme-text); }`);

fs.writeFileSync('app/club.css', css);
console.log('Fixed club.css for GoaGame');
