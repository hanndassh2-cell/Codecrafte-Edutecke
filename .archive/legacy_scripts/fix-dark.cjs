const fs = require('fs');
let code = fs.readFileSync('src/utils/pdfV2Exporter.ts', 'utf8');

const target = `  const fonts = await ensureTrueTypeFonts(pdf);`;
const repl = `  const fonts = await ensureTrueTypeFonts(pdf);

  // Force light mode during export to prevent dark text/backgrounds from appearing in the PDF
  const htmlEl = document.documentElement;
  const wasDark = htmlEl.classList.contains("dark");
  if (wasDark) {
    htmlEl.classList.remove("dark");
    // Give browser a moment to apply the non-dark styles
    await new Promise(r => setTimeout(r, 100));
  }`;

if (code.includes(target) && !code.includes("wasDark")) {
  code = code.replace(target, repl);
}

const target2 = `  } finally {`;
const repl2 = `  } finally {
    if (wasDark) {
      document.documentElement.classList.add("dark");
    }`;

if (code.includes(target2) && !code.includes("if (wasDark) {")) {
  code = code.replace(target2, repl2);
}

fs.writeFileSync('src/utils/pdfV2Exporter.ts', code);
console.log("Forced light mode during export");
