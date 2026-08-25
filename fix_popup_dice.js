const fs = require('fs');
let path = 'components/k3/K3GameScreen.js';
if (fs.existsSync(path)) {
  let code = fs.readFileSync(path, 'utf8');

  const searchStr = `                {outcomePopup.dice?.map((d, i) => (
                  <span key={i} style={{
                    width: "24px",
                    height: "24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid var(--theme-border)",
                    borderRadius: "4px",
                    color: "var(--theme-text)",
                    fontSize: "12px",
                    fontWeight: "700" }}>
                    {d}
                  </span>
                ))}`;

  const replaceStr = `                {outcomePopup.dice?.map((d, i) => (
                  <img key={i} src={\`/k3/images/\${d}.png\`} alt={\`Dice \${d}\`} className="w-8 h-8 object-contain" />
                ))}`;

  code = code.replace(searchStr, replaceStr);
  fs.writeFileSync(path, code);
  console.log('Fixed Popup Dice');
}
