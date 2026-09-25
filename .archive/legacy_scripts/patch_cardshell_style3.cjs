const fs = require('fs');
const file = 'src/modules/editor/components/CardShell.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "onDragEnd={handleDragEnd}",
  "onDragEnd={handleDragEnd}\n      style={{ \"--card-line-spacing\": `${p.lineSpacing || 0}px` } as React.CSSProperties}"
).replace(
  "className={`transition-all",
  "className={`lesson-card transition-all"
);

fs.writeFileSync(file, code);
console.log('Patched CardShell manually');
