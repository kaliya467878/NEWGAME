const fs = require('fs');
let path = 'components/games/GameHeader.tsx';

if (fs.existsSync(path)) {
  let code = fs.readFileSync(path, 'utf8');

  // Replace text-gold with text-white or text-blue-500 based on context
  // Wait, let's just make the top header beautiful by replacing the card-surface styles directly
  
  // Wallet Balance text
  code = code.replace(/text-gold/g, 'text-blue-500');
  
  // Withdraw Button
  code = code.replace(/border-red\/40 text-red bg-red\/10/g, 'border-white\/40 text-white bg-white\/20');
  
  // Deposit Button
  code = code.replace(/border border-gold\/50 bg-gradient-to-r from-gold-light to-gold text-dark/g, 'border border-transparent bg-white text-blue-500');

  // Make the wallet card a blue gradient
  code = code.replace(
    /className="card-surface rounded-2xl p-5 sm:p-6 flex flex-col items-center gap-4"/g,
    'className="rounded-2xl p-5 sm:p-6 flex flex-col items-center gap-4 shadow-xl" style={{ background: "linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)", color: "white" }}'
  );

  // Fix the text inside the blue wallet card
  code = code.replace(/text-2xl font-bold text-blue-500/g, 'text-3xl font-extrabold text-white tracking-tight');
  code = code.replace(/text-xs text-muted/g, 'text-sm text-blue-100 font-medium');

  // Fix the refresh icon color inside the blue card
  code = code.replace(/className="absolute right-0 top-0 text-blue-500 hover:text-gold-light transition-colors"/g, 'className="absolute right-0 top-0 text-white hover:text-blue-100 transition-colors"');

  // Tab active states (duration tabs)
  // Original: "border border-gold shadow-[0_0_12px_rgba(212,175,55,0.4)] text-gold"
  code = code.replace(
    /border border-gold shadow-\[0_0_12px_rgba\(212,175,55,0\.4\)\] text-blue-500/g, 
    'border border-blue-500 bg-gradient-to-br from-cyan-400 to-blue-500 shadow-[0_4px_12px_rgba(59,130,246,0.4)] text-white'
  );
  // Original: text-[11px] font-semibold ${active ? "text-gold" : "text-muted"}
  code = code.replace(/\? "text-blue-500" :/g, '? "text-blue-500" :');

  // Fix the marquee (announcement box)
  code = code.replace(
    /className="card-surface rounded-2xl px-4 py-3 flex items-center gap-3" style={{ border: "1px solid rgba\(212, 175, 55, 0\.25\)" }}/g,
    'className="bg-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm border border-slate-200"'
  );
  
  fs.writeFileSync(path, code);
  console.log('Fixed GameHeader UI');
}
