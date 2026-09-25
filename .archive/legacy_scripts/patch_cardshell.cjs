const fs = require('fs');
const file = 'src/modules/editor/components/CardShell.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetStr = `{/* 1. Change Card Type */}`;
const lineSpacingControl = `
          {/* Card Line Spacing */}
          <div>
            <label className="block text-slate-500 dark:text-slate-400 mb-1.5 font-bold">
              تباعد الأسطر داخل البطاقة
              <span className="mr-2 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 rounded font-mono text-[10px]">
                {p.lineSpacing || 0}
              </span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="30"
                step="1"
                value={p.lineSpacing || 0}
                onChange={(e) => updateParagraph(p.id, "lineSpacing", parseInt(e.target.value))}
                className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => updateParagraph(p.id, "lineSpacing", 0)}
                className="text-[9px] text-slate-400 hover:text-slate-600 cursor-pointer"
                title="إعادة التعيين (0)"
              >
                تلقائي
              </button>
            </div>
          </div>
`;

if (code.includes(targetStr)) {
    code = code.replace(targetStr, lineSpacingControl + '\n          ' + targetStr);
    fs.writeFileSync(file, code);
    console.log('Patched CardShell with line spacing control');
} else {
    console.log('Target string not found in CardShell');
}
