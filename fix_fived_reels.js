const fs = require('fs');
let path = 'app/fived/fived.css';
if (fs.existsSync(path)) {
  let css = fs.readFileSync(path, 'utf8');
  css += `

/* Fix 5D Reels to be bright and clean instead of dark */
.k5-reel-overlay-top {
    background: linear-gradient(to bottom, rgba(255, 255, 255, 0.95), transparent) !important;
}

.k5-reel-overlay-bottom {
    background: linear-gradient(to top, rgba(255, 255, 255, 0.95), transparent) !important;
}

.k5-reel-container {
    background: #FFFFFF !important;
    border: 1px solid #E2E8F0 !important;
}

.k5-reel-circle--inactive {
    background: #F1F5F9 !important;
    border: 1px solid #CBD5E1 !important;
    color: #64748b !important;
}

.k5-reel-circle--active {
    background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%) !important;
    color: #FFFFFF !important;
    border: none !important;
    box-shadow: 0 4px 12px rgba(59,130,246,0.3) !important;
}
`;
  fs.writeFileSync(path, css);
  console.log('Fixed fived reels');
}
