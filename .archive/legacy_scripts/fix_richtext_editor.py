import re

with open('src/modules/editor/components/RichTextEditor.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

snippet_button = """      <PortalDropdown
        trigger={
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-teal-600 dark:text-teal-400 font-bold flex items-center gap-1 transition-colors cursor-pointer"
            title="مكتبة القوالب الرياضية"
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-[10px] hidden sm:inline">قوالب</span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>
        }
      >
        <div className="w-64 max-h-80 overflow-y-auto p-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700">
          <div className="text-xs font-bold text-slate-500 mb-2 px-2">قوالب جاهزة</div>
          {[
            { name: "مصفوفة معقدة", latex: "\\\\begin{pmatrix} a & b \\\\\\\\ c & d \\\\end{pmatrix}" },
            { name: "كسر متسلسل", latex: "a_0 + \\\\frac{1}{a_1 + \\\\frac{1}{a_2 + \\\\dots}}" },
            { name: "مساحة الدائرة", latex: "A = \\\\pi r^2" },
            { name: "القانون العام", latex: "x = \\\\frac{-b \\\\pm \\\\sqrt{b^2 - 4ac}}{2a}" },
            { name: "تكامل محدود", latex: "\\\\int_{a}^{b} f(x) \\\\, dx" }
          ].map(snip => (
            <button
              key={snip.name}
              type="button"
              onClick={() => {
                editor.chain().focus().insertContent(`<span class="math-tex" dir="ltr">\\\\(${snip.latex}\\\\)</span> `).run();
              }}
              className="w-full text-right px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
            >
              <div className="font-bold text-slate-700 dark:text-slate-300">{snip.name}</div>
              <div className="text-xs text-slate-400 font-mono mt-1" dir="ltr">{snip.latex}</div>
            </button>
          ))}
        </div>
      </PortalDropdown>
"""

# import Sparkles
if 'Sparkles,' not in content and 'Sparkles } from "lucide-react"' not in content:
    content = content.replace('Sigma,', 'Sigma,\n  Sparkles,')

# Add snippet button after Sigma
content = content.replace('      <button\n        type="button"\n        onMouseDown={(e) => e.preventDefault()}\n        onClick={(e) => runCommand(e, () => onOpenEquation())}', snippet_button + '\n      <button\n        type="button"\n        onMouseDown={(e) => e.preventDefault()}\n        onClick={(e) => runCommand(e, () => onOpenEquation())}')

with open('src/modules/editor/components/RichTextEditor.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
