const fs = require('fs');
let path = 'app/club.css';

if (fs.existsSync(path)) {
  let css = fs.readFileSync(path, 'utf8');
  
  const newTheme = `

/* ==========================================================
   NEW PREMIUM AUTH UI OVERRIDE (SKYBLUE & GLASS)
========================================================== */

.auth-page {
    background: #F4F7F9 !important;
    min-height: 100vh;
}

/* Beautiful Top Bar */
.auth-topbar {
    background: rgba(255, 255, 255, 0.8) !important;
    backdrop-filter: blur(20px) !important;
    border-bottom: 1px solid rgba(0,0,0,0.05) !important;
    position: sticky;
    top: 0;
    z-index: 100;
}

/* Premium Hero Area */
.premium-hero {
    background: linear-gradient(135deg, rgba(167,253,235,0.4) 0%, rgba(206,255,245,0) 100%) !important;
    padding: 40px 24px 60px !important;
    position: relative;
    border-bottom-left-radius: 40px;
    border-bottom-right-radius: 40px;
    box-shadow: 0 10px 30px rgba(167,253,235,0.2);
}

.premium-hero::before {
    background: var(--theme-green) !important;
    width: 300px !important;
    height: 300px !important;
    right: -100px !important;
    top: -100px !important;
    opacity: 0.15 !important;
    filter: blur(80px) !important;
}

.hero-title {
    color: var(--theme-text) !important;
    font-size: 34px !important;
    font-weight: 800 !important;
    line-height: 1.1 !important;
    text-shadow: 0 2px 10px rgba(0,0,0,0.05);
}

.hero-subtitle {
    color: #64748b !important;
    font-weight: 500 !important;
    font-size: 14px !important;
    margin-top: 12px !important;
}

.hero-image {
    filter: drop-shadow(0 15px 25px rgba(0,0,0,0.1));
    transform: scale(1.1) translateY(10px);
}

/* The Glass Form Card */
.premium-form-section {
    margin-top: -40px !important;
    padding: 0 20px 40px !important;
    position: relative;
    z-index: 10;
}

.register-card {
    background: rgba(255, 255, 255, 0.95) !important;
    backdrop-filter: blur(30px) !important;
    border: 1px solid rgba(255, 255, 255, 1) !important;
    border-radius: 28px !important;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0,0,0,0.02) !important;
    padding: 28px 24px !important;
}

/* Tabs */
.register-tabs {
    display: flex !important;
    background: #F1F5F9 !important;
    border-radius: 16px !important;
    padding: 6px !important;
    margin-bottom: 24px !important;
    gap: 0 !important;
}

.register-tabs button {
    flex: 1 !important;
    background: transparent !important;
    color: #64748b !important;
    border: none !important;
    padding: 12px !important;
    font-weight: 600 !important;
    font-size: 14px !important;
    border-radius: 12px !important;
    transition: all 0.3s ease !important;
}

.register-tabs button.active {
    background: #FFFFFF !important;
    color: var(--theme-text) !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.05) !important;
}

/* Input Fields */
.premium-field {
    margin-bottom: 20px !important;
}

.premium-field label {
    color: #475569 !important;
    font-size: 13px !important;
    font-weight: 700 !important;
    margin-bottom: 8px !important;
    display: flex !important;
    align-items: center !important;
}

.premium-input-wrap {
    background: #F8FAFC !important;
    border: 1.5px solid #E2E8F0 !important;
    border-radius: 16px !important;
    display: flex !important;
    align-items: center !important;
    padding: 0 16px !important;
    transition: all 0.25s ease !important;
}

.premium-input-wrap:focus-within {
    border-color: var(--theme-green) !important;
    background: #FFFFFF !important;
    box-shadow: 0 0 0 4px rgba(167,253,235,0.4) !important;
}

.premium-input-wrap input.auth-input {
    background: transparent !important;
    border: none !important;
    padding: 16px 0 !important;
    font-size: 15px !important;
    color: var(--theme-text) !important;
    font-weight: 600 !important;
    width: 100% !important;
    outline: none !important;
}

.premium-input-wrap input.auth-input::placeholder {
    color: #94A3B8 !important;
    font-weight: 500 !important;
}

/* Submit Button */
.premium-submit-btn {
    background: linear-gradient(90deg, rgba(167,253,235,1) 0%, rgba(206,255,245,1) 100%) !important;
    color: #000 !important;
    border: none !important;
    width: 100% !important;
    padding: 18px !important;
    border-radius: 18px !important;
    font-size: 16px !important;
    font-weight: 800 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.5px !important;
    box-shadow: 0 10px 25px rgba(167,253,235,0.6) !important;
    cursor: pointer !important;
    transition: all 0.3s ease !important;
    margin-top: 10px !important;
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
    gap: 8px !important;
}

.premium-submit-btn:active {
    transform: translateY(2px) scale(0.98) !important;
    box-shadow: 0 5px 15px rgba(167,253,235,0.4) !important;
}

/* Links */
.premium-link {
    color: var(--theme-green) !important;
    font-weight: 700 !important;
    text-decoration: none !important;
    margin-left: 5px !important;
}

`;

  css += newTheme;
  fs.writeFileSync(path, css);
  console.log('Appended premium auth UI overrides to club.css');
}
