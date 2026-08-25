const fs = require('fs');

let homePath = 'components/home/HomeScreen.js';
if (fs.existsSync(homePath)) {
  let code = fs.readFileSync(homePath, 'utf8');
  
  // Replace sequential rendering with flex row
  const oldCode = `<CategoryTabs
        active={category}
        onChange={setCategory}
      />

      <GameGrid category={category} />`;
      
  const newCode = `<div className="home-main-layout" style={{ display: "flex", gap: "10px", padding: "0 10px", alignItems: "flex-start", marginBottom: "20px" }}>
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

  if (code.includes(oldCode)) {
    code = code.replace(oldCode, newCode);
    fs.writeFileSync(homePath, code);
    console.log('Updated HomeScreen.js layout');
  } else {
    console.log('Could not find the exact code block in HomeScreen.js');
  }
}
