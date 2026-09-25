const fs = require('fs');
const file = 'src/modules/editor/components/PreviewPanel.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "padding: isMinimal ? undefined : cardPaddingStyle,",
  "padding: isMinimal ? undefined : cardPaddingStyle,\n                \"--card-line-spacing\": `${p.lineSpacing || 0}px` as any,"
).replace(
  "padding: cardPaddingStyle,",
  "padding: cardPaddingStyle,\n                  \"--card-line-spacing\": `${p.lineSpacing || 0}px` as any,"
);

fs.writeFileSync(file, code);
console.log('Patched PreviewPanel.tsx');
