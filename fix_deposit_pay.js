const fs = require('fs');
let path = 'app/wallet/deposit/pay/deposit-pay.css';
if (fs.existsSync(path)) {
  let css = fs.readFileSync(path, 'utf8');
  css += `

/* ==========================================================
   FORCE CLEAN LIGHT/BLUE UI (Override the ugly Dark Gold)
========================================================== */
.arupi-pay-page { background: #F8FAFC !important; color: #1e293b !important; }
.arupi-pay-header { background: #FFFFFF !important; border-bottom: 1px solid #E2E8F0 !important; }
.arupi-pay-header h1, .arupi-pay-back { color: #1e293b !important; }
.arupi-pay-card { background: #FFFFFF !important; border: 1px solid #E2E8F0 !important; box-shadow: 0 4px 12px rgba(0,0,0,0.03) !important; }
.arupi-pay-amount-label { color: #64748b !important; }
.arupi-pay-amount-value { color: #3b82f6 !important; font-family: 'Poppins', sans-serif !important; }
.arupi-pay-copy-btn, .arupi-pay-copy-icon { color: #3b82f6 !important; }
.arupi-section-title { color: #1e293b !important; border-left: 3px solid #3b82f6 !important; padding-left: 8px !important; }
.arupi-order-row label { color: #64748b !important; }
.arupi-order-row span { color: #1e293b !important; }
.arupi-usdt-amount span { color: #ef4444 !important; font-weight: bold !important; }

.arupi-address-field { background: #F1F5F9 !important; border: 1px solid #E2E8F0 !important; }
.arupi-address-field input { color: #1e293b !important; }
.arupi-address-copy { background: #3b82f6 !important; color: #FFFFFF !important; border-radius: 8px !important; }

.arupi-proof-upload-btn { background: #F8FAFC !important; border: 2px dashed #CBD5E1 !important; color: #64748b !important; }
.arupi-proof-upload-btn:hover { border-color: #3b82f6 !important; color: #3b82f6 !important; background: rgba(59,130,246,0.05) !important; }
.arupi-submit-btn { background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%) !important; color: #FFFFFF !important; border: none !important; box-shadow: 0 4px 12px rgba(59,130,246,0.3) !important; }

.arupi-reminders { background: rgba(239,68,68,0.05) !important; border: 1px solid rgba(239,68,68,0.1) !important; }
.arupi-reminders h3 { color: #ef4444 !important; }
.arupi-reminders li { color: #64748b !important; }
.arupi-reminders li::before { color: #ef4444 !important; }
`;
  fs.writeFileSync(path, css);
  console.log('Fixed deposit pay UI');
}
