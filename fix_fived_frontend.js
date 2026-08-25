const fs = require('fs');
let path = 'components/fived/GameBoard.tsx';
if (fs.existsSync(path)) {
  let code = fs.readFileSync(path, 'utf8');

  const searchStr = `              <div className="grid grid-cols-5 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-inner">
                {DIGITS.map((n) => {
                  const isSelected = betType === "POSITION_NUMBER" && selection === \`\${selectorTab}:\${n}\`;`;

  const replaceStr = `              <div className="grid grid-cols-2 gap-2 mb-2">
                {(["BIG", "SMALL", "ODD", "EVEN"] as const).map((opt) => {
                  const isSelected = betType === "POSITION_NUMBER" && selection === \`\${selectorTab}:\${opt}\`;
                  const isBig = opt === "BIG";
                  const isSmall = opt === "SMALL";
                  const isOdd = opt === "ODD";
                  const isEven = opt === "EVEN";
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => pickDigit(selectorTab as any, opt as any)}
                      className={clsx(
                        "rounded-lg py-2 font-bold transition-all duration-150 border shadow-sm",
                        isSelected
                          ? "border-blue-500 bg-blue-500 text-white shadow-md scale-[1.02]"
                          : isBig || isSmall
                            ? "border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-300"
                            : "border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-300"
                      )}
                    >
                      {opt === "BIG" ? "Big" : opt === "SMALL" ? "Small" : opt === "ODD" ? "Odd" : "Even"} <span className="block text-[10px] font-normal mt-0.5 opacity-80">1.96X</span>
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-5 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-inner">
                {DIGITS.map((n) => {
                  const isSelected = betType === "POSITION_NUMBER" && selection === \`\${selectorTab}:\${n}\`;`;

  code = code.replace(searchStr, replaceStr);
  fs.writeFileSync(path, code);
  console.log('Fixed 5D Frontend');
}
