const fs = require('fs');

let path = 'app/club.css';
if (fs.existsSync(path)) {
  let css = fs.readFileSync(path, 'utf8');

  // Change auth-page background to pure white
  css = css.replace(
    /\.auth-page \{\n\s*background: #F4F7F9 !important;\n\s*min-height: 100vh;\n\}/g,
    '.auth-page {\n    background: #FFFFFF !important;\n    min-height: 100vh;\n}'
  );

  // Strip register-card styling to make it flat
  css = css.replace(
    /\.register-card \{\n\s*background: rgba\(255, 255, 255, 0\.95\) !important;\n\s*backdrop-filter: blur\(30px\) !important;\n\s*border: 1px solid rgba\(255, 255, 255, 1\) !important;\n\s*border-radius: 28px !important;\n\s*box-shadow: 0 25px 50px rgba\(0, 0, 0, 0\.08\), 0 0 0 1px rgba\(0,0,0,0\.02\) !important;\n\s*padding: 28px 24px !important;\n\}/g,
    '.register-card {\n    background: transparent !important;\n    border: none !important;\n    box-shadow: none !important;\n    padding: 10px 24px !important;\n}'
  );
  
  // Also remove topbar background to make it flat
  css = css.replace(
    /\.auth-topbar \{\n\s*background: rgba\(255, 255, 255, 0\.8\) !important;\n\s*backdrop-filter: blur\(20px\) !important;\n\s*border-bottom: 1px solid rgba\(0,0,0,0\.05\) !important;\n\s*position: sticky;\n\s*top: 0;\n\s*z-index: 100;\n\}/g,
    '.auth-topbar {\n    background: #FFFFFF !important;\n    border-bottom: none !important;\n    position: sticky;\n    top: 0;\n    z-index: 100;\n}'
  );

  fs.writeFileSync(path, css);
  console.log('Fixed Auth UI to be flat full-page');
}
