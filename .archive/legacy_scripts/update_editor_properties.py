import re

with open("src/modules/editor/components/EditorPanel.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Make sure Lock and move up/down icons are imported
if "Lock" not in content:
    content = content.replace("Settings,", "Settings,\n  Lock,\n  ArrowUp,\n  ArrowDown,\n  Unlock,")

# Find the properties panel inner content and update it
old_props = """                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">
                      نوع المحتوى
                    </label>
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
                      <Icon className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {cardInfo?.label || p.type}
                      </span>
                    </div>
                  </div>"""

new_props = """                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">
                      نوع المحتوى
                    </label>
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
                      <Icon className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {cardInfo?.label || p.type}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">
                      ترتيب البطاقة
                    </label>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          const idx = paragraphs.findIndex(x => x.id === p.id);
                          if (idx > 0) {
                            const newP = [...paragraphs];
                            [newP[idx-1], newP[idx]] = [newP[idx], newP[idx-1]];
                            setParagraphs(newP);
                          }
                        }}
                        className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                        title="تحريك لأعلى"
                      ><ArrowUp className="w-4 h-4 text-slate-500" /></button>
                      <button 
                        onClick={() => {
                          const idx = paragraphs.findIndex(x => x.id === p.id);
                          if (idx < paragraphs.length - 1) {
                            const newP = [...paragraphs];
                            [newP[idx+1], newP[idx]] = [newP[idx], newP[idx+1]];
                            setParagraphs(newP);
                          }
                        }}
                        className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                        title="تحريك لأسفل"
                      ><ArrowDown className="w-4 h-4 text-slate-500" /></button>
                      <span className="text-sm text-slate-500 pr-2">البطاقة {paragraphs.findIndex(x => x.id === p.id) + 1} من {paragraphs.length}</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">
                      لون البطاقة
                    </label>
                    <div className="flex gap-2">
                      {["bg-blue-50", "bg-green-50", "bg-red-50", "bg-yellow-50", "bg-purple-50", "bg-slate-50"].map(color => (
                        <button
                          key={color}
                          className={`w-6 h-6 rounded-full border border-slate-200 ${color}`}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>"""

if "ترتيب البطاقة" not in content:
    content = content.replace(old_props, new_props)

old_buttons = """                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <button
                      onClick={() => {
                        const newP = { ...p, id: "p-" + Date.now() };
                        setParagraphs([...paragraphs, newP]);
                        setActiveParagraphId(newP.id);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                    >
                      <Copy className="w-4 h-4" />
                      تكرار البطاقة
                    </button>
                    <button
                      onClick={() => {
                        deleteParagraph(p.id);
                        setActiveParagraphId(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                      حذف البطاقة
                    </button>
                  </div>"""

new_buttons = """                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <button
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                    >
                      <Lock className="w-4 h-4" />
                      قفل البطاقة
                    </button>
                    <button
                      onClick={() => {
                        const newP = { ...p, id: "p-" + Date.now() };
                        setParagraphs([...paragraphs, newP]);
                        setActiveParagraphId(newP.id);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition"
                    >
                      <Copy className="w-4 h-4" />
                      نسخ البطاقة
                    </button>
                    <button
                      onClick={() => {
                        deleteParagraph(p.id);
                        setActiveParagraphId(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                      حذف البطاقة
                    </button>
                  </div>"""

if "قفل البطاقة" not in content:
    content = content.replace(old_buttons, new_buttons)


with open("src/modules/editor/components/EditorPanel.tsx", "w", encoding="utf-8") as f:
    f.write(content)

