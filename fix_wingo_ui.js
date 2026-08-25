const fs = require('fs');

let path = 'app/wingo/wingo.css';
if (fs.existsSync(path)) {
  let css = fs.readFileSync(path, 'utf8');

  const ultimateWingoOverride = `

/* ==========================================================
   ULTIMATE PREMIUM WINGO OVERRIDE (MODERN BETTING APP)
========================================================== */

/* Page Background */
.wingo-game {
    background: #F4F7F9 !important;
}

.wingo-game::before {
    display: none !important;
}

/* Tabs: 30sec, 1Min, 3Min, 5Min */
.wg-duration-tabs {
    background: #FFFFFF !important;
    padding: 10px 12px 14px !important;
    margin-bottom: 0 !important;
    border-bottom: 1px solid #E2E8F0 !important;
    display: flex !important;
    justify-content: space-around !important;
    box-shadow: 0 4px 10px rgba(0,0,0,0.02) !important;
}

.wg-duration-tab {
    background: transparent !important;
    border: none !important;
    color: #64748b !important;
}

.wg-duration-tab.active {
    background: transparent !important;
    color: #3b82f6 !important;
    box-shadow: none !important;
}

.wg-duration-icon {
    background: #F1F5F9 !important;
    border: none !important;
    width: 48px !important;
    height: 48px !important;
    border-radius: 50% !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    margin-bottom: 6px !important;
    transition: all 0.3s ease !important;
}

.wg-duration-tab.active .wg-duration-icon {
    background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%) !important;
    color: #FFFFFF !important;
    box-shadow: 0 4px 12px rgba(59,130,246,0.3) !important;
    border: none !important;
}

/* Wallet Card */
.wg-wallet-card {
    background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%) !important;
    border: none !important;
    margin: 16px !important;
    padding: 20px !important;
    border-radius: 20px !important;
    box-shadow: 0 10px 25px rgba(59,130,246,0.25) !important;
    color: #FFFFFF !important;
}

.wg-wallet-amount, .wg-wallet-label, .wg-wallet-row {
    color: #FFFFFF !important;
}

.wg-wallet-amount {
    font-size: 28px !important;
    font-weight: 800 !important;
    text-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
}

.wg-btn-deposit {
    background: #FFFFFF !important;
    color: #3b82f6 !important;
    border: none !important;
    font-weight: 700 !important;
    border-radius: 12px !important;
    box-shadow: 0 4px 10px rgba(0,0,0,0.1) !important;
}

.wg-btn-withdraw {
    background: rgba(255, 255, 255, 0.2) !important;
    color: #FFFFFF !important;
    border: 1px solid rgba(255, 255, 255, 0.4) !important;
    font-weight: 700 !important;
    border-radius: 12px !important;
}

/* Ticket / Timer Box */
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

.wg-countdown-digit {
    background: #f1f5f9 !important;
    color: #3b82f6 !important;
    border: 1px solid #e2e8f0 !important;
    font-size: 24px !important;
    font-weight: 800 !important;
    border-radius: 6px !important;
    min-width: 32px !important;
}

/* Betting Zone */
.wg-bet-zone {
    background: #FFFFFF !important;
    border-radius: 24px 24px 0 0 !important;
    padding: 24px 16px !important;
    box-shadow: 0 -4px 20px rgba(0,0,0,0.03) !important;
}

.wg-color-btn.green { background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important; color: #fff !important; border: none !important; box-shadow: 0 4px 12px rgba(16,185,129,0.3) !important; }
.wg-color-btn.violet { background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%) !important; color: #fff !important; border: none !important; box-shadow: 0 4px 12px rgba(139,92,246,0.3) !important; }
.wg-color-btn.red { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important; color: #fff !important; border: none !important; box-shadow: 0 4px 12px rgba(239,68,68,0.3) !important; }

/* Number Balls */
.wg-num-btn {
    box-shadow: 0 4px 10px rgba(0,0,0,0.06) !important;
    border: 2px solid #ffffff !important;
    font-weight: 800 !important;
    font-size: 20px !important;
}
.wg-num-btn::before { display: none !important; }

.wg-num-btn.green { background: linear-gradient(135deg, #34d399 0%, #10b981 100%) !important; color: #fff !important; text-shadow: 0 1px 2px rgba(0,0,0,0.2) !important; }
.wg-num-btn.red { background: linear-gradient(135deg, #f87171 0%, #ef4444 100%) !important; color: #fff !important; text-shadow: 0 1px 2px rgba(0,0,0,0.2) !important; }
.wg-num-btn.v0 { background: linear-gradient(135deg, #f87171 0%, #ef4444 50%, #8b5cf6 51%, #6d28d9 100%) !important; color: #fff !important; }
.wg-num-btn.v5 { background: linear-gradient(135deg, #34d399 0%, #10b981 50%, #8b5cf6 51%, #6d28d9 100%) !important; color: #fff !important; }

/* Big Small */
.wg-size-btn.big { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%) !important; color: #fff !important; border: none !important; box-shadow: 0 4px 12px rgba(249,115,22,0.3) !important; }
.wg-size-btn.small { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%) !important; color: #fff !important; border: none !important; box-shadow: 0 4px 12px rgba(59,130,246,0.3) !important; }

/* Multipliers */
.wg-multi-btn {
    background: #f1f5f9 !important;
    color: #64748b !important;
    border: none !important;
    border-radius: 8px !important;
    font-weight: 700 !important;
}
.wg-multi-btn.active {
    background: #3b82f6 !important;
    color: #ffffff !important;
    box-shadow: 0 2px 8px rgba(59,130,246,0.3) !important;
}
.wg-random-btn {
    background: rgba(59,130,246,0.1) !important;
    color: #3b82f6 !important;
    border: none !important;
    border-radius: 8px !important;
    font-weight: 700 !important;
}

/* History Tabs */
.wg-history-tabs {
    background: #FFFFFF !important;
    border-radius: 12px !important;
    margin: 16px !important;
    padding: 6px !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.03) !important;
}
.wg-history-tab {
    background: transparent !important;
    color: #64748b !important;
    border: none !important;
    font-weight: 600 !important;
}
.wg-history-tab.active {
    background: #3b82f6 !important;
    color: #ffffff !important;
    border-radius: 8px !important;
    box-shadow: 0 2px 8px rgba(59,130,246,0.3) !important;
}

/* Table */
.wg-table {
    background: #FFFFFF !important;
    border-radius: 16px !important;
    margin: 0 16px 16px !important;
    box-shadow: 0 4px 16px rgba(0,0,0,0.03) !important;
    overflow: hidden !important;
}
.wg-table th {
    background: #f8fafc !important;
    color: #64748b !important;
    font-weight: 700 !important;
    border-bottom: 1px solid #e2e8f0 !important;
    padding: 12px 8px !important;
}
.wg-table td {
    border-bottom: 1px solid #f1f5f9 !important;
    padding: 12px 8px !important;
    color: #1e293b !important;
    font-weight: 600 !important;
}
`;

  css += ultimateWingoOverride;
  fs.writeFileSync(path, css);
  console.log('Fixed Wingo UI to premium standard');
}
