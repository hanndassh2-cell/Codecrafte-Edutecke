const fs = require('fs');
let code = fs.readFileSync('src/utils/pdfV2Exporter.ts', 'utf8');

code = code.replace(
  /const processedText = formatBidiTextForVectorPdf\(textContent, isRtl\);/g,
  `const processedText = textContent;`
);

fs.writeFileSync('src/utils/pdfV2Exporter.ts', code);
