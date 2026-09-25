const fs = require('fs');
let code = fs.readFileSync('src/utils/pdfV2Exporter.ts', 'utf8');

const target = `    const processedText = textContent;`;
const repl = `    const processedText = textContent;
    if (processedText.includes("السؤال الأول") || processedText.includes("الزمن المحدد")) {
      console.log("Rendering text in PDF:", processedText, "at", textX, textY, "isRtl", isRtl, "rect", rect, "opacity:", style.opacity);
    }`;

if (code.includes(target) && !code.includes("Rendering text in PDF")) {
  fs.writeFileSync('src/utils/pdfV2Exporter.ts', code.replace(target, repl));
  console.log("Injected log for text");
}
