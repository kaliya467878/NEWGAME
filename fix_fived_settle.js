const fs = require('fs');
let path = 'lib/fived/settle.ts';
if (fs.existsSync(path)) {
  let code = fs.readFileSync(path, 'utf8');

  // Fix multiplier
  const searchStr = `function getFiveDBetWinningMultiplier(bet: { betType: string; selection: string }): number {
  if (bet.betType === "POSITION_NUMBER") return 9 * 0.98;`;

  const replaceStr = `function getFiveDBetWinningMultiplier(bet: { betType: string; selection: string }): number {
  if (bet.betType === "POSITION_NUMBER") {
    const val = bet.selection.split(":")[1];
    if (["BIG", "SMALL", "ODD", "EVEN"].includes(val)) return 2 * 0.98;
    return 9 * 0.98;
  }`;

  code = code.replace(searchStr, replaceStr);
  fs.writeFileSync(path, code);
  console.log('Fixed settle.ts');
}
