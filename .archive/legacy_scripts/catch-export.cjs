const fs = require('fs');
let code = fs.readFileSync('src/components/PrintPreviewModal.tsx', 'utf8');

const target = `await generatePdfV2FromElement(document.getElementById("pdf-preview-sheet")!, {
        title: examTemplate.title,
        onProgress: setStatusMessage,
      });`;
      
const repl = `try {
        await generatePdfV2FromElement(document.getElementById("pdf-preview-sheet")!, {
          title: examTemplate.title,
          onProgress: setStatusMessage,
        });
      } catch (e) {
        alert("PDF EXPORT ERROR: " + (e.message || e.toString()));
        console.error(e);
      }`;

if (code.includes(target)) {
  fs.writeFileSync('src/components/PrintPreviewModal.tsx', code.replace(target, repl));
  console.log("Injected catch");
} else {
  console.log("Not found");
}
