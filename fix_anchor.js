const fs = require('fs');
let path = 'components/home/GameGrid.js';
if (fs.existsSync(path)) {
  let code = fs.readFileSync(path, 'utf8');
  code = code.replace(
    /return \(\n\s*<div className="mb-8 animate-fade-in"/g,
    'return (\n    <div id={`section-${catKey}`} className="mb-8 animate-fade-in"'
  );
  fs.writeFileSync(path, code);
  console.log('Added id to HomeGameSection');
}
