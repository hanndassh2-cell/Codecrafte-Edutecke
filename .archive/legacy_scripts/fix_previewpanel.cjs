const fs = require('fs');
const file = 'src/modules/editor/components/PreviewPanel.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/                style={{\n                  lineHeight: activeTemplate\.typography\?\.lineSpacing \|\| 1\.2,\n                }}/g, "");

fs.writeFileSync(file, code);
console.log('Fixed PreviewPanel.tsx');
