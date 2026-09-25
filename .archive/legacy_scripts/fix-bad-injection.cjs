const fs = require('fs');
let code = fs.readFileSync('src/utils/pdfV2Exporter.ts', 'utf8');

const badImageLoopTarget = `  for (const el of imagesAndSvgs) {
    if (mathNodes.has(el)) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) { rect = parentEl.getBoundingClientRect(); }
    if (rect.width <= 0 || rect.height <= 0) {
      if (textContent && textContent.includes("يمنع")) {
         console.log("[PDF-V2 SIDE TEXT REJECTED]", textContent, "rangeRect:", range.getBoundingClientRect(), "parentRect:", parentEl.getBoundingClientRect(), "grandParentRect:", parentEl.parentElement?.getBoundingClientRect());
      }
      continue;
    }
    
    if (textContent && textContent.includes("يمنع")) {
       console.log("[PDF-V2 SIDE TEXT ACCEPTED]", textContent, "rect:", rect, "angle:", Math.round(Math.atan2(window.getComputedStyle(parentEl).transform.match(/matrix\\((.+)\\)/)?.[1].split(',')[1] || 0, window.getComputedStyle(parentEl).transform.match(/matrix\\((.+)\\)/)?.[1].split(',')[0] || 1) * (180 / Math.PI)));
    }

    const x = (rect.left - sheetRect.left) * scaleX;`;

const fixedImageLoop = `  for (const el of imagesAndSvgs) {
    if (mathNodes.has(el)) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;

    const x = (rect.left - sheetRect.left) * scaleX;`;

code = code.replace(badImageLoopTarget, fixedImageLoop);
fs.writeFileSync('src/utils/pdfV2Exporter.ts', code);
console.log("Restored image loop");
