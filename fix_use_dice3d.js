const fs = require('fs');
let path = 'components/k3/K3GameScreen.js';
if (fs.existsSync(path)) {
  let code = fs.readFileSync(path, 'utf8');

  // Replace import
  let searchStr = `import Dice2D from "@/components/k3/Dice2D";`;
  let replaceStr = `import Dice3D from "@/components/k3/Dice3D";`;
  code = code.replace(searchStr, replaceStr);

  // Replace usage
  searchStr = `<Dice2D value={die} rolling={isRolling} index={i} />`;
  replaceStr = `<Dice3D value={die} rolling={isRolling} index={i} />`;
  code = code.replace(searchStr, replaceStr);

  fs.writeFileSync(path, code);
  console.log('Switched to Dice3D in K3GameScreen');
}
