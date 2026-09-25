const fs = require('fs');
let code = fs.readFileSync('src/utils/pdfV2Exporter.ts', 'utf8');

const target = `const cloneCards = clonedSheet.querySelectorAll(".editor-card-container, .preview-card, .question-renderer-block").length;
      console.log(\`[PDF-V2 AUDIT] PAGE \${i+1} - Cloned DOM: \${cloneCount} elements, \${cloneCards} cards\`);
      
      let zeroSize = 0;
      clonedSheet.querySelectorAll("*").forEach(el => {
         const rect = el.getBoundingClientRect();
         if (rect.width === 0 || rect.height === 0) zeroSize++;
      });
      console.log(\`[PDF-V2 AUDIT] PAGE \${i+1} - Zero Size Elements: \${zeroSize} / \${cloneCount}\`);`;

const replacement = `const cloneCards = clonedSheet.querySelectorAll(".editor-card-container, .preview-card, .question-renderer-block").length;
      const log1 = \`[PDF-V2 AUDIT] PAGE \${i+1} - Cloned DOM: \${cloneCount} elements, \${cloneCards} cards\`;
      console.log(log1);
      
      let zeroSize = 0;
      let displayNoneCount = 0;
      let visibilityHiddenCount = 0;
      let zeroHeightCards = 0;
      clonedSheet.querySelectorAll("*").forEach(el => {
         const rect = el.getBoundingClientRect();
         if (rect.width === 0 || rect.height === 0) zeroSize++;
         
         const style = window.getComputedStyle(el);
         if (style.display === 'none') displayNoneCount++;
         if (style.visibility === 'hidden') visibilityHiddenCount++;
      });
      clonedSheet.querySelectorAll(".editor-card-container, .preview-card, .question-renderer-block").forEach(card => {
         if (card.getBoundingClientRect().height === 0) zeroHeightCards++;
      });
      const log2 = \`[PDF-V2 AUDIT] PAGE \${i+1} - Zero Size: \${zeroSize} / \${cloneCount}. Display none: \${displayNoneCount}. Hidden: \${visibilityHiddenCount}. Zero height cards: \${zeroHeightCards} / \${cloneCards}\`;
      console.log(log2);

      fetch('/api/audit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ msg: log1 + "\\n" + log2 }) }).catch(e => {});`;

if (code.includes('const cloneCards = clonedSheet.querySelectorAll(".editor-card-container')) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/utils/pdfV2Exporter.ts', code);
  console.log("Replaced audit in pdfV2Exporter");
} else {
  console.log("Could not find target in pdfV2Exporter");
}
