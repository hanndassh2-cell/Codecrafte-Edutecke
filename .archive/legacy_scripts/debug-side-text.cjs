const fs = require('fs');
let code = fs.readFileSync('src/utils/pdfV2Exporter.ts', 'utf8');

const target = `    if (rect.width <= 0 || rect.height <= 0) continue;`;
const repl = `    if (rect.width <= 0 || rect.height <= 0) {
      if (textContent && textContent.includes("يمنع")) {
         console.log("[PDF-V2 SIDE TEXT REJECTED]", textContent, "rangeRect:", range.getBoundingClientRect(), "parentRect:", parentEl.getBoundingClientRect(), "grandParentRect:", parentEl.parentElement?.getBoundingClientRect());
      }
      continue;
    }
    
    if (textContent && textContent.includes("يمنع")) {
       console.log("[PDF-V2 SIDE TEXT ACCEPTED]", textContent, "rect:", rect, "angle:", Math.round(Math.atan2(window.getComputedStyle(parentEl).transform.match(/matrix\\((.+)\\)/)?.[1].split(',')[1] || 0, window.getComputedStyle(parentEl).transform.match(/matrix\\((.+)\\)/)?.[1].split(',')[0] || 1) * (180 / Math.PI)));
    }`;

if (code.includes(target) && !code.includes("[PDF-V2 SIDE TEXT REJECTED]")) {
  fs.writeFileSync('src/utils/pdfV2Exporter.ts', code.replace(target, repl));
  console.log("Injected side text debug");
}
