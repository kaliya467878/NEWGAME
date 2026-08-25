const fs = require('fs');
let path = 'app/dice/dice.css';
if (fs.existsSync(path)) {
  let css = fs.readFileSync(path, 'utf8');
  css += `

/* ==========================================================
   PREMIUM WHITE/BLUE THEME OVERRIDE (Match Wingo)
========================================================== */
.dice-layout, .dice-wrapper, body:has(.dice-layout) {
    background: #F4F7F9 !important;
}

.dice-card, .dice-panel, .dice-bet-area, .dice-arena {
    background: #FFFFFF !important;
    border: none !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.03) !important;
    border-radius: 16px !important;
}

/* Fix text and borders */
.dice-layout * {
    color: #1e293b;
}

.dice-value, .dice-result-text {
    color: #3b82f6 !important;
    font-weight: 800 !important;
}

/* Specific buttons */
.dice-bet-btn {
    background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%) !important;
    color: #FFFFFF !important;
    border: none !important;
    box-shadow: 0 4px 12px rgba(59,130,246,0.3) !important;
}

.dice-slider-track {
    background: #E2E8F0 !important;
}
.dice-slider-fill {
    background: #3b82f6 !important;
}
.dice-slider-thumb {
    background: #FFFFFF !important;
    border: 3px solid #3b82f6 !important;
    box-shadow: 0 2px 8px rgba(59,130,246,0.4) !important;
}
`;
  fs.writeFileSync(path, css);
  console.log('Fixed dice UI');
}
