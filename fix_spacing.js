const fs = require('fs');
let path = 'components/games/GameHeader.tsx';
if (fs.existsSync(path)) {
  let code = fs.readFileSync(path, 'utf8');
  // Find: <div className="flex flex-col gap-3 px-4 mb-4" style={{ marginTop: (!durations || durations.length === 0) ? "1rem" : "0" }}>
  // Change to: <div className="flex flex-col gap-3 px-4 mb-4 mt-4">
  code = code.replace(
    /<div className="flex flex-col gap-3 px-4 mb-4" style={{ marginTop: \(!durations \|\| durations\.length === 0\) \? "1rem" : "0" }}>/g,
    '<div className="flex flex-col gap-3 px-4 mb-4 mt-3">'
  );
  fs.writeFileSync(path, code);
  console.log('Fixed Header spacing');
}
