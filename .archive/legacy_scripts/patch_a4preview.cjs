const fs = require('fs');
const file = 'src/components/A4PaperPreview.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/    lineSpacing: 1.2,\n/g, "");
code = code.replace(/        lineHeight: typography.lineSpacing,\n/g, "");
code = code.replace(/          "--a4-line-spacing": typography.lineSpacing,\n/g, "");

fs.writeFileSync(file, code);
console.log('Patched A4PaperPreview.tsx');
