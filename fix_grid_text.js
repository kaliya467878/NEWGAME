const fs = require('fs');
let path = 'components/home/GameGrid.js';
if (fs.existsSync(path)) {
  let code = fs.readFileSync(path, 'utf8');
  
  // Replace the old text container block with the new one
  const oldText = `<div style={{ textAlign: "center", marginTop: "8px", padding: "0 2px" }}>
                <span style={{ display: "block", color: "var(--theme-text)", fontSize: "11px", fontWeight: "700", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{game.label}</span>
                <span style={{ display: "block", color: "var(--theme-green)", fontSize: "9px", fontWeight: "600", textTransform: "uppercase", marginTop: "2px" }}>{getCategoryLabel(game.category)}</span>
              </div>`;
              
  const newText = `<div style={{ textAlign: "left", marginTop: "10px", padding: "0 4px" }}>
                <span style={{ display: "block", color: "var(--theme-text-secondary, #64748B)", fontSize: "11px", fontWeight: "500", textTransform: "capitalize", marginBottom: "4px" }}>{getCategoryLabel(game.category)}</span>
                <span style={{ display: "block", color: "var(--theme-text, #0F172A)", fontSize: "14px", fontWeight: "800", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{game.label}</span>
              </div>`;
              
  if (code.includes(oldText)) {
      code = code.replace(oldText, newText);
      fs.writeFileSync(path, code);
      console.log('Fixed GameGrid text layout via exact replacement.');
  } else {
      console.log('Could not find the exact text block. Trying regex.');
      const regexOld = /<div style=\{\{\s*textAlign:\s*"center",\s*marginTop:\s*"8px",\s*padding:\s*"0 2px"\s*\}\}>[\s\S]*?<\/div>/;
      if (regexOld.test(code)) {
          code = code.replace(regexOld, newText);
          fs.writeFileSync(path, code);
          console.log('Fixed GameGrid text layout via regex.');
      } else {
          console.log('Failed to find text block entirely.');
      }
  }
}
