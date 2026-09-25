const fs = require('fs');
let code = fs.readFileSync('src/utils/pdfV2Exporter.ts', 'utf8');

const target = `    const range = document.createRange();
    range.selectNodeContents(textNode);
    const rect = range.getBoundingClientRect();

    if (rect.width <= 0 || rect.height <= 0) continue;`;

const replacement = `    const range = document.createRange();
    range.selectNodeContents(textNode);
    const rect = range.getBoundingClientRect();

    const style = window.getComputedStyle(parentEl);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") continue;
    
    // Allow capturing even if height is technically 0 due to some flex/grid collapsing issues on cloned text ranges,
    // as long as it has a valid x,y position on the sheet.
    if (rect.x === 0 && rect.y === 0 && rect.width === 0) continue;`;

code = code.replace(target, replacement);
fs.writeFileSync('src/utils/pdfV2Exporter.ts', code);
console.log("Text rect fixed");
