import re

with open("src/modules/editor/components/NavigationPanel.tsx", "r", encoding="utf-8") as f:
    content = f.read()

new_imports = """import React, { useState } from "react";
import {
  Search,
  Folder,
  FileText,
  Plus,
  Trash2,
  Copy,
  Move,
  Edit2,
  ChevronDown,
  ChevronLeft,
  List,
  Library,
  Image as ImageIcon,
  FileIcon,
  Video,
  FileText as WordIcon
} from "lucide-react";"""

content = re.sub(r"import React, { useState } from \"react\";\nimport {[\s\S]*?} from \"lucide-react\";", new_imports, content)

old_props = """export const NavigationPanel = ({
  units,
  lessons,
  selectedUnitId,
  selectedLessonId,
  onSelectLesson,
  onAddUnit,
  onAddLesson,
  onDeleteLesson,
}: {"""

new_props = """export const NavigationPanel = ({
  units,
  lessons,
  selectedUnitId,
  selectedLessonId,
  onSelectLesson,
  onAddUnit,
  onAddLesson,
  onDeleteLesson,
  paragraphs = [],
  activeParagraphId = null,
  onSelectParagraph = () => {},
}: {"""

content = content.replace(old_props, new_props)

old_type = """  onAddLesson: (unitId: string) => void;
  onDeleteLesson: (id: string) => void;
}) => {"""

new_type = """  onAddLesson: (unitId: string) => void;
  onDeleteLesson: (id: string) => void;
  paragraphs?: any[];
  activeParagraphId?: string | null;
  onSelectParagraph?: (id: string) => void;
}) => {"""

content = content.replace(old_type, new_type)

state_addition = """  const [activeTab, setActiveTab] = useState<"tree" | "outline" | "media">("tree");
"""

content = content.replace("  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(", state_addition + "  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(")


old_render = """  return (
    <div className="w-[15%] min-w-[200px] max-w-[300px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col h-full shrink-0 shadow-[2px_0_10px_rgba(0,0,0,0.02)] z-20">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800">
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="بحث سريع داخل المنهج..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pr-9 pl-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow"
          />
        </div>
      </div>"""

new_render = """  return (
    <div className="w-[15%] min-w-[220px] max-w-[300px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col h-full shrink-0 shadow-[2px_0_10px_rgba(0,0,0,0.02)] z-20">
      {/* Tabs */}
      <div className="flex p-2 gap-1 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
        <button
          onClick={() => setActiveTab("tree")}
          className={`flex-1 flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${activeTab === "tree" ? "bg-white dark:bg-slate-800 shadow-sm text-blue-600 dark:text-blue-400 font-bold" : "text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"}`}
          title="شجرة المنهج"
        >
          <Folder className="w-4 h-4 mb-1" />
          <span className="text-[10px]">المنهج</span>
        </button>
        <button
          onClick={() => setActiveTab("outline")}
          className={`flex-1 flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${activeTab === "outline" ? "bg-white dark:bg-slate-800 shadow-sm text-blue-600 dark:text-blue-400 font-bold" : "text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"}`}
          title="محتويات الدرس"
        >
          <List className="w-4 h-4 mb-1" />
          <span className="text-[10px]">المحتويات</span>
        </button>
        <button
          onClick={() => setActiveTab("media")}
          className={`flex-1 flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${activeTab === "media" ? "bg-white dark:bg-slate-800 shadow-sm text-blue-600 dark:text-blue-400 font-bold" : "text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"}`}
          title="مكتبة الوسائط"
        >
          <Library className="w-4 h-4 mb-1" />
          <span className="text-[10px]">الوسائط</span>
        </button>
      </div>

      <div className="p-3 border-b border-slate-100 dark:border-slate-800">
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={activeTab === 'tree' ? "بحث في المنهج..." : activeTab === 'outline' ? "بحث في المحتويات..." : "بحث في الوسائط..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pr-9 pl-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {activeTab === "tree" && units.map((unit) => {"""

content = content.replace(old_render, new_render)

# Now close the map and add outline/media rendering
end_of_tree = """          );
        })}
      </div>"""

new_end_of_tree = """          );
        })}

        {activeTab === "outline" && (
          <div className="space-y-2">
            {paragraphs.filter(p => !searchQuery || p.title.includes(searchQuery)).map((p, idx) => (
              <div 
                key={p.id}
                onClick={() => {
                  onSelectParagraph(p.id);
                  const el = document.getElementById('card-' + p.id);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className={`p-2 rounded-lg flex items-center gap-3 cursor-pointer transition-colors ${activeParagraphId === p.id ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-300" : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"}`}
              >
                <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700`}>
                  <span className="text-xs font-bold text-slate-400">{idx + 1}</span>
                </div>
                <div className="flex-1 truncate text-sm font-bold">{p.title}</div>
              </div>
            ))}
            {paragraphs.length === 0 && (
              <div className="text-center p-4 text-slate-400 text-sm">لا توجد محتويات في هذا الدرس</div>
            )}
          </div>
        )}

        {activeTab === "media" && (
          <div className="grid grid-cols-2 gap-2">
            <div className="aspect-square bg-slate-100 dark:bg-slate-800 rounded-lg flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-blue-500 hover:bg-blue-50 cursor-pointer transition-colors">
              <ImageIcon className="w-8 h-8" />
              <span className="text-xs font-bold">الصور</span>
            </div>
            <div className="aspect-square bg-slate-100 dark:bg-slate-800 rounded-lg flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-blue-500 hover:bg-blue-50 cursor-pointer transition-colors">
              <Video className="w-8 h-8" />
              <span className="text-xs font-bold">فيديو</span>
            </div>
            <div className="aspect-square bg-slate-100 dark:bg-slate-800 rounded-lg flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-blue-500 hover:bg-blue-50 cursor-pointer transition-colors">
              <FileIcon className="w-8 h-8" />
              <span className="text-xs font-bold">PDF</span>
            </div>
            <div className="aspect-square bg-slate-100 dark:bg-slate-800 rounded-lg flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-blue-500 hover:bg-blue-50 cursor-pointer transition-colors">
              <WordIcon className="w-8 h-8" />
              <span className="text-xs font-bold">Word</span>
            </div>
          </div>
        )}
      </div>"""

content = content.replace(end_of_tree, new_end_of_tree)

# The add button at the bottom should only show in 'tree' view
old_add_button = """      <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
        <button
          onClick={onAddUnit}
          className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          إضافة وحدة جديدة
        </button>
      </div>"""

new_add_button = """      {activeTab === 'tree' && (
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <button
            onClick={onAddUnit}
            className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            إضافة وحدة جديدة
          </button>
        </div>
      )}
      {activeTab === 'media' && (
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <button
            className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            رفع ملف جديد
          </button>
        </div>
      )}"""

content = content.replace(old_add_button, new_add_button)

with open("src/modules/editor/components/NavigationPanel.tsx", "w", encoding="utf-8") as f:
    f.write(content)

