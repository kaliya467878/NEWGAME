const fs = require('fs');
let path = 'components/k3/GameBoard.tsx';
if (fs.existsSync(path)) {
  let code = fs.readFileSync(path, 'utf8');
  
  const searchStr = `function DiceFace({ value, size = "md" }: { value: number; size?: "sm" | "md" | "lg" }) {
  const dots = DOT_POSITIONS[value] ?? [];
  const dims = size === "lg" ? "h-24 w-24 sm:h-28 sm:w-28" : size === "sm" ? "h-8 w-8" : "h-16 w-16 sm:h-20 sm:w-20";
  const dotDims = size === "lg" ? "h-4 w-4" : size === "sm" ? "h-1.5 w-1.5" : "h-3 w-3";
  return (
    <div
      className={clsx(
        "relative rounded-2xl bg-gradient-to-b from-white to-[#f0f0f0] shadow-[0_4px_18px_rgba(225,29,72,0.35)] border border-gold/20",
        dims
      )}
    >
      {dots.map((p, i) => (
        <span key={i} className={clsx("absolute rounded-full bg-[var(--theme-bg-card)]", dotDims, DOT_POS_CLASS[p])} />
      ))}
    </div>
  );
}`;

  const replaceStr = `function DiceFace({ value, size = "md" }: { value: number; size?: "sm" | "md" | "lg" }) {
  const dims = size === "lg" ? "h-20 w-20 sm:h-24 sm:w-24" : size === "sm" ? "h-8 w-8" : "h-14 w-14 sm:h-16 sm:w-16";
  return (
    <img 
      src={\`/k3/images/\${value}.png\`}
      alt={\`Dice \${value}\`}
      className={clsx(
        "object-contain filter drop-shadow-lg", 
        dims
      )} 
    />
  );
}`;

  code = code.replace(searchStr, replaceStr);
  fs.writeFileSync(path, code);
  console.log('Fixed DiceFace');
}
