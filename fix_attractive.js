const fs = require('fs');

let cssPath = 'app/club.css';
if (fs.existsSync(cssPath)) {
  let css = fs.readFileSync(cssPath, 'utf8');
  
  // Make club-categories look like a floating glass pill
  css = css.replace(
    /\.club-categories\s*\{\s*display: flex;\s*flex-direction: column;\s*gap: 14px;\s*margin: 0;\s*padding: 14px 8px;\s*overflow-y: auto;\s*scrollbar-width:none;\s*background: var\(--theme-bg-card\);\s*border: 1px solid var\(--theme-border\);\s*border-radius: 20px;\s*backdrop-filter: blur\(10px\);\s*\}/g,
    `.club-categories {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin: 0;
    padding: 16px 6px;
    overflow-y: auto;
    scrollbar-width: none;
    background: rgba(255, 255, 255, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.6);
    border-radius: 18px;
    backdrop-filter: blur(12px);
    box-shadow: 0 8px 32px rgba(71, 129, 255, 0.08);
}`
  );
  
  // Update icon wrap for a smaller, prettier look
  css = css.replace(
    /\.club-category-icon-wrap\{\s*width:56px;\s*height:56px;/g,
    `.club-category-icon-wrap{
    width:50px;
    height:50px;`
  );
  
  // Add hover effect for unselected icons
  if (!css.includes('.club-category-tab:hover:not(.active) .club-category-icon-wrap')) {
    css += `
.club-category-tab:hover:not(.active) .club-category-icon-wrap {
    background: #eef2ff;
    color: var(--theme-primary);
    transform: translateY(-2px);
}
`;
  }
  
  fs.writeFileSync(cssPath, css);
  console.log('Updated CSS for attractive category tabs');
}
