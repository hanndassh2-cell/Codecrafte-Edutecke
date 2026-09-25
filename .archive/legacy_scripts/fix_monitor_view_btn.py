with open('src/modules/settings/components/EquationMonitorView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import re
td_action = """<td className="px-5 py-4 bg-slate-50/50 dark:bg-slate-800/30">
                  <MathText text={`$$${eq.latex}$$`} className="!m-0 text-center" />
                  {eq.originalLatex && (
                    <div className="mt-2 text-center border-t border-slate-200 dark:border-slate-700 pt-2">
                      <button 
                        onClick={() => restoreEquation(eq.id)}
                        className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 text-[10px] font-bold rounded-lg cursor-pointer transition-colors"
                      >
                        استعادة الأصل (Undo)
                      </button>
                    </div>
                  )}
                </td>"""

content = re.sub(r'<td className="px-5 py-4 bg-slate-50/50 dark:bg-slate-800/30">[\s\S]*?</td>', td_action, content)

with open('src/modules/settings/components/EquationMonitorView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
