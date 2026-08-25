const fs = require('fs');
let path = 'app/account/account.css';
if (fs.existsSync(path)) {
  let css = fs.readFileSync(path, 'utf8');
  css += `

/* ==========================================================
   FORCE PREMIUM CLEAN BLUE THEME ON ACCOUNT UI
========================================================== */

/* Overwrite ugly gold headers and elements */
.account-hero {
    background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%) !important;
}

.account-vip-badge {
    background: rgba(255,255,255,0.2) !important;
    color: #FFFFFF !important;
    border: 1px solid rgba(255,255,255,0.4) !important;
}

.ah-stats .ah-value {
    color: #FFFFFF !important;
    -webkit-text-fill-color: #FFFFFF !important;
    text-shadow: 0 1px 2px rgba(0,0,0,0.1) !important;
}

.aq-deposit, .aq-withdraw {
    background: #FFFFFF !important;
    color: #1e293b !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.05) !important;
}

.aq-deposit .aq-glyph, .aq-withdraw .aq-glyph {
    color: #3b82f6 !important;
}

/* Fix menus and items to have modern borders instead of gold */
.as-grid-item, .as-row-item, .account-security-card, .ap-field-row {
    background: #FFFFFF !important;
    border: 1px solid #E2E8F0 !important;
    border-radius: 16px !important;
    box-shadow: 0 2px 8px rgba(0,0,0,0.02) !important;
}

.as-grid-item:hover, .as-row-item:hover {
    border-color: #3b82f6 !important;
    box-shadow: 0 4px 12px rgba(59,130,246,0.1) !important;
    transform: translateY(-1px) !important;
}

/* Fix icon wrappers */
.as-icon-wrap {
    background: rgba(59,130,246,0.1) !important;
    color: #3b82f6 !important;
}

/* Action buttons like Save, Edit */
.account-logout-btn, .as-submit-btn, .vip-claim-btn {
    background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%) !important;
    color: #FFFFFF !important;
    border: none !important;
    box-shadow: 0 4px 12px rgba(59,130,246,0.3) !important;
    font-weight: bold !important;
}

.vip-level-card.locked {
    background: #F8FAFC !important;
    border: 1px solid #E2E8F0 !important;
}

.vip-level-card.unlocked {
    background: #FFFFFF !important;
    border: 2px solid #3b82f6 !important;
    box-shadow: 0 8px 24px rgba(59,130,246,0.15) !important;
}

/* Any remaining gold text becomes blue */
.text-gold, [class*="gold"] {
    color: #3b82f6 !important;
}
`;
  fs.writeFileSync(path, css);
  console.log('Fixed account UI');
}
