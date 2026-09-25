import { RichTextEditor } from "../../editor/components/RichTextEditor";
import React, { useState, useEffect, useMemo } from "react";
import {
  Library,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Printer,
  Download,
  Eye,
  Trash2,
  ShieldCheck,
  Layers,
  FileText,
  Clock,
  User,
  BookOpen,
  ArrowRight,
  X,
  History,
  Check,
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  Save,
  Edit3,
} from "lucide-react";
import {
  ExamLibraryDocument,
  Subject,
  Unit,
  Lesson,
  Question,
  ExamIntegrityReport,
  QuestionIntegrityItem,
  QuestionSnapshot,
  Cycle,
  Exam,
} from "../../../types/index";
import { examLibraryService } from "../../../services/examLibraryService";
import { MathText } from "../../../components/MathText";
import { PrintPreviewModal } from "../../../components/PrintPreviewModal";
import { PaginatedA4Preview } from "../../../components/PaginatedA4Preview";
import { storage } from "../../../services/storage";
import { generateExamPrintItems } from "../../../services/SharedPrintService";
import { PastCyclesView } from "./PastCyclesView";
import {
  filterAllowedSubjects,
  filterAllowedItemsBySubject,
  canPerformAction,
  canAccessSubject,
} from "../../../services/rbacEngine";
import { User as UserType } from "../../../types/index";

interface ExamsLibraryViewProps {
  subjects: Subject[];
  questions: Question[];
  units?: Unit[];
  lessons?: Lesson[];
  exams?: Exam[];
  cycles?: Cycle[];
  currentUser?: UserType;
  onNavigateToGenerator?: () => void;
  onEditExam?: (doc: ExamLibraryDocument) => void;
  onDeleteExam?: (examId: string) => void;
  onSaveExam?: (exam: any) => void;
  onSaveCycle?: (cycle: Cycle) => void;
  onDeleteCycle?: (id: string) => void;
}

export const ExamsLibraryView: React.FC<ExamsLibraryViewProps> = ({
  subjects,
  questions,
  units,
  lessons,
  exams = [],
  cycles = [],
  currentUser,
  onNavigateToGenerator,
  onEditExam,
  onDeleteExam,
  onSaveExam,
  onSaveCycle,
  onDeleteCycle,
}) => {
  const libSavedUi = useMemo(() => storage.getUiState("exams_library_ui", {
    activeTab: "library" as const,
    searchQuery: "",
    selectedSubjectId: "all",
    selectedUnitId: "all",
    selectedLessonId: "all",
    selectedMethod: "all",
    selectedLevel: "all",
    selectedSemester: "all",
    selectedIntegrityFilter: "all",
    showAnswerKey: false,
  }), []);

  // State
  const [activeTab, setActiveTab] = useState<"library" | "cycles">("library");
  const [libraryExams, setLibraryExams] = useState<ExamLibraryDocument[]>(() =>
    examLibraryService.getExamsLibrary(),
  );
  const [searchQuery, setSearchQuery] = useState(libSavedUi.searchQuery || "");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(libSavedUi.selectedSubjectId || "all");
  const [selectedUnitId, setSelectedUnitId] = useState<string>(libSavedUi.selectedUnitId || "all");
  const [selectedLessonId, setSelectedLessonId] = useState<string>(libSavedUi.selectedLessonId || "all");
  const [selectedMethod, setSelectedMethod] = useState<string>(libSavedUi.selectedMethod || "all");
  const [selectedLevel, setSelectedLevel] = useState<string>(libSavedUi.selectedLevel || "all");
  const [selectedSemester, setSelectedSemester] = useState<string>(libSavedUi.selectedSemester || "all");
  const [selectedIntegrityFilter, setSelectedIntegrityFilter] = useState<string>(libSavedUi.selectedIntegrityFilter || "all");
  const [showAnswerKey, setShowAnswerKey] = useState(libSavedUi.showAnswerKey ?? false);

  useEffect(() => {
    storage.saveUiState("exams_library_ui", {
      activeTab,
      searchQuery,
      selectedSubjectId,
      selectedUnitId,
      selectedLessonId,
      selectedMethod,
      selectedLevel,
      selectedSemester,
      selectedIntegrityFilter,
      showAnswerKey,
    });
  }, [
    activeTab,
    searchQuery,
    selectedSubjectId,
    selectedUnitId,
    selectedLessonId,
    selectedMethod,
    selectedLevel,
    selectedSemester,
    selectedIntegrityFilter,
    showAnswerKey,
  ]);

  const effectiveUser = useMemo(() => currentUser || storage.getCurrentUser(), [currentUser]);
  const allowedSubjects = useMemo(() => filterAllowedSubjects(effectiveUser, subjects), [effectiveUser, subjects]);

  // Load Units and Lessons with fallback to storage
  const rawUnits = useMemo(() => {
    if (units && units.length > 0) return units;
    return storage.getUnits();
  }, [units]);

  const rawLessons = useMemo(() => {
    if (lessons && lessons.length > 0) return lessons;
    return storage.getLessons();
  }, [lessons]);

  const allUnits = useMemo(() => filterAllowedItemsBySubject(effectiveUser, rawUnits), [effectiveUser, rawUnits]);
  const allLessons = useMemo(() => filterAllowedItemsBySubject(effectiveUser, rawLessons), [effectiveUser, rawLessons]);
  const allowedQuestions = useMemo(() => filterAllowedItemsBySubject(effectiveUser, questions), [effectiveUser, questions]);
  const allowedLibraryExams = useMemo(() => filterAllowedItemsBySubject(effectiveUser, libraryExams), [effectiveUser, libraryExams]);

  // Compute available units based on selectedSubjectId
  const availableUnits = useMemo(() => {
    if (selectedSubjectId === "all") {
      return allUnits;
    }
    return allUnits.filter((u) => u.subjectId === selectedSubjectId);
  }, [allUnits, selectedSubjectId]);

  // Compute available lessons based on selectedSubjectId and selectedUnitId
  const availableLessons = useMemo(() => {
    let list = allLessons;
    if (selectedSubjectId !== "all") {
      list = list.filter((l) => l.subjectId === selectedSubjectId);
    }
    if (selectedUnitId !== "all") {
      list = list.filter((l) => l.unitId === selectedUnitId);
    }
    return list;
  }, [allLessons, selectedSubjectId, selectedUnitId]);

  // Filter Selection Sanitization
  useEffect(() => {
    if (selectedSubjectId !== "all" && subjects && subjects.length > 0 && !subjects.some((s) => s.id === selectedSubjectId)) {
      setSelectedSubjectId("all");
      setSelectedUnitId("all");
      setSelectedLessonId("all");
    } else if (selectedUnitId !== "all" && allUnits && !allUnits.some((u) => u.id === selectedUnitId)) {
      setSelectedUnitId("all");
      setSelectedLessonId("all");
    } else if (selectedLessonId !== "all" && allLessons && !allLessons.some((l) => l.id === selectedLessonId)) {
      setSelectedLessonId("all");
    }
  }, [subjects, allUnits, allLessons, selectedSubjectId, selectedUnitId, selectedLessonId]);

  // Selected Exam for Preview/Print Modal
  const [previewExam, setPreviewExam] = useState<ExamLibraryDocument | null>(
    null,
  );
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const [activeTemplate, setActiveTemplate] = useState(() => {
    const templates = storage.getPrintTemplates();
    return templates.find((t) => t.isDefault && t.type === "exam") ||
           templates.find((t) => t.type === "exam") ||
           storage.getPrintTemplate();
  });

  useEffect(() => {
    const handleSyncTemplate = () => {
      const templates = storage.getPrintTemplates();
      const defaultTmpl = templates.find((t) => t.isDefault && t.type === "exam") ||
                          templates.find((t) => t.type === "exam") ||
                          storage.getPrintTemplate();
      setActiveTemplate(defaultTmpl);
    };
    window.addEventListener("refresh-data-all", handleSyncTemplate);
    return () => window.removeEventListener("refresh-data-all", handleSyncTemplate);
  }, []);

  const previewExamItems = useMemo(() => {
    if (!previewExam) return [];
    const examSubId = previewExam.scope?.subjectId || (previewExam as any).subjectId;
    if (!canAccessSubject(effectiveUser, examSubId)) return [];

    const subjectObj = subjects.find((s) => s.id === examSubId);
    const unitObj = units?.find((u) => previewExam.scope?.unitIds?.includes(u.id));
    const lessonObj = lessons?.find((l) => previewExam.scope?.lessonIds?.includes(l.id));

    return generateExamPrintItems({
      template: {
        ...(previewExam.printTemplate || activeTemplate),
        type: "exam" as const,
      },
      title: previewExam.title,
      durationMinutes: previewExam.durationMinutes,
      totalMarks: previewExam.totalMarks,
      showStudentBox: previewExam.showStudentBox !== undefined ? previewExam.showStudentBox : true,
      showInstructions: previewExam.showInstructions !== undefined ? previewExam.showInstructions : false,
      instructionsText: previewExam.instructionsText || "",
      showGradingTable: previewExam.showGradingTable !== undefined ? previewExam.showGradingTable : false,
      sections: previewExam.sections || [],
      questions: previewExam.questionSnapshots || [],
      versionQuestions: previewExam.versions?.[0]?.questions || [],
      showAnswerKey,
      canSwap: false,
      groupingEnabled: false,
      subjectName: subjectObj?.name || (previewExam as any).subjectName,
      educationalLevel: (previewExam as any).educationalLevel || "",
      academicTerm: (previewExam as any).academicTerm || "",
      unitTitle: unitObj?.title,
      lessonTitle: lessonObj?.title,
    });
  }, [previewExam, showAnswerKey, activeTemplate, effectiveUser, subjects, units, lessons]);

  // Selected Exam for Integrity Audit Modal
  const [auditExamId, setAuditExamId] = useState<string | null>(null);
  const [integrityReport, setIntegrityReport] =
    useState<ExamIntegrityReport | null>(null);

  // Selected Exam for Editing
  const [editingExam, setEditingExam] = useState<ExamLibraryDocument | null>(
    null,
  );

  // Delete Confirmation State
  const [deleteConfirmExamId, setDeleteConfirmExamId] = useState<string | null>(
    null,
  );

  // Feedback Notification
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Reload exams from service and sync storage
  const refreshLibrary = () => {
    setIsRefreshing(true);
    try {
      const refreshed = examLibraryService.getExamsLibrary();
      setLibraryExams(refreshed);
      window.dispatchEvent(new CustomEvent("refresh-data-all"));
      setFeedbackMessage("تم تحديث بيانات مكتبة النماذج والاختبارات بنجاح");
      setTimeout(() => {
        setFeedbackMessage((prev) => (prev === "تم تحديث بيانات مكتبة النماذج والاختبارات بنجاح" ? null : prev));
      }, 3000);
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 400);
    }
  };
  // Automatically sync when global state changes
  useEffect(() => {
    const handleSync = () => setLibraryExams(examLibraryService.getExamsLibrary());
    window.addEventListener("refresh-data-all", handleSync);
    return () => window.removeEventListener("refresh-data-all", handleSync);
  }, []);


  // Open Integrity Audit Modal
  const handleOpenAuditModal = (examId: string) => {
    const exam = libraryExams.find((e) => (e.examId || (e as any).id) === examId);
    const examSubId = exam?.scope?.subjectId || (exam as any)?.subjectId;
    if (!canAccessSubject(effectiveUser, examSubId)) {
      setFeedbackMessage("⚠️ ليس لديك صلاحية الوصول إلى هذه المادة الدراسية.");
      return;
    }
    const report = examLibraryService.checkExamIntegrity(examId);
    setIntegrityReport(report);
    setAuditExamId(examId);
  };

  // Handle Integrity Resolution Action
  const handleResolveIntegrity = (
    questionId: string,
    action: "keep_snapshot" | "update_from_bank" | "replace_with_similar",
  ) => {
    if (!auditExamId) return;
    const exam = libraryExams.find((e) => (e.examId || (e as any).id) === auditExamId);
    const examSubId = exam?.scope?.subjectId || (exam as any)?.subjectId;
    if (!canPerformAction(effectiveUser, "edit", "exams") || !canAccessSubject(effectiveUser, examSubId)) {
      setFeedbackMessage("⚠️ ليس لديك صلاحية تعديل أو مزامنة هذا النموذج.");
      return;
    }
    const updatedDoc = examLibraryService.resolveIntegrityIssue(
      auditExamId,
      questionId,
      action,
    );
    if (updatedDoc) {
      refreshLibrary();
      // Re-run report
      const newReport = examLibraryService.checkExamIntegrity(auditExamId);
      setIntegrityReport(newReport);
      setFeedbackMessage("تمت مزامنة السؤال بنجاح وتحديث النموذج ✨");
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  };

  // Handle Confirm Delete Exam
  const handleConfirmDelete = (examId: string) => {
    const exam = libraryExams.find((e) => (e.examId || (e as any).id) === examId);
    const examSubId = exam?.scope?.subjectId || (exam as any)?.subjectId;
    if (!canPerformAction(effectiveUser, "delete", "exams") || !canAccessSubject(effectiveUser, examSubId)) {
      setFeedbackMessage("⚠️ ليس لديك صلاحية حذف نماذج الاختبارات لهذه المادة.");
      setDeleteConfirmExamId(null);
      return;
    }

    examLibraryService.deleteExamFromLibrary(examId);
    if (onDeleteExam) {
      onDeleteExam(examId);
    }
    refreshLibrary();
    setDeleteConfirmExamId(null);
    if (previewExam?.examId === examId) setPreviewExam(null);
    if (editingExam?.examId === examId) setEditingExam(null);
    if (auditExamId === examId) setAuditExamId(null);

    setFeedbackMessage(
      "تم حذف نموذج الاختبار بنجاح وإعادة كافة أسئلته إلى محرك توليد الاختبارات 🗑️✨",
    );
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // Editing Handlers
  const handleUpdateSnapshotField = (
    idx: number,
    field: "text" | "answer" | "allocatedMarks",
    value: string | number,
  ) => {
    if (!editingExam) return;
    const updated = [...editingExam.questionSnapshots];
    updated[idx] = {
      ...updated[idx],
      [field]: field === "allocatedMarks" ? Number(value) || 0 : value,
    };
    setEditingExam({
      ...editingExam,
      questionSnapshots: updated,
    });
  };

  const handleRemoveSnapshot = (idx: number) => {
    if (!editingExam) return;
    const updated = editingExam.questionSnapshots.filter((_, i) => i !== idx);
    setEditingExam({
      ...editingExam,
      questionSnapshots: updated,
    });
  };

  const handleAddQuestionToEditExam = (questionId: string) => {
    if (!editingExam) return;
    const examSubId = editingExam.scope?.subjectId || (editingExam as any).subjectId;
    if (!canPerformAction(effectiveUser, "edit", "exams") || !canAccessSubject(effectiveUser, examSubId)) {
      setFeedbackMessage("⚠️ ليس لديك صلاحية تعديل هذا النموذج.");
      return;
    }

    const q = allowedQuestions.find((item) => item.id === questionId);
    if (!q) {
      setFeedbackMessage("⚠️ السؤال المحدد غير متاح أو غير مصرح به.");
      return;
    }

    if (q.subjectId !== examSubId) {
      setFeedbackMessage("⚠️ لا يمكن إضافة سؤال من مادة مختلفة عن مادة النموذج.");
      return;
    }

    if ((editingExam.questionSnapshots || []).some((s) => s.questionId === q.id)) {
      return;
    }

    const newSnapshot: QuestionSnapshot = {
      questionId: q.id,
      questionType: q.type,
      customTypeName: q.customTypeName,
      text: q.text,
      answer: q.answer,
      allocatedMarks: 5,
      difficulty: q.difficulty,
      distractors: q.distractors,
      matchingPairs: q.matchingPairs,
      sequenceItems: q.sequenceItems,
      imageUrl: q.imageUrl,
      audioUrl: q.audioUrl,
      snapshotTimestamp: new Date().toISOString(),
    };

    setEditingExam({
      ...editingExam,
      questionSnapshots: [...editingExam.questionSnapshots, newSnapshot],
    });
  };

  const handleSaveEditingExam = () => {
    if (!editingExam) return;
    const examSubId = editingExam.scope?.subjectId || (editingExam as any).subjectId;
    if (!canPerformAction(effectiveUser, "edit", "exams") || !canAccessSubject(effectiveUser, examSubId)) {
      setFeedbackMessage("⚠️ ليس لديك صلاحية حفظ تعديلات هذا النموذج.");
      return;
    }

    const totalQuestions = editingExam.questionSnapshots.length;
    const totalMarks = editingExam.questionSnapshots.reduce(
      (sum, q) => sum + (Number(q.allocatedMarks) || 0),
      0,
    );

    const docToSave: ExamLibraryDocument = {
      ...editingExam,
      durationMinutes: Number(editingExam.durationMinutes) || 90,
      totalQuestions,
      totalMarks,
      usedQuestionIds: (editingExam.questionSnapshots || []).map((q) => q.questionId),
      updatedAt: new Date().toISOString(),
    };

    examLibraryService.saveExamToLibrary(docToSave);
    if (onSaveExam) {
      onSaveExam({
        id: docToSave.examId,
        title: docToSave.title,
        durationMinutes: docToSave.durationMinutes || 90,
        subjectId: docToSave.scope?.subjectId || (docToSave as any).subjectId || "",
        unitIds: docToSave.scope?.unitIds || [],
        lessonIds: docToSave.scope?.lessonIds || [],
        totalQuestions: docToSave.totalQuestions,
        totalMarks: docToSave.totalMarks,
        difficultyProfile: "balanced",
        generationType: docToSave.generationMethod === "semi" ? "semi_auto" : docToSave.generationMethod === "auto" ? "auto" : "manual",
        createdAt: docToSave.createdAt,
        createdBy: docToSave.createdByName || "المعلم",
        status: "finalized",
        libraryDoc: docToSave,
      });
    }
    refreshLibrary();
    setEditingExam(null);

    setFeedbackMessage("تم حفظ تعديلات نموذج الاختبار بنجاح ✨");
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  // Pre-calculate integrity status map for all exams in view
  const integrityMap = useMemo(() => {
    const map = new Map<string, ExamIntegrityReport>();
    libraryExams.forEach((exam) => {
      const eId = exam.examId || (exam as any).id || "";
      if (eId) {
        map.set(eId, examLibraryService.checkExamIntegrity(eId));
      }
    });
    return map;
  }, [libraryExams, questions]);

  // Filtered Exams List
  const filteredExams = useMemo(() => {
    return allowedLibraryExams.filter((exam) => {
      const eId = exam.examId || (exam as any).id || "";

      // 1. Search Query
      if (
        searchQuery &&
        !exam.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !eId.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      // 2. Subject Filter
      if (
        selectedSubjectId !== "all" &&
        exam.scope?.subjectId !== selectedSubjectId &&
        (exam as any).subjectId !== selectedSubjectId
      ) {
        return false;
      }

      // 3. Unit Filter
      if (selectedUnitId !== "all") {
        const scopeUnitIds = exam.scope?.unitIds || (exam as any).unitIds || [];
        const matchScopeUnit = Array.isArray(scopeUnitIds) && scopeUnitIds.includes(selectedUnitId);
        const matchDirectUnit = (exam as any).unitId === selectedUnitId;
        const matchQuestionUnit = exam.questionSnapshots?.some((q: any) => {
          if (q.unitId === selectedUnitId || (Array.isArray(q.unitIds) && q.unitIds.includes(selectedUnitId))) {
            return true;
          }
          const bankQ = questions.find((bq) => bq.id === q.questionId || bq.id === q.originalId);
          return bankQ?.unitId === selectedUnitId || (Array.isArray((bankQ as any)?.unitIds) && (bankQ as any).unitIds.includes(selectedUnitId));
        });

        if (!matchScopeUnit && !matchDirectUnit && !matchQuestionUnit) {
          return false;
        }
      }

      // 4. Lesson Filter
      if (selectedLessonId !== "all") {
        const scopeLessonIds = exam.scope?.lessonIds || (exam as any).lessonIds || [];
        const matchScopeLesson = Array.isArray(scopeLessonIds) && scopeLessonIds.includes(selectedLessonId);
        const matchDirectLesson = (exam as any).lessonId === selectedLessonId;
        const matchQuestionLesson = exam.questionSnapshots?.some((q: any) => {
          if (q.lessonId === selectedLessonId || (Array.isArray(q.lessonIds) && q.lessonIds.includes(selectedLessonId))) {
            return true;
          }
          const bankQ = questions.find((bq) => bq.id === q.questionId || bq.id === q.originalId);
          return bankQ?.lessonId === selectedLessonId || (Array.isArray(bankQ?.lessonIds) && bankQ.lessonIds.includes(selectedLessonId));
        });

        if (!matchScopeLesson && !matchDirectLesson && !matchQuestionLesson) {
          return false;
        }
      }

      // 5. Method Filter
      if (
        selectedMethod !== "all" &&
        exam.generationMethod !== selectedMethod
      ) {
        return false;
      }

      // 6. Integrity Filter
      if (selectedIntegrityFilter !== "all") {
        const report = integrityMap.get(exam.examId);
        if (selectedIntegrityFilter === "warnings" && !report?.hasWarnings)
          return false;
        if (selectedIntegrityFilter === "intact" && report?.hasWarnings)
          return false;
      }

      return true;
    });
  }, [
    allowedLibraryExams,
    searchQuery,
    selectedSubjectId,
    selectedUnitId,
    selectedLessonId,
    selectedMethod,
    selectedIntegrityFilter,
    integrityMap,
    allowedQuestions,
  ]);

  // Overall Statistics Metrics (Filter-aware based on filteredExams as single source of truth)
  const stats = useMemo(() => {
    let autoCount = 0;
    let semiCount = 0;
    let manualCount = 0;
    let warningsCount = 0;
    let totalQuestionsFrozen = 0;

    filteredExams.forEach((exam) => {
      if (exam.generationMethod === "auto") autoCount++;
      else if (exam.generationMethod === "semi") semiCount++;
      else manualCount++;

      totalQuestionsFrozen += exam.questionSnapshots?.length || 0;

      const report = integrityMap.get(exam.examId);
      if (report?.hasWarnings) warningsCount++;
    });

    return {
      total: filteredExams.length,
      autoCount,
      semiCount,
      manualCount,
      intactCount: filteredExams.length - warningsCount,
      warningsCount,
      totalQuestionsFrozen,
    };
  }, [filteredExams, integrityMap]);

  // Scope status detection
  const hasActiveFilters = useMemo(() => {
    return (
      selectedSubjectId !== "all" ||
      selectedUnitId !== "all" ||
      selectedLessonId !== "all" ||
      selectedMethod !== "all" ||
      selectedIntegrityFilter !== "all" ||
      searchQuery.trim() !== ""
    );
  }, [
    selectedSubjectId,
    selectedUnitId,
    selectedLessonId,
    selectedMethod,
    selectedIntegrityFilter,
    searchQuery,
  ]);

  const activeScopeName = useMemo(() => {
    if (selectedLessonId !== "all") {
      const les = allLessons.find((l) => l.id === selectedLessonId);
      return les ? `الدرس: ${les.title}` : "الدرس المحدد";
    }
    if (selectedUnitId !== "all") {
      const u = allUnits.find((un) => un.id === selectedUnitId);
      return u ? `الوحدة: ${u.title}` : "الوحدة المحددة";
    }
    if (selectedSubjectId !== "all") {
      const sub = subjects.find((s) => s.id === selectedSubjectId);
      return sub ? `المادة: ${sub.name}` : "المادة المحددة";
    }
    if (selectedMethod !== "all") {
      const methodLabel = selectedMethod === "auto" ? "توليد آلي" : selectedMethod === "semi" ? "شبه آلي" : "يدوي";
      return `طريقة التوليد: ${methodLabel}`;
    }
    if (selectedIntegrityFilter !== "all") {
      const integrityLabel = selectedIntegrityFilter === "intact" ? "سليمة 100%" : "تتطلب فحص";
      return `حالة السلامة: ${integrityLabel}`;
    }
    if (searchQuery.trim() !== "") {
      return `بحث: "${searchQuery.trim()}"`;
    }
    return "النطاق المحدد";
  }, [
    selectedLessonId,
    selectedUnitId,
    selectedSubjectId,
    selectedMethod,
    selectedIntegrityFilter,
    searchQuery,
    allLessons,
    allUnits,
    subjects,
  ]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedSubjectId !== "all") count++;
    if (selectedUnitId !== "all") count++;
    if (selectedLessonId !== "all") count++;
    if (selectedMethod !== "all") count++;
    if (selectedIntegrityFilter !== "all") count++;
    if (searchQuery.trim() !== "") count++;
    return count;
  }, [
    selectedSubjectId,
    selectedUnitId,
    selectedLessonId,
    selectedMethod,
    selectedIntegrityFilter,
    searchQuery,
  ]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedSubjectId("all");
    setSelectedUnitId("all");
    setSelectedLessonId("all");
    setSelectedMethod("all");
    setSelectedIntegrityFilter("all");
  };

  return (
    <div
      className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6"
      style={{ direction: "rtl" }}
    >
      {/* Top Level Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl w-fit mb-2 border border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("library")}
          className={`flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-lg transition-colors ${
            activeTab === "library"
              ? "bg-white dark:bg-slate-900 text-[#0f6cbd] shadow-sm border border-slate-200 dark:border-slate-700"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
          }`}
        >
          <Library className="w-4 h-4" />
          مكتبة النماذج والاختبارات
        </button>
        <button
          onClick={() => setActiveTab("cycles")}
          className={`flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-lg transition-colors ${
            activeTab === "cycles"
              ? "bg-white dark:bg-slate-900 text-[#0f6cbd] shadow-sm border border-slate-200 dark:border-slate-700"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
          }`}
        >
          <History className="w-4 h-4" />
          أرشيف الدورات السابقة
        </button>
      </div>

      {activeTab === "cycles" ? (
        <div className="mt-4">
          <PastCyclesView
            cycles={cycles}
            exams={exams}
            subjects={subjects}
            currentUser={effectiveUser}
            onSaveCycle={onSaveCycle || (() => {})}
            onDeleteCycle={onDeleteCycle || (() => {})}
          />
        </div>
      ) : (
        <>
          {/* Feedback Banner */}
          {feedbackMessage && (
            <div className="p-4 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-800 text-xs font-bold flex items-center justify-between shadow-sm">
              <span>{feedbackMessage}</span>
              <button
                onClick={() => setFeedbackMessage(null)}
                className="p-1 text-emerald-700 hover:text-emerald-900 dark:text-emerald-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* View Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
              <Library className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                مكتبة النماذج والاختبارات (Exams & Models Library)
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                مستودع أوراق الامتحانات المحفوظة ومتابعة مزامنتها مع بنك الأسئلة
                واللقطات المجمّدة
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={refreshLibrary}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shadow-3xs active:scale-98"
            title="تحديث قائمة النماذج ومزامنة البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400"}`} />
            <span>{isRefreshing ? "جاري التحديث..." : "تحديث البيانات"}</span>
          </button>

          {onNavigateToGenerator && (
            <button
              onClick={onNavigateToGenerator}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>توليد نموذج جديد بالذكاء الاصطناعي</span>
            </button>
          )}
        </div>
      </div>

      {/* Overview Statistics Cards */}
      <div className="space-y-2">
        {/* Live Scope Indicator */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full inline-block ${
                  hasActiveFilters ? "bg-blue-500 animate-pulse" : "bg-emerald-500"
                }`}
              />
              <span>
                {hasActiveFilters
                  ? `إحصائيات النطاق المحدد (${activeScopeName})`
                  : "إحصائيات شاملة (كافة النماذج)"}
              </span>
            </span>
            {hasActiveFilters && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
                <span>فلاتر مفعلة: {activeFiltersCount}</span>
              </span>
            )}
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[11px] font-extrabold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 cursor-pointer transition hover:underline"
              title="إلغاء تفعيل الفلاتر والعودة للإحصائيات الشاملة"
            >
              <X className="w-3.5 h-3.5 text-blue-600" />
              <span>إعادة تعيين للشامل</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
              <span>إجمالي النماذج {hasActiveFilters ? "المطابقة" : "المحفوظة"}</span>
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {stats.total}{" "}
              <span className="text-xs font-normal text-slate-400">نموذج</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              تتضمن {stats.totalQuestionsFrozen} سؤال مجمّد
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
              <span>توليد آلي بالذكاء الاصطناعي</span>
              <Sparkles className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {stats.autoCount}{" "}
              <span className="text-xs font-normal text-slate-400">نموذج</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              موزعة بالأوزان النسبية والمحاور
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
              <span>توليد شبه آلي ويدوي</span>
              <Layers className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono">
              {stats.semiCount + stats.manualCount}{" "}
              <span className="text-xs font-normal text-slate-400">نموذج</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              {stats.semiCount} شبه آلي | {stats.manualCount} يدوي
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
              <span>سلامة المزامنة مع البنك</span>
              <ShieldCheck className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
                {stats.intactCount}
              </span>
              {stats.warningsCount > 0 && (
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-300">
                  ⚠️ {stats.warningsCount} بحاجة فحص
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              {stats.warningsCount === 0
                ? "جميع الأسئلة متطابقة 100% مع البنك"
                : "توجد أسئلة معدلة أو مؤرشفة مؤخراً"}
            </p>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
            <input
              type="text"
              placeholder="ابحث باسم النموذج..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Subject Filter */}
          <div>
            <select
              value={selectedSubjectId}
              onChange={(e) => {
                setSelectedSubjectId(e.target.value);
                setSelectedUnitId("all");
                setSelectedLessonId("all");
              }}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold focus:outline-none focus:border-blue-500 transition"
            >
              <option value="all">جميع المواد المتاحة</option>
              {allowedSubjects.map((sub, sIdx) => (
                <option key={sub.id || `sub_${sIdx}`} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>

          {/* Unit Filter */}
          <div>
            <select
              value={selectedUnitId}
              onChange={(e) => {
                setSelectedUnitId(e.target.value);
                setSelectedLessonId("all");
              }}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold focus:outline-none focus:border-blue-500 transition"
            >
              <option value="all">جميع الوحدات</option>
              {availableUnits.map((u, uIdx) => (
                <option key={u.id || `unit_${uIdx}`} value={u.id}>
                  {u.title}
                </option>
              ))}
            </select>
          </div>

          {/* Lesson Filter */}
          <div>
            <select
              value={selectedLessonId}
              onChange={(e) => setSelectedLessonId(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold focus:outline-none focus:border-blue-500 transition"
            >
              <option value="all">جميع الدروس</option>
              {availableLessons.map((l, lIdx) => (
                <option key={l.id || `lesson_${lIdx}`} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
          </div>

          {/* Method Filter */}
          <div>
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold focus:outline-none focus:border-blue-500 transition"
            >
              <option value="all">طريقة التوليد (الكل)</option>
              <option value="auto">توليد آلي بالذكاء الاصطناعي</option>
              <option value="semi">توليد شبه آلي</option>
              <option value="manual">توليد يدوي مخصص</option>
            </select>
          </div>

          {/* Integrity Filter */}
          <div>
            <select
              value={selectedIntegrityFilter}
              onChange={(e) => setSelectedIntegrityFilter(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold focus:outline-none focus:border-blue-500 transition"
            >
              <option value="all">حالة السلامة (الكل)</option>
              <option value="intact">سليمة ومتطابقة 100%</option>
              <option value="warnings">تتطلب فحص ومزامنة</option>
            </select>
          </div>
        </div>

        {/* Active Filters Bar */}
        {(selectedSubjectId !== "all" ||
          selectedUnitId !== "all" ||
          selectedLessonId !== "all" ||
          selectedMethod !== "all" ||
          selectedIntegrityFilter !== "all" ||
          searchQuery.trim() !== "") && (
          <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-slate-700 dark:text-slate-300">الفلاتر النشطة:</span>
              {selectedSubjectId !== "all" && (
                <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">
                  المادة: {subjects.find((s) => s.id === selectedSubjectId)?.name || selectedSubjectId}
                </span>
              )}
              {selectedUnitId !== "all" && (
                <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800">
                  الوحدة: {allUnits.find((u) => u.id === selectedUnitId)?.title || selectedUnitId}
                </span>
              )}
              {selectedLessonId !== "all" && (
                <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800">
                  الدرس: {allLessons.find((l) => l.id === selectedLessonId)?.title || selectedLessonId}
                </span>
              )}
              {selectedMethod !== "all" && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                  الطريقة: {selectedMethod === "auto" ? "آلي" : selectedMethod === "semi" ? "شبه آلي" : "يدوي"}
                </span>
              )}
              {selectedIntegrityFilter !== "all" && (
                <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800">
                  المزامنة: {selectedIntegrityFilter === "intact" ? "سليمة" : "تتطلب فحص"}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-bold text-red-600 hover:text-red-700 dark:text-red-400 flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              إعادة ضبط الفلاتر
            </button>
          </div>
        )}
      </div>

      {/* Main Exams Grid List */}
      {filteredExams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExams.map((exam, examIdx) => {
            const examId = exam.examId || (exam as any).id || "";
            const subjectId = exam.scope?.subjectId || (exam as any).subjectId || "";
            const subject = subjects.find((s) => s.id === subjectId);
            const report = integrityMap.get(examId);
            const isSubjectAllowed = canAccessSubject(effectiveUser, subjectId);
            const canEditExam = canPerformAction(effectiveUser, "edit", "exams") && isSubjectAllowed;
            const canDeleteExam = canPerformAction(effectiveUser, "delete", "exams") && isSubjectAllowed;
            const canExportExam = canPerformAction(effectiveUser, "export") && isSubjectAllowed;

            return (
              <div
                key={examId ? `${examId}_${examIdx}` : `exam_${examIdx}`}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-5 space-y-4">
                  {/* Top Header Tags */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="px-2.5 py-1 rounded-lg text-[11px] font-black"
                      style={{
                        backgroundColor: (subject?.color || "#2563eb") + "15",
                        color: subject?.color || "#2563eb",
                        border: `1px solid ${subject?.color || "#2563eb"}30`,
                      }}
                    >
                      {subject?.name || "مادة غير محددة"}
                    </span>

                    {/* Method Tag */}
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                        exam.generationMethod === "auto"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200"
                          : exam.generationMethod === "semi"
                            ? "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200"
                      }`}
                    >
                      {exam.generationMethod === "auto" ? (
                        <>
                          <Sparkles className="w-3 h-3 text-emerald-600" />
                          <span>توليد آلي AI</span>
                        </>
                      ) : exam.generationMethod === "semi" ? (
                        <>
                          <Layers className="w-3 h-3 text-purple-600" />
                          <span>شبه آلي</span>
                        </>
                      ) : (
                        <>
                          <FileText className="w-3 h-3 text-slate-600" />
                          <span>يدوي</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Exam Title */}
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-base leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {exam.title}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        حُفظ بتاريخ:{" "}
                        {new Date(exam.createdAt).toLocaleDateString("ar-SA")}
                      </span>
                    </p>
                  </div>

                  {/* Scope Details */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs space-y-1.5 border border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between text-slate-600 dark:text-slate-300 font-medium">
                      <span>عدد الأسئلة:</span>
                      <span className="font-bold font-mono text-slate-900 dark:text-white">
                        {exam.totalQuestions} سؤال
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-300 font-medium">
                      <span>الدرجة الكلية:</span>
                      <span className="font-bold font-mono text-blue-600 dark:text-blue-400">
                        {exam.totalMarks} درجة
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-300 font-medium">
                      <span>نطاق المنهاج:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
                        {exam.scope?.isComprehensive
                          ? "امتحان شامل للوحدات"
                          : "وحدة/دروس مخصصة"}
                      </span>
                    </div>
                  </div>

                  {/* Integrity Status Badge */}
                  <div className="pt-1">
                    {report?.hasWarnings ? (
                      <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs font-bold flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>تحديثات طرأت ببنك الأسئلة</span>
                        </div>
                        <button
                          onClick={() => handleOpenAuditModal(examId)}
                          disabled={!isSubjectAllowed}
                          className={`px-2 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px] font-black hover:bg-amber-300 transition ${
                            !isSubjectAllowed ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                          }`}
                        >
                          مزامنة الآن 🔄
                        </button>
                      </div>
                    ) : (
                      <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>سليم ومتطابق 100% مع بنك الأسئلة</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer Action Bar */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => {
                        if (!isSubjectAllowed) {
                          setFeedbackMessage("⚠️ ليس لديك صلاحية الوصول إلى هذه المادة الدراسية.");
                          return;
                        }
                        if (!canExportExam) {
                          setFeedbackMessage("⚠️ ليس لديك صلاحية تصدير أو طباعة نماذج الاختبارات.");
                          return;
                        }
                        setPreviewExam(exam);
                        setShowAnswerKey(false);
                        setIsPrintModalOpen(true);
                      }}
                      disabled={!canExportExam}
                      className={`px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold transition flex items-center gap-1.5 shadow-2xs ${
                        !canExportExam ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                      }`}
                      title={!isSubjectAllowed ? "ليس لديك صلاحية الوصول إلى هذه المادة" : !canExportExam ? "ليس لديك صلاحية تصدير أو طباعة" : "معاينة وطباعة ورقة الامتحان (A4)"}
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>معاينة وطباعة</span>
                    </button>

                    <button
                      onClick={() => {
                        if (!canEditExam) {
                          setFeedbackMessage("⚠️ ليس لديك صلاحية تعديل نماذج الاختبارات لهذه المادة.");
                          return;
                        }
                        if (onEditExam) {
                          onEditExam(exam);
                        } else {
                          setEditingExam(exam);
                        }
                      }}
                      disabled={!canEditExam}
                      className={`px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold transition flex items-center gap-1 shadow-2xs ${
                        !canEditExam ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                      }`}
                      title={!canEditExam ? "ليس لديك صلاحية تعديل هذا النموذج" : "تعديل نموذج الاختبار في محرك التوليد"}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>تعديل النموذج</span>
                    </button>

                    <button
                      onClick={() => handleOpenAuditModal(examId)}
                      disabled={!isSubjectAllowed}
                      className={`px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold transition flex items-center gap-1 ${
                        !isSubjectAllowed ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                      }`}
                      title="فحص النزاهة والمزامنة"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                      <span>فحص المزامنة</span>
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      if (!canDeleteExam) {
                        setFeedbackMessage("⚠️ ليس لديك صلاحية حذف نماذج الاختبارات.");
                        return;
                      }
                      setDeleteConfirmExamId(examId);
                    }}
                    disabled={!canDeleteExam}
                    className={`p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 transition border border-transparent hover:border-red-200 ${
                      !canDeleteExam ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
                    }`}
                    title={!canDeleteExam ? "ليس لديك صلاحية حذف هذا النموذج" : "حذف نموذج الاختبار من المكتبة"}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
          <Library className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
            لا توجد نماذج امتحانات مطابقة للبحث
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            قم بتوليد نموذج امتحان جديد عبر محرك توليد الاختبارات بالذكاء
            الاصطناعي واضغط على "حفظ في مكتبة النماذج"
          </p>
          {onNavigateToGenerator && (
            <button
              onClick={onNavigateToGenerator}
              className="mt-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition"
            >
              الانتقال لمحرك توليد الاختبارات 🚀
            </button>
          )}
        </div>
      )}

      {/* 1. Modal: Integrity Audit & Sync Comparison */}
      {auditExamId && integrityReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 border border-slate-200 dark:border-slate-800 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-6 h-6 text-blue-600" />
                <div>
                  <h3 className="text-base font-extrabold">
                    تقرير السلامة والمزامنة مع بنك الأسئلة
                  </h3>
                  <p className="text-xs text-slate-500">
                    {integrityReport.examTitle}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setAuditExamId(null);
                  setIntegrityReport(null);
                }}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status Overview Header */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  أسئلة متطابقة
                </div>
                <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 font-mono">
                  {integrityReport.intactCount}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                <div className="text-xs font-bold text-amber-800 dark:text-amber-300">
                  أسئلة معدلة بالبنك
                </div>
                <div className="text-xl font-black text-amber-700 dark:text-amber-400 font-mono">
                  {integrityReport.modifiedCount}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800">
                <div className="text-xs font-bold text-red-800 dark:text-red-300">
                  أسئلة مؤرشفة (Soft Deleted)
                </div>
                <div className="text-xl font-black text-red-700 dark:text-red-400 font-mono">
                  {integrityReport.archivedCount}
                </div>
              </div>
            </div>

            {/* Questions Comparison List */}
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {(integrityReport?.items || []).map((item, idx) => (
                <div
                  key={item.questionId + "_" + idx}
                  className={`p-4 rounded-xl border text-xs space-y-2 ${
                    item.status === "intact"
                      ? "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30"
                      : item.status === "modified"
                        ? "border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20"
                        : "border-red-300 dark:border-red-800 bg-red-50/40 dark:bg-red-950/20"
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-slate-700 dark:text-slate-300">
                      السؤال #{idx + 1} (
                      {item.snapshot.questionType === "mcq"
                        ? "اختيار من متعدد"
                        : "مقال/صح وخطأ"}
                      )
                    </span>

                    {item.status === "intact" && (
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        متطابق 100%
                      </span>
                    )}
                    {item.status === "modified" && (
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold">
                        تعديل ببنك الأسئلة ⚠️
                      </span>
                    )}
                    {item.status === "archived" && (
                      <span className="px-2 py-0.5 rounded bg-red-100 text-red-900 text-[10px] font-bold">
                        سؤال مؤرشف من البنك 🚫
                      </span>
                    )}
                  </div>

                  {/* Question Text Frozen Snapshot vs Bank */}
                  <div className="space-y-1 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      <span className="font-bold text-blue-600">
                        النسخة المجمّدة بالنموذج:{" "}
                      </span>
                      <RichTextEditor value={item.snapshot.text || ""} readOnly />
                    </div>

                    {item.diffSummary && (
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 font-bold pt-1">
                        📢 {item.diffSummary}
                      </p>
                    )}

                    {item.currentBankQuestion && item.status === "modified" && (
                      <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-emerald-700 dark:text-emerald-400">
                        <span className="font-bold">النص الجديد بالبنك: </span>
                        <RichTextEditor value={item.currentBankQuestion.text || ""} readOnly />
                      </div>
                    )}
                  </div>

                  {/* Actions to resolve diff */}
                  {item.status !== "intact" && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        onClick={() =>
                          handleResolveIntegrity(
                            item.questionId,
                            "keep_snapshot",
                          )
                        }
                        className="px-2.5 py-1 rounded bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-[11px] font-bold"
                      >
                        الإبقاء على النسخة المجمّدة
                      </button>

                      {item.status === "modified" && (
                        <button
                          onClick={() =>
                            handleResolveIntegrity(
                              item.questionId,
                              "update_from_bank",
                            )
                          }
                          className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold"
                        >
                          تحديث من بنك الأسئلة الحالي
                        </button>
                      )}

                      <button
                        onClick={() =>
                          handleResolveIntegrity(
                            item.questionId,
                            "replace_with_similar",
                          )
                        }
                        className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold"
                      >
                        استبدال بسؤال جديد من البنك 🔄
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => {
                  setAuditExamId(null);
                  setIntegrityReport(null);
                }}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
              >
                إنهاء وإغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal: Delete Confirmation Dialog */}
      {deleteConfirmExamId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-3 rounded-full bg-red-100 dark:bg-red-950/60">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold">
                  تأكيد حذف نموذج الاختبار
                </h3>
                <p className="text-xs text-slate-500">
                  هذا الإجراء لا يمكن التراجع عنه
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
              هل أنت متأكد من رغبتك في حذف هذا النموذج نهائياً من مكتبة النماذج
              والاختبارات؟
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmExamId(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleConfirmDelete(deleteConfirmExamId)}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>حذف نهائياً</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal: Edit Exam Document Modal */}
      {editingExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 border border-slate-200 dark:border-slate-800 space-y-5 my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600">
                  <Pencil className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold">
                    تعديل نموذج الاختبار
                  </h3>
                  <p className="text-xs text-slate-500">
                    تعديل البيانات، الأسئلة، وتوزيع الدرجات
                  </p>
                </div>
              </div>

              <button
                onClick={() => setEditingExam(null)}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form & Question Snapshots List */}
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    عنوان نموذج الاختبار:
                  </label>
                  <input
                    type="text"
                    value={editingExam.title}
                    onChange={(e) =>
                      setEditingExam({ ...editingExam, title: e.target.value })
                    }
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold focus:border-amber-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    زمن الامتحان (بالدقائق):
                  </label>
                  <input
                    type="number"
                    value={editingExam.durationMinutes || 90}
                    onChange={(e) =>
                      setEditingExam({
                        ...editingExam,
                        durationMinutes: Number(e.target.value),
                      })
                    }
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold focus:border-amber-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    حالة النموذج:
                  </label>
                  <select
                    value={editingExam.status}
                    onChange={(e) =>
                      setEditingExam({
                        ...editingExam,
                        status: e.target.value as
                          "draft" | "published" | "archived",
                      })
                    }
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold focus:border-amber-500 outline-none"
                  >
                    <option value="published">منشور ومعتمد</option>
                    <option value="draft">مسوّدة</option>
                    <option value="archived">مؤرشف</option>
                  </select>
                </div>
              </div>

              {/* Questions List Header */}
              <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 dark:border-amber-800">
                <div className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  أسئلة النموذج ({editingExam.questionSnapshots.length} سؤال)
                </div>
                <div className="text-xs font-mono font-bold text-amber-800 dark:text-amber-300">
                  الدرجة الكلية:{" "}
                  {editingExam.questionSnapshots.reduce(
                    (s, q) => s + (Number(q.allocatedMarks) || 0),
                    0,
                  )}{" "}
                  درجة
                </div>
              </div>

              {/* Snapshots Items */}
              <div className="space-y-3">
                {(editingExam.questionSnapshots || []).map((q, qIdx) => (
                  <div
                    key={q.questionId + "_" + qIdx}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-3 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold text-xs text-blue-600 dark:text-blue-400">
                        سؤال #{qIdx + 1}
                      </span>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                            الدرجة:
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={q.allocatedMarks}
                            onChange={(e) =>
                              handleUpdateSnapshotField(
                                qIdx,
                                "allocatedMarks",
                                e.target.value,
                              )
                            }
                            className="w-16 p-1 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-center"
                          />
                        </div>

                        <button
                          onClick={() => handleRemoveSnapshot(qIdx)}
                          className="p-1.5 rounded bg-red-50 hover:bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 text-xs font-bold transition"
                          title="حذف السؤال من هذا النموذج"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Question Text */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500">
                        نص السؤال:
                      </label>
                      <div className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 min-h-[120px] overflow-hidden">
                        <RichTextEditor
                          value={q.text}
                          onChange={(newVal) =>
                            handleUpdateSnapshotField(
                              qIdx,
                              "text",
                              newVal,
                            )
                          }
                        />
                      </div>
                    </div>

                    {/* Question Answer */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-purple-600 dark:text-purple-400">
                        الإجابة النموذجية:
                      </label>
                      <input
                        type="text"
                        value={q.answer || ""}
                        onChange={(e) =>
                          handleUpdateSnapshotField(
                            qIdx,
                            "answer",
                            e.target.value,
                          )
                        }
                        className="w-full p-2 rounded-lg border border-purple-200 dark:border-purple-800/60 bg-purple-50/50 dark:bg-purple-950/20 text-xs font-semibold focus:border-purple-500 outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Question from Bank Option */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-dashed border-slate-300 dark:border-slate-700 space-y-2">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-emerald-600" />
                  <span>إضافة سؤال من بنك الأسئلة للنموذج:</span>
                </div>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddQuestionToEditExam(e.target.value);
                      e.target.value = "";
                    }
                  }}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="">
                    -- اختر سؤالاً لإضافته لهذا النموذج --
                  </option>
                  {questions
                    .filter(
                      (q) =>
                        (q.subjectId === editingExam.scope?.subjectId || q.subjectId === (editingExam as any).subjectId) &&
                        !(editingExam.questionSnapshots || []).some(
                          (s) => s.questionId === q.id,
                        ),
                    )
                    .map((q, qIdx) => (
                      <option key={(q.id || "q") + "_" + qIdx} value={q.id}>
                        {q.text.substring(0, 60)}... (
                        {q.type === "mcq" ? "اختيار من متعدد" : "مقال"})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setEditingExam(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200"
              >
                إلغاء التعديل
              </button>

              <button
                onClick={handleSaveEditingExam}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>حفظ التعديلات في المكتبة</span>
              </button>
            </div>
          </div>
        </div>
      )}




      {/* Print Preview Modal for Selected Exam */}
      {previewExam && (
        <PrintPreviewModal
          isOpen={isPrintModalOpen}
          onClose={() => {
            setIsPrintModalOpen(false);
            setPreviewExam(null);
          }}
          title={`${subjects.find(s => s.id === (previewExam.scope?.subjectId || (previewExam as any).subjectId))?.name || "المادة"} - نموذج اختباري - ${previewExam.title}`}
          extraToolbarContent={
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAnswerKey(!showAnswerKey)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  showAnswerKey
                    ? "bg-purple-600 hover:bg-purple-700 text-white"
                    : "bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 hover:bg-purple-200"
                }`}
              >
                <span>{showAnswerKey ? "عرض ورقة الطلاب 📄" : "عرض سلّم الحل والجواب 🔑"}</span>
              </button>
              
              {canPerformAction(effectiveUser, "edit", "exams") && canAccessSubject(effectiveUser, previewExam.scope?.subjectId || (previewExam as any).subjectId) && (
                <button
                  onClick={() => {
                    const examToEdit = previewExam;
                    setIsPrintModalOpen(false);
                    setPreviewExam(null);
                    if (onEditExam) {
                      onEditExam(examToEdit);
                    } else {
                      setEditingExam(examToEdit);
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  title="تعديل هذا النموذج في محرك توليد الاختبارات"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>تعديل النموذج</span>
                </button>
              )}
            </div>
          }
        >
          <PaginatedA4Preview
            template={{
              ...(previewExam.printTemplate || activeTemplate),
              headerContent: {
                ...(previewExam.printTemplate?.headerContent || activeTemplate.headerContent),
                subjectName: subjects.find(s => s.id === (previewExam.scope?.subjectId || (previewExam as any).subjectId))?.name || "نموذج اختبار معتمد",
              },
            }}
            title={previewExam.title}
            hierarchyText={(() => {
              if (!previewExam) return "";
              const sub = subjects.find(s => s.id === previewExam.scope?.subjectId || s.id === (previewExam as any).subjectId);
              const subName = sub?.name || "المادة";
              
              if (previewExam.scope?.isComprehensive || !previewExam.scope?.unitIds || previewExam.scope.unitIds.length === 0) {
                return `نموذج اختباري معتمد | ${subName} - امتحان شامل لكافة الوحدات`;
              }
              
              const unitList = (units || rawUnits).filter(u => previewExam.scope?.unitIds?.includes(u.id));
              if (unitList.length === 1) {
                let text = `${subName} - ${unitList[0].title}`;
                if (previewExam.scope?.lessonIds && previewExam.scope.lessonIds.length === 1) {
                  const les = (lessons || rawLessons).find(l => l.id === previewExam.scope?.lessonIds?.[0]);
                  if (les) text += ` | ${les.title}`;
                }
                return `نموذج اختباري معتمد | ${text}`;
              }
              return `نموذج اختباري معتمد | ${subName} - (${unitList.length} وحدات)`;
            })()}
            items={previewExamItems}
          />
        </PrintPreviewModal>
      )}
      </>
      )}
    </div>
  );
};
