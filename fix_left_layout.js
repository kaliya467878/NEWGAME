const fs = require('fs');
let homePath = 'components/home/HomeScreen.js';
if (fs.existsSync(homePath)) {
  let code = fs.readFileSync(homePath, 'utf8');
  
  const oldCode = `<div className="home-main-layout" style={{ display: "flex", gap: "10px", padding: "0 10px", alignItems: "flex-start", marginBottom: "20px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <GameGrid category={category} />
        </div>
        <div style={{ width: "80px", flexShrink: 0 }}>
          <CategoryTabs
            active={category}
            onChange={setCategory}
          />
        </div>
      </div>`;
      
  const newCode = `<div className="home-main-layout" style={{ display: "flex", gap: "12px", padding: "0 12px", alignItems: "flex-start", marginBottom: "20px" }}>
        <div style={{ width: "72px", flexShrink: 0, position: "sticky", top: "70px", zIndex: 10 }}>
          <CategoryTabs
            active={category}
            onChange={setCategory}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <GameGrid category={category} />
        </div>
      </div>`;

  if (code.includes(oldCode)) {
    code = code.replace(oldCode, newCode);
    fs.writeFileSync(homePath, code);
    console.log('Swapped layout to LEFT side in HomeScreen.js');
  }
}
