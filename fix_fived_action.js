const fs = require('fs');
let path = 'lib/actions/fived.ts';
if (fs.existsSync(path)) {
  let code = fs.readFileSync(path, 'utf8');

  // Replace validation logic
  const searchStr = `  let validSelection = false;
  if (betType === "POSITION_NUMBER") {
    const [pos, digitStr] = selection.split(":");
    const digit = Number(digitStr);
    validSelection = (POSITIONS as readonly string[]).includes(pos) && Number.isInteger(digit) && digit >= 0 && digit <= 9;
  }`;

  const replaceStr = `  let validSelection = false;
  if (betType === "POSITION_NUMBER") {
    const [pos, digitStr] = selection.split(":");
    if (["BIG", "SMALL", "ODD", "EVEN"].includes(digitStr)) {
      validSelection = (POSITIONS as readonly string[]).includes(pos);
    } else {
      const digit = Number(digitStr);
      validSelection = (POSITIONS as readonly string[]).includes(pos) && Number.isInteger(digit) && digit >= 0 && digit <= 9;
    }
  }`;

  code = code.replace(searchStr, replaceStr);
  fs.writeFileSync(path, code);
  console.log('Fixed 5D action validation');
}
