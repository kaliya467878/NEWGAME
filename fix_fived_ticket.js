const fs = require('fs');
let path = 'app/fived/fived.css';
if (fs.existsSync(path)) {
  let css = fs.readFileSync(path, 'utf8');
  css += `

/* Fix .wg-ticket in 5D to match Wingo's clean white look */
.wg-ticket {
    background: #FFFFFF !important;
    border: none !important;
    box-shadow: 0 6px 16px rgba(0,0,0,0.04) !important;
    border-radius: 16px !important;
    margin: 16px !important;
}

.wg-ticket::before, .wg-ticket::after {
    background: #F4F7F9 !important;
    border: none !important;
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.05) !important;
}

.wg-ticket-left {
    border-right: 1.5px dashed #E2E8F0 !important;
}

.wg-how-play {
    background: rgba(59,130,246,0.1) !important;
    color: #3b82f6 !important;
    border: none !important;
    font-weight: 700 !important;
}

.wg-mode-label {
    color: #1e293b !important;
    font-weight: 800 !important;
}

.wg-time-label {
    color: #64748b !important;
    font-weight: 700 !important;
}

/* Also fix the 5D reel background to look bright instead of dark metal */
.fived-reel {
    background: #F1F5F9 !important;
    border: 1px solid #E2E8F0 !important;
}
.fived-reel-digit {
    background: #FFFFFF !important;
    color: #1e293b !important;
    border: 1px solid #CBD5E1 !important;
}
`;
  fs.writeFileSync(path, css);
  console.log('Fixed fived ticket');
}
