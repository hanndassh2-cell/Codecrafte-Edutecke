const fs = require('fs');
const file = 'src/modules/editor/components/PreviewPanel.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /"--card-line-spacing": `\$\{p.lineSpacing \|\| 0\}px` as any,/g,
  "/* @ts-ignore */\n                  \"--card-line-spacing\": `${p.lineSpacing || 0}px`,"
);

fs.writeFileSync(file, code);
console.log('Fixed types in PreviewPanel.tsx');
