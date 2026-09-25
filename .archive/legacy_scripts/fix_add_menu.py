with open("src/modules/editor/components/EditorPanel.tsx", "r", encoding="utf-8") as f:
    content = f.read()

import re

old_add_menu = re.search(r"        {\/\* Add Card Menu \*\/\}.*?        </div>\n      </div>", content, re.DOTALL)

if old_add_menu:
    new_add_menu = """        {/* Add Card Button */}
        <div className="mt-8 rounded-2xl p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center flex flex-col items-center justify-center">
          <button
            onClick={() => {
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
        </div>
      </div>"""
    content = content.replace(old_add_menu.group(0), new_add_menu)
    with open("src/modules/editor/components/EditorPanel.tsx", "w", encoding="utf-8") as f:
        f.write(content)
else:
    print("Could not find Add Card Menu")
