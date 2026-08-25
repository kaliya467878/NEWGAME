const fs = require('fs');
let path = 'app/club.css';

if (fs.existsSync(path)) {
  let css = fs.readFileSync(path, 'utf8');

  const ultimateOverride = `

/* ==========================================================
   ULTIMATE SLEEK AUTH UI (BETTING APP STANDARD)
========================================================== */

/* Clean White Background */
.auth-page {
    background: #FFFFFF !important;
    min-height: 100vh;
}

.auth-topbar {
    background: #FFFFFF !important;
    backdrop-filter: none !important;
    border-bottom: none !important;
}

/* Headings */
.register-card h1 {
    font-size: 26px !important;
    color: #111111 !important;
    font-weight: 700 !important;
    letter-spacing: 0 !important;
    margin-bottom: 4px !important;
}

.register-card p {
    color: #94a3b8 !important;
    font-size: 14px !important;
}

/* Tabs */
.register-tabs {
    background: #F1F5F9 !important;
    border-radius: 12px !important;
    padding: 4px !important;
    margin-bottom: 30px !important;
}

.register-tabs button {
    border-radius: 8px !important;
    font-weight: 600 !important;
    font-size: 14px !important;
    color: #64748b !important;
}

.register-tabs button.active {
    background: #FFFFFF !important;
    color: var(--theme-green) !important;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05) !important;
}

/* Labels */
.premium-field label {
    color: #111111 !important;
    font-size: 14px !important;
    font-weight: 600 !important;
    margin-bottom: 4px !important;
}
.premium-field label svg {
    color: var(--theme-green) !important;
}

/* SLEEK UNDERLINE INPUTS */
.premium-input-wrap {
    background: transparent !important;
    border: none !important;
    border-bottom: 1px solid #E2E8F0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    padding: 4px 0 !important;
    transition: border-color 0.3s ease !important;
}

.premium-input-wrap:focus-within {
    background: transparent !important;
    border-bottom: 1px solid var(--theme-green) !important;
    box-shadow: none !important;
}

.premium-input-wrap input.auth-input {
    padding: 12px 8px !important;
    font-size: 15px !important;
    color: #111111 !important;
    font-weight: 500 !important;
}

/* Phone Row Specifics */
.auth-phone-row {
    display: flex !important;
    align-items: center !important;
    border-bottom: 1px solid #E2E8F0 !important;
    gap: 0 !important;
    transition: border-color 0.3s ease !important;
}

.auth-phone-row:focus-within {
    border-bottom: 1px solid var(--theme-green) !important;
}

.auth-country-code {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    padding: 0 12px 0 4px !important;
    height: auto !important;
    color: #111111 !important;
    font-weight: 600 !important;
    border-right: 1px solid #E2E8F0 !important;
    margin-right: 12px !important;
}

.auth-phone-input {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    padding: 12px 0 !important;
    font-size: 15px !important;
    color: #111111 !important;
    font-weight: 500 !important;
}

.auth-phone-input:focus {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
}

/* Password Eye Icon */
.premium-input-wrap svg {
    color: #cbd5e1 !important;
}
.premium-input-wrap:focus-within svg {
    color: var(--theme-green) !important;
}

/* Submit Button */
.premium-register-btn, .auth-btn, button[type="submit"] {
    background: linear-gradient(90deg, #10b981 0%, #14b8a6 100%) !important;
    color: #FFFFFF !important;
    border-radius: 12px !important;
    padding: 15px !important;
    font-size: 16px !important;
    font-weight: 700 !important;
    box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3) !important;
    margin-top: 20px !important;
    text-transform: none !important;
    letter-spacing: 0 !important;
}

/* Remember & Privacy */
.auth-checkbox-label {
    color: #64748b !important;
    font-size: 13px !important;
}
.premium-link {
    color: var(--theme-green) !important;
}
`;

  css += ultimateOverride;
  fs.writeFileSync(path, css);
  console.log('Applied ultimate sleek underline auth design');
}
