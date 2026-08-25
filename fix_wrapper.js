const fs = require('fs');
let path = 'components/home/GameGrid.js';
if (fs.existsSync(path)) {
  let code = fs.readFileSync(path, 'utf8');
  
  // For coming soon button
  code = code.replace(
    /className="club-popular-card coming-soon"/g,
    'className="coming-soon"'
  );
  
  // For the Link wrapper
  code = code.replace(
    /className="club-popular-card"\s*style=\{\{\s*display:\s*"flex",\s*flexDirection:\s*"column"/g,
    'className="" style={{ display: "flex", flexDirection: "column"'
  );
  
  // For PopularGameCard function
  code = code.replace(
    /const cardClass = \[\n\s*"club-popular-card",/g,
    'const cardClass = [\n      "",'
  );

  fs.writeFileSync(path, code);
  console.log('Fixed wrapper classes in GameGrid.js');
}
