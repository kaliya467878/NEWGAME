const fs = require('fs');
let path = 'app/club.css';

if (fs.existsSync(path)) {
  let css = fs.readFileSync(path, 'utf8');
  
  const newTheme = `

/* Extra Phone Row Overrides */
.auth-country-code {
    background: #F8FAFC !important;
    border: 1.5px solid #E2E8F0 !important;
    border-radius: 16px !important;
    color: var(--theme-text) !important;
    font-weight: 700 !important;
}

.auth-phone-input {
    background: #F8FAFC !important;
    border: 1.5px solid #E2E8F0 !important;
    border-radius: 16px !important;
    padding: 0 20px !important;
    font-size: 15px !important;
    color: var(--theme-text) !important;
    font-weight: 600 !important;
    transition: all 0.25s ease !important;
}

.auth-phone-input:focus {
    border-color: var(--theme-green) !important;
    background: #FFFFFF !important;
    box-shadow: 0 0 0 4px rgba(167,253,235,0.4) !important;
}

/* Password Input SVG Icons */
.premium-input-wrap svg {
    color: #94A3B8 !important;
    transition: color 0.3s ease !important;
}

.premium-input-wrap:focus-within svg {
    color: var(--theme-green) !important;
}

.auth-input:-webkit-autofill {
    -webkit-box-shadow: 0 0 0 30px white inset !important;
    -webkit-text-fill-color: var(--theme-text) !important;
}

.hero-badge {
    background: var(--theme-green) !important;
    color: #000 !important;
    box-shadow: 0 4px 12px rgba(167,253,235,0.5) !important;
}
`;

  css += newTheme;
  fs.writeFileSync(path, css);
  console.log('Appended extra auth UI overrides to club.css');
}
