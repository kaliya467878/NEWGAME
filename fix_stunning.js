const fs = require('fs');
let path = 'app/stunning.css';
if (fs.existsSync(path)) {
  let code = fs.readFileSync(path, 'utf8');
  
  // The wallet hero card, etc should be SkyBlue gradient, not white if they have white text!
  code = code.replace(/background:\s*var\(--theme-bg-card\)\s*!important;/g, 'background: linear-gradient(135deg, var(--theme-primary) 0%, #1D4ED8 100%) !important;');
  
  fs.writeFileSync(path, code);
  console.log('Fixed stunning.css invisible text');
}
