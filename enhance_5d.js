const fs = require('fs');

// 1. Fix fived.css ticket balls
let cssPath = 'app/fived/fived.css';
if (fs.existsSync(cssPath)) {
  let css = fs.readFileSync(cssPath, 'utf8');
  css += `

/* Fix the gold ticket balls to be premium blue */
.wg-mini-ball {
    background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%) !important;
    color: #FFFFFF !important;
    border: none !important;
    box-shadow: 0 4px 10px rgba(59,130,246,0.3) !important;
}

/* Improve the 5D betting container padding */
.fived-panel {
    padding: 24px 16px !important;
}
`;
  fs.writeFileSync(cssPath, css);
}

// 2. Enhance GameBoard.tsx Buttons
let jsPath = 'components/fived/GameBoard.tsx';
if (fs.existsSync(jsPath)) {
  let code = fs.readFileSync(jsPath, 'utf8');
  
  // Tabs: A B C D E
  // Currently: "border-slate-200 text-slate-500 hover:text-blue-600 bg-slate-50"
  // Let's make them crisp white with a blue shadow, or a solid crisp light blue.
  code = code.replace(/border-slate-200 text-slate-500 hover:text-blue-600 bg-slate-50/g, 'border-slate-300 text-slate-600 hover:text-blue-600 bg-white shadow-sm hover:shadow-md');
  
  // Number Digits: 0-9
  // Currently: "text-slate-500 hover:text-blue-600 bg-slate-100 hover:bg-slate-200"
  // Let's make them look like real buttons!
  code = code.replace(/text-slate-500 hover:text-blue-600 bg-slate-100 hover:bg-slate-200/g, 'text-blue-700 hover:text-white bg-slate-50 hover:bg-blue-400 border border-slate-200 shadow-sm');
  
  // The grid container
  // Currently: "bg-white p-2 rounded-xl border border-slate-200 shadow-sm"
  code = code.replace(/bg-white p-2 rounded-xl border border-slate-200 shadow-sm/g, 'bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-inner');
  
  fs.writeFileSync(jsPath, code);
  console.log('Enhanced 5D UI');
}
