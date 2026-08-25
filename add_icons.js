const fs = require('fs');

let path = 'components/home/NavIcon.js';
if (fs.existsSync(path)) {
  let code = fs.readFileSync(path, 'utf8');
  
  const newIcons = `
  activity: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  ),
  customer: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  ),
  team: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="8.5" r="3.1" stroke="currentColor" strokeWidth="1.75" />
      <path d="M4 19.5v-.8c0-2.4 2-4.2 5-4.2h.2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="16.5" cy="9.5" r="2.4" stroke="currentColor" strokeWidth="1.75" />
      <path d="M13.5 19.5v-.6c0-1.8 1.6-3.1 3.8-3.1" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  ),
  account: (`;

  code = code.replace('account: (', newIcons);
  fs.writeFileSync(path, code);
  console.log('Added new icons to NavIcon.js');
}
