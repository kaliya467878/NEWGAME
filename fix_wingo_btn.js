const fs = require('fs');

// Fix Wingo CSS explicitly
let wingoCss = fs.readFileSync('app/wingo/wingo.css', 'utf8');

wingoCss = wingoCss.replace(/\.wg-color-btn\.green\s*\{\s*background:\s*var\(--theme-(primary|green)\);\s*\}/g, '.wg-color-btn.green { background: #10B981 !important; }');
wingoCss = wingoCss.replace(/\.wg-color-btn\.violet\s*\{\s*background:\s*var\(--theme-(primary|violet)\);\s*\}/g, '.wg-color-btn.violet { background: #8B5CF6 !important; }');
wingoCss = wingoCss.replace(/\.wg-color-btn\.red\s*\{\s*background:\s*var\(--theme-(primary|danger|red)\);\s*\}/g, '.wg-color-btn.red { background: #EF4444 !important; }');

// Also fix the betting sheet chips to ensure they use game colors
wingoCss = wingoCss.replace(/\.wg-bet-sheet\.theme-green \.wg-bet-chip\.active\s*\{[^}]+\}/g, '.wg-bet-sheet.theme-green .wg-bet-chip.active { background: #10B981; border-color: #10B981; color: #fff; }');
wingoCss = wingoCss.replace(/\.wg-bet-sheet\.theme-violet \.wg-bet-chip\.active\s*\{[^}]+\}/g, '.wg-bet-sheet.theme-violet .wg-bet-chip.active { background: #8B5CF6; border-color: #8B5CF6; color: #fff; }');
wingoCss = wingoCss.replace(/\.wg-bet-sheet\.theme-red \.wg-bet-chip\.active\s*\{[^}]+\}/g, '.wg-bet-sheet.theme-red .wg-bet-chip.active { background: #EF4444; border-color: #EF4444; color: #fff; }');

fs.writeFileSync('app/wingo/wingo.css', wingoCss);
console.log('Fixed Wingo exact game colors');
