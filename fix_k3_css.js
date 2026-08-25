const fs = require('fs');
let path = 'app/k3/k3.css';
if (fs.existsSync(path)) {
  let css = fs.readFileSync(path, 'utf8');

  // Change k3-dice-stage background to very dark with white border (matching screenshot)
  const stageSearch = `.k3-dice-stage {
  background: var(--theme-bg-elevated);
  border-radius: 20px;
  padding: 16px;
  position: relative;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--theme-border);
}`;
  const stageReplace = `.k3-dice-stage {
  background: #111111;
  border-radius: 12px;
  padding: 16px;
  position: relative;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  border: 2px solid #ffffff;
  margin: 16px;
}`;
  if(css.includes(stageSearch)) css = css.replace(stageSearch, stageReplace);
  else css += `\n.k3-dice-stage { background: #111111 !important; border: 2px solid #fff !important; border-radius: 12px !important; }`;

  // Change arrows to white
  const arrowSearch = `background: #d4af37;`;
  const arrowReplace = `background: #ffffff;`;
  css = css.replace(new RegExp(arrowSearch, 'g'), arrowReplace);

  // Change k3-dice-slot background
  const slotSearch = `.k3-dice-slot {
  background: var(--theme-bg-elevated);
  border-radius: 14px;
  flex: 1;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--theme-border);
}`;
  const slotReplace = `.k3-dice-slot {
  background: transparent;
  flex: 1;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
}`;
  if(css.includes(slotSearch)) css = css.replace(slotSearch, slotReplace);
  else css += `\n.k3-dice-slot { background: transparent !important; border: none !important; box-shadow: none !important; }`;
  
  fs.writeFileSync(path, css);
  console.log('Fixed k3.css');
}
