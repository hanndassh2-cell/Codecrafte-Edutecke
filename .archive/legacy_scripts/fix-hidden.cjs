const fs = require('fs');
let code = fs.readFileSync('src/utils/pdfV2Exporter.ts', 'utf8');

const target = `    const style = window.getComputedStyle(parentEl);
    
    const isArabic = hasArabicText(textContent);`;

const replacement = `    const style = window.getComputedStyle(parentEl);
    
    const isHidden = style.display === "none" || style.visibility === "hidden" || parseFloat(style.opacity) === 0;
    if (isHidden) continue;

    const isArabic = hasArabicText(textContent);`;

if (code.includes('const isArabic = hasArabicText(textContent);')) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/utils/pdfV2Exporter.ts', code);
  console.log("Hidden check added back.");
}
