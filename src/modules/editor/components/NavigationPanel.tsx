import { PortalDropdown } from "../../../components/ui/PortalDropdown";
import { UnifiedCurriculumTree } from "../../../components/UnifiedCurriculumTree";
import { Popover } from "../../../components/ui/Popover";
import React, { useState, useRef, useEffect } from "react";
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
  ChevronRight,
  List,
  Library,
  Image as ImageIcon,
  FileIcon,
  Video,
  FileText as WordIcon,
  Check,
  X,
  ArrowUp,
  ArrowDown,
  BookOpen,
} from "lucide-react";

export const NavigationPanel = React.memo(({
  subjects,
  subject,
  units,
  lessons,
  selectedUnitId,
  selectedLessonId,
  onSelectLesson,
  onAddUnit,
  onAddLesson,
  onDeleteLesson,
  onRenameUnit,
  onDeleteUnit,
  onRenameLesson,
  onAddSubject,
  onEditSubject,
  onDeleteSubject,
  onRenameSubject,
  onDuplicateLesson,
  onMoveLesson,
  paragraphs = [],
  activeParagraphId = null,
  onSelectParagraph = () => {},
  onCollapse,
}: {
  subjects: any[];
  subject?: any;
  units: any[];
  lessons: any[];
  selectedUnitId: string;
  selectedLessonId: string;
  onSelectLesson: (id: string) => void;
  onAddUnit: () => void;
  onAddLesson: (unitId: string) => void;
  onDeleteLesson: (id: string) => void;
  onRenameUnit?: (unitId: string, newTitle: string) => void;
  onDeleteUnit?: (unitId: string) => void;
  onRenameLesson?: (lessonId: string, newTitle: string) => void;
  onAddSubject?: () => void;
  onEditSubject?: (subj: any) => void;
  onDeleteSubject?: (id: string) => void;
  onRenameSubject?: (id: string, newTitle: string) => void;
  onDuplicateLesson?: (lessonId: string) => void;
  onMoveLesson?: (lessonId: string, targetUnitId?: string, direction?: "up" | "down") => void;
  paragraphs?: any[];
  activeParagraphId?: string | null;
  onSelectParagraph?: (id: string) => void;
  onCollapse?: () => void;
}) => {
  const [activeTab, setActiveTab] = useState<"tree" | "outline" | "media">("tree");
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(
    new Set(units.map(u => u.id))
  );

  useEffect(() => {
    if (units.length > 0) {
      setExpandedUnits((prev) => {
        const next = new Set(prev);
        units.forEach((u) => next.add(u.id));
        if (selectedUnitId) next.add(selectedUnitId);
        return next;
      });
    }
  }, [units, selectedUnitId]);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [movingLessonId, setMovingLessonId] = useState<string | null>(null);
  const moveLessonRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const toggleUnit = (unitId: string) => {
    const newExpanded = new Set(expandedUnits);
    if (newExpanded.has(unitId)) newExpanded.delete(unitId);
    else newExpanded.add(unitId);
    setExpandedUnits(newExpanded);
  };

  const handleUnitFormSubmit = (e: React.FormEvent, unitId: string) => {
    e.preventDefault();
    if (editValue.trim() && onRenameUnit) {
      onRenameUnit(unitId, editValue.trim());
    }
    setEditingId(null);
  };

  const handleLessonFormSubmit = (e: React.FormEvent, lessonId: string) => {
    e.preventDefault();
    if (editValue.trim() && onRenameLesson) {
      onRenameLesson(lessonId, editValue.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-sm z-20 min-h-0 overflow-visible">
      {/* Tabs */}
      <div className="flex items-center p-2 gap-1 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
        <button
          onClick={() => setActiveTab("tree")}
          className={`flex-1 flex flex-col items-center justify-center p-1.5 rounded-lg transition-colors ${activeTab === "tree" ? "bg-white dark:bg-slate-800 shadow-sm text-blue-600 dark:text-blue-400 font-bold" : "text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"}`}
          title="شجرة المنهج"
        >
          <Folder className="w-4 h-4 mb-0.5" />
          <span className="text-[10px]">المنهج</span>
        </button>
        <button
          onClick={() => setActiveTab("outline")}
          className={`flex-1 flex flex-col items-center justify-center p-1.5 rounded-lg transition-colors ${activeTab === "outline" ? "bg-white dark:bg-slate-800 shadow-sm text-blue-600 dark:text-blue-400 font-bold" : "text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"}`}
          title="محتويات الدرس"
        >
          <List className="w-4 h-4 mb-0.5" />
          <span className="text-[10px]">المحتويات</span>
        </button>
        <button
          onClick={() => setActiveTab("media")}
          className={`flex-1 flex flex-col items-center justify-center p-1.5 rounded-lg transition-colors ${activeTab === "media" ? "bg-white dark:bg-slate-800 shadow-sm text-blue-600 dark:text-blue-400 font-bold" : "text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"}`}
          title="مكتبة الوسائط"
        >
          <Library className="w-4 h-4 mb-0.5" />
          <span className="text-[10px]">الوسائط</span>
        </button>
        {onCollapse && (
          <button
            onClick={onCollapse}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition-colors shrink-0 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer"
            title="طي القائمة الجانبية"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
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

      <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
        {activeTab === "tree" && (
          <UnifiedCurriculumTree
            subjects={subjects || (subject ? [subject] : [])}
            subject={subject}
            units={units}
            lessons={lessons}
            selectedUnitId={selectedUnitId}
            selectedLessonId={selectedLessonId}
            searchQuery={searchQuery}
            onSelectLesson={onSelectLesson}
            onAddUnit={onAddUnit}
            onAddLesson={onAddLesson}
            onDeleteLesson={onDeleteLesson}
            onRenameUnit={onRenameUnit}
            onDeleteUnit={onDeleteUnit}
            onRenameLesson={onRenameLesson}
            onAddSubject={onAddSubject}
            onEditSubject={onEditSubject}
            onDeleteSubject={onDeleteSubject}
            onRenameSubject={onRenameSubject}
          />
        )}

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
      </div>

      {activeTab === 'tree' && onAddUnit && (
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <button
            onClick={onAddUnit}
            className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            إضافة وحدة جديدة
          </button>
        </div>
      )}
      {activeTab === 'media' && (
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <button
            className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            رفع ملف جديد
          </button>
        </div>
                              )}
    </div>
  );
});

