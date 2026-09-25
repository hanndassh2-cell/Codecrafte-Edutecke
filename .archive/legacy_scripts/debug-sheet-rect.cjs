const fs = require('fs');
let code = fs.readFileSync('src/utils/pdfV2Exporter.ts', 'utf8');

const target = `      const log2 = \`[PDF-V2 AUDIT] PAGE \${i+1} - Zero Size: \${zeroSize} / \${cloneCount}. Display none: \${displayNoneCount}. Hidden: \${visibilityHiddenCount}. Zero height cards: \${zeroHeightCards} / \${cloneCards}\`;
      console.log(log2);`;
const repl = `      const log2 = \`[PDF-V2 AUDIT] PAGE \${i+1} - Zero Size: \${zeroSize} / \${cloneCount}. Display none: \${displayNoneCount}. Hidden: \${visibilityHiddenCount}. Zero height cards: \${zeroHeightCards} / \${cloneCards}\`;
      console.log(log2);
      
      const debugRect = clonedSheet.getBoundingClientRect();
      console.log("[PDF-V2 RECT DEBUG] clonedSheet rect:", debugRect.width, "x", debugRect.height, "expected width px:", 210 * 3.7795);
      // also check the side text
      clonedSheet.querySelectorAll("div").forEach(el => {
         if (el.textContent && el.textContent.includes("يمنع تداول")) {
            const trRect = el.getBoundingClientRect();
            console.log("[PDF-V2 SIDE TEXT RECT]", trRect, "style:", window.getComputedStyle(el).transform);
         }
      });
`;

if (code.includes(target) && !code.includes("[PDF-V2 RECT DEBUG]")) {
  fs.writeFileSync('src/utils/pdfV2Exporter.ts', code.replace(target, repl));
  console.log("Injected rect debug");
}
