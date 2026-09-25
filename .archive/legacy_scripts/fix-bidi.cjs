const fs = require('fs');
let code = fs.readFileSync('src/utils/pdfV2Exporter.ts', 'utf8');

code = code.replace(
  /const processedText = textContent;/g,
  `const processedText = formatBidiTextForVectorPdf(textContent, isRtl);`
);

fs.writeFileSync('src/utils/pdfV2Exporter.ts', code);
