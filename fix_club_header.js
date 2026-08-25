const fs = require('fs');
let path = 'app/club.css';
if (fs.existsSync(path)) {
  let css = fs.readFileSync(path, 'utf8');

  // Replace background: var(--theme-primary); with background: #FFFFFF; for .club-header
  css = css.replace(/\.club-header\s*{[^}]*background:\s*var\(--theme-primary\)[^}]*}/g, (match) => {
      return match.replace(/background:\s*var\(--theme-primary\);/, 'background: #FFFFFF !important;');
  });
  
  // Wait, there's also the color issue. If it's white, the text/icons should be dark!
  // In the original, it did color: #FFFFFF !important;
  // Let's replace color: #FFFFFF !important; inside .club-header blocks with color: var(--theme-text) !important;
  css = css.replace(/\.club-header\s*{[^}]*}/g, (match) => {
      return match.replace(/color:\s*#FFFFFF\s*!important;/g, 'color: var(--theme-text) !important;');
  });

  // Also fix the links/buttons color inside the media query
  css = css.replace(/\.club-header\s*a,\s*\.club-header\s*button,\s*\.club-header\s*\.club-header-title\s*{\s*color:\s*#FFFFFF\s*!important;\s*}/g, 
  '.club-header a, .club-header button, .club-header .club-header-title { color: var(--theme-text) !important; }');
  
  // Just to be absolutely safe, let's append a global override for .club-header
  css += `
  
/* FORCE CLUB HEADER TO ALWAYS BE WHITE */
.club-header {
    background: #FFFFFF !important;
    border-bottom: 1px solid rgba(0,0,0,0.04) !important;
}
.club-header a, .club-header button, .club-header .club-header-title, .club-header svg {
    color: #1e293b !important;
}
`;

  fs.writeFileSync(path, css);
  console.log('Fixed mobile club header');
}
