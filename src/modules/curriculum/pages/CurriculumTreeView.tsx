import "./CurriculumSubjects.css";
import { LessonDetails } from "../components/LessonDetails";
import React, { useState, useMemo, useRef, useLayoutEffect } from "react";
import { storage } from "../../../services/storage";
import {
  FolderTree,
  Plus,
  Search,
  BookOpen,
  Folder,
  FileText,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  Target,
  HelpCircle,
  ExternalLink,
  ChevronLeft,
  GraduationCap,
  Award,
  RefreshCw,
  Layers,
  ArrowUpRight,
  ShieldAlert,
  MoreHorizontal,
} from "lucide-react";
import { SubjectModal, ICON_MAP } from "../components/SubjectModal";
import { UnitModal } from "../components/UnitModal";
import { LessonModal } from "../components/LessonModal";
import { DeleteConfirmationModal, DeleteTargetInfo } from "../components/DeleteConfirmationModal";
import { Subject, Unit, Lesson, Question } from "../../../types";
import {
  filterAllowedSubjects,
  filterAllowedItemsBySubject,
  canPerformAction,
  canAccessSubject,
} from "../../../services/rbacEngine";

export interface CurriculumNavigationState {
  subjectQuery?: string; subjectSort?: string; unitSearchBySubject?: Record<string,string>;
  scroll?: Record<string,number>;
}

interface CurriculumTreeViewProps {
  navigationState?: React.MutableRefObject<CurriculumNavigationState>;
  onOpenLessonPreview?: (lessonId: string) => void;
  isLoading?: boolean;
  loadError?: string | null;
  onRetry?: () => void;
  subjects: Subject[];
  units: Unit[];
  lessons: Lesson[];
  questions?: Question[];
  onSaveSubject: (subject: Subject) => void | boolean;
  onDeleteSubject: (id: string) => void | boolean;
  onSaveUnit: (unit: Unit) => void | boolean;
  onDeleteUnit: (id: string) => void | boolean;
  onSaveLesson: (lesson: Lesson) => void | boolean;
  onDeleteLesson: (id: string) => void | boolean;
  onOpenLessonEditor: (lessonId: string) => void;
  onOpenLessonQuestions?: (subjectId: string, unitId: string, lessonId: string) => void;
}

const normalizeArabicSearch = (value = "") =>
  value
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

export const CurriculumTreeView: React.FC<CurriculumTreeViewProps> = ({
  isLoading = false, loadError = null, onRetry, navigationState, onOpenLessonPreview,
  subjects,
  units,
  lessons,
  questions = [],
  onSaveSubject,
  onDeleteSubject,
  onSaveUnit,
  onDeleteUnit,
  onSaveLesson,
  onDeleteLesson,
  onOpenLessonEditor,
  onOpenLessonQuestions,
}) => {
  const currentUser = useMemo(() => storage.getCurrentUser(), []);
  const allowedSubjects = useMemo(() => filterAllowedSubjects(currentUser, subjects), [currentUser, subjects]);
  const allowedUnits = useMemo(() => filterAllowedItemsBySubject(currentUser, units), [currentUser, units]);
  const allowedLessons = useMemo(() => filterAllowedItemsBySubject(currentUser, lessons), [currentUser, lessons]);

  const treeSavedUi = useMemo(() => storage.getUiState("curriculum_tree_ui", {
    selectedType: null as "subject" | "unit" | "lesson" | null,
    selectedId: null as string | null,
    searchQuery: "",
  }), []);

  const [selectedType, setSelectedType] = useState<"subject" | "unit" | "lesson" | null>(treeSavedUi.selectedType);
  const [selectedId, setSelectedId] = useState<string | null>(treeSavedUi.selectedId);
  const [searchQuery, setSearchQuery] = useState(treeSavedUi.searchQuery || "");

  const [subjectQuery, setSubjectQuery] = useState(navigationState?.current.subjectQuery || '');
  const [subjectSort, setSubjectSort] = useState(navigationState?.current.subjectSort || 'current');
  const [unitSearchBySubject, setUnitSearchBySubject] = useState<Record<string, string>>(navigationState?.current.unitSearchBySubject || {});
  const scrollArea = useRef<HTMLDivElement>(null);
  const listScroll = useRef(0);
  const subjectScroll = useRef(0);
  const isSubjectList = !selectedType || !selectedId;
  const scrollPositions = useRef<Record<string,number>>(navigationState?.current.scroll || {});
  const routeKey = `${selectedType || 'root'}:${selectedId || ''}`;
  useLayoutEffect(() => {
    const area = scrollArea.current;
    if (!area) return;
    area.scrollTop = scrollPositions.current[routeKey] ?? (isSubjectList ? listScroll.current : selectedType === 'subject' ? subjectScroll.current : 0);
    return () => { scrollPositions.current[routeKey] = area.scrollTop; };
  }, [routeKey]);
  React.useEffect(() => {
    if (navigationState) navigationState.current = {subjectQuery,subjectSort,unitSearchBySubject,scroll:scrollPositions.current};
  }, [navigationState,subjectQuery,subjectSort,unitSearchBySubject]);
  const openSubject = (id: string) => {
    listScroll.current = scrollArea.current?.scrollTop || 0;
    setSelectedType('subject'); setSelectedId(id);
  };
  const openUnit = (id: string) => {
    subjectScroll.current = scrollArea.current?.scrollTop || 0;
    setSelectedType("unit");
    setSelectedId(id);
  };
  const uniqueQuestions = useMemo(() => Array.from(new Map(questions.filter(Boolean).map(q => [q.id, q])).values()), [questions]);
  const subjectCounts = useMemo(() => new Map(allowedSubjects.map(subject => {
    const us = allowedUnits.filter(u => u.subjectId === subject.id);
    const ls = allowedLessons.filter(l => l.subjectId === subject.id);
    const unitIds = new Set(us.map(u => u.id)), lessonIds = new Set(ls.map(l => l.id));
    const qs = uniqueQuestions.filter(q => (!q.subjectId || q.subjectId === subject.id) &&
      (q.subjectId === subject.id || unitIds.has(q.unitId) || lessonIds.has(q.lessonId) || q.lessonIds?.some(id => lessonIds.has(id))));
    return [subject.id, {units: us.length, lessons: ls.length, questions: qs.length}];
  })), [allowedSubjects, allowedUnits, allowedLessons, uniqueQuestions]);
  const listedSubjects = useMemo(() => {
    const query = normalizeArabicSearch(subjectQuery);
    const result = allowedSubjects.filter(s => [s.name, s.code].some(value => normalizeArabicSearch(value || '').includes(query)));
    return subjectSort === 'name' ? [...result].sort((a,b) => a.name.localeCompare(b.name, 'ar')) : result;
  }, [allowedSubjects, subjectQuery, subjectSort]);

  // Modal States
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [unitDefaultSubjectId, setUnitDefaultSubjectId] = useState<string | undefined>(undefined);

  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonDefaultUnitId, setLessonDefaultUnitId] = useState<string | undefined>(undefined);
  const [lessonDefaultSubjectId, setLessonDefaultSubjectId] = useState<string | undefined>(undefined);

  // Delete Confirmation State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTargetInfo | null>(null);

  React.useEffect(() => {
    storage.saveUiState("curriculum_tree_ui", {
      selectedType,
      selectedId,
      searchQuery,
    });
  }, [selectedType, selectedId, searchQuery]);

  // Selection Sanitization based on permissions
  React.useEffect(() => {
    if (selectedType === "subject" && selectedId && !allowedSubjects.some((s) => s.id === selectedId)) {
      setSelectedType(allowedSubjects.length > 0 ? "subject" : null);
      setSelectedId(allowedSubjects[0]?.id || null);
    } else if (selectedType === "unit" && selectedId && !allowedUnits.some((u) => u.id === selectedId)) {
      setSelectedType(allowedSubjects.length > 0 ? "subject" : null);
      setSelectedId(allowedSubjects[0]?.id || null);
    } else if (selectedType === "lesson" && selectedId && !allowedLessons.some((l) => l.id === selectedId)) {
      setSelectedType(allowedSubjects.length > 0 ? "subject" : null);
      setSelectedId(allowedSubjects[0]?.id || null);
    }
  }, [allowedSubjects, allowedUnits, allowedLessons, selectedType, selectedId]);

  // RBAC Permission Helpers
  const canManageCurriculum = useMemo(() => canPerformAction(currentUser, "create", "curriculum"), [currentUser]);
  const canEditCurriculum = useMemo(() => canPerformAction(currentUser, "edit", "curriculum"), [currentUser]);
  const canDeleteCurriculum = useMemo(() => canPerformAction(currentUser, "delete", "curriculum"), [currentUser]);

  const canManageLessons = useMemo(() => canPerformAction(currentUser, "create", "lessons"), [currentUser]);
  const canEditLessons = useMemo(() => canPerformAction(currentUser, "edit", "lessons"), [currentUser]);
  const canDeleteLessons = useMemo(() => canPerformAction(currentUser, "delete", "lessons"), [currentUser]);

  const isSubjectPermitted = (sId?: string) => sId ? canAccessSubject(currentUser, sId) : false;

  // Modals Openers
  const handleOpenAddSubject = () => {
    if (!canManageCurriculum) return;
    setEditingSubject(null);
    setIsSubjectModalOpen(true);
  };

  const handleOpenEditSubject = (subj: Subject) => {
    if (!canEditCurriculum || !isSubjectPermitted(subj.id)) return;
    setEditingSubject(subj);
    setIsSubjectModalOpen(true);
  };

  const handleSaveSubjectModal = (savedSubj: Subject) => {
    if (onSaveSubject(savedSubj) === false) return false;
    // Keep the current context while the parent refreshes its data asynchronously.
    return true;
  };

  const handleOpenAddUnit = (subjId?: string) => {
    const sId = subjId || (selectedType === "subject" ? selectedId : null) || allowedSubjects[0]?.id || "";
    if (!canManageCurriculum || !isSubjectPermitted(sId)) return;
    setEditingUnit(null);
    setUnitDefaultSubjectId(sId);
    setIsUnitModalOpen(true);
  };

  const handleOpenEditUnit = (unit: Unit) => {
    if (!canEditCurriculum || !isSubjectPermitted(unit.subjectId)) return;
    setEditingUnit(unit);
    setUnitDefaultSubjectId(unit.subjectId);
    setIsUnitModalOpen(true);
  };

  const handleSaveUnitModal = (savedUnit: Unit) => {
    if (onSaveUnit(savedUnit) === false) return false;
    return true;
  };

  const handleOpenAddLesson = (unitId?: string) => {
    const uId = unitId || (selectedType === "unit" ? selectedId : null) || allowedUnits[0]?.id || "";
    const parentUnit = units.find((u) => u.id === uId);
    const sId = parentUnit?.subjectId || (selectedType === "subject" ? selectedId : null) || allowedSubjects[0]?.id || "";
    if (!canManageLessons || !isSubjectPermitted(sId)) return;

    setEditingLesson(null);
    setLessonDefaultUnitId(uId);
    setLessonDefaultSubjectId(sId);
    setIsLessonModalOpen(true);
  };

  const handleOpenEditLesson = (lesson: Lesson) => {
    if (!canEditLessons || !isSubjectPermitted(lesson.subjectId)) return;
    setEditingLesson(lesson);
    setLessonDefaultUnitId(lesson.unitId);
    setLessonDefaultSubjectId(lesson.subjectId);
    setIsLessonModalOpen(true);
  };

  const handleSaveLessonModal = (savedLesson: Lesson) => {
    if (onSaveLesson(savedLesson) === false) return false;
    setSelectedType("lesson");
    setSelectedId(savedLesson.id);
    return true;
  };

  // Safe Deletion Triggers
  const triggerDeleteSubject = (subjId: string) => {
    if (!canDeleteCurriculum || !isSubjectPermitted(subjId)) return;
    const sub = subjects.find((s) => s.id === subjId);
    if (!sub) return;

    const childUnits = units.filter((u) => u && u.subjectId === subjId);
    const childLessons = lessons.filter((l) => l && l.subjectId === subjId);
    const childQuestions = uniqueQuestions.filter(q => q.subjectId === subjId || childLessons.some(l => l.id === q.lessonId));

    setDeleteTarget({
      type: "subject",
      id: subjId,
      title: sub.name,
      childUnitsCount: childUnits.length,
      childLessonsCount: childLessons.length,
      linkedQuestionsCount: childQuestions.length,
    });
    setIsDeleteModalOpen(true);
  };

  const triggerDeleteUnit = (unitId: string) => {
    const unit = units.find((u) => u.id === unitId);
    if (!unit || !canDeleteCurriculum || !isSubjectPermitted(unit.subjectId)) return;

    const childLessons = lessons.filter((l) => l && l.unitId === unitId);
    const childLessonIds = new Set(childLessons.map((lesson) => lesson.id));
    const childQuestions = uniqueQuestions.filter((q) => q.unitId === unitId || childLessonIds.has(q.lessonId) || q.lessonIds?.some((id) => childLessonIds.has(id)));

    setDeleteTarget({
      type: "unit",
      id: unitId,
      title: unit.title,
      childLessonsCount: childLessons.length,
      linkedQuestionsCount: childQuestions.length,
    });
    setIsDeleteModalOpen(true);
  };

  const triggerDeleteLesson = (lessonId: string) => {
    const lesson = lessons.find((l) => l && l.id === lessonId);
    if (!lesson || !canDeleteLessons || !isSubjectPermitted(lesson.subjectId)) return;

    const childQuestions = uniqueQuestions.filter(
      (q) => q && (q.lessonId === lessonId || (Array.isArray(q.lessonIds) && q.lessonIds.includes(lessonId)))
    );

    setDeleteTarget({
      type: "lesson",
      id: lessonId,
      title: lesson.title,
      contentCardsCount: lesson.contentParagraphs?.length || 0,
      linkedQuestionsCount: childQuestions.length,
    });
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "subject") {
      if (onDeleteSubject(deleteTarget.id) === false) return false;
    } else if (deleteTarget.type === "unit") {
      const deletedUnit = units.find((unit) => unit.id === deleteTarget.id);
      if (onDeleteUnit(deleteTarget.id) === false) return false;
      setSelectedType("subject");
      setSelectedId(deletedUnit?.subjectId || null);
      setDeleteTarget(null);
      return true;
    } else if (deleteTarget.type === "lesson") {
      const deletedLesson = lessons.find(lesson => lesson.id === deleteTarget.id);
      if (onDeleteLesson(deleteTarget.id) === false) return false;
      setSelectedType('unit'); setSelectedId(deletedLesson?.unitId || null);
      setDeleteTarget(null); return true;
    }
    setSelectedType(null);
    setSelectedId(null);
    setDeleteTarget(null);
  };

  const stats = useMemo(() => {
    return {
      totalSubjects: allowedSubjects.length,
      totalUnits: allowedUnits.length,
      totalLessons: allowedLessons.length,
      totalQuestions: uniqueQuestions.filter((q) => !q.subjectId || allowedSubjects.some((s) => s.id === q.subjectId)).length,
    };
  }, [allowedSubjects, allowedUnits, allowedLessons, uniqueQuestions]);

  const currentSubject = selectedType === "subject"
    ? allowedSubjects.find((subject) => subject.id === selectedId)
    : selectedType === "unit"
      ? allowedSubjects.find((subject) => subject.id === allowedUnits.find((unit) => unit.id === selectedId)?.subjectId)
      : selectedType === "lesson"
        ? allowedSubjects.find((subject) => subject.id === allowedLessons.find((lesson) => lesson.id === selectedId)?.subjectId)
        : undefined;
  const currentUnit = selectedType === "unit"
    ? allowedUnits.find((unit) => unit.id === selectedId)
    : selectedType === "lesson"
      ? allowedUnits.find((unit) => unit.id === allowedLessons.find((lesson) => lesson.id === selectedId)?.unitId)
      : undefined;
  const currentLesson = selectedType === "lesson"
    ? allowedLessons.find((lesson) => lesson.id === selectedId)
    : undefined;

  const openExplorerRoot = () => {
    setSelectedType(null);
    setSelectedId(null);
  };

  return (
    <div className="flex h-full w-full bg-slate-50 dark:bg-slate-900" dir="rtl">
      {/* Subject Modal */}
      <SubjectModal
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        onSave={handleSaveSubjectModal}
        initialSubject={editingSubject}
        existingSubjectsCount={subjects.length}
      />

      {/* Unit Modal */}
      <UnitModal
        isOpen={isUnitModalOpen}
        onClose={() => setIsUnitModalOpen(false)}
        onSave={handleSaveUnitModal}
        initialUnit={editingUnit}
        subjects={allowedSubjects}
        defaultSubjectId={unitDefaultSubjectId}
        existingUnitsCount={units.length}
      />

      {/* Lesson Modal */}
      <LessonModal
        isOpen={isLessonModalOpen}
        onClose={() => setIsLessonModalOpen(false)}
        onSave={handleSaveLessonModal}
        initialLesson={editingLesson}
        units={allowedUnits}
        subjects={allowedSubjects}
        defaultUnitId={lessonDefaultUnitId}
        defaultSubjectId={lessonDefaultSubjectId}
        existingLessonsCount={lessons.length}
      />

      {/* Safe Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
        target={deleteTarget}
      />

      {/* Main Content Area */}
      <div ref={scrollArea} className="flex-1 flex flex-col min-w-0 overflow-y-auto p-4 sm:p-6 bg-slate-50 dark:bg-slate-900">
        <div hidden={isSubjectList || selectedType === "subject" || selectedType === "lesson"} className="max-w-6xl mx-auto w-full mb-5 space-y-3">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/50 text-primary-600 flex items-center justify-center border border-primary-100 dark:border-primary-800/50">
                    <FolderTree className="w-5 h-5" />
                  </div>
                  <div>
                    <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">مستكشف المناهج</h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">انتقل خطوة واحدة في كل مرة: مادة، ثم وحدة، ثم درس.</p>
                  </div>
                </div>

                <nav className="flex items-center gap-1.5 mt-3 text-xs font-bold text-slate-500 overflow-x-auto" aria-label="مسار المنهاج">
                  <button type="button" onClick={openExplorerRoot} className="shrink-0 hover:text-primary-600">المناهج</button>
                  {currentSubject && (
                    <>
                      <ChevronLeft className="w-3.5 h-3.5 shrink-0 text-slate-300" />
                      <button
                        type="button"
                        onClick={() => { setSelectedType("subject"); setSelectedId(currentSubject.id); }}
                        className={`shrink-0 max-w-[190px] truncate hover:text-primary-600 ${selectedType === "subject" ? "text-slate-900 dark:text-white" : ""}`}
                      >
                        {currentSubject.name}
                      </button>
                    </>
                  )}
                  {currentUnit && (
                    <>
                      <ChevronLeft className="w-3.5 h-3.5 shrink-0 text-slate-300" />
                      <button
                        type="button"
                        onClick={() => { setSelectedType("unit"); setSelectedId(currentUnit.id); }}
                        className={`shrink-0 max-w-[190px] truncate hover:text-primary-600 ${selectedType === "unit" ? "text-slate-900 dark:text-white" : ""}`}
                      >
                        {currentUnit.title}
                      </button>
                    </>
                  )}
                  {currentLesson && (
                    <>
                      <ChevronLeft className="w-3.5 h-3.5 shrink-0 text-slate-300" />
                      <span className="shrink-0 max-w-[220px] truncate text-slate-900 dark:text-white">{currentLesson.title}</span>
                    </>
                  )}
                </nav>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 lg:max-w-2xl lg:flex-1 lg:justify-end">
                <div className="relative sm:min-w-[280px] lg:max-w-md lg:flex-1">
                  <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    placeholder="ابحث باسم المادة أو رمزها..."
                    value={searchQuery}
                    onChange={(event) => {
                      const value = event.target.value;
                      setSearchQuery(value);
                      setSubjectQuery(value);
                      if (value.trim() && selectedType) openExplorerRoot();
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pr-9 pl-3 py-2.5 text-xs font-medium focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent("refresh-data-all"))}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 hover:text-primary-600 transition"
                  title="تحديث البيانات"
                  aria-label="تحديث البيانات"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>

                {!selectedType && canManageCurriculum && (
                  <button type="button" onClick={handleOpenAddSubject} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-black shadow-sm">
                    <Plus className="w-4 h-4" /><span>إضافة مادة</span>
                  </button>
                )}
                {selectedType === "subject" && currentSubject && canManageCurriculum && (
                  <button type="button" onClick={() => handleOpenAddUnit(currentSubject.id)} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-black shadow-sm">
                    <Plus className="w-4 h-4" /><span>إضافة وحدة</span>
                  </button>
                )}
                {selectedType === "unit" && currentUnit && canManageLessons && (
                  <button type="button" onClick={() => handleOpenAddLesson(currentUnit.id)} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-black shadow-sm">
                    <Plus className="w-4 h-4" /><span>إضافة درس</span>
                  </button>
                )}
                {selectedType === "lesson" && currentLesson && canEditLessons && (
                  <button type="button" onClick={() => onOpenLessonEditor(currentLesson.id)} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-black shadow-sm">
                    <Edit2 className="w-4 h-4" /><span>إعداد الدرس</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {isSubjectList ? (
          <section className="curriculum-subjects max-w-6xl mx-auto w-full" aria-label="قائمة المواد" aria-busy={isLoading}>
            <header className="cs-header"><div><h1>المناهج</h1><p>اختر مادة لاستعراض وحداتها ودروسها</p></div>
              <div className="cs-header-actions"><button aria-label="تحديث البيانات" title="تحديث البيانات" onClick={() => onRetry ? onRetry() : window.dispatchEvent(new CustomEvent('refresh-data-all'))}><RefreshCw size={18}/></button>
                {canManageCurriculum && <button className="cs-primary" onClick={handleOpenAddSubject}><Plus size={20}/>إضافة مادة</button>}</div>
            </header>
            {isLoading ? <div className="cs-empty" role="status">جارٍ تحميل المواد وإحصاءاتها…</div> : loadError ?
              <div className="cs-empty" role="alert"><p>{loadError}</p><button onClick={onRetry}>إعادة المحاولة</button></div> : <>
              <p className="cs-global-label">إحصاءات جميع المواد المتاحة لك — لا تتأثر بالبحث</p>
              <div className="cs-stats" aria-label="إحصاءات جميع المواد">
                {[[BookOpen,stats.totalSubjects,'مواد دراسية'],[Layers,stats.totalUnits,'وحدات'],[FileText,stats.totalLessons,'دروس'],[HelpCircle,stats.totalQuestions,'أسئلة في البنك']].map(([Icon,count,label]:any) => <div key={label}><Icon size={24}/><strong>{count}</strong><span>{label}</span></div>)}
              </div>
              <div className="cs-filters"><label className="cs-search"><Search size={20}/><input type="search" aria-label="بحث باسم المادة أو رمزها" placeholder="ابحث باسم المادة أو رمزها…" value={subjectQuery} onChange={e => setSubjectQuery(e.target.value)}/></label>
                <select aria-label="ترتيب المواد" value={subjectSort} onChange={e => setSubjectSort(e.target.value)}><option value="current">الترتيب الحالي</option><option value="name">الاسم</option></select>
              </div>
              {allowedSubjects.length === 0 ? <div className="cs-empty"><BookOpen size={38}/><h2>لا توجد مواد لعرضها</h2><p>أضف مادة لتبدأ تنظيم وحداتها ودروسها.</p>{canManageCurriculum && <button className="cs-primary" onClick={handleOpenAddSubject}>إضافة أول مادة</button>}</div> : listedSubjects.length === 0 ?
                <div className="cs-empty"><h2>لا توجد نتائج مطابقة</h2><button onClick={() => setSubjectQuery('')}>مسح البحث</button></div> :
                <div className="cs-grid">{listedSubjects.map(subject => {
                  const Icon = ICON_MAP[subject.icon] || BookOpen;
                  const counts = subjectCounts.get(subject.id)!;
                  return <article className="cs-card" key={subject.id} style={{'--subject-color': subject.color || '#2563eb'} as React.CSSProperties}>
                    <button className="cs-card-title" aria-label={`فتح مادة ${subject.name}`} onClick={() => openSubject(subject.id)}><span className="cs-icon"><Icon/></span><span><h2>{subject.name}</h2>{subject.code && <span className="cs-code" dir="auto">{subject.code}</span>}</span></button>
                    <p className="cs-description">{subject.description || 'لا يوجد وصف للمادة.'}</p>
                    <div className="cs-card-stats"><div><strong>{counts.units}</strong><span>وحدات</span></div><div><strong>{counts.lessons}</strong><span>دروس</span></div><div><strong>{counts.questions}</strong><span>أسئلة</span></div></div>
                    <div className="cs-card-actions"><button className="cs-open" onClick={() => openSubject(subject.id)}>عرض الوحدات</button>
                      {(canEditCurriculum || canDeleteCurriculum) && <details className="cs-menu" onKeyDown={e => {if(e.key === "Escape") {e.currentTarget.removeAttribute("open");e.currentTarget.querySelector("summary")?.focus();}}}><summary aria-label={`إجراءات مادة ${subject.name}`}><MoreHorizontal size={22}/></summary><div>
                        {canEditCurriculum && <button onClick={e => {e.currentTarget.closest('details')?.removeAttribute('open');handleOpenEditSubject(subject);}}><Edit2 size={16}/>تعديل المادة</button>}
                        {canDeleteCurriculum && <button className="cs-delete" onClick={e => {e.currentTarget.closest('details')?.removeAttribute('open');triggerDeleteSubject(subject.id);}}><Trash2 size={16}/>حذف المادة</button>}
                      </div></details>}
                    </div>
                  </article>;
                })}</div>}
              <p className="cs-result-count" role="status">عرض {listedSubjects.length} من {allowedSubjects.length} مواد</p>
            </>}
          </section>
        ) : (
          <div className="max-w-6xl mx-auto w-full space-y-6">

            {/* SUBJECT VIEW */}
            {selectedType === "subject" && allowedSubjects.find((s) => s.id === selectedId) && (() => {
              const currentSub = allowedSubjects.find((s) => s.id === selectedId)!;
              const subUnits = allowedUnits.filter((u) => u.subjectId === currentSub.id);
              const subLessons = allowedLessons.filter((l) => l.subjectId === currentSub.id);
              const counts = subjectCounts.get(currentSub.id) || { units: subUnits.length, lessons: subLessons.length, questions: 0 };
              const SubIconComponent = ICON_MAP[currentSub.icon] || BookOpen;
              const subjColor = currentSub.color || "#2563eb";
              const unitQuery = unitSearchBySubject[currentSub.id] || "";
              const normalizedUnitQuery = normalizeArabicSearch(unitQuery);
              const visibleUnits = subUnits.filter((unit) => [unit.title, unit.code].some((value) => normalizeArabicSearch(value || "").includes(normalizedUnitQuery)));
              const canEditThisSub = canEditCurriculum && isSubjectPermitted(currentSub.id);
              const canDeleteThisSub = canDeleteCurriculum && isSubjectPermitted(currentSub.id);

              return (
                <main className="subject-detail" style={{"--subject-color": subjColor} as React.CSSProperties}>
                  <nav className="sd-breadcrumb" aria-label="مسار المادة">
                    <button type="button" onClick={openExplorerRoot}>المناهج</button>
                    <ChevronLeft size={16}/>
                    <span>{currentSub.name}</span>
                  </nav>

                  <section className="sd-summary" aria-labelledby="subject-title">
                    <div className="sd-summary-main">
                      <span className="sd-subject-icon"><SubIconComponent/></span>
                      <div className="sd-subject-copy">
                        <div className="sd-title-line">
                          <h1 id="subject-title">{currentSub.name}</h1>
                          {currentSub.code && <span className="sd-code" dir="auto">{currentSub.code}</span>}
                        </div>
                        {currentSub.description && <p>{currentSub.description}</p>}
                      </div>
                      <div className="sd-summary-actions">
                        {canEditThisSub && <button type="button" onClick={() => handleOpenEditSubject(currentSub)}><Edit2 size={17}/>تعديل المادة</button>}
                        {(canDeleteThisSub || onOpenLessonQuestions) && <details className="cs-menu" onKeyDown={e => {if(e.key === "Escape") {e.currentTarget.removeAttribute("open"); e.currentTarget.querySelector("summary")?.focus();}}}>
                          <summary aria-label={`إجراءات مادة ${currentSub.name}`}><MoreHorizontal size={22}/></summary>
                          <div>
                            {onOpenLessonQuestions && <button onClick={e => {e.currentTarget.closest("details")?.removeAttribute("open"); onOpenLessonQuestions(currentSub.id,"","");}}><Target size={16}/>عرض أسئلة المادة</button>}
                            <button onClick={e => {e.currentTarget.closest("details")?.removeAttribute("open"); window.dispatchEvent(new CustomEvent("refresh-data-all"));}}><RefreshCw size={16}/>تحديث البيانات</button>
                            {canDeleteThisSub && <button className="cs-delete" onClick={e => {e.currentTarget.closest("details")?.removeAttribute("open"); triggerDeleteSubject(currentSub.id);}}><Trash2 size={16}/>حذف المادة</button>}
                          </div>
                        </details>}
                      </div>
                    </div>
                    <div className="sd-summary-footer">
                      <div className="sd-subject-stats" aria-label="إحصاءات المادة">
                        <span><strong>{counts.units}</strong> وحدات</span>
                        <span><strong>{counts.lessons}</strong> دروس</span>
                        <span><strong>{counts.questions}</strong> أسئلة مرتبطة</span>
                      </div>
                      {onOpenLessonQuestions && <button className="sd-question-link" type="button" onClick={() => onOpenLessonQuestions(currentSub.id,"","")}><ArrowUpRight size={17}/>عرض أسئلة المادة</button>}
                    </div>
                  </section>

                  <section className="sd-units" aria-labelledby="units-title">
                    <header className="sd-units-header">
                      <div><h2 id="units-title">الوحدات الدراسية</h2><p>اختر وحدة لاستعراض دروسها.</p></div>
                      {canManageCurriculum && <button className="sd-primary" type="button" onClick={() => handleOpenAddUnit(currentSub.id)}><Plus size={19}/>إضافة وحدة</button>}
                    </header>
                    {subUnits.length > 0 && <label className="sd-unit-search"><Search size={20}/><input type="search" aria-label="بحث في وحدات المادة" placeholder="ابحث عن وحدة بالاسم أو الرمز…" value={unitQuery} onChange={e => setUnitSearchBySubject(prev => ({...prev,[currentSub.id]:e.target.value}))}/></label>}

                    {subUnits.length === 0 ? <div className="sd-empty"><Folder size={38}/><h3>لا توجد وحدات في هذه المادة</h3><p>أضف أول وحدة لتبدأ تنظيم الدروس.</p>{canManageCurriculum && <button className="sd-primary" onClick={() => handleOpenAddUnit(currentSub.id)}>إضافة أول وحدة</button>}</div> : visibleUnits.length === 0 ? <div className="sd-empty"><Search size={34}/><h3>لا توجد وحدة مطابقة</h3><button onClick={() => setUnitSearchBySubject(prev => ({...prev,[currentSub.id]:""}))}>مسح البحث</button></div> : <div className="sd-unit-list">
                      {visibleUnits.map((unit,index) => {
                        const lessonCount = subLessons.filter((lesson) => lesson.unitId === unit.id).length;
                        return <article className="sd-unit-row" key={unit.id}>
                          <span className="sd-folder"><Folder size={26}/><b>{index + 1}</b></span>
                          <div className="sd-unit-copy"><h3>{unit.title}</h3><p>{unit.code && <span dir="auto">{unit.code}</span>}{unit.code && " • "}{lessonCount} {lessonCount === 1 ? "درس" : "دروس"}</p></div>
                          <div className="sd-unit-actions">
                            <button className="sd-open-unit" type="button" onClick={() => openUnit(unit.id)}><ChevronLeft size={18}/>عرض الدروس</button>
                            {(canEditCurriculum || canDeleteCurriculum) && <details className="cs-menu" onKeyDown={e => {if(e.key === "Escape") {e.currentTarget.removeAttribute("open"); e.currentTarget.querySelector("summary")?.focus();}}}>
                              <summary aria-label={`إجراءات وحدة ${unit.title}`}><MoreHorizontal size={21}/></summary>
                              <div>{canEditCurriculum && <button onClick={e => {e.currentTarget.closest("details")?.removeAttribute("open"); handleOpenEditUnit(unit);}}><Edit2 size={16}/>تعديل الوحدة</button>}{canDeleteCurriculum && <button className="cs-delete" onClick={e => {e.currentTarget.closest("details")?.removeAttribute("open"); triggerDeleteUnit(unit.id);}}><Trash2 size={16}/>حذف الوحدة</button>}</div>
                            </details>}
                          </div>
                        </article>;
                      })}
                    </div>}
                    <footer className="sd-units-footer"><span>{subUnits.length} وحدات</span><span>{subLessons.length} دروس</span></footer>
                  </section>
                </main>
              );
            })()}

            {/* UNIT VIEW */}
            {selectedType === "unit" && units.find((u) => u && u.id === selectedId) && (() => {
              const currentUnit = units.find((u) => u && u.id === selectedId)!;
              const parentSub = subjects.find((s) => s && s.id === currentUnit.subjectId);
              const unitLessons = lessons.filter((l) => l && l.unitId === currentUnit.id);
              const unitQuestions = questions.filter(
                (q) => q && (q.unitId === currentUnit.id || unitLessons.some((l) => l.id === q.lessonId))
              );
              const canEditThisUnit = canEditCurriculum && isSubjectPermitted(currentUnit.subjectId);
              const canDeleteThisUnit = canDeleteCurriculum && isSubjectPermitted(currentUnit.subjectId);

              return (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-800 shadow-xs shrink-0">
                        <Folder className="w-7 h-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-0.5">
                            {currentUnit.title}
                          </h2>
                          {currentUnit.code && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs font-bold border border-slate-200 dark:border-slate-700">
                              {currentUnit.code}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-primary-500" />
                          <span>المادة الدراسية: {parentSub?.name || "غير محدد"}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {onOpenLessonQuestions && (
                        <button
                          type="button"
                          onClick={() => onOpenLessonQuestions(currentUnit.subjectId, currentUnit.id, "")}
                          className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold border border-blue-200 dark:border-blue-800 transition cursor-pointer"
                          title="استعراض أسئلة هذه الوحدة في بنك الأسئلة"
                        >
                          <Target className="w-3.5 h-3.5" />
                          <span>أسئلة الوحدة ({unitQuestions.length})</span>
                        </button>
                      )}

                      {canEditThisUnit && (
                        <button
                          type="button"
                          onClick={() => handleOpenEditUnit(currentUnit)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer border border-slate-200 dark:border-slate-700"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>تعديل الوحدة</span>
                        </button>
                      )}

                    </div>
                  </div>

                  {/* Description if present */}
                  {currentUnit.description && (
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                      {currentUnit.description}
                    </div>
                  )}

                  {/* Lessons List */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary-600" />
                        <span>الدروس التعليمية التابعة للوحدة</span>
                      </h3>
                      <span className="text-xs font-bold text-slate-400">
                        {unitLessons.length} درس
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {unitLessons.map((lesson) => {
                        const lQuestions = questions.filter(
                          (q) => q && (q.lessonId === lesson.id || (Array.isArray(q.lessonIds) && q.lessonIds.includes(lesson.id)))
                        );
                        return (
                          <div
                            key={lesson.id}
                            onClick={() => {
                              setSelectedType("lesson");
                              setSelectedId(lesson.id);
                            }}
                            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-primary-500 dark:hover:border-primary-500 transition-all cursor-pointer flex items-center justify-between group hover:shadow-xs"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div>
                                <button type="button" onClick={() => { setSelectedType("lesson"); setSelectedId(lesson.id); }} className="font-bold text-sm text-start text-slate-800 dark:text-slate-200 group-hover:text-primary-600 dark:group-hover:text-primary-400">
                                  {lesson.title}
                                </button>
                                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                      lesson.status === "approved" || lesson.status === "completed"
                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                        : lesson.status === "review"
                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                                        : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                                    }`}
                                  >
                                    {lesson.status === "approved" || lesson.status === "completed"
                                      ? "معتمد"
                                      : lesson.status === "review"
                                      ? "قيد المراجعة"
                                      : "مسودة"}
                                  </span>
                                  <span>• {lesson.durationMinutes || 45} دقيقة</span>
                                  <span>• {lQuestions.length} أسئلة</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {canEditLessons && isSubjectPermitted(lesson.subjectId) && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenLessonEditor(lesson.id);
                                  }}
                                  className="text-xs font-black bg-primary-50 dark:bg-primary-950/50 hover:bg-primary-100 text-primary-700 dark:text-primary-300 px-3 py-1.5 rounded-xl border border-primary-200 dark:border-primary-800 transition-colors"
                                >
                                  إعداد الدرس
                                </button>
                              )}
                              <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-primary-500 transition-transform group-hover:-translate-x-1" />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {unitLessons.length === 0 && (
                      <div className="text-center py-8 text-slate-400 text-xs bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                        لا توجد دروس مضافة لهذه الوحدة حتى الآن.
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                    {canDeleteThisUnit ? (
                      <button
                        type="button"
                        onClick={() => triggerDeleteUnit(currentUnit.id)}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl transition-colors font-bold text-xs cursor-pointer border border-rose-200 dark:border-rose-900/40"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>حذف الوحدة</span>
                      </button>
                    ) : (
                      <div />
                    )}

                  </div>
                </div>
              );
            })()}

            {/* The existing lesson route owns this read-only summary. */}
            {selectedType === "lesson" && (isLoading ? <div className="ld-panel" role="status">جارٍ تحميل تفاصيل الدرس…</div> : loadError ?
              <div className="ld-panel" role="alert"><p>{loadError}</p><button className="ld-link" onClick={onRetry}>إعادة المحاولة</button></div> : !currentLesson ?
              <div className="ld-panel" role="alert"><p>تعذر العثور على الدرس أو لم تعد لديك صلاحية الوصول إليه.</p><button className="ld-link" onClick={openExplorerRoot}>العودة إلى المناهج</button></div> : null)}
            {selectedType === "lesson" && !isLoading && !loadError && currentLesson && <LessonDetails
              key={currentLesson.id} lesson={currentLesson} questions={uniqueQuestions}
              subjectName={currentSubject?.name} unitTitle={currentUnit?.title}
              onRoot={openExplorerRoot}
              onSubject={() => { setSelectedType('subject'); setSelectedId(currentLesson.subjectId); }}
              onUnit={() => { setSelectedType('unit'); setSelectedId(currentLesson.unitId); }}
              onPrepare={canEditLessons && isSubjectPermitted(currentLesson.subjectId) ? () => onOpenLessonEditor(currentLesson.id) : undefined}
              onPreview={onOpenLessonPreview ? () => onOpenLessonPreview(currentLesson.id) : undefined}
              onEdit={canEditLessons && isSubjectPermitted(currentLesson.subjectId) ? () => handleOpenEditLesson(currentLesson) : undefined}
              onDelete={canDeleteLessons && isSubjectPermitted(currentLesson.subjectId) ? () => triggerDeleteLesson(currentLesson.id) : undefined}
              onQuestions={onOpenLessonQuestions ? () => onOpenLessonQuestions(currentLesson.subjectId,currentLesson.unitId,currentLesson.id) : undefined}
            />}

          </div>
        )}
      </div>
    </div>
  );
};
