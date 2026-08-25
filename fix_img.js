const fs = require('fs');

let ggPath = 'components/home/GameGrid.js';
let ggCode = fs.readFileSync(ggPath, 'utf8');

// Replace the inline style on the image to make it fit properly with no white space
ggCode = ggCode.replace(
  /style=\{\{\s*position:\s*"absolute",\s*inset:\s*0,\s*width:\s*"100%",\s*height:\s*"100%",\s*objectFit:\s*"cover",\s*borderRadius:\s*"14px"\s*\}\}/g,
  'style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", border: "none" }}'
);

// Modify the container to ensure it covers the space fully
ggCode = ggCode.replace(
  /style=\{\{\s*width:\s*"100%",\s*aspectRatio:\s*"3\/4",\s*position:\s*"relative",\s*borderRadius:\s*"14px",\s*overflow:\s*"hidden",\s*border:\s*"1px solid var\(--theme-border\)",\s*boxShadow:\s*"0 4px 10px rgba\(0,\s*0,\s*0,\s*0\.05\)"\s*\}\}/g,
  'style={{ width: "100%", aspectRatio: "3/4", position: "relative", borderRadius: "14px", overflow: "hidden", border: "none", boxShadow: "0 4px 12px rgba(71, 129, 255, 0.15)", background: "var(--theme-primary)" }}'
);

fs.writeFileSync(ggPath, ggCode);
console.log('Fixed GameGrid image sizing');
