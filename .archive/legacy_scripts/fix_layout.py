with open("src/modules/editor/components/EditorPanel.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update the outer container and add the inner container
old_root = '<div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-950 relative overflow-hidden">'
new_root = '<div className="flex-1 flex h-full min-w-0 bg-slate-50 dark:bg-slate-950 overflow-hidden">\n      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">'
content = content.replace(old_root, new_root, 1)

# 2. Update the Properties Side Panel class name to slide in smoothly (shrink width instead of absolute positioning)
import re

old_panel = re.search(r'      \{\/\* Properties Side Panel \*\/}.*?      <div\n        className=\{`absolute.*?`\}\n      >', content, re.DOTALL)
if old_panel:
    new_panel = """      {/* Properties Side Panel */}
      <div
        className={`bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300 shrink-0 overflow-hidden flex flex-col ${activeParagraphId ? "w-72 opacity-100" : "w-0 opacity-0 border-none"}`}
      >"""
    content = content.replace(old_panel.group(0), new_panel)

# 3. Add closing div for the new inner container right before the Properties Side Panel
content = content.replace('      {/* Properties Side Panel */}', '      </div>\n\n      {/* Properties Side Panel */}')

with open("src/modules/editor/components/EditorPanel.tsx", "w", encoding="utf-8") as f:
    f.write(content)
