import re

with open("src/modules/editor/components/EditorPanel.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add a state for inline add menu
if "inlineAddIndex" not in content:
    content = content.replace(
        "const [activeParagraphId, setActiveParagraphId] = useState<string | null>(null);",
        "const [activeParagraphId, setActiveParagraphId] = useState<string | null>(null);\n  const [inlineAddIndex, setInlineAddIndex] = useState<number | null>(null);"
    )

old_add_btn = """              {/* Inline Add Menu */}
              <div className="flex justify-center opacity-0 hover:opacity-100 transition-opacity -my-2 relative z-10">
                <button 
                  onClick={() => {
                    // Quick add default card or open menu
                    // For now let's just insert a text card
                    const newId = "p-" + Date.now();
                    const newParagraphs = [...paragraphs];
                    newParagraphs.splice(index + 1, 0, {
                      id: newId,
                      title: "فقرة جديدة",
                      type: "explanation",
                      body: "",
                    });
                    setParagraphs(newParagraphs);
                    setActiveParagraphId(newId);
                  }}
                  className="bg-blue-600 text-white rounded-full p-1.5 shadow-md hover:bg-blue-700 hover:scale-110 transition-all flex items-center justify-center gap-1 pr-3"
                  title="إضافة فقرة هنا"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-[10px] font-bold">إضافة</span>
                </button>
              </div>"""

new_add_btn = """              {/* Inline Add Menu */}
              <div className="flex justify-center opacity-0 hover:opacity-100 transition-opacity -my-3 relative z-10">
                <button 
                  onClick={() => setInlineAddIndex(inlineAddIndex === index ? null : index)}
                  className="bg-blue-600 text-white rounded-full p-1 shadow-md hover:bg-blue-700 hover:scale-110 transition-all flex items-center justify-center gap-1 px-3"
                  title="إضافة فقرة هنا"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-[11px] font-bold">إضافة</span>
                </button>
                
                {inlineAddIndex === index && (
                  <div className="absolute top-full mt-2 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 grid grid-cols-2 gap-1 z-50">
                    {CARD_TYPES.map((c) => {
                      const Icon = c.icon;
                      return (
                        <button
                          key={c.type}
                          onClick={() => {
                            const newId = "p-" + Date.now();
                            const newParagraphs = [...paragraphs];
                            newParagraphs.splice(index + 1, 0, {
                              id: newId,
                              title: c.label,
                              type: c.type,
                              body: "",
                            });
                            setParagraphs(newParagraphs);
                            setActiveParagraphId(newId);
                            setInlineAddIndex(null);
                          }}
                          className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition text-right"
                        >
                          <div className={`p-1.5 rounded-lg ${c.color}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{c.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>"""

content = content.replace(old_add_btn, new_add_btn)

with open("src/modules/editor/components/EditorPanel.tsx", "w", encoding="utf-8") as f:
    f.write(content)
