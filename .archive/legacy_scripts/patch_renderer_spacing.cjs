const fs = require('fs');
const file = 'src/components/QuestionRenderer.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetStr = `        pageBreakInside: "avoid",
        ...style,
      }}`;

const replacementStr = `        pageBreakInside: "avoid",
        "--card-line-spacing": \`\${q.lineSpacing || 0}px\`,
        ...style,
      } as React.CSSProperties}`;

if (code.includes(targetStr)) {
    code = code.replace(targetStr, replacementStr);
    fs.writeFileSync(file, code);
    console.log('Patched QuestionRenderer.tsx');
} else {
    console.log('Target string not found in QuestionRenderer.tsx');
}
