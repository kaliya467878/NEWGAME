const fs = require('fs');
let path = 'app/wallet/wallet.css';
if (fs.existsSync(path)) {
  let css = fs.readFileSync(path, 'utf8');
  css += `

/* ==========================================================
   PREMIUM WALLET UI OVERHAUL (Fintech Style)
========================================================== */

/* Main Hero Card (Balance) */
.wallet-hero-card {
    background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%) !important;
    border: none !important;
    box-shadow: 0 10px 25px rgba(59,130,246,0.3) !important;
    color: #FFFFFF !important;
    border-radius: 24px !important;
    padding: 24px !important;
    margin: 16px !important;
}

.wallet-hero-card * {
    color: #FFFFFF !important;
}

.wallet-hero-icon-wrap {
    filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1)) !important;
}

.wallet-hero-label {
    opacity: 0.9 !important;
    font-weight: 500 !important;
    font-size: 14px !important;
}

.wallet-hero-amount {
    font-size: 36px !important;
    font-weight: 800 !important;
    text-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
    font-family: 'Poppins', sans-serif !important;
    margin: 8px 0 !important;
}

.wallet-hero-stats {
    background: rgba(255,255,255,0.15) !important;
    border-radius: 16px !important;
    padding: 12px 16px !important;
    margin-top: 16px !important;
    border: 1px solid rgba(255,255,255,0.2) !important;
}

.wallet-stat-copy strong {
    font-size: 18px !important;
    font-weight: 700 !important;
}

.wallet-stat-copy span {
    opacity: 0.8 !important;
    font-size: 12px !important;
}

.wallet-txn-view-all {
    margin-top: 16px !important;
    opacity: 0.9 !important;
    font-weight: 600 !important;
}

/* Action Buttons (Deposit, Withdraw, etc.) */
.wallet-actions {
    padding: 0 16px !important;
    display: grid !important;
    grid-template-columns: 1fr !important;
    gap: 12px !important;
}

.wallet-action-btn {
    background: #FFFFFF !important;
    border: 1px solid #E2E8F0 !important;
    border-radius: 16px !important;
    padding: 16px !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.03) !important;
    transition: all 0.2s ease !important;
    display: flex !important;
    align-items: center !important;
    justify-content: flex-start !important;
}

.wallet-action-btn:hover, .wallet-action-btn:active {
    border-color: #3b82f6 !important;
    box-shadow: 0 6px 16px rgba(59,130,246,0.15) !important;
    transform: translateY(-2px) !important;
}

/* Remove old green/yellow colored borders on buttons */
.wallet-action-btn.yellow, .wallet-action-btn.blue, .wallet-action-btn.red, .wallet-action-btn.green {
    border-color: #E2E8F0 !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.03) !important;
}

.wallet-action-icon-ring {
    width: 48px !important;
    height: 48px !important;
    border-radius: 14px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    margin-right: 16px !important;
}

/* Specific Icon Colors for modern look */
.wallet-action-icon-ring.yellow { background: rgba(245,158,11,0.1) !important; color: #f59e0b !important; border: none !important; }
.wallet-action-icon-ring.blue { background: rgba(59,130,246,0.1) !important; color: #3b82f6 !important; border: none !important; }
.wallet-action-icon-ring.red { background: rgba(239,68,68,0.1) !important; color: #ef4444 !important; border: none !important; }
.wallet-action-icon-ring.green { background: rgba(34,197,94,0.1) !important; color: #22c55e !important; border: none !important; }

.wallet-action-copy strong {
    color: #1e293b !important;
    font-size: 16px !important;
    font-weight: 700 !important;
}

.wallet-action-copy span {
    color: #64748b !important;
    font-size: 13px !important;
}

.wallet-action-chevron {
    margin-left: auto !important;
    color: #94a3b8 !important;
}
`;
  fs.writeFileSync(path, css);
  console.log('Fixed wallet UI');
}
