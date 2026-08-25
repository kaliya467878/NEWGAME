const fs = require('fs');
let path = 'components/k3/K3GameScreen.js';
if (fs.existsSync(path)) {
  let code = fs.readFileSync(path, 'utf8');

  // Replace import
  let searchStr = `import DicePNG from "@/components/k3/DicePNG";`;
  let replaceStr = `import Dice3D from "@/components/k3/Dice3D";`;
  code = code.replace(searchStr, replaceStr);

  // Replace usage
  searchStr = `<DicePNG value={die} rolling={isRolling} />`;
  replaceStr = `<Dice3D value={die} rolling={isRolling} index={i} />`;
  code = code.replace(searchStr, replaceStr);

  fs.writeFileSync(path, code);
  console.log('Switched back to Dice3D in K3GameScreen');
}
