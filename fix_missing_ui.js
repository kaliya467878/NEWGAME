const fs = require('fs');

// 1. Fix GameHeader Deposit button
let headerPath = 'components/games/GameHeader.tsx';
if (fs.existsSync(headerPath)) {
  let code = fs.readFileSync(headerPath, 'utf8');
  
  // Withdraw button
  code = code.replace(
    /className="rounded-xl py-3 text-center text-sm font-semibold border border-white\/40 text-white bg-white\/20/g,
    'style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)", color: "white" }} className="rounded-xl py-3 text-center text-sm font-semibold'
  );
  
  // Deposit button
  code = code.replace(
    /className="rounded-xl py-3 text-center text-sm font-semibold border border-transparent bg-white text-blue-500/g,
    'style={{ background: "#FFFFFF", color: "#3b82f6", border: "none" }} className="rounded-xl py-3 text-center text-sm font-semibold'
  );

  fs.writeFileSync(headerPath, code);
  console.log('Fixed GameHeader inline styles');
}

// 2. Fix Wingo CSS for Mini Balls and Dots
let cssPath = 'app/wingo/wingo.css';
if (fs.existsSync(cssPath)) {
  let css = fs.readFileSync(cssPath, 'utf8');
  
  const additionalCSS = `

/* Mini Balls, Table Nums, Dots */
.wg-mini-ball, .wg-table-num {
    color: #FFFFFF !important;
    text-shadow: 0 1px 2px rgba(0,0,0,0.2) !important;
    border: none !important;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
}
.wg-mini-ball::before, .wg-table-num::before { display: none !important; }

/* Greens */
.wg-mini-ball.green, .wg-table-num.green, .wg-dot.green { 
    background: linear-gradient(135deg, #34d399 0%, #10b981 100%) !important; 
}
/* Reds */
.wg-mini-ball.red, .wg-table-num.red, .wg-dot.red { 
    background: linear-gradient(135deg, #f87171 0%, #ef4444 100%) !important; 
}
/* Violet */
.wg-mini-ball.violet, .wg-table-num.violet, .wg-dot.violet { 
    background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%) !important; 
}

/* Mixed 0 */
.wg-mini-ball.v0, .wg-table-num.v0, .wg-dot.v0 { 
    background: linear-gradient(135deg, #f87171 0%, #ef4444 50%, #8b5cf6 51%, #6d28d9 100%) !important; 
}
/* Mixed 5 */
.wg-mini-ball.v5, .wg-table-num.v5, .wg-dot.v5 { 
    background: linear-gradient(135deg, #34d399 0%, #10b981 50%, #8b5cf6 51%, #6d28d9 100%) !important; 
}

.wg-dot {
    border: none !important;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
}
`;

  css += additionalCSS;
  fs.writeFileSync(cssPath, css);
  console.log('Fixed Wingo CSS for dots and balls');
}
