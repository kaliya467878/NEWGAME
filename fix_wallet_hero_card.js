const fs = require('fs');

// The issue might be that --theme-bg-card in theme.css is not taking effect 
// or there's a hardcoded background in a JS file inline style
let walletJs = fs.readFileSync('components/wallet/WalletScreen.js', 'utf8');

// Replace any inline styles that might be causing grey boxes
walletJs = walletJs.replace(/style=\{\{.*?background:.*?'#(1e1e24|141414|1c1c24|374151|4b5563|71717a|6b7280)'.*?\}\}/gi, '');
walletJs = walletJs.replace(/bg-\[(#[1-7][0-9a-fA-F]{5})\]/gi, 'bg-white');

fs.writeFileSync('components/wallet/WalletScreen.js', walletJs);

// Hardcode white backgrounds in wallet.css as a fallback
let walletCss = fs.readFileSync('app/wallet/wallet.css', 'utf8');

// Force white backgrounds on cards
walletCss = walletCss.replace(/\.wallet-hero-card\s*\{[^}]+\}/g, `
.wallet-hero-card {
  position: relative;
  margin: 0.75rem 1rem;
  padding: 1.25rem 1.125rem 1rem;
  border-radius: 20px;
  background: #FFFFFF !important;
  border: 1px solid #EAEAEA;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}
`);

walletCss = walletCss.replace(/\.wallet-action-card\s*\{[^}]+\}/g, `
.wallet-action-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #FFFFFF !important;
  border: 1px solid #EAEAEA;
  border-radius: 16px;
  text-decoration: none;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  margin-bottom: 0.75rem;
}
`);

walletCss = walletCss.replace(/\.wallet-action-icon\s*\{[^}]+\}/g, `
.wallet-action-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F7F8FA !important;
  color: var(--theme-primary) !important;
}
`);

// Force text colors
walletCss = walletCss.replace(/color:\s*var\(--theme-text-secondary\)/g, 'color: #646566 !important');
walletCss = walletCss.replace(/color:\s*var\(--theme-text-muted\)/g, 'color: #969799 !important');
walletCss = walletCss.replace(/color:\s*var\(--theme-text-dim\)/g, 'color: #C8C9CC !important');
walletCss = walletCss.replace(/color:\s*var\(--theme-text\)/g, 'color: #323233 !important');

fs.writeFileSync('app/wallet/wallet.css', walletCss);

// Fix Referral Screen Cards
let referralCss = fs.readFileSync('app/referral/referral.css', 'utf8');
referralCss = referralCss.replace(/\.referral-card\s*\{[^}]+\}/g, `
.referral-card {
  background: #FFFFFF !important;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  border: 1px solid #EAEAEA;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}
`);
fs.writeFileSync('app/referral/referral.css', referralCss);

console.log('Forced white background on wallet and referral cards');
