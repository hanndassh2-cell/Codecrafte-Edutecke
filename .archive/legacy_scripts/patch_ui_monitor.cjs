const fs = require('fs');
const file = 'src/components/UIIntegrityMonitor.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetStr = `        // Detect raw LaTeX patterns:`;
const checkLiStr = `
        // Check for <li> elements and ensure they have a container block context to protect emojis/markers.
        if (parent.tagName === "LI" && !parent.classList.contains("list-item-normalized")) {
          parent.classList.add("list-item-normalized");
          if (!parent.style.position || parent.style.position === "static") {
            parent.style.position = "relative";
          }
        }

`;

if (code.includes(targetStr)) {
    code = code.replace(targetStr, checkLiStr + targetStr);
    fs.writeFileSync(file, code);
    console.log('Patched UIIntegrityMonitor');
}
