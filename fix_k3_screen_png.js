const fs = require('fs');
let path = 'components/k3/K3GameScreen.js';
if (fs.existsSync(path)) {
  let code = fs.readFileSync(path, 'utf8');

  // Replace import
  let searchStr = `import Dice3D from "@/components/k3/Dice3D";`;
  let replaceStr = `import DicePNG from "@/components/k3/DicePNG";`;
  code = code.replace(searchStr, replaceStr);

  // Replace usage
  searchStr = `<Dice3D value={die} rolling={isRolling} index={i} />`;
  replaceStr = `<DicePNG value={die} rolling={isRolling} />`;
  code = code.replace(searchStr, replaceStr);

  fs.writeFileSync(path, code);
  console.log('Switched to DicePNG in K3GameScreen');
}
