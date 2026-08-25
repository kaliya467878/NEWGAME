const fs = require('fs');

// 1. K3 CSS Override
const k3Path = 'app/k3/k3.css';
if (fs.existsSync(k3Path)) {
  let css = fs.readFileSync(k3Path, 'utf8');
  css += `

/* ==========================================================
   K3 PREMIUM LIGHT THEME (WINGO-STYLE)
========================================================== */
.k3-layout, .k3-container {
    background-color: #F4F7F9 !important;
    color: #1e293b !important;
}

.k3-container::before {
    display: none !important;
}

.k3-period-header {
    background: #FFFFFF !important;
    border-radius: 16px !important;
    box-shadow: 0 6px 16px rgba(0,0,0,0.04) !important;
    margin: 16px !important;
    border: none !important;
    padding: 16px !important;
}

.k3-period-label {
    color: #64748b !important;
}
.k3-period-val {
    color: #1e293b !important;
}

.k3-countdown-timer .digit {
    background: #f1f5f9 !important;
    color: #3b82f6 !important;
    border: 1px solid #e2e8f0 !important;
    box-shadow: none !important;
}

.k3-how-to-play {
    background: rgba(59,130,246,0.1) !important;
    color: #3b82f6 !important;
    border: none !important;
}

.k3-tabs {
    background: #F1F5F9 !important;
    padding: 4px !important;
    border-radius: 12px !important;
    margin: 0 16px 16px !important;
}

.k3-tab {
    color: #64748b !important;
    border: none !important;
    background: transparent !important;
}

.k3-tab.active {
    background: #FFFFFF !important;
    color: #3b82f6 !important;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05) !important;
}

.k3-chip-inner {
    background: #FFFFFF !important;
    color: #1e293b !important;
    border: 1px solid #e2e8f0 !important;
    box-shadow: 0 2px 6px rgba(0,0,0,0.02) !important;
}

.k3-wg-color-btn.red { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important; color: white !important; border: none !important; }
.k3-wg-color-btn.green { background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important; color: white !important; border: none !important; }

/* The Game Arena itself should be clean */
.k3-game-arena {
    background: #FFFFFF !important;
    border-radius: 16px !important;
    margin: 0 16px 16px !important;
    padding: 20px 16px !important;
    box-shadow: 0 8px 24px rgba(0,0,0,0.04) !important;
}

.k3-history-section {
    background: transparent !important;
}
.k3-history-table {
    background: #FFFFFF !important;
    border-radius: 16px !important;
    box-shadow: 0 4px 16px rgba(0,0,0,0.03) !important;
}
.k3-history-th {
    background: #f8fafc !important;
    color: #64748b !important;
    border-bottom: 1px solid #e2e8f0 !important;
}
.k3-history-tr {
    border-bottom: 1px solid #f1f5f9 !important;
    color: #1e293b !important;
}
`;
  fs.writeFileSync(k3Path, css);
  console.log('Fixed K3 Theme');
}

// 2. 5D CSS Override
const fivedPath = 'app/fived/fived.css';
if (fs.existsSync(fivedPath)) {
  let css = fs.readFileSync(fivedPath, 'utf8');
  css += `

/* ==========================================================
   5D PREMIUM LIGHT THEME (WINGO-STYLE)
========================================================== */
.fived-layout {
    background: #F4F7F9 !important;
}

.fived-layout::before {
    display: none !important;
}

/* 5D Ticket/Timer Box */
.fived-timer-box, .card-surface {
    background: #FFFFFF !important;
    border-radius: 16px !important;
    box-shadow: 0 6px 16px rgba(0,0,0,0.04) !important;
    border: none !important;
}

.fived-panel {
    background: #FFFFFF !important;
    border-radius: 16px !important;
    box-shadow: 0 8px 24px rgba(0,0,0,0.04) !important;
    border: none !important;
}

.fived-text {
    color: #1e293b !important;
}
.fived-text-muted {
    color: #64748b !important;
}

.fived-button {
    background: #F1F5F9 !important;
    color: #3b82f6 !important;
    border: 1px solid #e2e8f0 !important;
}
.fived-button.active {
    background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%) !important;
    color: white !important;
    border: none !important;
}
`;
  fs.writeFileSync(fivedPath, css);
  console.log('Fixed 5D Theme');
}
