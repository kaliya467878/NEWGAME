const fs = require('fs');
let path = 'lib/fived/rounds.ts';
if (fs.existsSync(path)) {
  let code = fs.readFileSync(path, 'utf8');

  const searchStr = `  if (bet.betType === "POSITION_NUMBER") {
    const [posLabel, digitStr] = bet.selection.split(":");
    const posIndex = POSITIONS.indexOf(posLabel as Position);
    if (posIndex === -1) return 0;
    return Number(digitStr) === digits[posIndex] ? POSITION_NUMBER_MULTIPLIER : 0;
  }`;

  const replaceStr = `  if (bet.betType === "POSITION_NUMBER") {
    const [posLabel, digitStr] = bet.selection.split(":");
    const posIndex = POSITIONS.indexOf(posLabel as Position);
    if (posIndex === -1) return 0;
    const digit = digits[posIndex];
    if (digitStr === "BIG") return digit >= 5 ? SUM_BIG_SMALL_MULTIPLIER : 0;
    if (digitStr === "SMALL") return digit <= 4 ? SUM_BIG_SMALL_MULTIPLIER : 0;
    if (digitStr === "ODD") return digit % 2 !== 0 ? SUM_ODD_EVEN_MULTIPLIER : 0;
    if (digitStr === "EVEN") return digit % 2 === 0 ? SUM_ODD_EVEN_MULTIPLIER : 0;
    return Number(digitStr) === digit ? POSITION_NUMBER_MULTIPLIER : 0;
  }`;

  code = code.replace(searchStr, replaceStr);
  fs.writeFileSync(path, code);
  console.log('Fixed 5D rounds logic');
}
