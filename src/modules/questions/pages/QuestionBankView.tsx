import React, { useState, useEffect, useMemo } from "react";
import { systemLog } from "../../../services/diagnosticLogger";
import {
  Database,
  Plus,
  Search,
  Filter,
  Sparkles,
  Trash2,
  Edit,
  Star,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Upload, Image as ImageIcon,
  Layers,
  HelpCircle,
  Clock,
  Zap,
  Archive,
  ArchiveRestore,
  FolderArchive,
  X,
  CheckSquare,
  Square,
  Printer,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Sliders,
  AlertCircle,
  Loader2,
  MoreHorizontal,
  Settings,
  Link,
  BookOpen,
  Edit3,
  ChevronLeft,
  ChevronRight,
  List,
  LayoutGrid,
  ArrowUpDown,
  KeyRound,
  Copy,
  RefreshCw,
} from "lucide-react";
import { AIExecutionCenterModal } from "../../ai/components/AIExecutionCenterModal";
import { PrintPreviewModal } from "../../../components/PrintPreviewModal";
import { PaginatedA4Preview } from "../../../components/PaginatedA4Preview";
import { storage } from "../../../services/storage";
import { MathText, formatPastedEquation } from "../../../components/MathText";
import { QuestionRenderer, QuestionAnswerKeyBox, createAnswerKeyItems } from "../../../components/QuestionRenderer";
import { resolveQuestionAnswer, isOptionCorrect, hasAnswer } from "../../../utils/answerResolver";
import { validateCurriculumContext } from "../../../utils/curriculumValidator";
import { GroupedQuestionGrid } from "../../../components/GroupedQuestionGrid";
import { analyzeAndGroupQuestions } from "../../../services/groupingEngine";
import {
  Question,
  Exam,
  QuestionType,
  Subject,
  Unit,
  Lesson,
} from "../../../types/index";
import {
  filterAllowedSubjects,
  filterAllowedItemsBySubject,
  canPerformAction,
  canAccessSubject,
} from "../../../services/rbacEngine";
import { AiDistractorModal } from "../../ai/components/AiDistractorModal";
import { aiService } from "../../ai/services/aiService";
import { EquationToolbar } from "../../../components/EquationToolbar";
import { RichTextEditor } from "../../editor/components/RichTextEditor";
import { AIQuestionSolverModal } from "../../editor/components/AIQuestionSolverModal";
import { QuestionTextBuilder } from "../components/QuestionTextBuilder";
import { QuestionEditorPage } from "./QuestionEditorPage";
import { FullPageOcrPipeline } from "../components/FullPageOcrPipeline";

interface QuestionBankViewProps {
  initialTab?: string | null;
  onClearInitialTab?: () => void;
  initialAction?: string | null;
  onClearInitialAction?: () => void;
  questions: Question[];
  subjects: Subject[];
  units: Unit[];
  lessons: Lesson[];
  exams?: any[];
  onSaveQuestion: (question: Question) => void;
  onDeleteQuestion: (id: string) => void;
  initialFilters?: {
    subjectId?: string;
    unitId?: string;
    lessonId?: string;
  } | null;
  onClearInitialFilters?: () => void;
  onOpenLessonEditor?: (lessonId: string) => void;
}

const QUESTION_TYPES_LABEL: Record<QuestionType, string> = {
  intro: "مقدّمة",
  main_idea: "فكرة رئيسية",
  note: "ملاحظة",
  definition: "تعريف",
  explain: "اشرح / وضّح",
  reason: "علّل / فسّر",
  true_false: "صح أو خطأ",
  mcq: "اختر الإجابة الصحيحة",
  problem: "مسألة حسابية / تطبيقية",
  fill_blanks: "أكمل الفراغات",
  diagram_label: "سمِّ الأجزاء على الشكل",
  table_query: "إدراج جدول والسؤال عنه",
  matching: "التوصيل (Matching)",
  ordering: "الترتيب التسلسلي",
  image_choice: "الاختيار من صورة/شكل",
  equation: "معادلة / موازنة",
  grammar: "قواعد اللغة والإعراب",
  listening: "استماع وفهم",
  essay: "مقالي / إنشائي",
  custom: "نوع مخصص (Custom)",
};

import { useInView } from "react-intersection-observer";
import { debugLog } from "../../../utils/debugLog";

const LazyQuestionWrapper: React.FC<{ children: React.ReactNode; heightHint?: number }> = ({ children, heightHint = 150 }) => {
  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: '600px 0px',
  });

  return (
    <div ref={ref} style={{ minHeight: inView ? 'auto' : heightHint }}>
      {inView ? children : <div className="w-full h-full bg-slate-100/50 dark:bg-slate-800/30 animate-pulse rounded-xl" />}
    </div>
  );
};

export const QuestionBankView: React.FC<QuestionBankViewProps> = ({
  questions,
  subjects,
  units,
  lessons,
  exams = [],
  onSaveQuestion,
  onDeleteQuestion,
  initialFilters,
  onClearInitialFilters,
  initialTab,
  onClearInitialTab,
  initialAction,
  onClearInitialAction,
  onOpenLessonEditor,
}) => {
  const currentUser = useMemo(() => storage.getCurrentUser(), []);
  const allowedSubjects = useMemo(() => filterAllowedSubjects(currentUser, subjects), [currentUser, subjects]);
  const allowedUnits = useMemo(() => filterAllowedItemsBySubject(currentUser, units), [currentUser, units]);
  const allowedLessons = useMemo(() => filterAllowedItemsBySubject(currentUser, lessons), [currentUser, lessons]);
  const allowedQuestions = useMemo(() => {
    const filtered = filterAllowedItemsBySubject(currentUser, questions);
    return filtered.filter(
      (q) => !q.subjectId || allowedSubjects.some((s) => s.id === q.subjectId)
    );
  }, [currentUser, questions, allowedSubjects]);

  const canCreateQuestion = useMemo(() => {
    if (!currentUser) return true;
    return canPerformAction(currentUser, "create", "questions");
  }, [currentUser]);

  const canEditQuestion = useMemo(() => {
    if (!currentUser) return true;
    return canPerformAction(currentUser, "edit", "questions");
  }, [currentUser]);

  const canDeleteQuestion = useMemo(() => {
    if (!currentUser) return true;
    return canPerformAction(currentUser, "delete", "questions");
  }, [currentUser]);

  const qbSavedUi = useMemo(() => storage.getUiState("question_bank_ui", {
    activeTab: "questions",
    showAnswerKeyInBank: false,
    selectedSubjectId: "all",
    selectedUnitId: "all",
    selectedLessonId: "all",
    selectedType: "all",
    selectedDifficulty: "all",
    selectedUsage: "all",
    selectedAnswerStatus: "all",
    minImportance: 0,
    selectedStatus: "active",
    searchTerm: "",
    showAdvancedFilters: false,
    currentPage: 1,
    pageSize: 10,
    sortBy: "newest",
    viewMode: "list",
    expandedAnswers: {},
  }), []);

  const [activeTab, setActiveTab] = useState<
    "questions" | "import" | "full_page_ocr"
  >((initialTab as any) || "questions");

  const [showAnswerKeyInBank, setShowAnswerKeyInBank] = useState(qbSavedUi.showAnswerKeyInBank ?? false);

  // Filters
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(qbSavedUi.selectedSubjectId || "all");
  const [selectedUnitId, setSelectedUnitId] = useState<string>(qbSavedUi.selectedUnitId || "all");
  const [selectedLessonId, setSelectedLessonId] = useState<string>(qbSavedUi.selectedLessonId || "all");
  const [selectedType, setSelectedType] = useState<string>(qbSavedUi.selectedType || "all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>(qbSavedUi.selectedDifficulty || "all");
  const [selectedUsage, setSelectedUsage] = useState<string>(qbSavedUi.selectedUsage || "all");
  const [selectedAnswerStatus, setSelectedAnswerStatus] = useState<string>(qbSavedUi.selectedAnswerStatus || "all");
  const [minImportance, setMinImportance] = useState<number>(qbSavedUi.minImportance ?? 0);
  const [selectedStatus, setSelectedStatus] = useState<
    "active" | "archived" | "requires_review" | "draft" | "all"
  >((qbSavedUi.selectedStatus as any) || "active");
  const [searchTerm, setSearchTerm] = useState<string>(qbSavedUi.searchTerm || "");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(qbSavedUi.showAdvancedFilters ?? false);
  const [currentPage, setCurrentPage] = useState<number>(qbSavedUi.currentPage || 1);
  const [pageSize, setPageSize] = useState<number>(qbSavedUi.pageSize || 10);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "importance">((qbSavedUi.sortBy as any) || "newest");
  const [viewMode, setViewMode] = useState<"list" | "grid">((qbSavedUi.viewMode as any) || "list");
  const [focusedQuestionId, setFocusedQuestionId] = useState<string | null>(null);

  // Dropdown states for Unified Import & More Tools
  const [showImportDropdown, setShowImportDropdown] = useState(false);
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);
  const importDropdownRef = React.useRef<HTMLDivElement>(null);
  const moreDropdownRef = React.useRef<HTMLDivElement>(null);

  const isImportTab = (tab: string) =>
    tab === "import" ||
    tab === "full_page_ocr";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (importDropdownRef.current && !importDropdownRef.current.contains(event.target as Node)) {
        setShowImportDropdown(false);
      }
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target as Node)) {
        setShowMoreDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Collapsible answers in Live Assembly Preview (collapsed by default)
  const [expandedAnswers, setExpandedAnswers] = useState<Record<string, boolean>>(qbSavedUi.expandedAnswers || {});
  const [expandedExtractionAnswers, setExpandedExtractionAnswers] = useState<Record<number, boolean>>({});

  useEffect(() => {
    storage.saveUiState("question_bank_ui", {
      activeTab,
      showAnswerKeyInBank,
      selectedSubjectId,
      selectedUnitId,
      selectedLessonId,
      selectedType,
      selectedDifficulty,
      selectedUsage,
      selectedAnswerStatus,
      minImportance,
      selectedStatus,
      searchTerm,
      showAdvancedFilters,
      currentPage,
      pageSize,
      sortBy,
      viewMode,
      expandedAnswers,
    });
  }, [
    activeTab,
    showAnswerKeyInBank,
    selectedSubjectId,
    selectedUnitId,
    selectedLessonId,
    selectedType,
    selectedDifficulty,
    selectedUsage,
    selectedAnswerStatus,
    minImportance,
    selectedStatus,
    searchTerm,
    showAdvancedFilters,
    currentPage,
    pageSize,
    sortBy,
    viewMode,
    expandedAnswers,
  ]);

  // Filter Selection Sanitization
  useEffect(() => {
    if (selectedSubjectId !== "all" && !subjects.some((s) => s.id === selectedSubjectId)) {
      setSelectedSubjectId("all");
      setSelectedUnitId("all");
      setSelectedLessonId("all");
    } else if (selectedUnitId !== "all" && !units.some((u) => u.id === selectedUnitId)) {
      setSelectedUnitId("all");
      setSelectedLessonId("all");
    } else if (selectedLessonId !== "all" && !lessons.some((l) => l.id === selectedLessonId)) {
      setSelectedLessonId("all");
    }
  }, [subjects, units, lessons, selectedSubjectId, selectedUnitId, selectedLessonId]);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab as any);
      const timer = setTimeout(() => {
        onClearInitialTab?.();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [initialTab]);

  useEffect(() => {
    if (initialFilters) {
      if (initialFilters.subjectId) {
        setSelectedSubjectId(initialFilters.subjectId);
      }
      if (initialFilters.unitId) {
        setSelectedUnitId(initialFilters.unitId);
      }
      if (initialFilters.lessonId) {
        setSelectedLessonId(initialFilters.lessonId);
      }
      // Reset other filters to all to avoid conflicting filters hiding the results
      setSelectedType("all");
      setSelectedDifficulty("all");
      setMinImportance(0);
      setSelectedStatus("active");
      setSearchTerm("");
      
      setActiveTab("questions");
      const timer = setTimeout(() => {
        onClearInitialFilters?.();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [initialFilters]);

  const toggleAnswer = (questionId: string) => {
    debugLog("QuestionBankView", "toggleAnswer", { questionId, currentState: expandedAnswers[questionId] });
    setExpandedAnswers((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  const handleExpandAllAnswers = () => {
    const all: Record<string, boolean> = {};
    filteredQuestions.forEach((q) => {
      if (q.answer) all[q.id] = true;
    });
    setExpandedAnswers(all);
  };

  const handleCollapseAllAnswers = () => {
    setExpandedAnswers({});
  };

  useEffect(() => {
    const checkFocus = () => {
      const focusId = localStorage.getItem("edutech_focus_question_id");
      if (focusId) {
        setFocusedQuestionId(focusId);
        // Automatically set filters to 'all' and clear search to ensure the question is visible
        setSelectedSubjectId("all");
        setSelectedUnitId("all");
        setSelectedLessonId("all");
        setSelectedType("all");
        setSelectedDifficulty("all");
        setMinImportance(0);
        setSelectedStatus("all"); // show archived or active
        setSearchTerm("");
        
        // Scroll the highlighted element into view if it exists
        setTimeout(() => {
          const element = document.getElementById(`qbank-card-${focusId}`);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 300);

        // Clear focus ID after a few seconds so it doesn't repeatedly trigger
        setTimeout(() => {
          localStorage.removeItem("edutech_focus_question_id");
          setFocusedQuestionId(null);
        }, 8000);
      }
    };

    window.addEventListener("focus-question-bank", checkFocus);
    // Also check on mount
    checkFocus();

    return () => {
      window.removeEventListener("focus-question-bank", checkFocus);
    };
  }, []);

  // Question Modal
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  useEffect(() => {
    let timer: any;
    if (initialAction === "create") {
      setEditingQuestion(null);
      setShowQuestionModal(true);
      timer = setTimeout(() => {
        onClearInitialAction?.();
      }, 0);
    } else if (initialAction === "import_ocr") {
      setActiveTab("import");
      timer = setTimeout(() => {
        onClearInitialAction?.();
      }, 0);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [initialAction]);
  const [deletingQuestion, setDeletingQuestion] = useState<Question | null>(
    null,
  );
  const [confirmArchiveDialog, setConfirmArchiveDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  // Form Fields
  const [formSubjectId, setFormSubjectId] = useState<string>(
    subjects[0]?.id || "",
  );
  const [formUnitId, setFormUnitId] = useState<string>("");
  const [formLessonId, setFormLessonId] = useState<string>("");
  const [formType, setFormType] = useState<QuestionType>("mcq");
  const [formText, setFormText] = useState("");
  const [formAnswer, setFormAnswer] = useState("");
  const [formDifficulty, setFormDifficulty] = useState<
    "easy" | "medium" | "hard"
  >("medium");
  const [formImportance, setFormImportance] = useState<1 | 2 | 3 | 4 | 5>(4);
  const [formStatus, setFormStatus] = useState<
    "active" | "archived" | "requires_review" | "uncategorized"
  >("active");
  const [formIsPastCycle, setFormIsPastCycle] = useState(false);
  const [formPastCyclesInfo, setFormPastCyclesInfo] = useState("");
  const [formFutureProb, setFormFutureProb] = useState(85);
  const [formDistractors, setFormDistractors] = useState<
    { id: string; text: string; isCorrect: boolean }[]
  >([
    { id: "d1", text: "", isCorrect: false },
    { id: "d2", text: "", isCorrect: false },
    { id: "d3", text: "", isCorrect: false },
  ]);

  // AI Distractor Modal Trigger
  const [showAiDistractorModal, setShowAiDistractorModal] = useState(false);

  // Bulk Raw Text Import State
  const [rawImportText, setRawImportText] = useState("");
  const [importingText, setImportingText] = useState(false);
  const [importSubjectId, setImportSubjectId] = useState<string>(
    subjects[0]?.id || "",
  );
  const [importUnitId, setImportUnitId] = useState<string>("");
  const [importLessonId, setImportLessonId] = useState<string>("");
  const [importPattern, setImportPattern] = useState<string>("auto");
  const [importBookSource, setImportBookSource] = useState<string>("");
  const [importPageNumber, setImportPageNumber] = useState<string>("");
  const [importQuestionTitle, setImportQuestionTitle] = useState<string>("");
  const [importExerciseNumber, setImportExerciseNumber] = useState<string>("");
  const [showExecutionCenterForImport, setShowExecutionCenterForImport] = useState(false);


  // Extracted AI Questions Preview State
  const [extractedQuestionsForPreview, setExtractedQuestionsForPreview] = useState<Question[] | null>(null);
  const [selectedImportQuestionIds, setSelectedImportQuestionIds] = useState<Set<string>>(new Set());
  const [showAISolver, setShowAISolver] = useState(false);
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null);
  const [editingCandidateData, setEditingCandidateData] = useState<Question | null>(null);
  const [solvingCandidateId, setSolvingCandidateId] = useState<string | null>(null);
  const [isBatchSolving, setIsBatchSolving] = useState<boolean>(false);
  const handleArchiveQuestion = (q: Question) => {
    setConfirmArchiveDialog({
      isOpen: true,
      title: "أرشفة السؤال",
      message: `هل تريد نقل هذا السؤال إلى سجل الأرشيف؟ يمكنك استعادته في أي وقت.`,
      confirmText: "نعم، أرشفة السؤال",
      onConfirm: () => {
        onSaveQuestion({ ...q, status: "archived" });
      },
    });
  };

  const handleRestoreQuestion = (q: Question) => {
    onSaveQuestion({ ...q, status: "active" });
  };

  const handleBatchArchiveLowImportance = () => {
    const targetQuestions = questions.filter(
      (q) => q.importance <= 2 && q.status !== "archived",
    );
    if (targetQuestions.length === 0) {
      alert(
        "لا توجد أسئلة نشطة بدرجة أهمية منخفضة (1 أو 2 نجمة) لأرشفتها حالياً.",
      );
      return;
    }
    setConfirmArchiveDialog({
      isOpen: true,
      title: "أرشفة الأسئلة منخفضة الأهمية (تصنيف 1-2)",
      message: `هل تريد أرشفة جميع الأسئلة ذات درجة الأهمية المنخفضة (1 و 2 نجمة)؟ عدد الأسئلة المستهدفة: ${targetQuestions.length} سؤالاً.`,
      confirmText: `أرشفة ${targetQuestions.length} سؤال`,
      onConfirm: () => {
        targetQuestions.forEach((q) => {
          onSaveQuestion({ ...q, status: "archived" });
        });
      },
    });
  };

  // Helper for question type matching (including aliases)
  const isTypeMatch = (q: Question, typeKey: string): boolean => {
    if (typeKey === "all") return true;
    if (q.type === typeKey) return true;
    if ((q as any).customTypeName && (q as any).customTypeName === typeKey) return true;
    if (
      typeKey === "true_false" &&
      (q.type === ("true_false" as any) ||
        q.type === ("true-false" as any) ||
        q.type === ("tf" as any))
    )
      return true;
    if (
      typeKey === "mcq" &&
      (q.type === ("mcq" as any) || q.type === ("multiple_choice" as any))
    )
      return true;
    if (
      typeKey === "problem" &&
      (q.type === ("problem" as any) ||
        q.type === ("numerical" as any) ||
        q.type === ("calculation" as any) ||
        q.type === ("math" as any) ||
        q.type === ("equation" as any))
    )
      return true;
    if (
      typeKey === "essay" &&
      (q.type === ("essay" as any) ||
        q.type === ("written" as any) ||
        q.type === ("explain" as any) ||
        q.type === ("reason" as any) ||
        q.type === ("definition" as any))
    )
      return true;
    return false;
  };

  const usedQuestionIdsInExams = useMemo(() => {
    const set = new Set<string>();
    if (exams) {
      exams.forEach((exam) => {
        exam.versions?.forEach((v) => {
          v.questions?.forEach((q) => set.add(q.questionId));
        });
      });
    }
    return set;
  }, [exams]);

  // Unified Scope Questions: matches all curriculum, hierarchy, type, search & properties filters
  const scopedQuestions = useMemo(() => {
    return allowedQuestions.filter((q) => {
      if (!q) return false;
      if (selectedAnswerStatus === "empty" && hasAnswer(q)) return false;
      if (selectedAnswerStatus === "has_answer" && !hasAnswer(q)) return false;
      if (selectedSubjectId !== "all" && q.subjectId !== selectedSubjectId)
        return false;
      if (selectedUnitId !== "all") {
        const matchUnit =
          q.unitId === selectedUnitId ||
          (lessons &&
            lessons.some(
              (l) =>
                l &&
                l.unitId === selectedUnitId &&
                (q.lessonId === l.id ||
                  (Array.isArray(q.lessonIds) && q.lessonIds.includes(l.id)) ||
                  (Array.isArray(l.questionIds) && l.questionIds.includes(q.id))),
            ));
        if (!matchUnit) return false;
      }
      if (selectedLessonId !== "all") {
        const matchLesson =
          q.lessonId === selectedLessonId ||
          (Array.isArray(q.lessonIds) && q.lessonIds.includes(selectedLessonId)) ||
          (lessons &&
            lessons.find((l) => l && l.id === selectedLessonId)?.questionIds?.includes(q.id));
        if (!matchLesson) return false;
      }
      if (selectedType !== "all" && !isTypeMatch(q, selectedType)) return false;
      if (selectedDifficulty !== "all" && q.difficulty !== selectedDifficulty)
        return false;
      if (minImportance > 0 && (q.importance || 0) < minImportance) return false;
      if (selectedUsage === "used" && !usedQuestionIdsInExams.has(q.id)) return false;
      if (selectedUsage === "unused" && usedQuestionIdsInExams.has(q.id)) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchText = (q.text || "").toLowerCase().includes(term);
        const matchAns = resolveQuestionAnswer(q).toLowerCase().includes(term);
        const matchTag = q.tags?.some((t) => t && t.toLowerCase().includes(term));
        const matchBookRef =
          q.bookReference &&
          ((q.bookReference.bookSource || "").toLowerCase().includes(term) ||
            (q.bookReference.pageNumber || "").toString().toLowerCase().includes(term) ||
            (q.bookReference.questionTitle || "").toLowerCase().includes(term) ||
            (q.bookReference.exerciseNumber || "").toLowerCase().includes(term));
        if (!matchText && !matchAns && !matchTag && !matchBookRef) return false;
      }
      return true;
    });
  }, [
    allowedQuestions,
    selectedAnswerStatus,
    selectedSubjectId,
    selectedUnitId,
    selectedLessonId,
    selectedType,
    selectedDifficulty,
    minImportance,
    selectedUsage,
    searchTerm,
    lessons,
    usedQuestionIdsInExams,
  ]);

  // Filter Logic for List View (applies selectedStatus on scopedQuestions)
  const filteredQuestions = useMemo(() => {
    return scopedQuestions.filter((q) => {
      if (
        selectedStatus === "active" &&
        (q.status === "archived" ||
          q.status === "requires_review" ||
          q.status === "uncategorized" ||
          (q.status as string) === "draft" ||
          Boolean((q as any).isDraft))
      )
        return false;
      if (selectedStatus === "archived" && q.status !== "archived") return false;
      if (
        selectedStatus === "requires_review" &&
        q.status !== "requires_review" &&
        q.status !== "uncategorized"
      )
        return false;
      if (
        selectedStatus === "draft" &&
        (q.status as string) !== "draft" &&
        !Boolean((q as any).isDraft)
      )
        return false;
      return true;
    });
  }, [scopedQuestions, selectedStatus]);

  // Live Scoped Metrics & Statistics (reactive to current active scope)
  const activeQuestionsCount = useMemo(
    () =>
      scopedQuestions.filter(
        (q) =>
          q &&
          (q.status === "active" ||
            (!q.status &&
              q.status !== "archived" &&
              q.status !== "requires_review" &&
              q.status !== "uncategorized" &&
              (q.status as string) !== "draft" &&
              !Boolean((q as any).isDraft))),
      ).length,
    [scopedQuestions],
  );

  const archivedQuestionsCount = useMemo(
    () => scopedQuestions.filter((q) => q && q.status === "archived").length,
    [scopedQuestions],
  );

  const requiresReviewQuestionsCount = useMemo(
    () =>
      scopedQuestions.filter(
        (q) => q && (q.status === "requires_review" || q.status === "uncategorized"),
      ).length,
    [scopedQuestions],
  );

  const totalQuestionsCount = scopedQuestions.length;

  const solvedCount = useMemo(
    () => scopedQuestions.filter((q) => q && q.status !== "archived" && hasAnswer(q)).length,
    [scopedQuestions],
  );

  const curriculumLinkedCount = useMemo(
    () =>
      scopedQuestions.filter(
        (q) =>
          q &&
          q.status !== "archived" &&
          (q.lessonId || (q.lessonIds && q.lessonIds.length > 0) || q.unitId),
      ).length,
    [scopedQuestions],
  );

  const notInLessonCount = useMemo(
    () =>
      scopedQuestions.filter(
        (q) =>
          q &&
          q.status !== "archived" &&
          !q.lessonId &&
          (!q.lessonIds || q.lessonIds.length === 0),
      ).length,
    [scopedQuestions],
  );

  const draftsCount = useMemo(
    () =>
      scopedQuestions.filter(
        (q) =>
          q &&
          ((q.status as string) === "draft" || Boolean((q as any).isDraft)),
      ).length,
    [scopedQuestions],
  );

  const requiresReviewCount = requiresReviewQuestionsCount;

  const bankStats = {
    total: filteredQuestions.length,
    mcq: filteredQuestions.filter((q) => isTypeMatch(q, "mcq")).length,
    trueFalse: filteredQuestions.filter((q) => isTypeMatch(q, "true_false")).length,
    problem: filteredQuestions.filter((q) => isTypeMatch(q, "problem")).length,
    essay: filteredQuestions.filter((q) => isTypeMatch(q, "essay")).length,
    other: filteredQuestions.filter(
      (q) =>
        !isTypeMatch(q, "mcq") &&
        !isTypeMatch(q, "true_false") &&
        !isTypeMatch(q, "problem") &&
        !isTypeMatch(q, "essay"),
    ).length,
    usedInExams: filteredQuestions.filter((q) => usedQuestionIdsInExams.has(q.id)).length,
    notUsedInExams: filteredQuestions.filter((q) => !usedQuestionIdsInExams.has(q.id)).length,
  };

  const activeAdvancedFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedDifficulty !== "all") count++;
    if (minImportance > 0) count++;
    if (selectedAnswerStatus !== "all") count++;
    if (selectedUsage !== "all") count++;
    return count;
  }, [selectedDifficulty, minImportance, selectedAnswerStatus, selectedUsage]);

  const hasActiveScopeFilters = useMemo(() => {
    return (
      selectedSubjectId !== "all" ||
      selectedUnitId !== "all" ||
      selectedLessonId !== "all" ||
      selectedType !== "all" ||
      selectedDifficulty !== "all" ||
      minImportance > 0 ||
      searchTerm.trim() !== "" ||
      selectedAnswerStatus !== "all" ||
      selectedUsage !== "all"
    );
  }, [
    selectedSubjectId,
    selectedUnitId,
    selectedLessonId,
    selectedType,
    selectedDifficulty,
    minImportance,
    searchTerm,
    selectedAnswerStatus,
    selectedUsage,
  ]);

  const activeScopeName = useMemo(() => {
    if (selectedLessonId !== "all") {
      const les = lessons.find((l) => l.id === selectedLessonId);
      return les ? `الدرس: ${les.title}` : "الدرس المحدد";
    }
    if (selectedUnitId !== "all") {
      const u = units.find((un) => un.id === selectedUnitId);
      return u ? `الوحدة: ${u.title}` : "الوحدة المحددة";
    }
    if (selectedSubjectId !== "all") {
      const sub = subjects.find((s) => s.id === selectedSubjectId);
      return sub ? `المادة: ${sub.name}` : "المادة المحددة";
    }
    return "النطاق المحدد";
  }, [selectedSubjectId, selectedUnitId, selectedLessonId, subjects, units, lessons]);

  const totalActiveFiltersCount = useMemo(() => {
    let count = activeAdvancedFiltersCount;
    if (selectedSubjectId !== "all") count++;
    if (selectedUnitId !== "all") count++;
    if (selectedLessonId !== "all") count++;
    if (selectedType !== "all") count++;
    if (searchTerm.trim() !== "") count++;
    if (selectedStatus !== "active") count++;
    return count;
  }, [
    activeAdvancedFiltersCount,
    selectedSubjectId,
    selectedUnitId,
    selectedLessonId,
    selectedType,
    searchTerm,
    selectedStatus,
  ]);

  const sortedQuestions = useMemo(() => {
    const list = [...filteredQuestions];
    if (sortBy === "newest") {
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    } else if (sortBy === "oldest") {
      list.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
    } else if (sortBy === "importance") {
      list.sort((a, b) => (b.importance || 0) - (a.importance || 0));
    }
    return list;
  }, [filteredQuestions, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedQuestions.length / pageSize));
  const paginatedQuestions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedQuestions.slice(start, start + pageSize);
  }, [sortedQuestions, currentPage, pageSize]);

  const handleClearFilters = () => {
    setSelectedSubjectId("all");
    setSelectedUnitId("all");
    setSelectedLessonId("all");
    setSelectedType("all");
    setSelectedDifficulty("all");
    setMinImportance(0);
    setSelectedAnswerStatus("all");
    setSelectedUsage("all");
    setSelectedStatus("active");
    setSearchTerm("");
  };

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const activeTemplate = useMemo(() => {
    return storage.getPrintTemplate();
  }, []);

  const previewTemplate = useMemo(() => {
    return {
      ...activeTemplate,
      headerContent: {
        ...activeTemplate.headerContent,
        subjectName: subjects.find((s) => s.id === selectedSubjectId)?.name || "بنك الأسئلة المعتمد",
      },
    };
  }, [activeTemplate, subjects, selectedSubjectId]);

  const questionBookletItems = useMemo(() => {
    const items: { id: string; content: React.ReactNode }[] = [];

    items.push({
      id: "bank-header",
      content: (
        <div className="border-2 border-slate-900 p-3.5 rounded-xl mb-4 bg-slate-50 text-[12pt] space-y-2">
          <div className="font-extrabold text-[12pt] text-slate-900 border-b border-slate-300 pb-1.5 flex justify-between items-center">
            <span>📚 كراسة الأسئلة المعتمدة ({filteredQuestions.length} سؤال)</span>
            <span className="text-[10pt] font-normal text-slate-600">
              تاريخ التصدير: {new Date().toLocaleDateString('ar-EG')}
            </span>
          </div>
          <div className="text-[10pt] font-bold text-slate-700 flex gap-4 flex-wrap">
            <span>المادة: {subjects.find(s => s.id === selectedSubjectId)?.name || "جميع المواد"}</span>
            <span>الإجمالي: {filteredQuestions.length} سؤالاً</span>
          </div>
        </div>
      )
    });

    const groupedUnits = analyzeAndGroupQuestions(filteredQuestions, {
      enabled: true,
      maxColumns: "auto",
      numberingStyle: "paren-num",
      density: "compact",
      stripCommonPrefix: true,
    });

    let currentItemNumber = 1;
    groupedUnits.forEach((unit, uIdx) => {
      if (unit.isGroup) {
        items.push({
          id: `grouped-${unit.id}-${uIdx}`,
          content: (
            <LazyQuestionWrapper>
              <GroupedQuestionGrid
                unit={unit}
                mainQuestionNumber={unit.groupIndex || currentItemNumber}
                numberFormat="dash"
                numberingStyle="paren-num"
                columns="auto"
                density="compact"
                showAnswerKey={showAnswerKeyInBank}
                activeFontFamily={activeTemplate.typography?.fontFamily || "inherit"}
                questionSize="12pt"
                optionsSize="11pt"
              />
            </LazyQuestionWrapper>
          ),
        });
        currentItemNumber++;
      } else {
        const q = unit.items[0]?.originalQuestion;
        if (!q) return;
        items.push({
          id: q.id + "_" + uIdx,
          content: (
            <LazyQuestionWrapper>
              <QuestionRenderer
                question={q}
                questionNumber={unit.groupIndex || currentItemNumber}
                numberFormat="dash"
                allocatedMarks={(q as any).marks || (q.importance ? q.importance * 2 : 5)}
                showMarks={false}
                showAnswerKey={showAnswerKeyInBank}
                suppressAnswerBox={showAnswerKeyInBank}
                mode="exam-print"
                questionSize="12pt"
                optionsSize="11pt"
              />
            </LazyQuestionWrapper>
          ),
        });
        currentItemNumber++;

        if (showAnswerKeyInBank) {
          const ansItems = createAnswerKeyItems(q, `${q.id}_${uIdx}`, "11pt");
          ansItems.forEach((ansItem) => {
            items.push({
              id: ansItem.id,
              content: (
                <LazyQuestionWrapper>
                  {ansItem.content}
                </LazyQuestionWrapper>
              ),
            });
          });
        }
      }
    });

    return items;
  }, [filteredQuestions, selectedSubjectId, subjects, showAnswerKeyInBank, activeTemplate]);


    const openCreateModal = () => {
    setEditingQuestion(null);
    setFormSubjectId(selectedSubjectId !== "all" ? selectedSubjectId : (subjects[0]?.id || ""));
    setFormUnitId(selectedUnitId !== "all" ? selectedUnitId : "");
    setFormLessonId(selectedLessonId !== "all" ? selectedLessonId : "");
    setFormType("mcq");
    setFormText("");
    setFormAnswer("");
    setFormDifficulty("medium");
    setFormImportance(4);
    setFormStatus("active");
    setFormIsPastCycle(false);
    setFormPastCyclesInfo("");
    setFormFutureProb(80);
    setFormDistractors([
      { id: "d1", text: "خيار خاطئ 1", isCorrect: false },
      { id: "d2", text: "خيار خاطئ 2", isCorrect: false },
      { id: "d3", text: "خيار خاطئ 3", isCorrect: false },
    ]);
    setShowQuestionModal(true);
  };

  const openEditModal = (q: Question) => {
    if (!q) return;
    setEditingQuestion(q);
    setFormSubjectId(q.subjectId || "");
    setFormUnitId(q.unitId || "");
    setFormLessonId(q.lessonId || "");
    setFormType(q.type);
    setFormText(q.text);
    setFormAnswer(q.answer);
    setFormDifficulty(q.difficulty);
    setFormImportance(q.importance);
    setFormStatus(q.status || "active");
    setFormIsPastCycle(q.isPastCycle);
    setFormPastCyclesInfo(q.pastCyclesInfo || "");
    setFormFutureProb(q.futureProbability);
    if (q.distractors) {
      setFormDistractors(
        q.distractors.map((d) => ({
          id: d.id,
          text: d.text,
          isCorrect: d.isCorrect,
        })),
      );
    }
    setShowQuestionModal(true);
  };

  const handleSaveQuestionSubmit = (e: React.FormEvent) => {
    systemLog("جاري حفظ التعديلات على السؤال...", "info");
    e.preventDefault();
    if (!formText || !formSubjectId) return;

    // DATA-1 Guardrail: Validate Curriculum Context
    const validation = validateCurriculumContext(formSubjectId, formUnitId, formLessonId);
    if (!validation.isValid) {
      alert("فشل التحقق من صحة المنهاج:\n\n" + validation.errors.join("\n"));
      console.error("[DATA-1] Curriculum Validation Failed for handleSaveQuestionSubmit:", validation.errors);
      return;
    }

    // Weight score calculation f(importance, recurrence, futureProb)
    const weight = Number(
      (formImportance * 0.5 + (formFutureProb / 100) * 2.5).toFixed(1),
    );

    const newQuestion: Question = {
      id: editingQuestion ? editingQuestion.id : "q-" + Date.now(),
      subjectId: formSubjectId,
      unitId: formUnitId,
      lessonId: formLessonId,
      type: formType,
      text: formText,
      answer: formAnswer,
      difficulty: formDifficulty,
      importance: formImportance,
      status: formStatus,
      tags: ["بنك الأسئلة"],
      isPastCycle: formIsPastCycle,
      pastCyclesInfo: formPastCyclesInfo,
      occurrencesCount: formIsPastCycle ? 2 : 0,
      futureProbability: formFutureProb,
      finalWeightScore: weight,
      distractors:
        formType === "mcq" || formType === "true_false"
          ? formDistractors
          : undefined,
      createdAt: editingQuestion
        ? editingQuestion.createdAt
        : new Date().toISOString().substring(0, 10),
    };

    onSaveQuestion(newQuestion);
    setShowQuestionModal(false);
  };

  // Process Bulk AI Text Import with Preview & Candidate Selection
  const handleBulkImport = async () => {
    systemLog("بدء عملية تحليل واستخراج الأسئلة الذكي...", "info");
    if (!canCreateQuestion) {
      alert("ليس لديك صلاحية لإضافة أو استيراد أسئلة جديدة.");
      return;
    }
    if (!rawImportText.trim()) return;
    if (!importSubjectId) {
      alert("يرجى اختيار المادة الدراسية.");
      return;
    }
    if (!canAccessSubject(currentUser, importSubjectId)) {
      alert("ليس لديك صلاحية على المادة الدراسية المختارة.");
      return;
    }
    const availableImportUnits = (allowedUnits || []).filter(
      (u) => u && u.subjectId === importSubjectId,
    );
    if (availableImportUnits.length > 0 && !importUnitId) {
      alert("يرجى اختيار الوحدة الدراسية.");
      return;
    }
    const availableImportLessons = (allowedLessons || []).filter(
      (l) => l && l.unitId === importUnitId,
    );
    if (availableImportLessons.length > 0 && !importLessonId) {
      alert("يرجى اختيار الدرس.");
      return;
    }

    setImportingText(true);
    try {
      const selectedSubjectName =
        subjects.find((s) => s.id === importSubjectId)?.name || "عام";
        
      const finalImportUnitId = importUnitId;
      const finalImportLessonId = importLessonId;
      
      // DATA-1 Guardrail
      const validation = validateCurriculumContext(importSubjectId, finalImportUnitId, finalImportLessonId);
      if (!validation.isValid) {
         setImportingText(false);
         alert("فشل التحقق من المنهاج للاستيراد الذكي:\n\n" + validation.errors.join("\n"));
         console.error("[DATA-1] Bulk Import Curriculum Validation Failed:", validation.errors);
         return;
      }

      const res = await aiService.parseTextQuestions(
        rawImportText,
        selectedSubjectName,
        importPattern,
      );
      if (res?.parsedQuestions && res.parsedQuestions.length > 0) {
        const generatedList: Question[] = res.parsedQuestions.map((pq: any, idx: number) => {
          const rawAnswer = (pq.answer || "").trim();
          const qType = (pq.type as QuestionType) || "essay";
          let distractorsList: { id: string; text: string; isCorrect: boolean }[] | undefined = undefined;

          if (qType === "mcq") {
            const rawDistractors: any[] = Array.isArray(pq.distractors) ? pq.distractors : [];
            let optionsTextList: { text: string; isCorrect: boolean }[] = [];
            let foundCorrect = false;

            rawDistractors.forEach((dItem: any) => {
              const textStr = (typeof dItem === "string" ? dItem : dItem.text || "").trim();
              if (!textStr) return;
              const explicitCorrect = typeof dItem === "object" && dItem.isCorrect !== undefined ? Boolean(dItem.isCorrect) : false;
              const matchesAnswer = Boolean(rawAnswer && textStr.toLowerCase() === rawAnswer.toLowerCase());
              const isCorr = explicitCorrect || matchesAnswer;
              if (isCorr) foundCorrect = true;
              optionsTextList.push({ text: textStr, isCorrect: isCorr });
            });

            // Ensure the correct answer (rawAnswer) is included in the options
            if (rawAnswer) {
              if (!foundCorrect) {
                const existingIdx = optionsTextList.findIndex(
                  (opt) => opt.text.toLowerCase() === rawAnswer.toLowerCase()
                );
                if (existingIdx !== -1) {
                  optionsTextList[existingIdx].isCorrect = true;
                  foundCorrect = true;
                } else {
                  // Insert rawAnswer into optionsTextList as a correct option at a randomized position
                  const insertIdx = Math.floor(Math.random() * (optionsTextList.length + 1));
                  optionsTextList.splice(insertIdx, 0, { text: rawAnswer, isCorrect: true });
                  foundCorrect = true;
                }
              }
            }

            distractorsList = optionsTextList.map((opt, i) => ({
              id: `d-${Date.now()}-${idx}-${i}-${Math.random().toString(36).substring(2, 5)}`,
              text: opt.text,
              isCorrect: opt.isCorrect,
            }));
          } else if (pq.distractors && Array.isArray(pq.distractors)) {
            distractorsList = pq.distractors.map((dText: any, i: number) => {
              const textStr = typeof dText === "string" ? dText : dText.text || "";
              const isCorr =
                typeof dText === "object" && dText.isCorrect !== undefined
                  ? Boolean(dText.isCorrect)
                  : Boolean(rawAnswer && textStr.trim() === rawAnswer.trim());
              return {
                id: `d-${Date.now()}-${idx}-${i}-${Math.random().toString(36).substring(2, 5)}`,
                text: textStr,
                isCorrect: isCorr,
              };
            });
          }

          const bookRefPayload = (pq.bookReference || importBookSource || importPageNumber || importExerciseNumber || importQuestionTitle) ? {
            bookSource: (pq.bookReference?.bookSource) || importBookSource || "",
            pageNumber: (pq.bookReference?.pageNumber) || importPageNumber || "",
            questionTitle: (pq.bookReference?.questionTitle) || importQuestionTitle || "",
            exerciseNumber: (pq.bookReference?.exerciseNumber) || importExerciseNumber || "",
            showInCard: true,
            showInPrint: true,
          } : undefined;

          let questionStatus: "active" | "requires_review" = "active";
          const hasValidAns = rawAnswer || (distractorsList && distractorsList.some(d => d.isCorrect));
          if (!pq.text || !hasValidAns) {
            questionStatus = "requires_review";
          } else if (qType === "mcq" || qType === "true_false") {
            if (!distractorsList || distractorsList.length < 2 || !distractorsList.some(d => d.isCorrect)) {
              questionStatus = "requires_review";
            }
          }

          return {
            id: `q-imp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
            subjectId: importSubjectId,
            bookReference: bookRefPayload,
            unitId: finalImportUnitId,
            lessonId: finalImportLessonId,
            type: qType,
            text: pq.text || "",
            answer: rawAnswer,
            status: questionStatus,
            distractors: distractorsList,
            difficulty: pq.difficulty || "medium",
            importance: pq.importance || 4,
            tags: ["استيراد آلي"],
            isPastCycle: false,
            occurrencesCount: 0,
            futureProbability: pq.futureProb || 75,
            finalWeightScore: 4.0,
            createdAt: new Date().toISOString().substring(0, 10),
          };
        });

        setExtractedQuestionsForPreview(generatedList);
        setSelectedImportQuestionIds(new Set(generatedList.map((q) => q.id)));
      } else {
        alert("لم يتم استخراج أي أسئلة من النص المدخل. يرجى التأكد من محتوى النص وتحديد نمط الاستخراج المناسب.");
      }
    } catch (e: any) {
      console.error(e);
      if (e.message === "MISSING_AI_SETTINGS") {
        window.dispatchEvent(new CustomEvent("open-ai-settings"));
      } else {
        alert("حدث خطأ من الذكاء الاصطناعي: " + (e.message || "تأكد من إعدادات API"));
      }
    } finally {
      setImportingText(false);
    }
  };

  const handleToggleSelectCandidate = (id: string) => {
    setSelectedImportQuestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllCandidates = () => {
    if (!extractedQuestionsForPreview) return;
    setSelectedImportQuestionIds(
      new Set(extractedQuestionsForPreview.map((q) => q.id))
    );
  };

  const handleDeselectAllCandidates = () => {
    setSelectedImportQuestionIds(new Set());
  };

  const handleDeleteCandidateFromPreview = (id: string) => {
    if (!extractedQuestionsForPreview) return;
    const filtered = extractedQuestionsForPreview.filter((q) => q.id !== id);
    setExtractedQuestionsForPreview(filtered);
    setSelectedImportQuestionIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleStartEditingCandidate = (q: Question) => {
    setEditingCandidateId(q.id);
    setEditingCandidateData({ ...q });
  };

  const handleSaveCandidateEdit = () => {
    if (!editingCandidateData || !extractedQuestionsForPreview) return;
    
    // Re-evaluate validity
    let questionStatus: "active" | "requires_review" = "active";
    const qType = editingCandidateData.type;
    const rawAnswer = (editingCandidateData.answer || "").trim();
    if (!editingCandidateData.text || !rawAnswer) {
      questionStatus = "requires_review";
    } else if (qType === "mcq" || qType === "true_false") {
      const distractorsList = editingCandidateData.distractors;
      if (!distractorsList || distractorsList.length < 2 || !distractorsList.some(d => d.isCorrect)) {
        questionStatus = "requires_review";
      }
    }
    editingCandidateData.status = questionStatus;

    setExtractedQuestionsForPreview((prev) =>
      prev ? prev.map((q) => (q.id === editingCandidateData.id ? editingCandidateData : q)) : null
    );
    setEditingCandidateId(null);
    setEditingCandidateData(null);
  };

  // Quick 1-Click AI Solver for an individual candidate in preview
  const handleSolveCandidateQuick = async (candidateId: string) => {
    systemLog(`جاري حل السؤال (معرف: ${candidateId}) تلقائياً...`, "info");
    if (!extractedQuestionsForPreview) return;
    const targetQ = extractedQuestionsForPreview.find((q) => q.id === candidateId);
    if (!targetQ) return;

    setSolvingCandidateId(candidateId);
    try {
      const generatedSolution = await aiService.solveQuestion(targetQ);
      if (generatedSolution) {
        setExtractedQuestionsForPreview((prev) => {
          if (!prev) return null;
          return prev.map((q, idx) => {
            if (q.id === candidateId) {
              setExpandedExtractionAnswers((exp) => ({ ...exp, [idx]: true }));
              return {
                ...q,
                answer: generatedSolution,
                status: "active",
              };
            }
            return q;
          });
        });
        setSelectedImportQuestionIds((prev) => new Set([...prev, candidateId]));
      }
    } catch (error: any) {
      console.error("Quick solve error:", error);
      alert("تعذر توليد الإجابة بالذكاء الاصطناعي: " + (error?.message || "يرجى المحاولة مجدداً"));
    } finally {
      setSolvingCandidateId(null);
    }
  };

  // Batch AI Solver for all incomplete candidates in preview
  const handleBatchSolveIncompleteCandidates = async () => {
    systemLog("بدء عملية الحل الدفعي للأسئلة غير المكتملة...", "info");
    if (!extractedQuestionsForPreview) return;
    const incompleteQuestions = extractedQuestionsForPreview.filter(
      (q) => !hasAnswer(q) || q.status === "requires_review"
    );
    if (incompleteQuestions.length === 0) {
      alert("جميع الأسئلة المستخرجة تحتوي على إجابات نموذجية صالحة ومكتملة!");
      return;
    }

    setIsBatchSolving(true);
    try {
      const updatedList = [...extractedQuestionsForPreview];
      for (let i = 0; i < updatedList.length; i++) {
        const q = updatedList[i];
        if (!hasAnswer(q) || q.status === "requires_review") {
          try {
            const solution = await aiService.solveQuestion(q);
            if (solution) {
              updatedList[i] = {
                ...q,
                answer: solution,
                status: "active",
              };
              setExpandedExtractionAnswers((exp) => ({ ...exp, [i]: true }));
            }
          } catch (err) {
            console.warn(`Failed to solve question ${q.id}:`, err);
          }
        }
      }
      setExtractedQuestionsForPreview(updatedList);
      setSelectedImportQuestionIds(new Set(updatedList.map((q) => q.id)));
    } catch (error: any) {
      console.error("Batch solve error:", error);
      alert("حدث خطأ أثناء التوليد الجماعي: " + (error?.message || "يرجى التحقق من الاتصال"));
    } finally {
      setIsBatchSolving(false);
    }
  };

  const handleFinalizeImportSelected = () => {
    if (!canCreateQuestion) {
      alert("ليس لديك صلاحية لإضافة أسئلة جديدة إلى بنك الأسئلة.");
      return;
    }
    if (!extractedQuestionsForPreview) return;
    const selectedQuestions = extractedQuestionsForPreview.filter((q) =>
      selectedImportQuestionIds.has(q.id)
    );

    const selectedValid = selectedQuestions.filter(q => q.status !== "requires_review");
    const selectedInvalid = selectedQuestions.filter(q => q.status === "requires_review");
    const unselected = extractedQuestionsForPreview.filter((q) => !selectedImportQuestionIds.has(q.id));

    if (selectedValid.length === 0) {
      alert("لا توجد أسئلة مكتملة صالحة ضمن التحديد للإرسال. يرجى مراجعة الأسئلة وتحديد الإجابات.");
      return;
    }

    const authorizedToSave = selectedValid.filter((q) => !q.subjectId || canAccessSubject(currentUser, q.subjectId));
    if (authorizedToSave.length === 0) {
      alert("لا تملك صلاحية الوصول إلى المواد الدراسية الخاصة بالأسئلة المحددة.");
      return;
    }

    authorizedToSave.forEach((q) => {
      onSaveQuestion(q);
    });

    const savedIds = new Set(authorizedToSave.map(q => q.id));
    const remainingQuestions = [...selectedInvalid, ...unselected, ...selectedValid.filter(q => !savedIds.has(q.id))];

    if (remainingQuestions.length > 0) {
      alert(`✨ تم إرسال (${authorizedToSave.length}) سؤال بنجاح! يرجى إكمال مراجعة الأسئلة المتبقية.`);
      setExtractedQuestionsForPreview(remainingQuestions);
      setSelectedImportQuestionIds(new Set(selectedInvalid.map(q => q.id)));
    } else {
      alert(`✨ تم رفد بنك الأسئلة بـ ${authorizedToSave.length} سؤال بنجاح!`);
      setExtractedQuestionsForPreview(null);
      setSelectedImportQuestionIds(new Set());
      setRawImportText("");
      setActiveTab("questions");
    }
  };

  const handleFinalizeImportAll = () => {
    if (!canCreateQuestion) {
      alert("ليس لديك صلاحية لإضافة أسئلة جديدة إلى بنك الأسئلة.");
      return;
    }
    if (!extractedQuestionsForPreview) return;
    
    const validQuestions = extractedQuestionsForPreview.filter(q => q.status !== "requires_review");
    const invalidQuestions = extractedQuestionsForPreview.filter(q => q.status === "requires_review");
    
    if (validQuestions.length === 0) {
      alert("لا توجد أسئلة مكتملة صالحة للإرسال.");
      return;
    }

    const authorizedToSave = validQuestions.filter((q) => !q.subjectId || canAccessSubject(currentUser, q.subjectId));
    if (authorizedToSave.length === 0) {
      alert("لا تملك صلاحية الوصول إلى المواد الدراسية الخاصة بالأسئلة.");
      return;
    }

    authorizedToSave.forEach((q) => {
      onSaveQuestion(q);
    });

    const savedIds = new Set(authorizedToSave.map(q => q.id));
    const unauthorizedRemaining = validQuestions.filter(q => !savedIds.has(q.id));

    if (invalidQuestions.length > 0 || unauthorizedRemaining.length > 0) {
      alert(`✨ تم إرسال (${authorizedToSave.length}) سؤال بنجاح! يرجى إكمال الأسئلة المتبقية.`);
      const remaining = [...invalidQuestions, ...unauthorizedRemaining];
      setExtractedQuestionsForPreview(remaining);
      setSelectedImportQuestionIds(new Set(remaining.map(q => q.id)));
    } else {
      alert(`✨ تم رفد بنك الأسئلة بكافة الأسئلة (${authorizedToSave.length}) بنجاح!`);
      setExtractedQuestionsForPreview(null);
      setSelectedImportQuestionIds(new Set());
      setRawImportText("");
      setActiveTab("questions");
    }
  };


  const handleDataMigration = () => {
    let migratedCount = 0;
    const defaultSubject = subjects[0];
    if (!defaultSubject) {
      alert("لا يوجد مواد دراسية لربط الأسئلة بها.");
      return;
    }

    questions.forEach(q => {
      let changed = false;
      let newQ = { ...q };

      // 1. Fix Subject
      if (!newQ.subjectId) {
        if ((q as any).subjectIds && (q as any).subjectIds.length > 0) {
          newQ.subjectId = (q as any).subjectIds[0];
        } else {
          newQ.subjectId = defaultSubject.id;
        }
        changed = true;
      }

      // 2. Fix Unit
      let currentUnitId = newQ.unitId;
      if (!currentUnitId) {
        if ((q as any).unitIds && (q as any).unitIds.length > 0) {
          currentUnitId = (q as any).unitIds[0];
        } else {
          const subUnits = (units || []).filter(u => u && u.subjectId === newQ.subjectId);
          currentUnitId = subUnits.length > 0 ? (subUnits[0]?.id || "") : "";
        }
        newQ.unitId = currentUnitId;
        changed = true;
      }

      // 3. Fix Lesson
      if (!newQ.lessonId) {
        if ((q as any).lessonIds && (q as any).lessonIds.length > 0) {
          newQ.lessonId = (q as any).lessonIds[0];
        } else {
          const unitLessons = (lessons || []).filter(l => l && l.unitId === currentUnitId);
          newQ.lessonId = unitLessons.length > 0 ? (unitLessons[0]?.id || "") : "";
        }
        changed = true;
      }

      if (changed) {
        onSaveQuestion(newQ);
        migratedCount++;
      }
    });

    alert(`تم ترحيل وترميم بيانات ${migratedCount} سؤال بنجاح لترتبط بدروس ومقررات صحيحة.`);
  };

  if (showQuestionModal) {
    return (
      <QuestionEditorPage
        editingQuestion={editingQuestion}
        initialSubjectId={selectedSubjectId !== "all" ? selectedSubjectId : ""}
        initialUnitId={selectedUnitId !== "all" ? selectedUnitId : ""}
        initialLessonId={selectedLessonId !== "all" ? selectedLessonId : ""}
        subjects={allowedSubjects}
        units={allowedUnits}
        lessons={allowedLessons}
        QUESTION_TYPES_LABEL={QUESTION_TYPES_LABEL}
        onSave={(savedQuestion) => {
          onSaveQuestion(savedQuestion);
          setShowQuestionModal(false);
        }}
        onCancel={() => setShowQuestionModal(false)}
      />
    );
  }

  return (
    <div className="p-3 sm:p-4 lg:p-5 w-full max-w-[1680px] mx-auto space-y-3">
      {/* 1. Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#0f6cbd] text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
              بنك الأسئلة الرقمي وتصنيف الأهمية
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
              مستودع شامل لجميع الأسئلة مصنف حسب الأهمية والموضوع
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("refresh-data-all"))}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer flex items-center justify-center"
            title="تحديث البيانات يدوياً من المصدر المركزي"
          >
            <RefreshCw className="w-4.5 h-4.5" />
          </button>
          {canCreateQuestion && (
            <button
              type="button"
              onClick={openCreateModal}
              className="px-4 py-2.5 rounded-xl bg-[#0f6cbd] hover:bg-[#115ea3] text-white font-black text-xs sm:text-sm shadow-2xs transition flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4.5 h-4.5" />
              <span>إضافة سؤال جديد</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Metrics Cards Row with Scope Indicator */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full inline-block ${
                  hasActiveScopeFilters ? "bg-blue-500 animate-pulse" : "bg-emerald-500"
                }`}
              />
              <span>
                {hasActiveScopeFilters
                  ? `إحصائيات النطاق المحدد (${activeScopeName})`
                  : "إحصائيات شاملة (كافة الأسئلة)"}
              </span>
            </span>
            {hasActiveScopeFilters && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
                <span>فلاتر مفعلة: {totalActiveFiltersCount}</span>
              </span>
            )}
          </div>
          {hasActiveScopeFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-[11px] font-extrabold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 cursor-pointer transition hover:underline"
              title="إلغاء تفعيل الفلاتر والعودة للإحصائيات الشاملة"
            >
              <X className="w-3.5 h-3.5 text-blue-600" />
              <span>إعادة تعيين للشامل</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2">
          {/* Card 1: بحاجة مراجعة */}
          <div
            onClick={() => {
              setActiveTab("questions");
              setSelectedStatus("requires_review");
            }}
            className="p-2.5 sm:p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 flex items-center justify-between cursor-pointer hover:bg-rose-100/60 dark:hover:bg-rose-900/30 transition shadow-3xs"
            title="عرض الأسئلة التي تحتاج إلى مراجعة"
          >
            <div>
              <span className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 block leading-none">
                {requiresReviewQuestionsCount}
              </span>
              <span className="text-xs sm:text-sm font-bold text-rose-700 dark:text-rose-300 mt-1 block">
                بحاجة مراجعة
              </span>
            </div>
            <div className="p-1.5 sm:p-2 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300">
              <AlertTriangle className="w-4 h-4 sm:w-5 h-5" />
            </div>
          </div>

          {/* Card 2: مسودات */}
          <div
            onClick={() => {
              setActiveTab("questions");
              setSelectedStatus("draft");
            }}
            className="p-2.5 sm:p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-900/40 flex items-center justify-between cursor-pointer hover:bg-purple-100/60 dark:hover:bg-purple-900/30 transition shadow-3xs"
            title="عرض المسودات"
          >
            <div>
              <span className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 block leading-none">
                {draftsCount}
              </span>
              <span className="text-xs sm:text-sm font-bold text-purple-700 dark:text-purple-300 mt-1 block">
                مسودات
              </span>
            </div>
            <div className="p-1.5 sm:p-2 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-300">
              <Edit3 className="w-4 h-4 sm:w-5 h-5" />
            </div>
          </div>

          {/* Card 3: غير مدرج في درس */}
          <div className="p-2.5 sm:p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 flex items-center justify-between">
            <div>
              <span className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 block leading-none">
                {notInLessonCount}
              </span>
              <span className="text-xs sm:text-sm font-bold text-amber-700 dark:text-amber-300 mt-1 block">
                غير مدرج في درس
              </span>
            </div>
            <div className="p-1.5 sm:p-2 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300">
              <BookOpen className="w-4 h-4 sm:w-5 h-5" />
            </div>
          </div>

          {/* Card 4: مرتبط بالمنهاج */}
          <div className="p-2.5 sm:p-3 rounded-xl bg-sky-50/60 dark:bg-sky-950/20 border border-sky-200/80 dark:border-sky-900/40 flex items-center justify-between">
            <div>
              <span className="text-xl sm:text-2xl font-black text-sky-600 dark:text-sky-400 block leading-none">
                {curriculumLinkedCount}
              </span>
              <span className="text-xs sm:text-sm font-bold text-sky-700 dark:text-sky-300 mt-1 block">
                مرتبط بالمنهاج
              </span>
            </div>
            <div className="p-1.5 sm:p-2 rounded-full bg-sky-100 dark:bg-sky-900/60 text-sky-600 dark:text-sky-300">
              <Link className="w-4 h-4 sm:w-5 h-5" />
            </div>
          </div>

          {/* Card 5: محلول */}
          <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40 flex items-center justify-between">
            <div>
              <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 block leading-none">
                {solvedCount}
              </span>
              <span className="text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-300 mt-1 block">
                محلول
              </span>
            </div>
            <div className="p-1.5 sm:p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 sm:w-5 h-5" />
            </div>
          </div>

          {/* Card 6: إجمالي الأسئلة */}
          <div
            onClick={() => {
              setActiveTab("questions");
              setSelectedStatus("active");
            }}
            className="p-2.5 sm:p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 flex items-center justify-between cursor-pointer hover:bg-blue-100/60 dark:hover:bg-blue-900/30 transition shadow-3xs"
            title="عرض الأسئلة النشطة"
          >
            <div>
              <span className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 block leading-none">
                {totalQuestionsCount}
              </span>
              <span className="text-xs sm:text-sm font-bold text-blue-700 dark:text-blue-300 mt-1 block">
                إجمالي الأسئلة
              </span>
            </div>
            <div className="p-1.5 sm:p-2 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300">
              <FileText className="w-4 h-4 sm:w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs Switcher (Unified & Streamlined) */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-extrabold gap-2 overflow-visible relative pt-1 pb-0.5">
        <div className="flex items-center gap-3 sm:gap-5 lg:gap-6 overflow-x-auto scrollbar-none flex-1">
          {/* Tab 1: الأسئلة النشطة */}
          <button
            type="button"
            onClick={() => {
              setActiveTab("questions");
              setSelectedStatus("active");
            }}
            className={`pb-3 px-1.5 relative transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeTab === "questions" && selectedStatus === "active"
                ? "text-[#0f6cbd] font-black"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Layers className="w-4.5 h-4.5 text-blue-600" />
            <span>الأسئلة النشطة</span>
            <span className="px-1.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
              {activeQuestionsCount}
            </span>
            {activeTab === "questions" && selectedStatus === "active" && (
              <span className="absolute bottom-0 right-0 left-0 h-0.5 bg-[#0f6cbd] rounded-full" />
            )}
          </button>

          {/* Tab 2: المسودات */}
          <button
            type="button"
            onClick={() => {
              setActiveTab("questions");
              setSelectedStatus("draft");
            }}
            className={`pb-3 px-1.5 relative transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeTab === "questions" && selectedStatus === "draft"
                ? "text-purple-600 dark:text-purple-400 font-black"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Edit3 className="w-4.5 h-4.5 text-purple-600" />
            <span>المسودات</span>
            <span className="px-1.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
              {draftsCount}
            </span>
            {activeTab === "questions" && selectedStatus === "draft" && (
              <span className="absolute bottom-0 right-0 left-0 h-0.5 bg-purple-600 rounded-full" />
            )}
          </button>

          {/* Tab 3: بحاجة مراجعة */}
          <button
            type="button"
            onClick={() => {
              setActiveTab("questions");
              setSelectedStatus("requires_review");
            }}
            className={`pb-3 px-1.5 relative transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeTab === "questions" && selectedStatus === "requires_review"
                ? "text-rose-600 dark:text-rose-400 font-black"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <AlertTriangle className="w-4.5 h-4.5 text-rose-600" />
            <span>بحاجة مراجعة</span>
            <span className="px-1.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
              {requiresReviewQuestionsCount}
            </span>
            {activeTab === "questions" && selectedStatus === "requires_review" && (
              <span className="absolute bottom-0 right-0 left-0 h-0.5 bg-rose-600 rounded-full" />
            )}
          </button>

          {/* Tab 4: الأرشيف */}
          <button
            type="button"
            onClick={() => {
              setActiveTab("questions");
              setSelectedStatus("archived");
            }}
            className={`pb-3 px-1.5 relative transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeTab === "questions" && selectedStatus === "archived"
                ? "text-[#0f6cbd] font-black"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Archive className="w-4.5 h-4.5 text-slate-500" />
            <span>الأرشيف</span>
            <span className="px-1.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {archivedQuestionsCount}
            </span>
            {activeTab === "questions" && selectedStatus === "archived" && (
              <span className="absolute bottom-0 right-0 left-0 h-0.5 bg-[#0f6cbd] rounded-full" />
            )}
          </button>

          {/* Tab 5: الاستيراد الموحد (Unified Import Menu) */}
          <div className="relative" ref={importDropdownRef}>
            <button
              type="button"
              onClick={() => {
                if (!isImportTab(activeTab)) {
                  setActiveTab("import");
                }
                setShowImportDropdown((prev) => !prev);
              }}
              className={`pb-3 px-1.5 relative transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                isImportTab(activeTab)
                  ? "text-indigo-600 dark:text-indigo-400 font-black"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Upload className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
              <span>الاستيراد</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showImportDropdown ? "rotate-180 text-indigo-600" : "text-slate-400"}`} />
              {isImportTab(activeTab) && (
                <span className="absolute bottom-0 right-0 left-0 h-0.5 bg-indigo-600 rounded-full" />
              )}
            </button>

            {/* Dropdown Menu for Import */}
            {showImportDropdown && (
              <div className="absolute right-0 top-full mt-1.5 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="text-[11px] font-black text-slate-400 px-3 py-1.5 uppercase tracking-wider">
                  طرق الاستيراد والمسح
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("import");
                    setShowImportDropdown(false);
                  }}
                  className={`w-full text-right px-3 py-2.5 rounded-xl flex items-center gap-2.5 text-xs font-bold transition cursor-pointer ${
                    activeTab === "import"
                      ? "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-600 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-extrabold text-slate-900 dark:text-white">الاستيراد الذكي (Smart AI)</div>
                    <div className="text-[10px] text-slate-400 font-medium">تفريغ وتحليل النصوص مع الإجابات</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("full_page_ocr");
                    setShowImportDropdown(false);
                  }}
                  className={`w-full text-right px-3 py-2.5 rounded-xl flex items-center gap-2.5 text-xs font-bold transition cursor-pointer ${
                    activeTab === "full_page_ocr"
                      ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 flex items-center justify-center shrink-0">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-extrabold text-slate-900 dark:text-white">استخراج صفحة كاملة (OCR)</div>
                    <div className="text-[10px] text-slate-400 font-medium">مسح صفحة مستند واستخراج أسئلتها</div>
                  </div>
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Tab 7: قائمة المزيد (More Tools Dropdown) */}
        <div className="relative shrink-0" ref={moreDropdownRef}>
          <button
            type="button"
            onClick={() => setShowMoreDropdown((prev) => !prev)}
            className={`pb-3 px-2 relative transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === "questions" && selectedStatus === "all"
                ? "text-[#0f6cbd] font-black"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <MoreHorizontal className="w-4.5 h-4.5 text-slate-500" />
            <span>المزيد</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showMoreDropdown ? "rotate-180 text-blue-600" : "text-slate-400"}`} />
            {activeTab === "questions" && selectedStatus === "all" && (
              <span className="absolute bottom-0 right-0 left-0 h-0.5 bg-[#0f6cbd] rounded-full" />
            )}
          </button>

          {/* Dropdown Menu for More Tools */}
          {showMoreDropdown && (
            <div className="absolute left-0 top-full mt-1.5 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="text-[11px] font-black text-slate-400 px-3 py-1.5 uppercase tracking-wider">
                الأدوات والخدمات المتقدمة
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("questions");
                  setSelectedStatus("all");
                  setShowMoreDropdown(false);
                }}
                title="عرض كافة الأسئلة بجميع الحالات (نشط، مسودة، بحاجة مراجعة، مؤرشف)"
                className={`w-full text-right px-3 py-2 rounded-xl flex items-center gap-2.5 text-xs font-bold transition cursor-pointer ${
                  activeTab === "questions" && selectedStatus === "all"
                    ? "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
              >
                <Eye className="w-4 h-4 text-slate-500 shrink-0" />
                <div className="flex flex-col">
                  <span>عرض جميع الحالات</span>
                  <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">
                    إلغاء فلتر الحالة وعرض الكل
                  </span>
                </div>
              </button>

              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

              <button
                type="button"
                onClick={() => {
                  handleDataMigration();
                  setShowMoreDropdown(false);
                }}
                title="إصلاح وترميم ربط المادة والوحدة والدرس (Subject/Unit/Lesson) للأسئلة غير المرتبطة"
                className="w-full text-right px-3 py-2 rounded-xl flex items-center gap-2.5 text-xs font-bold hover:bg-purple-50 dark:hover:bg-purple-950/50 text-purple-700 dark:text-purple-300 transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                <div className="flex flex-col">
                  <span>ربط البيانات بالمنهج</span>
                  <span className="text-[10px] font-normal text-purple-600/70 dark:text-purple-400/70">
                    إصلاح ربط الأسئلة بالمنهاج
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleBatchArchiveLowImportance();
                  setShowMoreDropdown(false);
                }}
                title="أرشفة جماعية آمنة للأسئلة ذات الأهمية المنخفضة (نجمة أو نجمتين) بعد التأكيد"
                className="w-full text-right px-3 py-2 rounded-xl flex items-center gap-2.5 text-xs font-bold hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-700 dark:text-rose-300 transition cursor-pointer"
              >
                <Archive className="w-4 h-4 text-rose-600 shrink-0" />
                <div className="flex flex-col">
                  <span>أرشفة منخفضة الأهمية</span>
                  <span className="text-[10px] font-normal text-rose-600/70 dark:text-rose-400/70">
                    أرشفة الأسئلة الضعيفة بعد التأكيد
                  </span>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* TAB 1: Questions Bank List & Filter */}
      {activeTab === "questions" && (
        <div className="space-y-3">
          {/* 4. Filter Control Panel */}
          <div className="bg-white dark:bg-slate-900 p-3 sm:p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3 text-xs sm:text-sm">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
              {/* Far Right: Advanced Filters Button */}
              <button
                type="button"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`px-3.5 py-2.5 rounded-xl font-extrabold transition flex items-center gap-2 cursor-pointer shrink-0 text-xs sm:text-sm ${
                  showAdvancedFilters || activeAdvancedFiltersCount > 0
                    ? "bg-blue-50 dark:bg-blue-950/60 text-[#0f6cbd] dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                    : "bg-blue-50/50 hover:bg-blue-100 text-[#0f6cbd] dark:bg-blue-950/30 dark:text-blue-300 border border-blue-100 dark:border-blue-900/50"
                }`}
              >
                <Filter className="w-4 h-4" />
                <span>فلتر متقدمة</span>
              </button>

              {/* Filter Select Controls Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 flex-1">
                {/* Subject */}
                <div className="relative">
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
                    {allowedSubjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <span className="absolute right-3 top-0 -translate-y-1/2 bg-white dark:bg-slate-800 px-1 text-xs text-slate-500 font-extrabold pointer-events-none">
                    المادة
                  </span>
                  <ChevronDown className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                {/* Unit */}
                <div className="relative">
                  <select
                    value={selectedUnitId}
                    onChange={(e) => {
                      setSelectedUnitId(e.target.value);
                      setSelectedLessonId("all");
                    }}
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-extrabold text-xs sm:text-sm focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer"
                  >
                    <option value="all">جميع الوحدات</option>
                    {allowedUnits
                      .filter((u) => u && (selectedSubjectId === "all" || u.subjectId === selectedSubjectId))
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.title}
                        </option>
                      ))}
                  </select>
                  <span className="absolute right-3 top-0 -translate-y-1/2 bg-white dark:bg-slate-800 px-1 text-xs text-slate-500 font-extrabold pointer-events-none">
                    الوحدة
                  </span>
                  <ChevronDown className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                {/* Lesson */}
                <div className="relative">
                  <select
                    value={selectedLessonId}
                    onChange={(e) => setSelectedLessonId(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-extrabold text-xs sm:text-sm focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer"
                  >
                    <option value="all">جميع الدروس</option>
                    {allowedLessons
                      .filter((l) => {
                        if (!l) return false;
                        if (selectedUnitId !== "all") return l.unitId === selectedUnitId;
                        if (selectedSubjectId !== "all") {
                          return allowedUnits.some((u) => u && u.id === l.unitId && u.subjectId === selectedSubjectId);
                        }
                        return true;
                      })
                      .map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.title}
                        </option>
                      ))}
                  </select>
                  <span className="absolute right-3 top-0 -translate-y-1/2 bg-white dark:bg-slate-800 px-1 text-xs text-slate-500 font-extrabold pointer-events-none">
                    الدرس
                  </span>
                  <ChevronDown className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                {/* Question Type */}
                <div className="relative">
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
                  <span className="absolute right-3 top-0 -translate-y-1/2 bg-white dark:bg-slate-800 px-1 text-xs text-slate-500 font-extrabold pointer-events-none">
                    نوع السؤال
                  </span>
                  <ChevronDown className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Search Box */}
              <div className="relative w-full lg:w-64 shrink-0">
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

            {/* Sub-row: Clear Filters, Global Show/Hide Answers & Sort Option */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="text-xs sm:text-sm font-extrabold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-4 h-4 text-blue-600" />
                  <span>مسح الفلاتر</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const isAllExpanded =
                      filteredQuestions.length > 0 &&
                      filteredQuestions
                        .filter((q) => hasAnswer(q))
                        .every((q) => expandedAnswers[q.id]);
                    if (isAllExpanded) {
                      handleCollapseAllAnswers();
                    } else {
                      handleExpandAllAnswers();
                    }
                  }}
                  className="text-xs sm:text-sm font-extrabold text-slate-700 dark:text-slate-300 hover:text-[#0f6cbd] flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 transition cursor-pointer"
                  title="توسيع أو طي جميع الإجابات النموذجية لجميع الأسئلة المعروضة"
                >
                  {filteredQuestions.length > 0 &&
                  filteredQuestions
                    .filter((q) => hasAnswer(q))
                    .every((q) => expandedAnswers[q.id]) ? (
                    <>
                      <EyeOff className="w-4 h-4 text-slate-500" />
                      <span>إخفاء كافة الإجابات</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 text-blue-600" />
                      <span>إظهار كافة الإجابات</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSortBy(sortBy === "newest" ? "oldest" : sortBy === "oldest" ? "importance" : "newest")}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowUpDown className="w-4 h-4 text-slate-500" />
                  <span>ترتيب: {sortBy === "newest" ? "الأحدث أولاً" : sortBy === "oldest" ? "الأقدم أولاً" : "حسب الأهمية"}</span>
                </button>
              </div>
            </div>

            {/* Collapsible Advanced Filters Drawer */}
            {showAdvancedFilters && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/70 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 text-xs sm:text-sm">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-extrabold mb-1">
                    مستوى الصعوبة
                  </label>
                  <select
                    value={selectedDifficulty}
                    onChange={(e) => setSelectedDifficulty(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                  >
                    <option value="all">جميع المستويات</option>
                    <option value="easy">سهل</option>
                    <option value="medium">متوسط</option>
                    <option value="hard">صعب</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-extrabold mb-1">
                    تصنيف الأهمية
                  </label>
                  <select
                    value={minImportance}
                    onChange={(e) => setMinImportance(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                  >
                    <option value={0}>جميع الدرجات (1 - 5)</option>
                    <option value={3}>3 نجوم أو أعلى</option>
                    <option value={4}>4 نجوم أو أعلى (هام جداً)</option>
                    <option value={5}>5 نجوم (أساس ومحوري)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-extrabold mb-1">
                    تاريخ الاستخدام
                  </label>
                  <select
                    value={selectedUsage}
                    onChange={(e) => setSelectedUsage(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                  >
                    <option value="all">جميع الأسئلة (الكل)</option>
                    <option value="used">المدرجة في الاختبارات</option>
                    <option value="unused">غير المدرجة (جديدة)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-extrabold mb-1">
                    حالة الإجابة
                  </label>
                  <select
                    value={selectedAnswerStatus}
                    onChange={(e) => setSelectedAnswerStatus(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                  >
                    <option value="all">جميع الأسئلة</option>
                    <option value="empty">بدون إجابة (فارغة)</option>
                    <option value="has_answer">تملك إجابة</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* 5. Pagination & View Mode Switcher Header */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-extrabold px-1 pt-1">
            <div>
              عرض {sortedQuestions.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} - {Math.min(currentPage * pageSize, sortedQuestions.length)} من {sortedQuestions.length} سؤال
            </div>

            <div className="flex items-center gap-3">
              {/* Pagination controls */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight className="w-4.5 h-4.5" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-xl font-black text-xs sm:text-sm transition cursor-pointer ${
                      currentPage === page
                        ? "bg-[#0f6cbd] text-white"
                        : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    {page}
                  </button>
                ))}

                {totalPages > 5 && <span className="px-1 text-slate-400">...</span>}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Page Size Select */}
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-extrabold text-xs sm:text-sm cursor-pointer"
              >
                <option value={10}>10 / صفحة</option>
                <option value={20}>20 / صفحة</option>
                <option value={50}>50 / صفحة</option>
              </select>

              {/* Grid / List view mode switcher */}
              <div className="flex items-center gap-0.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    viewMode === "list"
                      ? "bg-[#0f6cbd] text-white"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                  title="عرض القائمة"
                >
                  <List className="w-4.5 h-4.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    viewMode === "grid"
                      ? "bg-[#0f6cbd] text-white"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                  title="عرض الشبكة"
                >
                  <LayoutGrid className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          </div>

          {/* 6. Question Cards List / Grid View */}
          <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 gap-3.5" : "space-y-3.5"}>
            {paginatedQuestions.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-xs sm:text-sm font-bold text-slate-500 col-span-full">
                {selectedStatus === "archived"
                  ? "لا توجد أسئلة مؤرشفة حالياً."
                  : "لا توجد أسئلة تطابق معايير الفلترة الحالية."}
              </div>
            ) : (
              paginatedQuestions.map((q, idx) => {
                if (!q) return null;
                const sub = subjects.find((s) => s && s.id === q.subjectId);
                const isArchived = q.status === "archived";
                const isHighlighted = focusedQuestionId === q.id;

                const linkedLessons = lessons.filter(l => 
                  l && (
                    l.id === q.lessonId || 
                    q.lessonIds?.includes(l.id) || 
                    l.questionIds?.includes(q.id)
                  )
                );

                return (
                  <div
                    key={q.id}
                    id={`qbank-card-${q.id}`}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all duration-300 space-y-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-700 shadow-2xs ${
                      isHighlighted ? "ring-2 ring-blue-500 border-blue-500" : ""
                    }`}
                  >
                    {/* Card Header matching Reference */}
                    <div className="flex items-start justify-between gap-3">
                      {/* Right: Badges */}
                      <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-extrabold">
                        <span className="px-3 py-1 rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-100 dark:border-blue-900/40">
                          {QUESTION_TYPES_LABEL[q.type] || q.type}
                        </span>
                        <span className="px-3 py-1 rounded-xl bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-100 dark:border-purple-900/40">
                          {sub?.name || q.subjectName || "رياضيات"}
                        </span>
                        <span className="px-3 py-1 rounded-xl bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-100 dark:border-amber-900/40 flex items-center gap-1">
                          <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                          <span>الأهمية: {q.importance || 1}/5</span>
                        </span>
                        <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/40 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>محلول</span>
                        </span>
                      </div>

                      {/* Left: Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="checkbox"
                          className="w-4.5 h-4.5 text-blue-600 rounded-md border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />
                        {canDeleteQuestion && (!q.subjectId || canAccessSubject(currentUser, q.subjectId)) && (
                          <button
                            type="button"
                            onClick={() => setDeletingQuestion(q)}
                            className="p-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        {canEditQuestion && (!q.subjectId || canAccessSubject(currentUser, q.subjectId)) && (
                          <button
                            type="button"
                            onClick={() => openEditModal(q)}
                            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            title="تعديل"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {canCreateQuestion && (!q.subjectId || canAccessSubject(currentUser, q.subjectId)) && (
                          <button
                            type="button"
                            onClick={() => {
                              const dup = { ...q, id: `q-${Date.now()}` };
                              onSaveQuestion(dup);
                            }}
                            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            title="نسخ"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        )}
                        {canEditQuestion && (!q.subjectId || canAccessSubject(currentUser, q.subjectId)) && (
                          <button
                            type="button"
                            onClick={() => isArchived ? handleRestoreQuestion(q) : handleArchiveQuestion(q)}
                            className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 text-xs sm:text-sm font-extrabold hover:bg-amber-100 transition cursor-pointer"
                          >
                            {isArchived ? "استعادة" : "أرشفة"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* ID Subline */}
                    <div className="text-xs font-mono font-bold text-slate-400">
                      ID: {q.id}
                    </div>

                    {/* Question Content Box */}
                    <div className="p-3.5 sm:p-4 bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2.5">
                      <div className="text-base sm:text-lg lg:text-[19px] font-black leading-relaxed text-slate-900 dark:text-white">
                        <LazyQuestionWrapper>
                          <QuestionRenderer question={q} questionNumber={idx + 1 + (currentPage - 1) * pageSize} numberFormat="dash" mode="compact" showMarks={false} showAnswerKey={expandedAnswers[q.id]} suppressAnswerBox={true} />
                        </LazyQuestionWrapper>
                      </div>

                      {/* Expand Answer Button */}
                      {hasAnswer(q) && (
                        <div className="pt-2 flex justify-start">
                          <button
                            type="button"
                            onClick={() => toggleAnswer(q.id)}
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
                        <div className="mt-2.5 animate-in fade-in duration-200">
                          <QuestionAnswerKeyBox question={q} />
                        </div>
                      )}
                    </div>

                    {/* Footer Metadata Line matching Reference */}
                    <div className="flex flex-wrap items-center justify-between text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                        <span>الوحدة: {units.find((u) => u.id === q.unitId)?.title || q.unitTitle || "المصفوفات"}</span>
                        <span className="text-slate-300 dark:text-slate-700">|</span>
                        <span>الدرس: {lessons.find((l) => l.id === q.lessonId)?.title || q.lessonTitle || "إثبات طريقة غاوس"}</span>
                        <span className="text-slate-300 dark:text-slate-700">|</span>
                        <span>الصعوبة: {q.difficulty === "easy" ? "سهلة" : q.difficulty === "medium" ? "متوسطة" : "صعبة"}</span>
                        <span className="text-slate-300 dark:text-slate-700">|</span>
                        <span>تاريخ الإضافة: {q.createdAt ? new Date(q.createdAt).toLocaleDateString("ar-EG") : "2026/08/23"}</span>
                        <span className="text-slate-300 dark:text-slate-700">|</span>
                        <span>حالة الإجابة: {hasAnswer(q) ? "محلول" : "غير محلول"}</span>
                      </div>

                      <button type="button" className="p-1 text-slate-400 hover:text-slate-600 transition cursor-pointer">
                        <MoreHorizontal className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}


      {/* UNIFIED IMPORT PIPELINES CONTAINER */}
      {isImportTab(activeTab) && (
        <div className="space-y-4">
          {/* Sub Navigation Bar for Import Modes */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 w-fit max-w-full overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab("import")}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
                activeTab === "import"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>الاستيراد الذكي (Smart AI)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("full_page_ocr")}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
                activeTab === "full_page_ocr"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Upload className="w-4 h-4 text-indigo-600" />
              <span>صفحة كاملة (OCR)</span>
            </button>
          </div>

          <div className="min-h-0">
            {/* TAB 3: Bulk AI Import Parser */}
            {activeTab === "import" && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-w-5xl mx-auto">
          <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <span>الاستيراد الذكي: تفريغ النصوص الخارجية إلى أسئلة مصنفة مع الإجابات النموذجية</span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            الصق نص امتحان سابق أو فقرة دراسية، وسيشارك الذكاء الاصطناعي بتقسيمه
            إلى أسئلة منفصلة مع استخراج الإجابة والصعوبة ودرجة الأهمية.
          </p>

          <div className="flex flex-col gap-4 text-sm mb-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-slate-500 text-xs font-semibold mb-1.5">اسم المرجع/الكتاب</label>
                <input
                  type="text"
                  value={importBookSource}
                  onChange={(e) => setImportBookSource(e.target.value)}
                  placeholder="مثال: كتاب الرياضيات"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-500 text-xs font-semibold mb-1.5">رقم الصفحة</label>
                <input
                  type="text"
                  value={importPageNumber}
                  onChange={(e) => setImportPageNumber(e.target.value)}
                  placeholder="مثال: 125"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-500 text-xs font-semibold mb-1.5">رقم التمرين</label>
                <input
                  type="text"
                  value={importExerciseNumber}
                  onChange={(e) => setImportExerciseNumber(e.target.value)}
                  placeholder="مثال: 4 أ"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-500 text-xs font-semibold mb-1.5">عنوان السؤال (اختياري)</label>
                <input
                  type="text"
                  value={importQuestionTitle}
                  onChange={(e) => setImportQuestionTitle(e.target.value)}
                  placeholder="مثال: مبرهنة فيثاغورس"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium text-xs"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-500 font-semibold mb-1.5">
                  المادة المستهدفة
                </label>
              <select
                value={importSubjectId}
                onChange={(e) => {
                  setImportSubjectId(e.target.value);
                  setImportUnitId("");
                  setImportLessonId("");
                }}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
              >
                <option value="" disabled>
                  اختر المادة...
                </option>
                {allowedSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-500 font-semibold mb-1.5">
                الوحدة
              </label>
              <select
                value={importUnitId}
                onChange={(e) => {
                  setImportUnitId(e.target.value);
                  setImportLessonId("");
                }}
                disabled={!importSubjectId}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
              >
                <option value="" disabled>
                  اختر الوحدة...
                </option>
                {allowedUnits
                  .filter((u) => u && u.subjectId === importSubjectId)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.title}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-500 font-semibold mb-1.5">
                الدرس
              </label>
              <select
                value={importLessonId}
                onChange={(e) => setImportLessonId(e.target.value)}
                disabled={!importUnitId}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
              >
                <option value="" disabled>
                  اختر الدرس...
                </option>
                {allowedLessons
                  .filter((l) => l && l.unitId === importUnitId)
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          </div>
          <div className="w-full min-h-[400px] h-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
            <RichTextEditor
              value={rawImportText}
              onChange={setRawImportText}
              placeholder="الصق الأسئلة أو نص الاختيار من متعدد هنا..."
            />
          </div>

          <div className="flex flex-col gap-1.5 mt-4 mb-4">
            <label className="block text-slate-500 font-semibold text-sm">
              نمط الاستخراج
            </label>
            <select
              value={importPattern}
              onChange={(e) => setImportPattern(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium text-sm"
            >
              <option value="auto">تلقائي (حسب النص)</option>
              <option value="mcq">فرض اختيار من متعدد (MCQ)</option>
              <option value="true_false">فرض صح وخطأ</option>
              <option value="essay">فرض أسئلة مقالية</option>
              <option value="fill_blanks">فرض إكمال فراغات</option>
              <option value="problem">فرض مسألة / تطبيق</option>
              <option value="reason">فرض تعليل / تفسير</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={handleBulkImport}
              disabled={importingText || !rawImportText.trim()}
              className="py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {importingText ? (
                <span>جاري التحليل والاستخراج بواسطة AI Gateway...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>تحليل واستخراج الأسئلة (سريع)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowExecutionCenterForImport(true)}
              disabled={importingText || !rawImportText.trim()}
              className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-300 dark:border-slate-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Sliders className="w-4 h-4 text-blue-500" />
              <span>مركز التنفيذ العالمي للذكاء الاصطناعي (14B)</span>
            </button>
          </div>

          {showExecutionCenterForImport && (
            <AIExecutionCenterModal
              isOpen={showExecutionCenterForImport}
              onClose={() => setShowExecutionCenterForImport(false)}
              taskType="smart_import"
              taskPayload={{
                title: "استيراد وتحليل الأسئلة الذكي",
                previewText: rawImportText,
                subjectName: allowedSubjects.find((s) => s.id === importSubjectId)?.name || "عام",
              }}
              onExecute={async (opts) => {
                const selectedSubjectName =
                  allowedSubjects.find((s) => s.id === importSubjectId)?.name || "عام";
                const res = await aiService.parseTextQuestions(
                  rawImportText,
                  selectedSubjectName,
                  importPattern,
                  {
                    mode: opts.mode,
                    specificModelId: opts.specificModelId,
                    abortSignal: opts.abortSignal,
                    onProgress: opts.onProgress,
                  }
                );
                return res;
              }}
              onSuccessResult={(res) => {
                if (res?.parsedQuestions && res.parsedQuestions.length > 0) {
                  // Process questions
                  const availableImportUnits = allowedUnits.filter((u) => u && u.subjectId === importSubjectId);
                  const availableImportLessons = allowedLessons.filter((l) => l && l.unitId === importUnitId);

                  const finalImportUnitId = importUnitId;
                  const finalImportLessonId = importLessonId;

                  // DATA-1 Guardrail
                  const validation = validateCurriculumContext(importSubjectId, finalImportUnitId, finalImportLessonId);
                  if (!validation.isValid) {
                    alert("فشل التحقق من المنهاج للاستيراد الذكي المتقدم:\n\n" + validation.errors.join("\n"));
                    console.error("[DATA-1] Bulk Import (Advanced) Curriculum Validation Failed:", validation.errors);
                    return;
                  }

                  const generatedList: Question[] = res.parsedQuestions.map((pq: any, idx: number) => {
                    const rawAnswer = (pq.answer || "").trim();
                    const qType = (pq.type as QuestionType) || "essay";
                    let distractorsList: { id: string; text: string; isCorrect: boolean }[] | undefined = undefined;

                    if (qType === "mcq") {
                      const rawDistractors: any[] = Array.isArray(pq.distractors) ? pq.distractors : [];
                      let optionsTextList: { text: string; isCorrect: boolean }[] = [];
                      let foundCorrect = false;

                      rawDistractors.forEach((dItem: any) => {
                        const textStr = (typeof dItem === "string" ? dItem : dItem.text || "").trim();
                        if (!textStr) return;
                        const explicitCorrect = typeof dItem === "object" && dItem.isCorrect !== undefined ? Boolean(dItem.isCorrect) : false;
                        const matchesAnswer = Boolean(rawAnswer && textStr.toLowerCase() === rawAnswer.toLowerCase());
                        const isCorr = explicitCorrect || matchesAnswer;
                        if (isCorr) foundCorrect = true;
                        optionsTextList.push({ text: textStr, isCorrect: isCorr });
                      });

                      if (rawAnswer && !foundCorrect) {
                        optionsTextList.unshift({ text: rawAnswer, isCorrect: true });
                      }

                      distractorsList = optionsTextList.map((opt, i) => ({
                        id: `d-${Date.now()}-${idx}-${i}-${Math.random().toString(36).substring(2, 5)}`,
                        text: opt.text,
                        isCorrect: opt.isCorrect,
                      }));
                    }

                    const bookRefPayload = (pq.bookReference || importBookSource || importPageNumber || importExerciseNumber || importQuestionTitle) ? {
                      bookSource: (pq.bookReference?.bookSource) || importBookSource || "",
                      pageNumber: (pq.bookReference?.pageNumber) || importPageNumber || "",
                      questionTitle: (pq.bookReference?.questionTitle) || importQuestionTitle || "",
                      exerciseNumber: (pq.bookReference?.exerciseNumber) || importExerciseNumber || "",
                      showInCard: true,
                      showInPrint: true,
                    } : undefined;

                    return {
                      id: `q-imp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
                      subjectId: importSubjectId,
                      bookReference: bookRefPayload,
                      unitId: finalImportUnitId,
                      lessonId: finalImportLessonId,
                      type: qType,
                      text: pq.text || "",
                      answer: rawAnswer,
                      status: "active",
                      distractors: distractorsList,
                      difficulty: pq.difficulty || "medium",
                      importance: pq.importance || 4,
                      tags: ["استيراد آلي 14B"],
                      isPastCycle: false,
                      occurrencesCount: 0,
                      futureProbability: pq.futureProb || 75,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    };
                  });

                  setExtractedQuestionsForPreview(generatedList);
                  setSelectedImportQuestionIds(new Set(generatedList.map((q) => q.id)));
                }
              }}
            />
          )}
        </div>
      )}

      {/* TAB: Full Page OCR */}
      {activeTab === "full_page_ocr" && (
        <FullPageOcrPipeline
          onSaveQuestion={onSaveQuestion}
          subjects={allowedSubjects}
          units={allowedUnits}
          lessons={allowedLessons}
        />
      )}


          </div>
        </div>
      )}

      {/* AI Distractor Modal Trigger */}
      {showAiDistractorModal && (
        <AiDistractorModal
          questionText={formText}
          questionType={formType}
          answerText={formAnswer}
          subjectName={
            subjects.find((s) => s.id === formSubjectId)?.name || "عام"
          }
          onApplyDistractors={(distractors) => {
            setFormDistractors(
              distractors.map((d, i) => ({
                id: `d-${i}`,
                text: d.text,
                isCorrect: d.isCorrect,
              })),
            );
          }}
          onClose={() => setShowAiDistractorModal(false)}
        />
      )}

      {/* Delete Question Confirmation Modal (with usage checking & protection) */}
      {deletingQuestion && (() => {
        const usage = storage.checkQuestionUsage(deletingQuestion.id);
        if (usage.inUse) {
          return (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-amber-200 dark:border-amber-800 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      حظر حذف السؤال (السؤال مستخدم)
                    </h3>
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                      لا يمكن الحذف النهائي للحفاظ على سلامة الدروس والاختبارات
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 line-clamp-2">
                    <MathText text={deletingQuestion.text} />
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 max-h-48 overflow-y-auto pr-1">
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    هذا السؤال مرتبط بالعناصر التالية ولا يمكن حذفه من البنك:
                  </p>
                  
                  {(usage.lessons || []).length > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-950/30 p-2.5 rounded-lg border border-blue-200 dark:border-blue-800/50 space-y-1">
                      <span className="font-bold text-blue-700 dark:text-blue-300 block">📚 الدروس المرتبطة ({(usage.lessons || []).length}):</span>
                      <ul className="list-disc list-inside text-blue-800 dark:text-blue-200 space-y-0.5">
                        {(usage.lessons || []).map((l, idx) => (
                          <li key={idx}>{l.title}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {(usage.lessonCards || []).length > 0 && (
                    <div className="bg-indigo-50 dark:bg-indigo-950/30 p-2.5 rounded-lg border border-indigo-200 dark:border-indigo-800/50 space-y-1">
                      <span className="font-bold text-indigo-700 dark:text-indigo-300 block">🃏 بطاقات شرائح الدروس ({(usage.lessonCards || []).length}):</span>
                      <ul className="list-disc list-inside text-indigo-800 dark:text-indigo-200 space-y-0.5">
                        {(usage.lessonCards || []).map((c, idx) => (
                          <li key={idx}>{c.cardTitle} (درس: {c.lessonTitle})</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {(usage.exams || []).length > 0 && (
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800/50 space-y-1">
                      <span className="font-bold text-emerald-700 dark:text-emerald-300 block">📝 نماذج الاختبارات الحالية ({(usage.exams || []).length}):</span>
                      <ul className="list-disc list-inside text-emerald-800 dark:text-emerald-200 space-y-0.5">
                        {(usage.exams || []).map((e, idx) => (
                          <li key={idx}>{e.title}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {(usage.libraryDocs || []).length > 0 && (
                    <div className="bg-purple-50 dark:bg-purple-950/30 p-2.5 rounded-lg border border-purple-200 dark:border-purple-800/50 space-y-1">
                      <span className="font-bold text-purple-700 dark:text-purple-300 block">📂 أرشيف ومكتبة الاختبارات ({(usage.libraryDocs || []).length}):</span>
                      <ul className="list-disc list-inside text-purple-800 dark:text-purple-200 space-y-0.5">
                        {(usage.libraryDocs || []).map((d, idx) => (
                          <li key={idx}>{d.title}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex flex-wrap justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setDeletingQuestion(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      storage.archiveQuestion(deletingQuestion.id);
                      setDeletingQuestion(null);
                      alert("تم نقل السؤال إلى الأرشيف بنجاح مع الحفاظ على جميع ارتباطاته بالدروس والاختبارات.");
                    }}
                    className="px-4 py-2 rounded-xl font-bold text-xs bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition flex items-center gap-1.5"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    أرشفة السؤال بدلاً من الحذف
                  </button>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    حذف السؤال من البنك
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    تأكيد عملية الحذف
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                هل أنت متأكد من حذف هذا السؤال: "{deletingQuestion.text}"؟ هذا السؤال غير مرتبط بأي درس أو اختبار حالياً. لا يمكن التراجع عن هذا الإجراء.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingQuestion(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const res = storage.deleteQuestion(deletingQuestion.id);
                    if (res && !res.success) {
                      alert(res.message);
                    } else {
                      onDeleteQuestion(deletingQuestion.id);
                    }
                    setDeletingQuestion(null);
                  }}
                  className="px-4 py-2 rounded-xl font-bold text-xs bg-red-600 hover:bg-red-700 text-white shadow-xs transition"
                >
                  حذف السؤال
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Archive Question Confirmation Modal */}
      {confirmArchiveDialog.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Archive className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {confirmArchiveDialog.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  إدارة الأرشيف وتصنيف الأهمية
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {confirmArchiveDialog.message}
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() =>
                  setConfirmArchiveDialog({
                    ...confirmArchiveDialog,
                    isOpen: false,
                  })
                }
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmArchiveDialog.onConfirm();
                  setConfirmArchiveDialog({
                    ...confirmArchiveDialog,
                    isOpen: false,
                  });
                }}
                className="px-4 py-2 rounded-xl font-bold text-xs bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition flex items-center gap-1.5"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>
                  {confirmArchiveDialog.confirmText || "تأكيد الأرشفة"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Extracted Questions Preview & Selection Modal */}
      {extractedQuestionsForPreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-5xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 my-auto max-h-[92vh] flex flex-col space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">
                      معاينة وانتقاء الأسئلة المستخرجة بالذكاء الاصطناعي
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                      {extractedQuestionsForPreview.length} أسئلة
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                    <span>الوجهة المستهدفة:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {subjects.find((s) => s.id === importSubjectId)?.name || "عام"}
                    </span>
                    {importUnitId && (
                      <>
                        <span>•</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {units.find((u) => u.id === importUnitId)?.title}
                        </span>
                      </>
                    )}
                    {importLessonId && (
                      <>
                        <span>•</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {lessons.find((l) => l.id === importLessonId)?.title}
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setExtractedQuestionsForPreview(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title="إغلاق وكسر المعاينة"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selection Toolbar */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-700/70 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllCandidates}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-extrabold hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center gap-1.5 shadow-2xs"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                  <span>تحديد الكل</span>
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAllCandidates}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-extrabold hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center gap-1.5 shadow-2xs"
                >
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                  <span>إلغاء تحديد الكل</span>
                </button>

                {extractedQuestionsForPreview.some((q) => !hasAnswer(q) || q.status === "requires_review") && (
                  <button
                    type="button"
                    disabled={isBatchSolving}
                    onClick={handleBatchSolveIncompleteCandidates}
                    className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isBatchSolving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>جاري توليد الإجابات للأسئلة الناقصة...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                        <span>حل جميع الأسئلة الناقصة بالذكاء الاصطناعي ({extractedQuestionsForPreview.filter((q) => !hasAnswer(q) || q.status === "requires_review").length})</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
                  selectedImportQuestionIds.size > 0
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                }`}>
                  تم تحديد {selectedImportQuestionIds.size} من {extractedQuestionsForPreview.length} سؤال
                </span>
              </div>
            </div>

            {/* Scrollable Questions List */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 pl-1 max-h-[50vh]">
              {extractedQuestionsForPreview.map((q, idx) => {
                const isSelected = selectedImportQuestionIds.has(q.id);
                const isEditing = editingCandidateId === q.id;

                if (isEditing && editingCandidateData) {
                  return (
                    <div
                      key={q.id}
                      className="p-4 rounded-2xl border-2 border-blue-500 bg-blue-50/40 dark:bg-blue-950/40 space-y-3"
                    >
                      <div className="flex items-center justify-between font-bold text-xs text-blue-800 dark:text-blue-300">
                        <span>تعديل السؤال المستخرج #{idx + 1}</span>
                        <span>محتوى الخيارات والأنماط</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs mb-3">
                        <div>
                          <label className="block text-slate-500 mb-1 font-semibold">المادة</label>
                          <select
                            value={editingCandidateData.subjectId || ""}
                            onChange={(e) => setEditingCandidateData({...editingCandidateData, subjectId: e.target.value})}
                            className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-xs font-bold"
                          >
                            {allowedSubjects.map((subj) => (
                              <option key={subj.id} value={subj.id}>{subj.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-slate-500 mb-1 font-semibold">الوحدة / الفصل</label>
                          <select
                            value={editingCandidateData.unitId || ""}
                            onChange={(e) => setEditingCandidateData({...editingCandidateData, unitId: e.target.value})}
                            className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-xs font-bold"
                          >
                            {units.filter(u => u && u.subjectId === editingCandidateData.subjectId).map((u) => (
                              <option key={u.id} value={u.id}>{u.title}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-slate-500 mb-1 font-semibold">الدرس</label>
                          <select
                            value={editingCandidateData.lessonId || ""}
                            onChange={(e) => setEditingCandidateData({...editingCandidateData, lessonId: e.target.value})}
                            className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-xs font-bold"
                          >
                            {lessons.filter(l => l && l.unitId === editingCandidateData.unitId).map((l) => (
                              <option key={l.id} value={l.id}>{l.title}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-slate-500 mb-1 font-semibold">نوع السؤال</label>
                          <select
                            value={editingCandidateData.type}
                            onChange={(e) =>
                              setEditingCandidateData({
                                ...editingCandidateData,
                                type: e.target.value as QuestionType,
                              })
                            }
                            className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-xs font-bold"
                          >
                            {Object.entries(QUESTION_TYPES_LABEL).map(([k, label]) => (
                              <option key={k} value={k}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-slate-500 mb-1 font-semibold">مستوى الصعوبة</label>
                          <select
                            value={editingCandidateData.difficulty}
                            onChange={(e) =>
                              setEditingCandidateData({
                                ...editingCandidateData,
                                difficulty: e.target.value as any,
                              })
                            }
                            className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-xs font-bold"
                          >
                            <option value="easy">سهل</option>
                            <option value="medium">متوسط</option>
                            <option value="hard">صعب</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-slate-500 mb-1 font-semibold">درجة الأهمية (1-5)</label>
                          <select
                            value={editingCandidateData.importance}
                            onChange={(e) =>
                              setEditingCandidateData({
                                ...editingCandidateData,
                                importance: Number(e.target.value) as any,
                              })
                            }
                            className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-xs font-bold"
                          >
                            {[1, 2, 3, 4, 5].map((num) => (
                              <option key={num} value={num}>
                                أهمية {num}/5
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Book Reference Block */}
                      <div className="border border-slate-300 dark:border-slate-700 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">البيانات المرجعية للبطاقة (Metadata)</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div>
                            <input
                              type="text"
                              value={editingCandidateData.bookReference?.bookSource || ""}
                              onChange={(e) => setEditingCandidateData({...editingCandidateData, bookReference: {...(editingCandidateData.bookReference || { bookSource: "", pageNumber: "", exerciseNumber: "", questionTitle: "", showInCard: true, showInPrint: true }), bookSource: e.target.value}})}
                              placeholder="اسم المصدر/الكتاب"
                              className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-900 text-xs font-medium"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              value={editingCandidateData.bookReference?.pageNumber || ""}
                              onChange={(e) => setEditingCandidateData({...editingCandidateData, bookReference: {...(editingCandidateData.bookReference || { bookSource: "", pageNumber: "", exerciseNumber: "", questionTitle: "", showInCard: true, showInPrint: true }), pageNumber: e.target.value}})}
                              placeholder="رقم الصفحة"
                              className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-900 text-xs font-medium"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              value={editingCandidateData.bookReference?.exerciseNumber || ""}
                              onChange={(e) => setEditingCandidateData({...editingCandidateData, bookReference: {...(editingCandidateData.bookReference || { bookSource: "", pageNumber: "", exerciseNumber: "", questionTitle: "", showInCard: true, showInPrint: true }), exerciseNumber: e.target.value}})}
                              placeholder="رقم التمرين/السؤال"
                              className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-900 text-xs font-medium"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              value={editingCandidateData.bookReference?.questionTitle || ""}
                              onChange={(e) => setEditingCandidateData({...editingCandidateData, bookReference: {...(editingCandidateData.bookReference || { bookSource: "", pageNumber: "", exerciseNumber: "", questionTitle: "", showInCard: true, showInPrint: true }), questionTitle: e.target.value}})}
                              placeholder="عنوان السؤال/الفقرة"
                              className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-900 text-xs font-medium"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3">
                        <div className="border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 min-h-[100px] bg-white dark:bg-slate-900">
                          <div className="bg-slate-100 dark:bg-slate-800 p-1.5 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300">نص السؤال</div>
                          <RichTextEditor
                            value={editingCandidateData.text}
                            onChange={(val) =>
                              setEditingCandidateData({
                                ...editingCandidateData,
                                text: val,
                              })
                            }
                            placeholder="أدخل نص السؤال هنا..."
                          />
                        </div>

                        <div className="border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 min-h-[80px] bg-white dark:bg-slate-900">
                          <div className="bg-slate-100 dark:bg-slate-800 p-1.5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">الإجابة النموذجية أو خطوات الحل</span>
                            <button
                              type="button"
                              onClick={() => setShowAISolver(true)}
                              className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-100/50 hover:bg-blue-200 text-blue-700 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-300 rounded transition text-[10px] font-bold"
                            >
                              <Sparkles className="w-3 h-3" />
                              حل بالذكاء الاصطناعي
                            </button>
                          </div>
                          <RichTextEditor
                            value={editingCandidateData.answer}
                            onChange={(val) =>
                              setEditingCandidateData({
                                ...editingCandidateData,
                                answer: val,
                              })
                            }
                            placeholder="أدخل الإجابة النموذجية..."
                          />
                        </div>

                        {(editingCandidateData.type === 'mcq' || editingCandidateData.type === 'true_false') && (
                          <div className="border border-slate-300 dark:border-slate-700 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">خيارات الإجابة المتعددة</label>
                            <div className="space-y-2">
                              {editingCandidateData.distractors?.map((distractor, dIdx) => (
                                <div key={dIdx} className="flex gap-2 items-center">
                                  <input
                                    type="radio"
                                    name={`editing-candidate-${editingCandidateData.id}-correct`}
                                    checked={distractor.isCorrect}
                                    onChange={() => {
                                      const newDistractors = [...(editingCandidateData.distractors || [])];
                                      newDistractors.forEach((d, idx) => {
                                        d.isCorrect = idx === dIdx;
                                      });
                                      setEditingCandidateData({
                                        ...editingCandidateData,
                                        distractors: newDistractors,
                                        answer: newDistractors[dIdx]?.text || editingCandidateData.answer
                                      });
                                    }}
                                    className="w-4 h-4 text-blue-600 cursor-pointer"
                                  />
                                  <span className="text-xs font-bold w-4 shrink-0 text-slate-500">{["أ", "ب", "ج", "د", "هـ", "و"][dIdx] || "-"}:</span>
                                  <div className="flex-1 min-w-[200px] border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-blue-500">
                                    <RichTextEditor
                                      value={distractor.text}
                                      onChange={(val) => {
                                        const newDistractors = [...(editingCandidateData.distractors || [])];
                                        newDistractors[dIdx] = { ...newDistractors[dIdx], text: val };
                                        setEditingCandidateData({
                                          ...editingCandidateData,
                                          distractors: newDistractors,
                                          answer: distractor.isCorrect ? val : editingCandidateData.answer
                                        });
                                      }}
                                      placeholder={`الخيار ${dIdx + 1}`}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCandidateId(null);
                            setEditingCandidateData(null);
                          }}
                          className="px-3 py-1.5 rounded-xl border border-slate-300 text-slate-600 font-bold text-xs hover:bg-slate-100 transition"
                        >
                          إلغاء التعديل
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveCandidateEdit}
                          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition"
                        >
                          حفظ التعديلات
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={q.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isSelected
                        ? "border-blue-500 dark:border-blue-500 bg-blue-50/20 dark:bg-blue-950/20 shadow-xs"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 opacity-60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectCandidate(q.id)}
                          className="w-5 h-5 rounded-md text-blue-600 border-slate-300 focus:ring-blue-500 mt-1 cursor-pointer shrink-0"
                        />
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-extrabold text-slate-900 dark:text-white">
                              سؤال #{idx + 1}
                            </span>
                            {q.status === "requires_review" && (
                              <span className="px-2 py-0.5 rounded font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                                ⚠️ يحتاج مراجعة
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded font-bold bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                              {QUESTION_TYPES_LABEL[q.type] || q.type}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded font-bold ${
                                q.difficulty === "easy"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  : q.difficulty === "medium"
                                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                    : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                              }`}
                            >
                              {q.difficulty === "easy"
                                ? "سهل"
                                : q.difficulty === "medium"
                                  ? "متوسط"
                                  : "صعب"}
                            </span>
                            <span className="px-2 py-0.5 rounded font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                              أهمية {q.importance || 4}/5
                            </span>
                          </div>

                          <div className="text-sm font-extrabold text-slate-900 dark:text-white pt-1">
                            <LazyQuestionWrapper><QuestionRenderer question={q} questionNumber={idx + 1} numberFormat="dash" mode="compact" showMarks={false} showAnswerKey={expandedAnswers[q.id]} suppressAnswerBox={true} /></LazyQuestionWrapper>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEditingCandidate(q)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          title="تعديل هذا السؤال"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCandidateFromPreview(q.id)}
                          className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                          title="استبعاد من القائمة"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Options / Distractors preview if present */}
                    {q.distractors && q.distractors.length > 0 && (
                      <div className="w-full overflow-x-auto pt-2 mt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                        <table className="w-full table-fixed border-collapse border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden text-xs" dir="rtl">
                          <tbody>
                            <tr className="align-middle">
                              {q.distractors.map((d: any, dIdx: number) => {
                                const isStr = typeof d === "string";
                                const id = isStr ? "d-" + dIdx : d.id || "d-" + dIdx;
                                const text = isStr ? d : d.text || "";
                                const isCorrect = isOptionCorrect(q, d, dIdx);
                                const showCorrect = expandedExtractionAnswers[idx] && isCorrect;
                                const arabicLetters = ["أ", "ب", "ج", "د", "هـ", "و"];
                                const colWidth = `${100 / Math.max(1, q.distractors.length)}%`;

                                return (
                                  <td
                                    key={id}
                                    className={`p-2 border border-slate-200 dark:border-slate-700 text-right align-middle font-medium ${
                                      showCorrect
                                        ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200"
                                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
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

                    {/* Model Answer preview */}
                    {(() => {
                      const qHasAnswer = hasAnswer(q);
                      if (!qHasAnswer) {
                        return (
                          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 mt-2.5">
                            <div className="flex items-center gap-1.5 font-bold text-xs">
                              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                              <span>لا توجد إجابة نموذجية مسجلة لهذا السؤال</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={solvingCandidateId === q.id || isBatchSolving}
                                onClick={() => handleSolveCandidateQuick(q.id)}
                                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                              >
                                {solvingCandidateId === q.id ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>جاري الحل بالذكاء الاصطناعي...</span>
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                                    <span>حل السؤال بالذكاء الاصطناعي</span>
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStartEditingCandidate(q)}
                                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center gap-1 cursor-pointer"
                              >
                                <Edit className="w-3 h-3" />
                                <span>كتابة الإجابة</span>
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="bg-blue-50/50 dark:bg-blue-900/20 p-2.5 rounded-xl border border-blue-100 dark:border-blue-800/50 mt-2.5 text-xs text-blue-900 dark:text-blue-200">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-blue-700 dark:text-blue-400">
                                الإجابة النموذجية:
                              </span>
                              <button
                                type="button"
                                disabled={solvingCandidateId === q.id || isBatchSolving}
                                onClick={() => handleSolveCandidateQuick(q.id)}
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 hover:bg-purple-200 transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                title="إعادة توليد وتحديث الإجابة بالذكاء الاصطناعي"
                              >
                                {solvingCandidateId === q.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                                )}
                                <span>إعادة الحل بالـ AI</span>
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                setExpandedExtractionAnswers((prev) => ({
                                  ...prev,
                                  [idx]: prev[idx] !== undefined ? !prev[idx] : false,
                                }))
                              }
                              className="flex items-center gap-1 text-[11px] font-bold select-none text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                              title={expandedExtractionAnswers[idx] === false ? "توسيع الإجابة" : "طي الإجابة"}
                            >
                              {expandedExtractionAnswers[idx] === false ? (
                                <>
                                  <ChevronDown className="w-3.5 h-3.5" />
                                  <span>توسيع الإجابة</span>
                                </>
                              ) : (
                                <>
                                  <ChevronUp className="w-3.5 h-3.5" />
                                  <span>طي الإجابة</span>
                                </>
                              )}
                            </button>
                          </div>
                          {expandedExtractionAnswers[idx] !== false && (
                            <div className="mt-2 animate-in fade-in duration-200">
                              <QuestionAnswerKeyBox question={q} />
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>

            {/* Modal Footer Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 pt-4 shrink-0">
              <button
                type="button"
                onClick={() => setExtractedQuestionsForPreview(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                إلغاء والتراجع
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleFinalizeImportAll}
                  disabled={extractedQuestionsForPreview.filter(q => q.status !== "requires_review").length === 0}
                  className="px-4 py-2.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold text-xs hover:bg-blue-100 transition disabled:opacity-50"
                >
                  إرسال المكتملة فقط ({extractedQuestionsForPreview.filter(q => q.status !== "requires_review").length})
                </button>

                <button
                  type="button"
                  onClick={handleFinalizeImportSelected}
                  disabled={selectedImportQuestionIds.size === 0 || Array.from(selectedImportQuestionIds).filter(id => extractedQuestionsForPreview?.find(q => q.id === id)?.status !== 'requires_review').length === 0}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition flex items-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>إرسال المحددة الصالحة ({Array.from(selectedImportQuestionIds).filter(id => extractedQuestionsForPreview?.find(q => q.id === id)?.status !== 'requires_review').length})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Preview Modal for Question Booklet */}
      <PrintPreviewModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title={`كراسة الأسئلة - ${subjects.find(s => s.id === selectedSubjectId)?.name || "جميع المواد"}`}
        extraToolbarContent={
          <button
            type="button"
            onClick={() => setShowAnswerKeyInBank(!showAnswerKeyInBank)}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer ${
              showAnswerKeyInBank
                ? "bg-purple-600 text-white shadow-md hover:bg-purple-700"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            <span>{showAnswerKeyInBank ? "🔑 إخفاء سلّم التصحيح والحل" : "🔑 عرض سلّم التصحيح والحل"}</span>
          </button>
        }
      >
        <PaginatedA4Preview
          template={previewTemplate}
          title={`كراسة الأسئلة المعتمدة`}
          hierarchyText={`بنك الأسئلة الشامل | ${subjects.find(s => s.id === selectedSubjectId)?.name || "جميع المواد"}`}
          items={questionBookletItems}
        />
      </PrintPreviewModal>

      {/* AI Solver Modal */}
      {showAISolver && (
        <AIQuestionSolverModal
          question={{
            id: editingCandidateData?.id || editingQuestion?.id || "temp-solver-q",
            subjectId: editingCandidateData?.subjectId || formSubjectId || subjects[0]?.id || "",
            unitId: editingCandidateData?.unitId || formUnitId || "",
            lessonId: editingCandidateData?.lessonId || formLessonId || "",
            type: editingCandidateData?.type || formType || "essay",
            text: editingCandidateData?.text || formText || "",
            answer: editingCandidateData?.answer || formAnswer || "",
            difficulty: editingCandidateData?.difficulty || formDifficulty || "medium",
            importance: editingCandidateData?.importance || formImportance || 4,
            distractors: editingCandidateData?.distractors || (formType === 'mcq' || formType === 'true_false' ? formDistractors.map((d, i) => ({ id: `d${i}`, text: d.text, isCorrect: d.isCorrect })) : undefined)
          } as any}
          onClose={() => setShowAISolver(false)}
          onInsert={(ans) => {
            if (editingCandidateData) {
              setEditingCandidateData({
                ...editingCandidateData,
                answer: ans,
              });
            } else {
              setFormAnswer(ans);
            }
          }}
        />
      )}
    </div>
  );
};
