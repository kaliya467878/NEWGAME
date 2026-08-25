const fs = require('fs');
let themeCss = fs.readFileSync('app/theme.css', 'utf8');

// Replace any remaining green/violet/red variables in the theme with primary to strictly enforce 2-color UI
themeCss = themeCss.replace(/--theme-green:\s*#[a-zA-Z0-9]+;/g, '--theme-green: var(--theme-primary);');
themeCss = themeCss.replace(/--theme-violet:\s*#[a-zA-Z0-9]+;/g, '--theme-violet: var(--theme-primary);');
themeCss = themeCss.replace(/--theme-red:\s*#[a-zA-Z0-9]+;/g, '--theme-red: var(--theme-primary);');
themeCss = themeCss.replace(/--theme-danger:\s*#[a-zA-Z0-9]+;/g, '--theme-danger: var(--theme-primary);');

fs.writeFileSync('app/theme.css', themeCss);

// Let's also check LobbyWidgets.js to see if it uses 10b981 for amount
let lwCss = fs.readFileSync('components/home/LobbyWidgets.js', 'utf8');
lwCss = lwCss.replace(/#10b981/g, 'var(--theme-primary)');
fs.writeFileSync('components/home/LobbyWidgets.js', lwCss);

console.log('Fixed theme vars to strict 2-color');
