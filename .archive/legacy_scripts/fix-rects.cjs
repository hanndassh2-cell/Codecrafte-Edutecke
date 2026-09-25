const fs = require('fs');
let code = fs.readFileSync('src/utils/pdfV2Exporter.ts', 'utf8');

const target1 = `  for (const el of allContainers) {
    if (mathNodes.has(el)) continue; // Skip vector backgrounds/borders for math elements as they are rendered via html2canvas
    
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;`;

const replacement1 = `  for (const el of allContainers) {
    if (mathNodes.has(el)) continue; // Skip vector backgrounds/borders for math elements as they are rendered via html2canvas
    
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") continue;
    if (rect.width <= 0 || rect.height <= 0) {
      if (el.tagName !== "DIV" && el.tagName !== "SPAN" && el.tagName !== "P") continue;
    }`;

code = code.replace(target1, replacement1);
fs.writeFileSync('src/utils/pdfV2Exporter.ts', code);
console.log("Rects fixed");
