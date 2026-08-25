const fs = require('fs');
let path = 'app/mines/mines.css';
if (fs.existsSync(path)) {
  let css = fs.readFileSync(path, 'utf8');
  css += `

/* ==========================================================
   PREMIUM WHITE/BLUE THEME OVERRIDE (Match Wingo)
========================================================== */
.mines-layout, body:has(.mines-layout) {
    background: #F4F7F9 !important;
}

.mines-panel, .mines-board, .mines-controls {
    background: #FFFFFF !important;
    border: none !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.03) !important;
    border-radius: 16px !important;
}

.mines-layout * {
    color: #1e293b;
}

.mines-tile {
    background: #F1F5F9 !important;
    border: 1px solid #E2E8F0 !important;
    box-shadow: inset 0 2px 4px rgba(255,255,255,0.5), 0 2px 4px rgba(0,0,0,0.05) !important;
    border-radius: 12px !important;
}

.mines-tile:hover {
    background: #E2E8F0 !important;
}

.mines-tile.revealed.gem {
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%) !important;
    border-color: #16a34a !important;
}

.mines-tile.revealed.bomb {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important;
    border-color: #dc2626 !important;
}

.mines-bet-btn, .mines-cashout-btn {
    background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%) !important;
    color: #FFFFFF !important;
    border: none !important;
    box-shadow: 0 4px 12px rgba(59,130,246,0.3) !important;
}

/* Fix any remaining gold borders */
.mines-multiplier {
    color: #3b82f6 !important;
    background: rgba(59,130,246,0.1) !important;
    border: 1px solid rgba(59,130,246,0.2) !important;
}
`;
  fs.writeFileSync(path, css);
  console.log('Fixed mines UI');
}
