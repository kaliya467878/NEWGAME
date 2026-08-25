const fs = require('fs');
let path = 'components/home/GameGrid.js';
if (fs.existsSync(path)) {
  let code = fs.readFileSync(path, 'utf8');
  
  const oldPop = `<div className="club-popular-card-info">
      <strong>{game.label}</strong>
      <span>{game.category}</span>
    </div>`;
    
  const newPop = `<div className="club-popular-card-info" style={{ textAlign: "left", padding: "10px 4px", background: "transparent" }}>
      <span style={{ display: "block", color: "var(--theme-text-secondary, #64748B)", fontSize: "11px", fontWeight: "500", textTransform: "capitalize", marginBottom: "4px" }}>{game.category}</span>
      <strong style={{ display: "block", margin: 0, fontSize: "14px", fontWeight: "800", color: "var(--theme-text)", lineHeight: 1.2 }}>{game.label}</strong>
    </div>`;

  if (code.includes(oldPop)) {
      code = code.replace(oldPop, newPop);
      fs.writeFileSync(path, code);
      console.log('Fixed Popular Games text layout.');
  } else {
      console.log('Could not find the exact popular text block. Trying regex.');
      const regexPop = /<div className="club-popular-card-info">[\s\S]*?<\/div>/;
      if (regexPop.test(code)) {
          code = code.replace(regexPop, newPop);
          fs.writeFileSync(path, code);
          console.log('Fixed Popular Games text layout via regex.');
      }
  }
}
