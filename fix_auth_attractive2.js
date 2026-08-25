const fs = require('fs');
let path = 'app/club.css';

if (fs.existsSync(path)) {
  let css = fs.readFileSync(path, 'utf8');

  const extraOverrides = `
/* TRUE ATTRACTIVE OVERRIDES */

.premium-register-btn, .auth-btn, button[type="submit"] {
    background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%) !important;
    color: #FFFFFF !important;
    border: none !important;
    width: 100% !important;
    padding: 16px !important;
    border-radius: 16px !important;
    font-size: 16px !important;
    font-weight: 800 !important;
    letter-spacing: 0.5px !important;
    box-shadow: 0 10px 25px rgba(59, 130, 246, 0.4) !important;
    cursor: pointer !important;
    transition: all 0.3s ease !important;
    margin-top: 10px !important;
}

.premium-register-btn:active, .auth-btn:active {
    transform: translateY(2px) scale(0.98) !important;
    box-shadow: 0 5px 15px rgba(59, 130, 246, 0.3) !important;
}

/* Auth Page attractive gradient background */
.auth-page {
    background: radial-gradient(circle at 50% -20%, rgba(59, 130, 246, 0.15) 0%, rgba(244, 247, 249, 1) 50%) !important;
    background-color: #F4F7F9 !important;
}

/* Glassmorphism Topbar */
.auth-topbar {
    background: rgba(244, 247, 249, 0.6) !important;
    backdrop-filter: blur(20px) !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.5) !important;
}

/* Beautiful Inputs */
.premium-input-wrap, .auth-country-code, .auth-phone-input {
    background: rgba(255, 255, 255, 0.8) !important;
    border: 1px solid rgba(59, 130, 246, 0.2) !important;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.02) !important;
    border-radius: 16px !important;
}

.premium-input-wrap:focus-within, .auth-phone-input:focus {
    border-color: #3b82f6 !important;
    background: #FFFFFF !important;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15) !important;
}

.register-tabs {
    background: rgba(59, 130, 246, 0.05) !important;
    border-radius: 16px !important;
    padding: 6px !important;
}

.register-tabs button.active {
    background: #FFFFFF !important;
    color: #3b82f6 !important;
    box-shadow: 0 4px 15px rgba(0,0,0,0.05) !important;
}
`;

  css += extraOverrides;
  fs.writeFileSync(path, css);
  console.log('Appended final attractive styles');
}
