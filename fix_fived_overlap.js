const fs = require('fs');
let path = 'components/fived/GameBoard.tsx';
if (fs.existsSync(path)) {
  let code = fs.readFileSync(path, 'utf8');

  // Wrap How to play and Lottery label in a column to prevent overlap
  const searchStr = `          <div className="wg-ticket-left">
            <button
              type="button"
              className="wg-how-play"`;
              
  const replaceStr = `          <div className="wg-ticket-left flex flex-col justify-center items-start gap-2">
            <button
              type="button"
              className="wg-how-play"`;

  code = code.replace(searchStr, replaceStr);
  fs.writeFileSync(path, code);
  console.log('Fixed overlap');
}
