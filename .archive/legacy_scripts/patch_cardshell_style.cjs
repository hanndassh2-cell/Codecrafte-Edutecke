const fs = require('fs');
const file = 'src/modules/editor/components/CardShell.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetStr = `      onDragEnd={handleDragEnd}
      className=\`transition-all`;

const replacementStr = `      onDragEnd={handleDragEnd}
      style={{ "--card-line-spacing": \`\${p.lineSpacing || 0}px\` } as React.CSSProperties}
      className=\`lesson-card transition-all`;

if (code.includes(targetStr)) {
    code = code.replace(targetStr, replacementStr);
    fs.writeFileSync(file, code);
    console.log('Patched CardShell with lesson-card class and custom property');
}
