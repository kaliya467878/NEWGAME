const fs = require('fs');
let path = 'components/games/GameHeader.tsx';
if (fs.existsSync(path)) {
  let code = fs.readFileSync(path, 'utf8');

  // Extract the entire Duration Tabs block
  const durationRegex = /({\/\*\s*DURATION TABS\s*\*\/}[\s\S]*?)(?={\/\*\s*WALLET & ANNOUNCEMENT\s*\*\/})/;
  const match = code.match(durationRegex);
  
  if (match) {
    const durationBlock = match[1];
    
    // Remove the duration block from its current location
    code = code.replace(durationBlock, '');
    
    // Append it at the bottom, just before `</>`
    const lastClosingTagIndex = code.lastIndexOf('</>');
    if (lastClosingTagIndex !== -1) {
      code = code.substring(0, lastClosingTagIndex) + durationBlock + '\n      ' + code.substring(lastClosingTagIndex);
      fs.writeFileSync(path, code);
      console.log('Reordered layout successfully');
    } else {
      console.log('Could not find last </> tag');
    }
  } else {
    console.log('Could not find duration block');
  }
}
