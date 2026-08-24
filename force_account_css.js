const fs = require('fs');

let accountCss = fs.readFileSync('app/account/account.css', 'utf8');

// Force white backgrounds on account cards
accountCss = accountCss.replace(/\.account-menu-group\s*\{[^}]+\}/g, `
.account-menu-group {
  background: #FFFFFF !important;
  border-radius: 12px;
  margin-bottom: 12px;
  overflow: hidden;
  border: 1px solid #EAEAEA;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}
`);

accountCss = accountCss.replace(/\.account-menu-item\s*\{[^}]+\}/g, `
.account-menu-item {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  text-decoration: none;
  background: #FFFFFF !important;
  transition: background 0.2s ease;
  position: relative;
}
`);

// Force white on VIP / balance cards in account
accountCss = accountCss.replace(/\.account-balance-card\s*\{[^}]+\}/g, `
.account-balance-card {
  background: #FFFFFF !important;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid #EAEAEA;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}
`);

fs.writeFileSync('app/account/account.css', accountCss);
console.log('Forced white background on account cards');
