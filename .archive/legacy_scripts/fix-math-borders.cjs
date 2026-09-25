const fs = require('fs');
let code = fs.readFileSync('src/utils/pdfV2Exporter.ts', 'utf8');

const target = `  for (const el of allContainers) {
    /* removed no-print skip */
    const rect = el.getBoundingClientRect();`;

const replacement = `  // 3. IDENTIFY MATH ELEMENTS FIRST TO SKIP THEM IN VECTOR RENDER
  const mathNodes = new Set<Node>();
  const specialMathEls = Array.from(
    sheet.querySelectorAll<HTMLElement>(
      ".katex, .katex-display, .katex-html, tiptap-math, [data-type='equation'], .math-display, .math-inline, .math-block-wrapper"
    )
  );
  for (const mathEl of specialMathEls) {
    mathEl.querySelectorAll("*").forEach((n) => mathNodes.add(n));
    mathNodes.add(mathEl);
  }

  for (const el of allContainers) {
    if (mathNodes.has(el)) continue; // Skip vector backgrounds/borders for math elements as they are rendered via html2canvas
    
    /* removed no-print skip */
    const rect = el.getBoundingClientRect();`;

if (code.includes('/* removed no-print skip */')) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/utils/pdfV2Exporter.ts', code);
  console.log("Math nodes skipped in vector render");
} else {
  console.log("Could not find target");
}
