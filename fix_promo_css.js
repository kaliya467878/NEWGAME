const fs = require('fs');

let css = fs.readFileSync('app/club.css', 'utf8');

css += `
/* Goa Game Center Promo Button */
.club-nav-promo-btn-goa {
  position: absolute;
  top: -24px;
  left: 50%;
  transform: translateX(-50%);
  width: 56px;
  height: 56px;
  background: radial-gradient(circle, #FF9B44, #FF5A5F);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 10px rgba(255, 90, 95, 0.4);
  border: 3px solid #FFFFFF;
}

.goa-promo-dial {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 2px dashed rgba(255,255,255,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.goa-promo-go {
  color: #FFFFFF;
  font-weight: 800;
  font-size: 16px;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
}

.goa-promo-text {
  margin-top: 24px;
  color: #4781FF;
  font-weight: 700;
  font-size: 11px;
}
`;

fs.writeFileSync('app/club.css', css);
console.log('Fixed promo css');
