with open("src/modules/editor/components/EditorCard.tsx", "r", encoding="utf-8") as f:
    content = f.read()

import re

# Add Lock, MoreVertical to imports
if "Lock" not in content:
    content = content.replace('Trash2, Link as LinkIcon, Video, AlertTriangle, Info, AlertCircle, Plus', 'Trash2, Link as LinkIcon, Video, AlertTriangle, Info, AlertCircle, Plus, Lock, MoreVertical, Settings as SettingsIcon')
else:
    content = content.replace('MoreVertical', 'MoreVertical')

# Add isLocked state and settingsOpen state
if "const [showSettings, setShowSettings] = useState(false);" not in content:
    content = content.replace('const Icon = cardInfo.icon || FileText;', 'const Icon = cardInfo.icon || FileText;\n  const [showSettings, setShowSettings] = useState(false);\n  const [isLocked, setIsLocked] = useState(false);')

# Find the header section
header_regex = re.compile(r'<div\n        className={`px-4 py-3 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between cursor-move \$\{cardInfo\.color\.split\(" "\)\[0\]\} dark:bg-opacity-10 transition-colors`}\n      >\n.*?</div>\n      </div>', re.DOTALL)

new_header = """<div
        className={`px-4 py-3 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between cursor-move ${cardInfo.color.split(" ")[0]} dark:bg-opacity-10 transition-colors sticky top-0 z-10`}
      >
        <div className="flex items-center gap-3 w-full">
          <div className="p-1.5 bg-white/50 dark:bg-slate-800/50 rounded-lg text-slate-400 group-hover:text-slate-600 transition" title="سحب البطاقة">
            <GripVertical className="w-4 h-4" />
          </div>
          <div
            className={`p-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm flex-shrink-0 ${cardInfo.color}`}
          >
            <Icon className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={p.title}
            onChange={(e) =>
              updateParagraph(p.id, "title", e.target.value)
            }
            disabled={isLocked}
            className={`font-bold text-slate-900 dark:text-slate-100 bg-transparent border-none focus:outline-none focus:ring-0 p-0 flex-1 ${isLocked ? "opacity-70 cursor-not-allowed" : ""}`}
            placeholder="عنوان البطاقة..."
          />
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => toggleCollapse(p.id)}
            className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition text-slate-500"
            title={isCollapsed ? "توسيع" : "طي"}
          >
            {isCollapsed ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </button>
          
          <button
            onClick={() => { /* duplicate logic ideally passed from parent */ }}
            className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition text-slate-500"
            title="نسخ البطاقة"
          >
            <Copy className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsLocked(!isLocked)}
            className={`p-1.5 rounded-lg transition ${isLocked ? "bg-red-100 text-red-600 dark:bg-red-900/30" : "hover:bg-black/5 dark:hover:bg-white/10 text-slate-500"}`}
            title={isLocked ? "إلغاء القفل" : "قفل البطاقة"}
          >
            <Lock className="w-4 h-4" />
          </button>

          <button
            onClick={() => deleteParagraph(p.id)}
            className="p-1.5 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 rounded-lg transition text-slate-500"
            title="حذف"
            disabled={isLocked}
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-lg transition ${showSettings ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30" : "hover:bg-black/5 dark:hover:bg-white/10 text-slate-500"}`}
            title="خيارات"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {showSettings && (
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm animate-in slide-in-from-top-2 duration-200">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">لون البطاقة</label>
              <div className="flex gap-2">
                {["bg-blue-50", "bg-green-50", "bg-red-50", "bg-yellow-50", "bg-purple-50", "bg-slate-50"].map(color => (
                  <button key={color} className={`w-6 h-6 rounded-full border border-slate-200 ${color}`} />
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">إعدادات الطباعة</label>
              <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <input type="checkbox" defaultChecked className="rounded border-slate-300" /> إظهار في الطباعة
              </label>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-500 mb-2">ملاحظات داخلية</label>
              <input type="text" placeholder="ملاحظات للمعلم فقط..." className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900" />
            </div>
        </div>
      )}
"""
content = header_regex.sub(new_header, content)

with open("src/modules/editor/components/EditorCard.tsx", "w", encoding="utf-8") as f:
    f.write(content)
