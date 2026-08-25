const fs = require('fs');

let path = 'app/club.css';
if (fs.existsSync(path)) {
  let css = fs.readFileSync(path, 'utf8');

  // Replace auth-page background
  css = css.replace(
    /\.auth-page \{\n\s*background: #FFFFFF !important;\n\s*min-height: 100vh;\n\}/g,
    `.auth-page {
    background: radial-gradient(circle at 50% 0%, rgba(167, 253, 235, 0.4) 0%, rgba(244, 247, 249, 1) 40%) !important;
    background-color: #F4F7F9 !important;
    min-height: 100vh;
}`
  );

  // Upgrade Topbar
  css = css.replace(
    /\.auth-topbar \{\n\s*background: #FFFFFF !important;\n\s*border-bottom: none !important;\n\s*position: sticky;\n\s*top: 0;\n\s*z-index: 100;\n\}/g,
    `.auth-topbar {
    background: rgba(244, 247, 249, 0.7) !important;
    backdrop-filter: blur(20px) !important;
    border-bottom: none !important;
    position: sticky;
    top: 0;
    z-index: 100;
}`
  );

  // Make inputs pop
  const oldInput = `.premium-input-wrap {
    background: #F8FAFC !important;
    border: 1.5px solid #E2E8F0 !important;
    border-radius: 16px !important;
    display: flex !important;
    align-items: center !important;
    padding: 0 16px !important;
    transition: all 0.25s ease !important;
}`;
  
  const newInput = `.premium-input-wrap {
    background: #FFFFFF !important;
    border: 1px solid rgba(167, 253, 235, 0.3) !important;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.03) !important;
    border-radius: 18px !important;
    display: flex !important;
    align-items: center !important;
    padding: 0 16px !important;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}`;
  css = css.replace(oldInput, newInput);

  // Phone input pop
  const oldPhoneInput = `.auth-phone-input {
    background: #F8FAFC !important;
    border: 1.5px solid #E2E8F0 !important;
    border-radius: 16px !important;
    padding: 0 20px !important;
    font-size: 15px !important;
    color: var(--theme-text) !important;
    font-weight: 600 !important;
    transition: all 0.25s ease !important;
}`;

  const newPhoneInput = `.auth-phone-input {
    background: #FFFFFF !important;
    border: 1px solid rgba(167, 253, 235, 0.3) !important;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.03) !important;
    border-radius: 18px !important;
    padding: 0 20px !important;
    font-size: 15px !important;
    color: var(--theme-text) !important;
    font-weight: 600 !important;
    transition: all 0.3s ease !important;
    width: 100% !important;
}`;
  css = css.replace(oldPhoneInput, newPhoneInput);

  const oldCountry = `.auth-country-code {
    background: #F8FAFC !important;
    border: 1.5px solid #E2E8F0 !important;
    border-radius: 16px !important;
    color: var(--theme-text) !important;
    font-weight: 700 !important;
}`;
  const newCountry = `.auth-country-code {
    background: #FFFFFF !important;
    border: 1px solid rgba(167, 253, 235, 0.3) !important;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.03) !important;
    border-radius: 18px !important;
    color: var(--theme-text) !important;
    font-weight: 700 !important;
}`;
  css = css.replace(oldCountry, newCountry);

  // Tabs upgrade
  const oldTabs = `.register-tabs {
    display: flex !important;
    background: #F1F5F9 !important;
    border-radius: 16px !important;
    padding: 6px !important;
    margin-bottom: 24px !important;
    gap: 0 !important;
}`;
  const newTabs = `.register-tabs {
    display: flex !important;
    background: rgba(255, 255, 255, 0.5) !important;
    border-radius: 20px !important;
    padding: 6px !important;
    margin-bottom: 32px !important;
    gap: 8px !important;
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.02) !important;
}`;
  css = css.replace(oldTabs, newTabs);

  const oldTabBtnActive = `.register-tabs button.active {
    background: #FFFFFF !important;
    color: var(--theme-text) !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.05) !important;
}`;
  const newTabBtnActive = `.register-tabs button.active {
    background: #FFFFFF !important;
    color: var(--theme-text) !important;
    box-shadow: 0 6px 16px rgba(0,0,0,0.08) !important;
    border-radius: 16px !important;
}`;
  css = css.replace(oldTabBtnActive, newTabBtnActive);

  // Button upgrade
  const oldBtn = `.premium-submit-btn {
    background: linear-gradient(90deg, rgba(167,253,235,1) 0%, rgba(206,255,245,1) 100%) !important;
    color: #000 !important;`;
  const newBtn = `.premium-submit-btn {
    background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%) !important;
    color: #FFFFFF !important;`;
  css = css.replace(oldBtn, newBtn);

  fs.writeFileSync(path, css);
  console.log('Made auth UI very attractive');
}
