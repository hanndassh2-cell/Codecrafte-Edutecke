const fs = require('fs');
const file = 'src/types/index.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/    lineSpacing\?: number; \/\/ Deprecated: Moved to per-card setting\n/g, "");

fs.writeFileSync(file, code);
console.log('Removed typography.lineSpacing from types');
