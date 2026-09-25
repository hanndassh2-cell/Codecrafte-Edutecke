const fs = require('fs');
const file = 'src/modules/exams/pages/ExamGeneratorView.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/          lineSpacing: 1.2,\n/g, "");
code = code.replace(/        lineSpacing: prev.typography\?\.lineSpacing \|\| 1.2,\n/g, "");
code = code.replace(/        lineSpacing: 1.2,\n/g, "");

fs.writeFileSync(file, code);
console.log('Patched ExamGeneratorView.tsx');
