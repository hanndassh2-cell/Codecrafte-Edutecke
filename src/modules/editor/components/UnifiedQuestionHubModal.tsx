import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Search,
  Filter,
  CheckSquare,
  Square,
  HelpCircle,
  Star,
  Calendar,
  User,
  Tag,
  ChevronDown,
  ChevronUp,
  Check,
  Database,
  Plus,
  Trash2,
  RefreshCw,
  Layers,
  Sparkles,
  Code,
  FileCheck,
  AlertTriangle,
  Archive,
  ArrowRightLeft,
  Info,
  ShieldCheck,
  Save,
  Download,
  Copy,
  PlusCircle,
  Hash,
  ArrowLeft,
  Clock,
  CheckCircle2,
  ArrowUpDown,
  BookOpen,
  Edit3,
  SlidersHorizontal,
  RotateCcw
} from "lucide-react";
import { storage } from "../../../services/storage";
import { Question } from "../../../types/index";
import { MathText } from "../../../components/MathText";
import { RichTextEditor } from "./RichTextEditor";
import { AIQuestionSolverModal } from "./AIQuestionSolverModal";
import { QuestionRenderer, QuestionAnswerKeyBox } from "../../../components/QuestionRenderer";
import { resolveQuestionAnswer, isOptionCorrect, hasAnswer } from "../../../utils/answerResolver";
import {
  QuestionObject,
  buildQuestionObject,
  validateQuestionObject,
  QUESTION_TYPE_ARABIC_NAMES
} from "../../../services/questionObjectBuilder";
import {
  QuestionBankItem,
  SyncDiffReport,
  SyncRemovalStrategy,
  compareQuestionObjectsWithBank,
  executeQuestionBankSync,
  getStoredQuestionBank
} from "../../../services/questionBankSyncEngine";

interface UnifiedQuestionHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "bank" | "builder" | "sync";
  currentLessonId?: string;
  incomingQuestionsForSync?: QuestionObject[];
  parsedQuestionsForBuilder?: any[];
  onInsertQuestions?: (selectedQuestions: Question[]) => void;
  onConfirmSaveObjects?: (objects: QuestionObject[]) => void;
  onSyncCompleted?: (finalBank: QuestionBankItem[]) => void;
  alreadyInsertedQuestionIds?: string[];
}

const QUESTION_TYPES_LABEL: Record<string, string> = {
  mcq: "اختيار متعدد",
  true_false: "صح أو خطأ",
  reason: "علل",
  definition: "عرف",
  fill_blanks: "أكمل",
  ordering: "رتب",
  matching: "وصل",
  essay: "سؤال مقالي",
  problem: "حسابي",
  practical: "عملي",
  diagram_label: "رسم أو تخطيط",
  image_choice: "سؤال يعتمد على صورة",
  table_query: "سؤال يعتمد على جدول",
  equation: "سؤال يعتمد على معادلة"
};

export const UnifiedQuestionHubModal: React.FC<UnifiedQuestionHubModalProps> = ({
  isOpen,
  onClose,
  initialTab = "bank",
  currentLessonId,
  incomingQuestionsForSync = [],
  parsedQuestionsForBuilder = [],
  onInsertQuestions,
  onConfirmSaveObjects,
  onSyncCompleted,
  alreadyInsertedQuestionIds = []
}) => {
  const hubSavedUi = useMemo(() => storage.getUiState("question_hub_modal_ui", {
    activeTab: initialTab,
    searchTerm: "",
    selectedStatus: "active" as const,
    minImportance: 0,
    selectedSubjectId: "all",
    selectedUnitId: "all",
    selectedLessonId: "all",
    selectedType: "all",
    selectedDifficulty: "all",
    selectedImportance: "",
    selectedTag: "",
    selectedAuthor: "",
    selectedDateFilter: "",
    sortBy: "newest",
    hideInserted: true,
    showFilters: true,
  }), []);

  const [activeTab, setActiveTab] = useState<"bank" | "builder" | "sync">(initialTab);
  const [syncTick, setSyncTick] = useState(0);
  const [showAISolver, setShowAISolver] = useState(false);

  useEffect(() => {
    const handleSync = () => setSyncTick(t => t + 1);
    window.addEventListener("refresh-data-all", handleSync);
    return () => window.removeEventListener("refresh-data-all", handleSync);
  }, []);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // -------------------------------------------------------------
  // TAB 1: CENTRAL QUESTION BANK SEARCH & PICKER STATE
  // -------------------------------------------------------------
  const allQuestions = useMemo(() => {
    return storage.getQuestions();
  }, [isOpen, activeTab, syncTick]);

  // Status & metric counts matching QuestionBankView
  const totalQuestionsCount = allQuestions.length;
  const activeQuestionsCount = allQuestions.filter(q => q.status !== "archived").length;
  const archivedQuestionsCount = allQuestions.filter(q => q.status === "archived").length;
  const requiresReviewCount = allQuestions.filter(q => q.status === "requires_review" || (q as any).status === "draft").length;
  const draftsCount = allQuestions.filter(q => (q as any).status === "draft").length;
  const notInLessonCount = allQuestions.filter(q => !q.lessonId && (!Array.isArray(q.lessonIds) || q.lessonIds.length === 0)).length;
  const solvedCount = allQuestions.filter(q => hasAnswer(q)).length;

  const subjects = useMemo(() => storage.getSubjects(), [isOpen]);
  const units = useMemo(() => storage.getUnits(), [isOpen]);
  const lessons = useMemo(() => storage.getLessons(), [isOpen]);

  const [searchTerm, setSearchTerm] = useState(hubSavedUi.searchTerm || "");
  const [selectedStatus, setSelectedStatus] = useState<"active" | "archived" | "all">(hubSavedUi.selectedStatus || "active");
  const [minImportance, setMinImportance] = useState<number>(hubSavedUi.minImportance ?? 0);
  const [selectedSubjectId, setSelectedSubjectId] = useState(hubSavedUi.selectedSubjectId || "all");
  const [selectedUnitId, setSelectedUnitId] = useState(hubSavedUi.selectedUnitId || "all");
  const [selectedLessonId, setSelectedLessonId] = useState(hubSavedUi.selectedLessonId || "all");
  const [selectedType, setSelectedType] = useState(hubSavedUi.selectedType || "all");
  const [selectedDifficulty, setSelectedDifficulty] = useState(hubSavedUi.selectedDifficulty || "all");
  const [selectedImportance, setSelectedImportance] = useState(hubSavedUi.selectedImportance || "");
  const [selectedTag, setSelectedTag] = useState(hubSavedUi.selectedTag || "");
  const [selectedAuthor, setSelectedAuthor] = useState(hubSavedUi.selectedAuthor || "");
  const [selectedDateFilter, setSelectedDateFilter] = useState(hubSavedUi.selectedDateFilter || "");
  const [sortBy, setSortBy] = useState(hubSavedUi.sortBy || "newest");
  const [hideInserted, setHideInserted] = useState(hubSavedUi.hideInserted ?? true);
  const [showFilters, setShowFilters] = useState(hubSavedUi.showFilters ?? false);

  useEffect(() => {
    storage.saveUiState("question_hub_modal_ui", {
      activeTab,
      searchTerm,
      selectedStatus,
      minImportance,
      selectedSubjectId,
      selectedUnitId,
      selectedLessonId,
      selectedType,
      selectedDifficulty,
      selectedImportance,
      selectedTag,
      selectedAuthor,
      selectedDateFilter,
      sortBy,
      hideInserted,
      showFilters,
    });
  }, [
    activeTab,
    searchTerm,
    selectedStatus,
    minImportance,
    selectedSubjectId,
    selectedUnitId,
    selectedLessonId,
    selectedType,
    selectedDifficulty,
    selectedImportance,
    selectedTag,
    selectedAuthor,
    selectedDateFilter,
    sortBy,
    hideInserted,
    showFilters,
  ]);

  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [expandedAnswers, setExpandedAnswers] = useState<Record<string, boolean>>({});

  const toggleAnswer = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setExpandedAnswers((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedStatus("active");
    setMinImportance(0);
    setSelectedSubjectId("all");
    setSelectedUnitId("all");
    setSelectedLessonId("all");
    setSelectedType("all");
    setSelectedDifficulty("all");
    setSelectedImportance("");
    setSelectedTag("");
    setSelectedAuthor("");
    setSelectedDateFilter("");
    setSortBy("newest");
  };

  const filteredUnits = useMemo(() => {
    if (!selectedSubjectId || selectedSubjectId === "all") return units;
    return units.filter((u) => u.subjectId === selectedSubjectId);
  }, [units, selectedSubjectId]);

  const filteredLessons = useMemo(() => {
    if (!selectedUnitId || selectedUnitId === "all") return lessons;
    return lessons.filter((l) => l.unitId === selectedUnitId);
  }, [lessons, selectedUnitId]);

  const isTypeMatch = (q: Question, typeKey: string): boolean => {
    if (typeKey === "all") return true;
    if (q.type === typeKey) return true;
    if ((q as any).customTypeName && (q as any).customTypeName === typeKey) return true;
    if (typeKey === "true_false" && (q.type === ("true_false" as any) || q.type === ("true-false" as any) || q.type === ("tf" as any))) return true;
    if (typeKey === "mcq" && (q.type === ("mcq" as any) || q.type === ("multiple_choice" as any))) return true;
    if (typeKey === "problem" && (q.type === ("problem" as any) || q.type === ("numerical" as any) || q.type === ("calculation" as any) || q.type === ("math" as any) || q.type === ("equation" as any))) return true;
    if (typeKey === "essay" && (q.type === ("essay" as any) || q.type === ("written" as any) || q.type === ("explain" as any) || q.type === ("reason" as any) || q.type === ("definition" as any))) return true;
    return false;
  };

  const filteredQuestions = useMemo(() => {
    return allQuestions.filter((q) => {
      if (selectedStatus === "active" && q.status === "archived") return false;
      if (selectedStatus === "archived" && q.status !== "archived") return false;
      
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const textMatch = q.text?.toLowerCase().includes(term);
        const answerMatch = q.answer?.toLowerCase().includes(term);
        const tagMatch = q.tags?.some((t) => t.toLowerCase().includes(term));
        if (!textMatch && !answerMatch && !tagMatch) return false;
      }
      if (selectedSubjectId !== "all" && q.subjectId !== selectedSubjectId) return false;
      if (selectedUnitId !== "all") {
        const matchUnit = q.unitId === selectedUnitId ||
          (lessons && lessons.some(l => l.unitId === selectedUnitId && (q.lessonId === l.id || (Array.isArray(q.lessonIds) && q.lessonIds.includes(l.id)) || (Array.isArray(l.questionIds) && l.questionIds.includes(q.id)))));
        if (!matchUnit) return false;
      }
      if (selectedLessonId !== "all") {
        const matchLesson = q.lessonId === selectedLessonId ||
          (Array.isArray(q.lessonIds) && q.lessonIds.includes(selectedLessonId)) ||
          (lessons && lessons.find(l => l.id === selectedLessonId)?.questionIds?.includes(q.id));
        if (!matchLesson) return false;
      }
      if (selectedType !== "all" && !isTypeMatch(q, selectedType)) return false;
      if (selectedDifficulty !== "all" && q.difficulty !== selectedDifficulty) return false;
      if (minImportance > 0 && q.importance < minImportance) return false;
      
      if (hideInserted && alreadyInsertedQuestionIds.includes(q.id)) return false;

      // old filters
      if (selectedTag && !q.tags?.includes(selectedTag)) return false;
      if (selectedAuthor && q.author !== selectedAuthor) return false;

      if (selectedDateFilter && q.createdAt) {
        const qDate = new Date(q.createdAt).getTime();
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        if (selectedDateFilter === "today" && now - qDate > oneDay) return false;
        if (selectedDateFilter === "week" && now - qDate > oneDay * 7) return false;
        if (selectedDateFilter === "month" && now - qDate > oneDay * 30) return false;
      }

      return true;
    }).sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return sortBy === "newest" ? dateB - dateA : dateA - dateB;
    });
  }, [
    allQuestions,
    searchTerm,
    selectedStatus,
    selectedSubjectId,
    selectedUnitId,
    selectedLessonId,
    selectedType,
    selectedDifficulty,
    minImportance,
    selectedTag,
    selectedAuthor,
    selectedDateFilter,
    sortBy,
    currentLessonId,
    lessons,
    hideInserted,
    alreadyInsertedQuestionIds,
  ]);

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedQuestionIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedQuestionIds(next);
  };

  const handleSelectAll = () => {
    const validQuestions = filteredQuestions.filter(q => !alreadyInsertedQuestionIds.includes(q.id));
    if (selectedQuestionIds.size === validQuestions.length && validQuestions.length > 0) {
      setSelectedQuestionIds(new Set());
    } else {
      setSelectedQuestionIds(new Set(validQuestions.map((q) => q.id)));
    }
  };

  const handleConfirmInsertFromBank = () => {
    const selected = allQuestions.filter((q) => selectedQuestionIds.has(q.id));
    if (onInsertQuestions) {
      onInsertQuestions(selected);
    }
    setSelectedQuestionIds(new Set());
    onClose();
  };

  // -------------------------------------------------------------
  // TAB 2: QUESTION OBJECT BUILDER & SMART DECONSTRUCTION STATE
  // -------------------------------------------------------------
  const [builderObjects, setBuilderObjects] = useState<QuestionObject[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [copiedJson, setCopiedJson] = useState(false);

  useEffect(() => {
    if (parsedQuestionsForBuilder.length > 0) {
      const built = parsedQuestionsForBuilder.map((p, idx) =>
        buildQuestionObject(p, {
          subjectId: selectedSubjectId || "subject_101",
          unitId: selectedUnitId || "unit_01",
          lessonId: currentLessonId || "lesson_01",
        })
      );
      setBuilderObjects(built);
      setSelectedIndex(0);
    } else if (builderObjects.length === 0) {
      // Create sample question object
      const defaultObj = buildQuestionObject(
        {
          type: "mcq",
          questionText: "أدخل نص السؤال الجديد هنا...",
          choices: [
            { id: "c1", letter: "أ", text: "الخيار الأول", isCorrect: true },
            { id: "c2", letter: "ب", text: "الخيار الثاني", isCorrect: false },
          ],
        },
        {
          subjectId: selectedSubjectId || "subject_101",
          unitId: selectedUnitId || "unit_01",
          lessonId: currentLessonId || "lesson_01",
        }
      );
      setBuilderObjects([defaultObj]);
      setSelectedIndex(0);
    }
  }, [parsedQuestionsForBuilder, isOpen]);

  const currentObj = builderObjects[selectedIndex] || builderObjects[0];

  const updateCurrentObject = (updates: Partial<QuestionObject>) => {
    if (!currentObj) return;
    const updated = { ...currentObj, ...updates, updatedAt: new Date().toISOString() };
    const next = [...builderObjects];
    next[selectedIndex] = updated;
    setBuilderObjects(next);
  };

  const handleAddNewBuilderQuestion = () => {
    const newObj = buildQuestionObject(
      {
        type: "mcq",
        questionText: "سؤال جديد " + (builderObjects.length + 1),
        choices: [
          { id: "c1", letter: "أ", text: "إجابة 1", isCorrect: true },
          { id: "c2", letter: "ب", text: "إجابة 2", isCorrect: false },
        ],
      },
      {
        subjectId: selectedSubjectId || "subject_101",
        unitId: selectedUnitId || "unit_01",
        lessonId: currentLessonId || "lesson_01",
      }
    );
    setBuilderObjects((prev) => [...prev, newObj]);
    setSelectedIndex(builderObjects.length);
  };

  const handleSaveBuilderObjects = () => {
    if (onConfirmSaveObjects) {
      onConfirmSaveObjects(builderObjects);
    }
    // Also perform silent sync to bank
    executeQuestionBankSync(builderObjects, "keep");
    onClose();
  };

  // -------------------------------------------------------------
  // TAB 3: QUESTION BANK SYNC & AUDIT REPORT STATE
  // -------------------------------------------------------------
  const [syncReport, setSyncReport] = useState<SyncDiffReport | null>(null);
  const [removalStrategy, setRemovalStrategy] = useState<SyncRemovalStrategy>("keep");

  useEffect(() => {
    if (activeTab === "sync" || isOpen) {
      // Calculate diff report between builderObjects/incoming and current bank
      const objectsToSync = incomingQuestionsForSync.length > 0 ? incomingQuestionsForSync : builderObjects;
      const { diffReport } = compareQuestionObjectsWithBank(objectsToSync);
      setSyncReport(diffReport);
    }
  }, [activeTab, incomingQuestionsForSync, builderObjects, isOpen]);

  const handleExecuteSyncNow = () => {
    const objectsToSync = incomingQuestionsForSync.length > 0 ? incomingQuestionsForSync : builderObjects;
    const result = executeQuestionBankSync(objectsToSync, removalStrategy);
    setSyncReport(result.diffReport);
    if (onSyncCompleted) {
      onSyncCompleted(result.finalBank);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden animate-in fade-in duration-200" dir="rtl">
      {/* Top Header Banner matching QuestionBankView style */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-2xs shrink-0">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Right: Title & Back Button */}
          <div className="flex items-center justify-between lg:justify-start gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#0f6cbd] flex items-center justify-center border border-blue-100 dark:border-blue-900/40">
                  <Database className="w-4.5 h-4.5" />
                </div>
                <h1 className="text-base sm:text-lg lg:text-xl font-black text-slate-900 dark:text-white">
                  مركز الأسئلة والمزامنة الموحد
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-extrabold rounded-full bg-blue-50 text-[#0f6cbd] border border-blue-100 dark:bg-blue-900/20 dark:border-blue-800/30">
                  Unified Question Hub
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-bold">
                الالتقاط من البنك المركزي، الإنشاء والتفكيك الذكي، وإدارة مزامنة الأسئلة مع الدرس
              </p>
            </div>

            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs sm:text-sm transition flex items-center gap-2 cursor-pointer shadow-3xs shrink-0 lg:hidden"
            >
              <span>العودة للدرس</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Left: 6 Metric Cards Row matching QuestionBankView Reference */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 flex-1 lg:max-w-[820px]">
            {/* Card 1: بحاجة مراجعة */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 flex items-center justify-between">
              <div>
                <span className="text-lg sm:text-xl font-black text-rose-600 dark:text-rose-400 block leading-none">
                  {requiresReviewCount}
                </span>
                <span className="text-[11px] sm:text-xs font-bold text-rose-700 dark:text-rose-300 mt-1 block">
                  بحاجة مراجعة
                </span>
              </div>
              <div className="p-1.5 sm:p-2 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>

            {/* Card 2: مسودات */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-900/40 flex items-center justify-between">
              <div>
                <span className="text-lg sm:text-xl font-black text-purple-600 dark:text-purple-400 block leading-none">
                  {draftsCount}
                </span>
                <span className="text-[11px] sm:text-xs font-bold text-purple-700 dark:text-purple-300 mt-1 block">
                  مسودات
                </span>
              </div>
              <div className="p-1.5 sm:p-2 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-300">
                <Edit3 className="w-4 h-4" />
              </div>
            </div>

            {/* Card 3: غير مدرج في درس */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 flex items-center justify-between">
              <div>
                <span className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400 block leading-none">
                  {notInLessonCount}
                </span>
                <span className="text-[11px] sm:text-xs font-bold text-amber-700 dark:text-amber-300 mt-1 block">
                  غير مدرج في درس
                </span>
              </div>
              <div className="p-1.5 sm:p-2 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>

            {/* Card 4: محلول / بإجابة */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40 flex items-center justify-between">
              <div>
                <span className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 block leading-none">
                  {solvedCount}
                </span>
                <span className="text-[11px] sm:text-xs font-bold text-emerald-700 dark:text-emerald-300 mt-1 block">
                  محلول / بإجابة
                </span>
              </div>
              <div className="p-1.5 sm:p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>

            {/* Card 5: الأسئلة النشطة */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 flex items-center justify-between">
              <div>
                <span className="text-lg sm:text-xl font-black text-[#0f6cbd] dark:text-blue-400 block leading-none">
                  {activeQuestionsCount}
                </span>
                <span className="text-[11px] sm:text-xs font-bold text-blue-700 dark:text-blue-300 mt-1 block">
                  الأسئلة النشطة
                </span>
              </div>
              <div className="p-1.5 sm:p-2 rounded-full bg-blue-100 dark:bg-blue-900/60 text-[#0f6cbd] dark:text-blue-300">
                <CheckSquare className="w-4 h-4" />
              </div>
            </div>

            {/* Card 6: إجمالي البنك */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <span className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 block leading-none">
                  {totalQuestionsCount}
                </span>
                <span className="text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-400 mt-1 block">
                  إجمالي البنك
                </span>
              </div>
              <div className="p-1.5 sm:p-2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                <Database className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Desktop Back Button */}
          <button
            onClick={onClose}
            className="hidden lg:flex px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs sm:text-sm transition items-center gap-2 cursor-pointer shadow-3xs shrink-0"
          >
            <span>العودة للدرس</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation Tabs Switcher matching QuestionBankView */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-xs sm:text-sm lg:text-base font-extrabold px-4 sm:px-6 bg-white dark:bg-slate-900 shrink-0 pt-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab("bank")}
          className={`pb-3 relative transition-colors cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === "bank"
              ? "text-[#0f6cbd] font-black"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <CheckSquare className="w-4.5 h-4.5" />
          <span>بنك الأسئلة المركزي</span>
          {filteredQuestions.length > 0 && (
            <span className={`px-2 py-0.5 text-xs font-black rounded-full ${activeTab === 'bank' ? 'bg-blue-100 text-[#0f6cbd] dark:bg-blue-900/50 dark:text-blue-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
              {filteredQuestions.length}
            </span>
          )}
          {activeTab === "bank" && (
            <span className="absolute bottom-0 right-0 left-0 h-0.5 bg-[#0f6cbd] rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("builder")}
          className={`pb-3 relative transition-colors cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === "builder"
              ? "text-[#0f6cbd] font-black"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Sparkles className="w-4.5 h-4.5" />
          <span>الإنشاء والتفكيك الذكي</span>
          {activeTab === "builder" && (
            <span className="absolute bottom-0 right-0 left-0 h-0.5 bg-[#0f6cbd] rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("sync")}
          className={`pb-3 relative transition-colors cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === "sync"
              ? "text-[#0f6cbd] font-black"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <RefreshCw className="w-4.5 h-4.5" />
          <span>حالة المزامنة والتدقيق</span>
          {syncReport?.summary.createdCount ? (
            <span className="px-2 py-0.5 text-xs font-black rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              +{syncReport.summary.createdCount}
            </span>
          ) : null}
          {activeTab === "sync" && (
            <span className="absolute bottom-0 right-0 left-0 h-0.5 bg-[#0f6cbd] rounded-full" />
          )}
        </button>
      </div>

      {/* Modal Body Content */}
      <div className="flex-1 overflow-y-auto w-full mx-auto p-4 sm:p-6 lg:p-7">
        <div className="max-w-[1600px] mx-auto w-full h-full flex flex-col">
          {/* TAB 1: CENTRAL QUESTION BANK */}
          {activeTab === "bank" && (
            <div className="space-y-4">
              {/* Filter Control Box matching QuestionBankView Row 1 & Row 2 */}
              <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3 text-xs sm:text-sm">
                {/* Row 1: Quick Filter Bar - Selects, Filter Toggle & Search */}
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2.5 flex-1">
                    {/* Advanced Filter Toggle Button */}
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className={`px-3.5 py-2.5 rounded-xl font-extrabold transition flex items-center gap-2 cursor-pointer shrink-0 text-xs sm:text-sm ${
                        showFilters
                          ? "bg-[#0f6cbd] text-white shadow-2xs"
                          : "bg-blue-50/50 hover:bg-blue-100 text-[#0f6cbd] dark:bg-blue-950/30 dark:text-blue-300 border border-blue-100 dark:border-blue-900/50"
                      }`}
                    >
                      <Filter className="w-4 h-4" />
                      <span>فلترة متقدمة</span>
                    </button>

                    {/* Subject Select */}
                    <div className="relative min-w-[130px] flex-1 sm:flex-initial">
                      <span className="absolute right-3 top-0 -translate-y-1/2 bg-white dark:bg-slate-800 px-1 text-[10px] text-slate-500 font-extrabold pointer-events-none">
                        المادة
                      </span>
                      <select
                        value={selectedSubjectId}
                        onChange={(e) => {
                          setSelectedSubjectId(e.target.value);
                          setSelectedUnitId("all");
                          setSelectedLessonId("all");
                        }}
                        className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-extrabold text-xs sm:text-sm focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer"
                      >
                        <option value="all">جميع المواد</option>
                        {subjects.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Unit Select */}
                    <div className="relative min-w-[130px] flex-1 sm:flex-initial">
                      <span className="absolute right-3 top-0 -translate-y-1/2 bg-white dark:bg-slate-800 px-1 text-[10px] text-slate-500 font-extrabold pointer-events-none">
                        الوحدة
                      </span>
                      <select
                        value={selectedUnitId}
                        onChange={(e) => {
                          setSelectedUnitId(e.target.value);
                          setSelectedLessonId("all");
                        }}
                        className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-extrabold text-xs sm:text-sm focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer"
                      >
                        <option value="all">جميع الوحدات</option>
                        {filteredUnits.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.title}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Lesson Select */}
                    <div className="relative min-w-[130px] flex-1 sm:flex-initial">
                      <span className="absolute right-3 top-0 -translate-y-1/2 bg-white dark:bg-slate-800 px-1 text-[10px] text-slate-500 font-extrabold pointer-events-none">
                        الدرس
                      </span>
                      <select
                        value={selectedLessonId}
                        onChange={(e) => setSelectedLessonId(e.target.value)}
                        className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-extrabold text-xs sm:text-sm focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer"
                      >
                        <option value="all">جميع الدروس</option>
                        {filteredLessons.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.title}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Question Type Select */}
                    <div className="relative min-w-[130px] flex-1 sm:flex-initial">
                      <span className="absolute right-3 top-0 -translate-y-1/2 bg-white dark:bg-slate-800 px-1 text-[10px] text-slate-500 font-extrabold pointer-events-none">
                        نوع السؤال
                      </span>
                      <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-extrabold text-xs sm:text-sm focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer"
                      >
                        <option value="all">جميع الأنواع</option>
                        {Object.entries(QUESTION_TYPES_LABEL).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Search Box */}
                  <div className="relative w-full lg:w-72 shrink-0">
                    <input
                      type="text"
                      placeholder="بحث في الأسئلة..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold text-xs sm:text-sm placeholder:text-slate-400 focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Row 2: Advanced Filter Drawer */}
                {showFilters && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs sm:text-sm animate-in fade-in duration-150">
                    {/* Status Select */}
                    <div className="relative">
                      <span className="absolute right-3 top-0 -translate-y-1/2 bg-white dark:bg-slate-800 px-1 text-[10px] text-slate-500 font-extrabold pointer-events-none">
                        الحالة
                      </span>
                      <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value as any)}
                        className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold appearance-none cursor-pointer"
                      >
                        <option value="all">الكل ({allQuestions.length})</option>
                        <option value="active">الأسئلة النشطة ({activeQuestionsCount})</option>
                        <option value="archived">المؤرشفة ({archivedQuestionsCount})</option>
                      </select>
                      <ChevronDown className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Difficulty */}
                    <div className="relative">
                      <span className="absolute right-3 top-0 -translate-y-1/2 bg-white dark:bg-slate-800 px-1 text-[10px] text-slate-500 font-extrabold pointer-events-none">
                        الصعوبة
                      </span>
                      <select
                        value={selectedDifficulty}
                        onChange={(e) => setSelectedDifficulty(e.target.value)}
                        className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold appearance-none cursor-pointer"
                      >
                        <option value="all">جميع المستويات</option>
                        <option value="easy">سهل</option>
                        <option value="medium">متوسط</option>
                        <option value="hard">صعب</option>
                      </select>
                      <ChevronDown className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Importance */}
                    <div className="relative">
                      <span className="absolute right-3 top-0 -translate-y-1/2 bg-white dark:bg-slate-800 px-1 text-[10px] text-slate-500 font-extrabold pointer-events-none">
                        الأهمية (فأكثر)
                      </span>
                      <select
                        value={minImportance}
                        onChange={(e) => setMinImportance(Number(e.target.value))}
                        className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold appearance-none cursor-pointer"
                      >
                        <option value={0}>الكل</option>
                        <option value={5}>5 نجوم فقط (مهم جداً)</option>
                        <option value={4}>4 نجوم فأكثر</option>
                        <option value={3}>3 نجوم فأكثر</option>
                        <option value={2}>نجمتين فأكثر</option>
                      </select>
                      <ChevronDown className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Sort Order */}
                    <div className="relative">
                      <span className="absolute right-3 top-0 -translate-y-1/2 bg-white dark:bg-slate-800 px-1 text-[10px] text-slate-500 font-extrabold pointer-events-none">
                        الترتيب
                      </span>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold appearance-none cursor-pointer"
                      >
                        <option value="newest">الأحدث أولاً</option>
                        <option value="oldest">الأقدم أولاً</option>
                      </select>
                      <ChevronDown className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Hide Already Inserted */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                      <input
                        type="checkbox"
                        id="hideInsertedCheckbox"
                        checked={hideInserted}
                        onChange={(e) => setHideInserted(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                      />
                      <label htmlFor="hideInsertedCheckbox" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                        إخفاء المضاف للدرس
                      </label>
                    </div>
                  </div>
                )}

                {/* Sub-row: Reset Filters indicator */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60 text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-bold">
                    النتائج المعروضة: <span className="text-blue-600 dark:text-blue-400 font-black">{filteredQuestions.length}</span> سؤال من أصل {allQuestions.length}
                  </span>

                  {(searchTerm || selectedSubjectId !== "all" || selectedUnitId !== "all" || selectedLessonId !== "all" || selectedType !== "all" || selectedDifficulty !== "all" || minImportance > 0 || selectedStatus !== "active") && (
                    <button
                      onClick={handleResetFilters}
                      className="text-xs font-extrabold text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>إعادة ضبط الفلاتر</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Selection Summary and Batch Actions Bar matching QuestionBankView */}
              <div className="flex flex-col sm:flex-row items-center justify-between bg-white dark:bg-slate-900 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs text-xs sm:text-sm gap-3 sm:gap-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={handleSelectAll}
                    className="flex items-center gap-2 font-extrabold text-[#0f6cbd] dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    {selectedQuestionIds.size === filteredQuestions.filter(q => !alreadyInsertedQuestionIds.includes(q.id)).length && filteredQuestions.filter(q => !alreadyInsertedQuestionIds.includes(q.id)).length > 0 ? (
                      <CheckSquare className="w-4.5 h-4.5" />
                    ) : (
                      <Square className="w-4.5 h-4.5" />
                    )}
                    <span>
                      {selectedQuestionIds.size === filteredQuestions.length && filteredQuestions.length > 0
                        ? "إلغاء تحديد الكل"
                        : "تحديد الكل"}
                    </span>
                  </button>

                  <span className="text-slate-300 dark:text-slate-700">|</span>

                  <span className="text-slate-700 dark:text-slate-300 font-extrabold">
                    المحدد: <span className="text-[#0f6cbd] dark:text-blue-400 font-black">{selectedQuestionIds.size}</span> من أصل {filteredQuestions.length}
                  </span>
                  
                  <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>
                  
                  <button
                    type="button"
                    onClick={() => {
                      const newExpanded = { ...expandedAnswers };
                      filteredQuestions.forEach((q) => {
                        newExpanded[q.id] = true;
                      });
                      setExpandedAnswers(newExpanded);
                    }}
                    className="text-xs font-extrabold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronDown className="w-4 h-4" />
                    <span>توسيع كافة الإجابات</span>
                  </button>

                  <span className="text-slate-300 dark:text-slate-700">|</span>

                  <button
                    type="button"
                    onClick={() => setExpandedAnswers({})}
                    className="text-xs font-extrabold text-slate-600 dark:text-slate-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronUp className="w-4 h-4" />
                    <span>طي الإجابات</span>
                  </button>
                </div>

                {/* Primary Insert Button */}
                <button
                  onClick={handleConfirmInsertFromBank}
                  disabled={selectedQuestionIds.size === 0}
                  className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl font-extrabold shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>إدراج الأسئلة المختارة ({selectedQuestionIds.size})</span>
                </button>
              </div>

              {/* Question List matching QuestionBankView Card Architecture */}
              <div className="space-y-3.5 max-h-[480px] overflow-y-auto pr-1">
                {filteredQuestions.length === 0 ? (
                  <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-xs sm:text-sm font-bold text-slate-500">
                    {selectedStatus === "archived"
                      ? "لا توجد أسئلة مؤرشفة حالياً."
                      : "لا توجد أسئلة تطابق معايير الفلترة الحالية."}
                  </div>
                ) : (
                  filteredQuestions.map((q, idx) => {
                    const isSelected = selectedQuestionIds.has(q.id);
                    const sub = subjects.find((s) => s.id === q.subjectId);
                    const isArchived = q.status === "archived";
                    const isSolved = hasAnswer(q);

                    return (
                      <div
                        key={q.id}
                        onClick={() => handleToggleSelect(q.id)}
                        className={`p-4 sm:p-5 rounded-2xl border transition-all duration-300 space-y-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-700 shadow-2xs cursor-pointer ${
                          isSelected
                            ? "ring-2 ring-blue-500 border-blue-500 bg-blue-50/20 dark:bg-blue-950/20"
                            : isArchived
                              ? "bg-amber-50/30 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900/40"
                              : ""
                        }`}
                      >
                        {/* Card Top Badges & Actions matching QuestionBankView */}
                        <div className="flex items-start justify-between gap-3">
                          {/* Right: Badges */}
                          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-extrabold">
                            <span className="px-3 py-1 rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-100 dark:border-blue-900/40">
                              {QUESTION_TYPES_LABEL[q.type] || q.type}
                            </span>
                            <span className="px-3 py-1 rounded-xl bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-100 dark:border-purple-900/40">
                              {sub?.name || q.subjectName || "المادة"}
                            </span>
                            <span className="px-3 py-1 rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/40">
                              {units.find((u) => u.id === q.unitId)?.title || q.unitTitle || "الوحدة"}
                            </span>
                            <span className="px-3 py-1 rounded-xl bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border border-sky-100 dark:border-sky-900/40">
                              {lessons.find((l) => l.id === q.lessonId)?.title || q.lessonTitle || "الدرس"}
                            </span>
                            <span className="px-3 py-1 rounded-xl bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-100 dark:border-amber-900/40 flex items-center gap-1">
                              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                              <span>الأهمية: {q.importance || 1}/5</span>
                            </span>
                            <span
                              className={`px-3 py-1 rounded-xl border font-extrabold ${
                                q.difficulty === "easy"
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/40"
                                  : q.difficulty === "medium"
                                    ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-100 dark:border-amber-900/40"
                                    : "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-100 dark:border-rose-900/40"
                              }`}
                            >
                              {q.difficulty === "easy" ? "سهل" : q.difficulty === "medium" ? "متوسط" : "صعب"}
                            </span>
                            {isSolved && (
                              <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/40 flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <span>محلول</span>
                              </span>
                            )}
                            {isArchived && (
                              <span className="px-3 py-1 rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40 flex items-center gap-1">
                                <Archive className="w-3.5 h-3.5" />
                                <span>مؤرشف</span>
                              </span>
                            )}
                            {q.isPastCycle && (
                              <span className="px-3 py-1 rounded-xl bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                <span>ورد في دورات سابقة ({q.pastCyclesInfo})</span>
                              </span>
                            )}
                          </div>

                          {/* Left: Checkbox Selector matching QuestionBankView */}
                          <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(q.id)}
                              className="w-5 h-5 text-blue-600 rounded-md border-slate-300 focus:ring-blue-500 cursor-pointer"
                            />
                          </div>
                        </div>

                        {/* ID Subline */}
                        <div className="text-xs font-mono font-bold text-slate-400">
                          ID: {q.id}
                        </div>

                        {/* Question Content Box matching QuestionBankView */}
                        <div className="p-3.5 sm:p-4 bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2.5">
                          <div className="text-base sm:text-lg font-black leading-relaxed text-slate-900 dark:text-white pointer-events-none">
                            <QuestionRenderer
                              question={q}
                              questionNumber={idx + 1}
                              numberFormat="dash"
                              mode="compact"
                              showMarks={false}
                            />
                          </div>

                          {q.type === "mcq" && q.distractors && (
                            <div className="w-full overflow-x-auto pt-1 pointer-events-none">
                              <table className="w-full table-fixed border-collapse border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden text-xs" dir="rtl">
                                <tbody>
                                  <tr className="align-middle">
                                    {q.distractors.map((d: any, dIdx: number) => {
                                      const isStr = typeof d === 'string';
                                      const id = isStr ? 'd-' + dIdx : d.id || ('d-'+dIdx);
                                      const text = isStr ? d : (d.text || "");
                                      const isCorrect = isOptionCorrect(q, d, dIdx);
                                      const showCorrect = expandedAnswers[q.id] && isCorrect;
                                      const arabicLetters = ["أ", "ب", "ج", "د", "هـ", "و"];
                                      const colWidth = `${100 / Math.max(1, q.distractors.length)}%`;

                                      return (
                                        <td
                                          key={id}
                                          className={`p-2 border border-slate-200 dark:border-slate-700 text-right align-middle font-medium ${
                                            showCorrect
                                              ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200"
                                              : "bg-slate-50/60 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300"
                                          }`}
                                          style={{ width: colWidth, verticalAlign: "middle" }}
                                        >
                                          <div className="flex items-center justify-start gap-1.5 w-full min-w-0" dir="rtl">
                                            <span className="font-bold shrink-0 text-slate-800 dark:text-slate-200">
                                              ({arabicLetters[dIdx] || dIdx + 1})
                                            </span>
                                            <div className="flex-1 min-w-0 break-words leading-tight text-right">
                                              <RichTextEditor value={text || ""} readOnly />
                                            </div>
                                            {showCorrect && (
                                              <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-1 py-0.5 rounded shrink-0">
                                                ✓
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                      );
                                    })}
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* Expand Answer Button matching QuestionBankView */}
                          {isSolved && (
                            <div className="pt-2 flex justify-start" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={(e) => toggleAnswer(e, q.id)}
                                className="px-3.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-extrabold text-xs sm:text-sm flex items-center gap-2 hover:bg-blue-100 transition cursor-pointer"
                              >
                                {expandedAnswers[q.id] ? (
                                  <>
                                    <ChevronUp className="w-4 h-4" />
                                    <span>طي الإجابة</span>
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="w-4 h-4" />
                                    <span>توسيع الإجابة</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}

                          {expandedAnswers[q.id] && (
                            <div className="mt-2.5 animate-in fade-in duration-200" onClick={(e) => e.stopPropagation()}>
                              <QuestionAnswerKeyBox question={q} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: QUESTION OBJECT BUILDER */}
          {activeTab === "builder" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    كائنات الأسئلة المجهزة: ({builderObjects.length})
                  </span>
                  <div className="flex items-center gap-1">
                    {builderObjects.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedIndex(idx)}
                        className={`w-7 h-7 rounded-xl text-xs font-extrabold transition-all ${
                          selectedIndex === idx
                            ? "bg-blue-600 text-white shadow-sm"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                        }`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddNewBuilderQuestion}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة سؤال جديد</span>
                  </button>

                  <button
                    onClick={handleSaveBuilderObjects}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>اعتماد وحفظ الكائنات</span>
                  </button>
                </div>
              </div>

              {currentObj && (
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                        نوع السؤال
                      </label>
                      <select
                        value={currentObj.questionType}
                        onChange={(e) => updateCurrentObject({ questionType: e.target.value as any })}
                        className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                      >
                        {Object.entries(QUESTION_TYPE_ARABIC_NAMES).map(([type, label]) => (
                          <option key={type} value={type}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                        الدرجة المقررة
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={currentObj.marks}
                        onChange={(e) => updateCurrentObject({ marks: Number(e.target.value) || 1 })}
                        className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                        مستوى الصعوبة
                      </label>
                      <select
                        value={currentObj.difficulty}
                        onChange={(e) => updateCurrentObject({ difficulty: e.target.value as any })}
                        className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                      >
                        <option value="easy">سهل</option>
                        <option value="medium">متوسط</option>
                        <option value="hard">صعب</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      نص السؤال الكامل
                    </label>
                    <div className="min-h-[auto] border border-slate-200 dark:border-slate-700 rounded-xl">
                      <RichTextEditor
                        value={currentObj.questionText}
                        onChange={(val) => updateCurrentObject({ questionText: val })}
                        placeholder="نص السؤال..."
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        الإجابة النموذجية / النموذج
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowAISolver(true)}
                        className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-300 rounded-xl transition text-[10px] font-bold"
                      >
                        <Sparkles className="w-3 h-3" />
                        حل السؤال بالذكاء الاصطناعي
                      </button>
                    </div>
                    <div className="min-h-[auto] border border-slate-200 dark:border-slate-700 rounded-xl">
                      <RichTextEditor
                        value={currentObj.correctAnswer || ""}
                        onChange={(val) => updateCurrentObject({ correctAnswer: val })}
                        placeholder="الإجابة النموذجية..."
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: QUESTION BANK SYNC & AUDIT REPORT */}
          {activeTab === "sync" && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                      حالة المزامنة التلقائية الصامتة (Silent Background Sync)
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      تطابق الـ UUIDs والوسوم الفردية تلقائياً دون تعطيل تجربة إعداد الدرس
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={removalStrategy}
                    onChange={(e) => setRemovalStrategy(e.target.value as any)}
                    className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    <option value="keep">الاحتفاظ بأسئلة البنك السابقة (تراكمي - موصى به)</option>
                    <option value="archive">أرشفة الأسئلة المزالة من الدرس</option>
                    <option value="delete">حذف نهائي للأسئلة المستبعدة</option>
                  </select>

                  <button
                    onClick={handleExecuteSyncNow}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>مزامنة فورية الآن</span>
                  </button>
                </div>
              </div>

              {syncReport && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-1">
                    <span className="text-[10px] font-bold text-slate-400">جديد للإضافة</span>
                    <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                      +{syncReport.summary.createdCount}
                    </p>
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-1">
                    <span className="text-[10px] font-bold text-slate-400">أسئلة محدثة</span>
                    <p className="text-lg font-black text-blue-600 dark:text-blue-400">
                      {syncReport.summary.updatedCount}
                    </p>
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-1">
                    <span className="text-[10px] font-bold text-slate-400">بدون تغيير</span>
                    <p className="text-lg font-black text-slate-600 dark:text-slate-400">
                      {syncReport.summary.unchangedCount}
                    </p>
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-1">
                    <span className="text-[10px] font-bold text-slate-400">إجمالي البنك بعد المزامنة</span>
                    <p className="text-lg font-black text-amber-600 dark:text-amber-400">
                      {syncReport.summary.totalInBankAfter}
                    </p>
                  </div>
                </div>
              )}

              {/* Action logs audit list */}
              {syncReport && (syncReport.actionLogs || []).length > 0 && (
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <h4 className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
                    سجل عمليات المزامنة والتطابق الحديثة:
                  </h4>
                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
                    {(syncReport.actionLogs || []).map((log, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-[11px] flex items-center justify-between gap-2 border border-slate-100 dark:border-slate-800"
                      >
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[60%]">
                          {log.questionText}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md font-extrabold text-[10px] ${
                            log.action === "created"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                              : log.action === "updated"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300"
                              : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {log.reason}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showAISolver && currentObj && (
        <AIQuestionSolverModal
          question={{
            id: currentObj.questionId || "temp",
            subjectId: currentObj.subjectId || "temp",
            unitId: currentObj.unitId || "temp",
            lessonId: currentObj.lessonId || currentLessonId || "temp",
            type: currentObj.questionType || "essay",
            text: currentObj.questionText || "",
            answer: currentObj.correctAnswer || "",
            difficulty: currentObj.difficulty || "medium",
            importance: 3,
            distractors: currentObj.choices || []
          } as any}
          onClose={() => setShowAISolver(false)}
          onInsert={(ans) => updateCurrentObject({ correctAnswer: ans })}
        />
      )}
    </div>,
    document.body
  );
};
