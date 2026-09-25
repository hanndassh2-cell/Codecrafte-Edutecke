const fs = require('fs');
let code = fs.readFileSync('src/modules/editor/components/RichTextEditor.tsx', 'utf8');

const target1 = `<div className={\`group relative flex flex-col w-full h-full \${readOnly ? "min-h-[auto] bg-transparent border-transparent" : "min-h-[auto] bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl focus-within:ring-2 focus-within:ring-blue-500/50 transition-all"}\`}>`;
const repl1 = `<div className={\`group relative w-full \${readOnly ? "block min-h-[auto] bg-transparent border-transparent h-auto" : "flex flex-col h-full min-h-[auto] bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl focus-within:ring-2 focus-within:ring-blue-500/50 transition-all"}\`}>`;

const target2 = `<div className="flex-1 overflow-y-auto p-1 text-right" dir="rtl">
        <EditorContent editor={editor} className="min-h-full" />
      </div>`;
const repl2 = `<div className={\`p-1 text-right \${readOnly ? "h-auto block overflow-visible" : "flex-1 overflow-y-auto"}\`} dir="rtl">
        <EditorContent editor={editor} className={\`\${readOnly ? "h-auto block" : "min-h-full"}\`} />
      </div>`;

if (code.includes(target1) && code.includes(target2)) {
  code = code.replace(target1, repl1);
  code = code.replace(target2, repl2);
  fs.writeFileSync('src/modules/editor/components/RichTextEditor.tsx', code);
  console.log("RTE fixed");
} else {
  console.log("Targets not found in RTE");
}
