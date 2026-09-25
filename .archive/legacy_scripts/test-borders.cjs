const fs = require('fs');
let code = fs.readFileSync('src/utils/pdfV2Exporter.ts', 'utf8');

const target = `    // Borders
    const bTopW = parseFloat(style.borderTopWidth) || 0;`;

const repl = `    // Borders
    const bTopW = parseFloat(style.borderTopWidth) || 0;
    if (el.classList.contains("student-info-box")) {
      console.log("student-info-box border:", {
        bTopW, bBotW: parseFloat(style.borderBottomWidth),
        topColor: style.borderTopColor,
        parsed: parseColorToRgb(style.borderTopColor)
      });
    }`;

if (code.includes(target) && !code.includes("student-info-box border")) {
  code = code.replace(target, repl);
  fs.writeFileSync('src/utils/pdfV2Exporter.ts', code);
  console.log("Injected log");
}
