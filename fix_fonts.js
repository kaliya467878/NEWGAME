const fs = require('fs');

// 1. Fix LobbyWidgets.js
let lwPath = 'components/home/LobbyWidgets.js';
let lwCss = fs.readFileSync(lwPath, 'utf8');

// Replace white text with proper variables
lwCss = lwCss.replace(/color:\s*rgba\(255,\s*255,\s*255,\s*0\.[0-9]+\)/g, 'color: var(--theme-text)');
lwCss = lwCss.replace(/border(-bottom)?:\s*1px (solid|dashed) rgba\(255,\s*255,\s*255,\s*0\.[0-9]+\)/g, 'border$1: 1px $2 var(--theme-border)');
lwCss = lwCss.replace(/border:\s*2px solid;/g, 'border: 2px solid var(--theme-border);');
lwCss = lwCss.replace(/background:\s*rgba\(255,\s*255,\s*255,\s*0\.02\)/g, 'background: var(--theme-bg-elevated)');

// For specific podium texts
lwCss = lwCss.replace(/\.text-gold-light\s*\{\s*color:\s*#[a-f0-9]+;\s*\}/g, '.text-gold-light { color: #854d0e; }'); // Dark gold
lwCss = lwCss.replace(/\.text-blue-light\s*\{\s*color:\s*#[a-f0-9]+;\s*\}/g, '.text-blue-light { color: #1e3a8a; }'); // Dark blue
lwCss = lwCss.replace(/\.text-pink-light\s*\{\s*color:\s*#[a-f0-9]+;\s*\}/g, '.text-pink-light { color: #831843; }'); // Dark pink
// Podium badge texts
lwCss = lwCss.replace(/\.badge-1\s*\{\s*background:\s*#[a-f0-9]+;\s*color:\s*#111;\s*\}/g, '.badge-1 { background: #d4af37; color: #fff; }');
lwCss = lwCss.replace(/\.badge-2\s*\{\s*background:\s*#[a-f0-9]+;\s*color:\s*var\(--theme-text\);\s*\}/g, '.badge-2 { background: #60a5fa; color: #fff; }');
lwCss = lwCss.replace(/\.badge-3\s*\{\s*background:\s*#[a-f0-9]+;\s*color:\s*var\(--theme-text\);\s*\}/g, '.badge-3 { background: #f472b6; color: #fff; }');

// Podium box shadow
lwCss = lwCss.replace(/box-shadow:\s*0 8px 32px rgba\(0,\s*0,\s*0,\s*0\.2\);/g, 'box-shadow: 0 8px 32px rgba(0, 0, 0, 0.05);');

fs.writeFileSync(lwPath, lwCss);

// 2. Fix legal.css
let legalPath = 'app/legal.css';
let legalCss = fs.readFileSync(legalPath, 'utf8');

// Change text color from faint border to text-muted
legalCss = legalCss.replace(/\.terms-flat-list-v2 li\s*\{[^}]*color:\s*var\(--theme-border\);/g, function(match) {
    return match.replace('color: var(--theme-border);', 'color: var(--theme-text-muted);');
});

fs.writeFileSync(legalPath, legalCss);

console.log('Fixed fonts and text colors');
