const fs = require('fs');
let code = fs.readFileSync('src/utils/pdfV2Exporter.ts', 'utf8');

const target = `  // 3. RENDER SPECIAL ISOLATED ELEMENTS (KaTeX Math, Matrices, SVGs, Images)
  const mathNodes = new Set<Node>();
  const specialMathEls = Array.from(
    sheet.querySelectorAll<HTMLElement>(
      ".katex, .katex-display, .katex-html, tiptap-math, [data-type='equation'], .math-display, .math-inline, .math-block-wrapper"
    )
  );`;

const replacement = `  // 3. RENDER SPECIAL ISOLATED ELEMENTS (KaTeX Math, Matrices, SVGs, Images)`;

if (code.includes('const mathNodes = new Set<Node>();')) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/utils/pdfV2Exporter.ts', code);
  console.log("Removed duplicate definitions.");
}
