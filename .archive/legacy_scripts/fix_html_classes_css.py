import re
with open('src/components/MathText.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Force standard padding/margin in preview but aggressively strip it using specific utility classes for print
code = re.sub(
    r'className=\{`math-block-wrapper-preview print:!my-0 print:!py-0 print:!px-0 my-2\.5 py-3\.5 px-4 [^`]*`\}',
    r'className={`math-block-wrapper-preview print:!m-0 print:!p-0 print:!border-none print:!shadow-none my-2.5 py-3.5 px-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 overflow-x-auto text-center [direction:ltr] print:bg-transparent print:overflow-visible ${onEquationClick || typeof (window as any).__openGlobalEquationEditor === "function" ? "cursor-pointer hover:border hover:border-blue-400 transition-all active:scale-[0.99]" : ""}`}',
    code
)
code = code.replace(
    '"math-block-wrapper-preview print:!my-0 print:!py-0 print:!px-0 my-2.5 py-3.5 px-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 overflow-x-auto text-center [direction:ltr] print:bg-transparent print:overflow-visible"',
    '"math-block-wrapper-preview print:!m-0 print:!p-0 print:!border-none print:!shadow-none my-2.5 py-3.5 px-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 overflow-x-auto text-center [direction:ltr] print:bg-transparent print:overflow-visible"'
)

with open('src/components/MathText.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

with open('src/modules/editor/extensions/TipTapMathExtension.ts', 'r', encoding='utf-8') as f:
    code2 = f.read()

code2 = code2.replace(
    '"math-rendered-block print:!my-0 print:!p-0 print:!bg-transparent print:!border-none my-2 p-2 bg-slate-50 dark:bg-slate-900/80 rounded-lg text-center cursor-pointer border border-blue-200 dark:border-blue-900/50 hover:border-blue-400 transition-all shadow-2xs hover:shadow-xs active:scale-[0.99] group/math"',
    '"math-rendered-block print:!m-0 print:!p-0 print:!bg-transparent print:!border-none print:!shadow-none my-2 p-2 bg-slate-50 dark:bg-slate-900/80 rounded-lg text-center cursor-pointer border border-blue-200 dark:border-blue-900/50 hover:border-blue-400 transition-all shadow-2xs hover:shadow-xs active:scale-[0.99] group/math"'
)

with open('src/modules/editor/extensions/TipTapMathExtension.ts', 'w', encoding='utf-8') as f:
    f.write(code2)

# CSS OVERRIDE TO TARGET EVERYTHING UNDER A4
with open('src/index.css', 'a', encoding='utf-8') as f:
    f.write("""
/* NUCLEAR MARGIN RESET V2 - FORCING SPECIFICITY */
html .a4-print-sheet div.math-rendered-block,
html .a4-print-sheet div.math-block-wrapper-preview,
html .a4-print-sheet div.katex-display,
html .a4-print-sheet p:has(> .math-rendered-block),
html .a4-print-sheet p:has(> .math-block-wrapper-preview),
html .a4-print-sheet .exam-question-item p {
  margin: 0 !important;
  padding: 0 !important;
  min-height: 0 !important;
  line-height: 1 !important;
}

html .a4-print-sheet div.katex-display > span.katex {
  margin: 0 !important;
  padding: 0 !important;
}

html .a4-print-sheet .exam-question-item,
html .a4-print-sheet .question-renderer-block,
html .a4-print-sheet .question-block {
  margin: 0 !important;
  padding: 0 !important;
  gap: 0 !important;
}
""")

print("Applied V2 nuclear fixes")
