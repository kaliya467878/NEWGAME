const fs = require('fs');
let path = 'components/home/GameGrid.js';
if (fs.existsSync(path)) {
  let code = fs.readFileSync(path, 'utf8');

  // Add id to HomeGameSection
  code = code.replace(
    /return \(\n\s*<div className="club-game-section">/g,
    'return (\n    <div id={`section-${catKey}`} className="club-game-section">'
  );

  // Add the sub-nav logic in GameGrid component
  const oldReturn = `  return (
    <>
      <div style={{ marginTop: "12px" }}>
        {sectionsToShow.map((sec) => (`;
        
  const newReturn = `  const SUB_NAV = [
    { id: "lobby", label: "Lobby" },
    { id: "slots", label: "Slots" },
    { id: "lottery", label: "Lottery" },
    { id: "sports", label: "Sports" },
    { id: "live", label: "Casino" }
  ];
  const [activeSub, setActiveSub] = useState("lobby");

  const handleSubNavClick = (id) => {
    setActiveSub(id);
    const mappedKey = id === "lobby" ? "wingo" : id === "lottery" ? "k3" : id;
    const el = document.getElementById(\`section-\${mappedKey}\`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      {category === "all" && (
        <div style={{ display: "flex", gap: "20px", padding: "4px 8px 16px", overflowX: "auto", scrollbarWidth: "none", alignItems: "center" }}>
          {SUB_NAV.map(item => {
            const isActive = activeSub === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSubNavClick(item.id)}
                style={{
                  background: isActive ? "linear-gradient(90deg, rgba(167,253,235,1) 0%, rgba(206,255,245,1) 100%)" : "transparent",
                  color: isActive ? "#000" : "#64748b",
                  border: "none",
                  padding: "6px 16px",
                  borderRadius: "20px",
                  fontSize: "14px",
                  fontWeight: isActive ? "700" : "500",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  boxShadow: isActive ? "0 4px 12px rgba(167,253,235,0.5)" : "none",
                  transition: "all 0.3s ease"
                }}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      )}
      <div style={{ marginTop: "0px" }}>
        {sectionsToShow.map((sec) => (`;

  code = code.replace(oldReturn, newReturn);
  fs.writeFileSync(path, code);
  console.log('Added sub-nav to GameGrid.js');
}
