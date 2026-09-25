const fs = require('fs');
let code = fs.readFileSync('src/utils/pdfV2Exporter.ts', 'utf8');

const target = `  try {
    for (let i = 0; i < sheets.length; i++) {
      const sheet = sheets[i];`;

const replacement = `  try {
    for (let i = 0; i < sheets.length; i++) {
      const sheet = sheets[i];
      console.log(\`[PDF-V2 AUDIT] PAGE \${i+1} - Source DOM elements count:\`, sheet.querySelectorAll("*").length);
      console.log(\`[PDF-V2 AUDIT] PAGE \${i+1} - Source DOM '.editor-card-container' count:\`, sheet.querySelectorAll(".editor-card-container, .preview-card").length);
`;

code = code.replace(target, replacement);

const target2 = `      stage.appendChild(clonedSheet);

      // Wait for layout
      await new Promise((r) => setTimeout(r, 150));

      await renderSheetVectorAndLiveText(clonedSheet, pdf, i, fonts, options);`;

const replacement2 = `      stage.appendChild(clonedSheet);

      // Wait for layout
      await new Promise((r) => setTimeout(r, 150));

      console.log(\`[PDF-V2 AUDIT] PAGE \${i+1} - Cloned DOM elements count:\`, clonedSheet.querySelectorAll("*").length);
      
      let visibleElements = 0;
      let zeroSizeElements = 0;
      clonedSheet.querySelectorAll("*").forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) visibleElements++;
        else zeroSizeElements++;
      });
      console.log(\`[PDF-V2 AUDIT] PAGE \${i+1} - Cloned DOM visible elements:\`, visibleElements, "zero size:", zeroSizeElements);

      await renderSheetVectorAndLiveText(clonedSheet, pdf, i, fonts, options);`;

code = code.replace(target2, replacement2);

fs.writeFileSync('src/utils/pdfV2Exporter.ts', code);
console.log("Audit injected");
