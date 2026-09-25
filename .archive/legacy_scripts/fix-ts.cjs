const fs = require('fs');
let code = fs.readFileSync('src/utils/pdfV2Exporter.ts', 'utf8');

code = code.replace(/const font = pdf\.getFont\(fontName, fontStyle\);/g, `const font = (pdf as any).getFont(fontName, fontStyle);`);

fs.writeFileSync('src/utils/pdfV2Exporter.ts', code);
