const fs = require('fs');

let loginPath = 'app/login/page.js';
if (fs.existsSync(loginPath)) {
  let code = fs.readFileSync(loginPath, 'utf8');

  // Remove premium-hero
  const heroRegex = /<section className="premium-hero">[\s\S]*?<\/section>/g;
  code = code.replace(heroRegex, '');

  // Add minimal header inside register-card
  const cardStart = '<div className="register-card">';
  const minimalHeader = `<div className="register-card">
            <div style={{ textAlign: "center", marginBottom: "32px", marginTop: "10px" }}>
              <h1 style={{ fontSize: "32px", fontWeight: "800", color: "var(--theme-text)", marginBottom: "8px", letterSpacing: "-0.5px" }}>Welcome Back</h1>
              <p style={{ fontSize: "15px", color: "#64748b", fontWeight: "500" }}>Login to your Lucky Nova account</p>
            </div>`;
  
  code = code.replace(cardStart, minimalHeader);
  fs.writeFileSync(loginPath, code);
  console.log('Fixed login UI');
}

let registerPath = 'components/auth/RegisterForm.js';
if (fs.existsSync(registerPath)) {
  let code = fs.readFileSync(registerPath, 'utf8');

  // Remove premium-hero
  const heroRegex = /<section className="premium-hero">[\s\S]*?<\/section>/g;
  code = code.replace(heroRegex, '');

  // Add minimal header inside register-card
  const cardStart = '<div className="register-card">';
  const minimalHeader = `<div className="register-card">
            <div style={{ textAlign: "center", marginBottom: "32px", marginTop: "10px" }}>
              <h1 style={{ fontSize: "32px", fontWeight: "800", color: "var(--theme-text)", marginBottom: "8px", letterSpacing: "-0.5px" }}>Create Account</h1>
              <p style={{ fontSize: "15px", color: "#64748b", fontWeight: "500" }}>Join Lucky Nova today</p>
            </div>`;
            
  code = code.replace(cardStart, minimalHeader);
  fs.writeFileSync(registerPath, code);
  console.log('Fixed register UI');
}

let cssPath = 'app/club.css';
if (fs.existsSync(cssPath)) {
  let css = fs.readFileSync(cssPath, 'utf8');
  // Update premium-form-section margin
  css = css.replace('margin-top: -40px !important;', 'margin-top: 30px !important;');
  fs.writeFileSync(cssPath, css);
  console.log('Fixed CSS margins');
}
