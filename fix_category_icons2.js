const fs = require('fs');

let path = 'components/home/CategoryTabs.js';
if (fs.existsSync(path)) {
  let code = fs.readFileSync(path, 'utf8');

  // Replace Lottery (ball)
  const oldLottery = `    case "ball":
      // Lottery Ticket
      return (
        <svg {...svgProps}>
          <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
          <path d="M9 9h.01M15 9h.01M9 15h.01M15 15h.01M12 9v6" />
        </svg>
      );`;
      
  const newLottery = `    case "ball":
      // Lottery (Gift)
      return (
        <svg {...svgProps}>
          <rect x="3" y="8" width="18" height="4" rx="1" />
          <path d="M12 8v13" />
          <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
          <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" />
        </svg>
      );`;

  // Replace Slots (slots)
  const oldSlots = `    case "slots":
      // Slots / Arcade
      return (
        <svg {...svgProps}>
          <rect x="4" y="2" width="16" height="20" rx="2" />
          <path d="M4 8h16M4 14h16" />
          <circle cx="12" cy="18" r="1.5" fill="currentColor" />
          <path d="M8 11h.01M12 11h.01M16 11h.01" />
        </svg>
      );`;
      
  const newSlots = `    case "slots":
      // Slots (Crown)
      return (
        <svg {...svgProps}>
          <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
        </svg>
      );`;

  // Replace Live Casino (dealer)
  const oldDealer = `    case "dealer":
      // Live Casino / Spades / Cards
      return (
        <svg {...svgProps}>
          <rect x="2" y="5" width="16" height="16" rx="2" />
          <path d="M22 10v9a2 2 0 0 1-2 2h-2" />
          <path d="M8 9h.01M8 17h.01M12 13h.01" />
        </svg>
      );`;
      
  const newDealer = `    case "dealer":
      // Live Casino (Casino Chip)
      return (
        <svg {...svgProps}>
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
        </svg>
      );`;

  if (code.includes(oldLottery) && code.includes(oldSlots) && code.includes(oldDealer)) {
    code = code.replace(oldLottery, newLottery);
    code = code.replace(oldSlots, newSlots);
    code = code.replace(oldDealer, newDealer);
    fs.writeFileSync(path, code);
    console.log('Updated the 3 icons in CategoryTabs.js');
  } else {
    console.log('Could not find exact code to replace');
  }
}
