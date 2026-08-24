const fs = require("fs");
const path = require("path");

const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu;

function scan(dir) {
  for (const file of fs.readdirSync(dir)) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (!["node_modules", ".git", ".next", "scratch"].includes(file)) {
        scan(full);
      }
    } else if (/\.(js|jsx|ts|tsx)$/.test(file)) {
      const content = fs.readFileSync(full, "utf8");
      if (emojiRegex.test(content)) {
        console.log(`Found emojis in: ${full}`);
        const lines = content.split("\n");
        lines.forEach((line, i) => {
          if (emojiRegex.test(line)) {
            console.log(`  Line ${i + 1}: ${line.trim()}`);
          }
        });
      }
    }
  }
}

scan(path.join(__dirname, "..", "app"));
scan(path.join(__dirname, "..", "components"));
