const fs = require('fs');
let path = 'app/k3/k3.css';
if (fs.existsSync(path)) {
  let css = fs.readFileSync(path, 'utf8');
  css += `
.k3-dice-slots-container {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 8px !important;
  align-items: stretch !important;
  justify-content: center;
  padding: 4px;
  width: 100% !important;
  height: 100% !important;
}

.k3-dice-slot {
  background: #363636 !important; /* dark grey inner */
  border-radius: 6px !important;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none !important;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.5) !important;
}

.dice-png-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}
`;
  fs.writeFileSync(path, css);
  console.log('Fixed slots CSS');
}
