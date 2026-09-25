with open("src/modules/editor/components/TopBar.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Replace interface
old_props_type = """  onExportWord: () => void;
  onImportWord: () => void;
  isSaving?: boolean;
}) => {"""

new_props_type = """  onExportWord: () => void;
  onImportWord: () => void;
  isSaving?: boolean;
  onToggleMediaLibrary?: () => void;
  isMediaLibraryOpen?: boolean;
}) => {"""
content = content.replace(old_props_type, new_props_type)

import re

# Add button before "حفظ الدرس"
old_buttons = """        <button
          onClick={onPreview}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold transition-colors"
        >"""

new_buttons = """        <button
          onClick={onToggleMediaLibrary}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-colors ${isMediaLibraryOpen ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
        >
          <Upload className="w-4 h-4" />
          مكتبة الوسائط
        </button>

        <button
          onClick={onPreview}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold transition-colors"
        >"""

content = content.replace(old_buttons, new_buttons)

with open("src/modules/editor/components/TopBar.tsx", "w", encoding="utf-8") as f:
    f.write(content)
