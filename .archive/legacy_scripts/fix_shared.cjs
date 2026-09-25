const fs = require('fs');
const file = 'src/services/SharedPrintService.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/    lineSpacing: 1\.2,\n/g, "");

fs.writeFileSync(file, code);
console.log('Fixed SharedPrintService.tsx');
