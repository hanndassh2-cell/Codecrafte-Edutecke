import re

with open("src/modules/editor/components/EditorPanel.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add ContentPickerModal import
if "ContentPickerModal" not in content:
    content = content.replace('import { EditorCard } from "./EditorCard";', 'import { EditorCard } from "./EditorCard";\nimport { ContentPickerModal } from "./ContentPickerModal";')

# Add isPickerOpen state
if "isPickerOpen" not in content:
    content = content.replace("const [inlineAddIndex, setInlineAddIndex] = useState<number | null>(null);", "const [inlineAddIndex, setInlineAddIndex] = useState<number | null>(null);\n  const [isPickerOpen, setIsPickerOpen] = useState(false);")

# Update Add Card Menu at the bottom
old_add_menu = """        {/* Add Card Menu */}
        <div className="mt-8 rounded-2xl p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
          <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            إضافة محتوى جديد
          </h4>
          <p className="text-slate-500 mb-6 text-sm">
            اختر نوع المحتوى الذي تريد إضافته للدرس
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {CARD_TYPES.map((c) => {
              const Icon = c.icon;
              return (
                <button
                  key={c.type}
                  onClick={() => addCard(c.type)}
                  className={`flex flex-col items-center gap-3 p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition group hover:shadow-md bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800`}
                >
                  <div className={`p-3 rounded-xl ${c.color} transition-transform group-hover:scale-110`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                    {c.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>"""

new_add_menu = """        {/* Add Card Button */}
        <div className="mt-8 rounded-2xl p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center flex flex-col items-center justify-center">
          <button
            onClick={() => {
              setInlineAddIndex(paragraphs.length - 1);
              setIsPickerOpen(true);
            }}
            className="group flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-slate-50 hover:bg-blue-50 dark:bg-slate-800/50 dark:hover:bg-blue-900/20 border border-slate-200 hover:border-blue-200 dark:border-slate-700 dark:hover:border-blue-800/50 transition-all"
          >
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-xl group-hover:scale-110 transition-transform">
              <Plus className="w-6 h-6" />
            </div>
            <span className="text-lg font-bold text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              إضافة محتوى
            </span>
          </button>
        </div>"""

content = content.replace(old_add_menu, new_add_menu)

# Update the inline add button
old_inline_add = """                {inlineAddIndex === index && (
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
                )}"""

content = content.replace(old_inline_add, "")

# Add the picker component at the bottom of the component
picker_component = """      <ContentPickerModal
        isOpen={isPickerOpen}
        onClose={() => {
          setIsPickerOpen(false);
          setInlineAddIndex(null);
        }}
        onSelect={(type) => {
          const cardInfo = CARD_TYPES.find((c) => c.type === type);
          if (!cardInfo) return;
          const newId = "p-" + Date.now();
          const newP = {
            id: newId,
            title: cardInfo.label,
            type: type,
            body: "",
          };
          const newParagraphs = [...paragraphs];
          const insertIdx = inlineAddIndex !== null ? inlineAddIndex + 1 : paragraphs.length;
          newParagraphs.splice(insertIdx, 0, newP);
          setParagraphs(newParagraphs);
          setActiveParagraphId(newId);
        }}
      />"""

content = content.replace("    </div>\n  );\n};", picker_component + "\n    </div>\n  );\n};")

# Fix inline add button action to open picker
content = content.replace(
    "onClick={() => setInlineAddIndex(inlineAddIndex === index ? null : index)}",
    "onClick={() => { setInlineAddIndex(index); setIsPickerOpen(true); }}"
)

with open("src/modules/editor/components/EditorPanel.tsx", "w", encoding="utf-8") as f:
    f.write(content)
