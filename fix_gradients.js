const fs = require('fs');

let accountCss = fs.readFileSync('app/account/account.css', 'utf8');

// Fix the top account profile header to be entirely clean (GoaGame style blue)
accountCss = accountCss.replace(/\.account-profile-header\s*\{[^}]+\}/g, `
.account-profile-header {
  position: relative;
  padding: 1.5rem 1rem 1rem;
  background: var(--theme-primary);
  border-bottom: none;
  margin-bottom: -10px;
  padding-bottom: 24px;
}
`);

// The name and UID should be white text when on blue background
accountCss = accountCss.replace(/\.account-profile-name-link\s*h1\s*\{[^}]+\}/g, `
.account-profile-name-link h1 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #FFFFFF;
}
`);

accountCss = accountCss.replace(/\.account-uid\s*\{[^}]+\}/g, `
.account-uid {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: rgba(255,255,255,0.2);
  border: none;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  color: #FFFFFF;
  font-size: 0.8rem;
  font-family: monospace;
  cursor: pointer;
  margin: 0.25rem 0;
}
`);

accountCss = accountCss.replace(/\.account-last-login\s*\{[^}]+\}/g, `
.account-last-login {
  margin: 0;
  font-size: 0.75rem;
  color: rgba(255,255,255,0.8);
}
`);

// Avatar should be blue/white theme
accountCss = accountCss.replace(/\.account-avatar\s*\{[^}]+\}/g, `
.account-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: #FFFFFF;
  border: 2px solid rgba(255,255,255,0.5);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
`);

fs.writeFileSync('app/account/account.css', accountCss);

let walletCss = fs.readFileSync('app/wallet/wallet.css', 'utf8');
// Any other weird gradients
walletCss = walletCss.replace(/radial-gradient\([^)]+\)/g, 'var(--theme-primary)');
walletCss = walletCss.replace(/linear-gradient\([^)]+\)/g, 'var(--theme-primary)');
fs.writeFileSync('app/wallet/wallet.css', walletCss);

console.log('Fixed account gradients');
