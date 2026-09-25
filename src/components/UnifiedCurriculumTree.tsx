import React, { useState, useEffect } from "react";
import {
  Folder,
  FileText,
  Plus,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronLeft,
  Check,
  X,
  BookOpen,
} from "lucide-react";

interface UnifiedCurriculumTreeProps {
  subjects?: any[];
  subject?: any;
  units: any[];
  lessons: any[];
  selectedUnitId?: string;
  selectedLessonId?: string;
  searchQuery?: string;
  onSelectLesson: (id: string) => void;
  onAddSubject?: () => void;
  onEditSubject?: (subject: any) => void;
  onAddUnit?: (subjectId?: string) => void;
  onAddLesson: (unitId: string) => void;
  onDeleteLesson: (id: string) => void;
  onRenameSubject?: (subjectId: string, newTitle: string) => void;
  onDeleteSubject?: (subjectId: string) => void;
  onRenameUnit?: (unitId: string, newTitle: string) => void;
  onDeleteUnit?: (unitId: string) => void;
  onRenameLesson?: (lessonId: string, newTitle: string) => void;
  onSelectSubject?: (id: string) => void;
  onSelectUnit?: (id: string) => void;
}

export const UnifiedCurriculumTree: React.FC<UnifiedCurriculumTreeProps> = ({
  subjects,
  subject,
  units,
  lessons,
  selectedUnitId,
  selectedLessonId,
  searchQuery = "",
  onSelectLesson,
  onAddSubject,
  onEditSubject,
  onAddUnit,
  onAddLesson,
  onDeleteLesson,
  onRenameSubject,
  onDeleteSubject,
  onRenameUnit,
  onDeleteUnit,
  onRenameLesson,
  onSelectSubject,
  onSelectUnit,
}) => {
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(
    new Set(units.map((u) => u.id))
  );
  
  const subjectsList = subjects || (subject ? [subject] : []);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(
    new Set(subjectsList.map((s) => s?.id))
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
  
  useEffect(() => {
    if (subjectsList.length > 0) {
      setExpandedSubjects((prev) => {
        const next = new Set(prev);
        subjectsList.forEach((s) => s && next.add(s.id));
        return next;
      });
    }
  }, [subjectsList]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const toggleUnit = (id: string) => {
    setExpandedUnits((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  
  const toggleSubject = (id: string) => {
    setExpandedSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
  
  const handleSubjectFormSubmit = (e: React.FormEvent, subjectId: string) => {
    e.preventDefault();
    if (editValue.trim() && onRenameSubject) {
      onRenameSubject(subjectId, editValue.trim());
    }
    setEditingId(null);
  };

  const renderUnits = (subjectId?: string) => {
    const subjectUnits = subjectId ? units.filter(u => u && u.subjectId === subjectId) : units.filter(Boolean);
    
    if (subjectUnits.length === 0) {
      return (
         <div className="text-center py-4 text-slate-400 text-xs">
           لا توجد وحدات
         </div>
      );
    }
    
    return subjectUnits.map((unit) => {
        if (!unit) return null;
        const unitLessons = lessons.filter((l) => l && l.unitId === unit.id);
        const isExpanded = expandedUnits.has(unit.id);
        
        if (searchQuery && !(unit.title || "").includes(searchQuery) && !unitLessons.some(l => (l.title || "").includes(searchQuery))) {
            return null;
        }

        return (
          <div key={unit.id} className="mb-2">
            <div
              className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                selectedUnitId === unit.id
                  ? "bg-slate-200/50 dark:bg-slate-800/80"
                  : "hover:bg-slate-100 dark:hover:bg-slate-800/50"
              }`}
              onClick={() => {
                toggleUnit(unit.id);
                if (onSelectUnit) onSelectUnit(unit.id);
              }}
            >
              <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 flex-1 min-w-0">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 shrink-0 text-slate-400" />
                ) : (
                  <ChevronLeft className="w-4 h-4 shrink-0 text-slate-400" />
                )}
                <Folder className="w-4 h-4 shrink-0 text-blue-500" />
                {editingId === unit.id ? (
                  <form
                    onSubmit={(e) => handleUnitFormSubmit(e, unit.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 flex-1 min-w-0"
                  >
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="bg-white dark:bg-slate-900 text-sm px-2 py-1 rounded border border-blue-500 focus:outline-none flex-1 w-full font-bold text-slate-800 dark:text-slate-100 shadow-2xs"
                    />
                    <button
                      type="submit"
                      className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 transition cursor-pointer shrink-0"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="p-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 transition cursor-pointer shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </form>
                ) : (
                  <span className="truncate flex-1 block" title={unit.title}>{unit.title}</span>
                )}
                <span
                  className="shrink-0 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-500 shadow-2xs dark:bg-slate-900 dark:text-slate-400"
                  title={`${unitLessons.length} درس في هذه الوحدة`}
                >
                  {unitLessons.length}
                </span>
              </div>
              
              {editingId !== unit.id && (
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddLesson(unit.id);
                      if (!isExpanded) toggleUnit(unit.id);
                    }}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 hover:text-blue-600 transition"
                    title="إضافة درس"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  {onRenameUnit && (
                    <button
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 hover:text-amber-600 transition"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(unit.id);
                        setEditValue(unit.title);
                      }}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {onDeleteUnit && (
                    <button
                      className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-slate-500 hover:text-red-600 transition"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteUnit(unit.id);
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
            
            {isExpanded && (
              <div className="pr-4 mt-1 space-y-1 border-r-2 border-slate-100 dark:border-slate-800 mr-2">
                {unitLessons.map((lesson) => {
                  if (searchQuery && !lesson.title.includes(searchQuery) && !unit.title.includes(searchQuery)) return null;
                  const isSelected = lesson.id === selectedLessonId;
                  const lessonStatus = lesson.status || "draft";
                  const statusMeta = lessonStatus === "approved" || lessonStatus === "completed"
                    ? { label: "مكتمل", color: "bg-emerald-500" }
                    : lessonStatus === "review" || lessonStatus === "in_progress" || lessonStatus === "in-progress"
                      ? { label: "قيد المراجعة", color: "bg-amber-500" }
                      : lessonStatus === "archived"
                        ? { label: "مؤرشف", color: "bg-slate-400" }
                        : { label: "مسودة", color: "bg-blue-400" };
                  
                  return (
                    <div
                      key={lesson.id}
                      onClick={() => onSelectLesson(lesson.id)}
                      className={`group relative flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer transition-all ${
                        isSelected
                          ? "bg-primary-50 dark:bg-primary-900/30 border-r-4 border-r-primary-600 text-primary-800 dark:text-primary-200 font-extrabold shadow-sm"
                          : "hover:bg-slate-100/70 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-medium"
                      }`}
                    >
                      <div className="flex items-center gap-2 text-xs flex-1 min-w-0">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${statusMeta.color}`} title={statusMeta.label} />
                        <FileText className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-primary-600" : "text-slate-400"}`} />
                        {editingId === lesson.id ? (
                           <form
                            onSubmit={(e) => handleLessonFormSubmit(e, lesson.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 flex-1 min-w-0"
                          >
                            <input
                              autoFocus
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="bg-white dark:bg-slate-800 text-xs px-2 py-1 rounded border border-blue-500 focus:outline-none flex-1 w-full font-medium"
                            />
                            <button type="submit" className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700">
                              <Check className="w-3 h-3" />
                            </button>
                            <button type="button" onClick={() => setEditingId(null)} className="p-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-600">
                              <X className="w-3 h-3" />
                            </button>
                          </form>
                        ) : (
                          <span className="truncate flex-1 block" title={lesson.title}>{lesson.title}</span>
                        )}
                      </div>
                      
                      {editingId !== lesson.id && (
                        <div className={`flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ${isSelected ? 'opacity-100':''}`}>
                          {onRenameLesson && (
                            <button
                              className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md text-slate-400 hover:text-amber-600 transition"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingId(lesson.id);
                                setEditValue(lesson.title);
                              }}
                              title="إعادة تسمية الدرس"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {onDeleteLesson && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteLesson(lesson.id);
                              }}
                              className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md text-slate-400 hover:text-red-600 transition"
                              title="حذف الدرس"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
    });
  };

  return (
    <div className="w-full">
      {/* Quick Add Subject bar if onAddSubject is provided */}
      {onAddSubject && (
        <div className="mb-3">
          <button
            type="button"
            onClick={onAddSubject}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-primary-50 dark:bg-primary-950/40 hover:bg-primary-100 dark:hover:bg-primary-900/60 text-primary-700 dark:text-primary-300 rounded-xl text-xs font-black border border-primary-200/80 dark:border-primary-800/60 transition-all shadow-2xs hover:shadow-xs cursor-pointer group"
          >
            <Plus className="w-4 h-4 transition-transform group-hover:scale-110" />
            <span>إضافة مادة جديدة</span>
          </button>
        </div>
      )}

      {subjectsList.length > 0 ? (
        subjectsList.map((subj) => {
          if (!subj) return null;
          const isExpanded = expandedSubjects.has(subj.id);
          const subjColor = subj.color || "#2563eb";
          return (
            <div key={subj.id} className="mb-4 border-b border-slate-100 dark:border-slate-800 pb-2 last:border-0">
              <div 
                className="flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 group transition-colors"
                onClick={() => {
                  toggleSubject(subj.id);
                  if (onSelectSubject) onSelectSubject(subj.id);
                }}
              >
                <div className="flex items-center gap-2 font-black text-sm text-slate-800 dark:text-slate-100 flex-1 min-w-0">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 shrink-0 text-slate-400" />
                  ) : (
                    <ChevronLeft className="w-4 h-4 shrink-0 text-slate-400" />
                  )}
                  <span
                    className="w-3 h-3 rounded-full shrink-0 shadow-2xs border border-white dark:border-slate-800"
                    style={{ backgroundColor: subjColor }}
                  />
                  <BookOpen className="w-4 h-4 shrink-0 text-primary-600" />
                  
                  {editingId === subj.id ? (
                     <form
                      onSubmit={(e) => handleSubjectFormSubmit(e, subj.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 flex-1 min-w-0"
                    >
                      <input
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="bg-white dark:bg-slate-800 text-sm px-2 py-1 rounded border border-blue-500 focus:outline-none flex-1 w-full"
                      />
                      <button type="submit" className="p-1 rounded bg-emerald-600 text-white">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => setEditingId(null)} className="p-1 rounded bg-slate-200 dark:bg-slate-700">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  ) : (
                    <span className="truncate flex-1" title={subj.name}>{subj.name}</span>
                  )}
                </div>
                
                {editingId !== subj.id && (
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {onAddUnit && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddUnit(subj.id);
                          if (!isExpanded) toggleSubject(subj.id);
                        }}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 hover:text-blue-600 transition"
                        title="إضافة وحدة لهذه المادة"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onEditSubject ? (
                      <button
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 hover:text-amber-600 transition"
                        title="تعديل بيانات المادة"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditSubject(subj);
                        }}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    ) : onRenameSubject ? (
                      <button
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 hover:text-amber-600 transition"
                        title="إعادة تسمية المادة"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(subj.id);
                          setEditValue(subj.name);
                        }}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                    {onDeleteSubject && (
                      <button
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-slate-500 hover:text-red-600 transition"
                        title="حذف المادة"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSubject(subj.id);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              {isExpanded && (
                <div className="pr-2 mt-1 border-r border-slate-200 dark:border-slate-700 mr-3">
                  {renderUnits(subj.id)}
                </div>
              )}
            </div>
          );
        })
      ) : (
        renderUnits()
      )}
    </div>
  );
};
