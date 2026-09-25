const fs = require('fs');
const css = fs.readFileSync('dist/assets/index-DrcMUjj2.css', 'utf-8');
console.log(css.includes('.a4-print-sheet .math-text-container .my-2\.5'));
