const fs = require('fs');

let themeCss = fs.readFileSync('app/theme.css', 'utf8');

// Restore the actual game colors but keep them flat and clean
themeCss = themeCss.replace(/--theme-green:\s*var\(--theme-primary\);/g, '--theme-green: #10B981;');
themeCss = themeCss.replace(/--theme-violet:\s*var\(--theme-primary\);/g, '--theme-violet: #8B5CF6;');
themeCss = themeCss.replace(/--theme-danger:\s*var\(--theme-primary\);/g, '--theme-danger: #EF4444;');
themeCss = themeCss.replace(/--theme-red:\s*var\(--theme-primary\);/g, '--theme-red: #EF4444;');

fs.writeFileSync('app/theme.css', themeCss);

// Force Wingo to use flat colors
let wingoCss = fs.readFileSync('app/wingo/wingo.css', 'utf8');

// Remove white glassy overlays entirely
wingoCss = wingoCss.replace(/\.wg-color-btn::before\s*\{[^}]+\}/g, '.wg-color-btn::before { display: none; }');
wingoCss = wingoCss.replace(/\.wg-num-btn::before\s*\{[^}]+\}/g, '.wg-num-btn::before { display: none; }');
wingoCss = wingoCss.replace(/\.wg-mini-ball::before\s*\{[^}]+\}/g, '.wg-mini-ball::before { display: none; }');
wingoCss = wingoCss.replace(/\.wg-table-num::before\s*\{[^}]+\}/g, '.wg-table-num::before { display: none; }');
wingoCss = wingoCss.replace(/\.wg-chart-ball::before\s*\{[^}]+\}/g, '.wg-chart-ball::before { display: none; }');

fs.writeFileSync('app/wingo/wingo.css', wingoCss);

console.log('Restored game colors and ensured glossy overlays are removed');
