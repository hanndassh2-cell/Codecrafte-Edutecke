import React, { useState, useMemo, useEffect } from "react";
import { RichTextEditor } from "../../editor/components/RichTextEditor";
import {
  Sparkles, X,
  Filter,
  ShieldAlert,
  History,
  AlertTriangle,
  Code,
  CheckSquare,
  Square,
  Info,
  Printer,
  FileSpreadsheet,
  FileText,
  Layers,
  CheckCircle2,
  Check,
  Copy,
  Loader2,
  Settings,
  HelpCircle,
  Clock,
  BookOpen,
  Layout,
  ChevronUp,
  ChevronDown,
  Plus,
  Trash2,
  Edit2,
  Pencil,
  Bold,
  Italic,
  Underline,
  AlignRight,
  AlignCenter,
  AlignLeft,
  Type,
  Palette,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  RefreshCw,
} from "lucide-react";
import {
  Subject,
  Unit,
  Lesson,
  Question,
  Exam,
  ExamTemplate,
  PrintTemplate,
  QuestionSnapshot,
  ExamLibraryDocument,
  ExamQuestionEntry,
  User,
} from "../../../types/index";
import { A4PaperPreview } from "../../../components/A4PaperPreview";
import { PaginatedA4Preview } from "../../../components/PaginatedA4Preview";
import { PrintPreviewModal } from "../../../components/PrintPreviewModal";
import { storage } from "../../../services/storage";
import { aiService } from "../../ai/services/aiService";
import { AIExecutionCenterModal } from "../../ai/components/AIExecutionCenterModal";
import { Sliders } from "lucide-react";
import { examLibraryService } from "../../../services/examLibraryService";
import { MathText } from "../../../components/MathText";
import { cleanQuestionTextForRender } from "../../../components/QuestionRenderer";
import { generateExamPrintItems } from "../../../services/SharedPrintService";
import { stripHtml } from "../../../services/bidiContentPipeline";
import {
  filterAllowedSubjects,
  filterAllowedItemsBySubject,
  canPerformAction,
  canAccessSubject,
} from "../../../services/rbacEngine";

interface ExamGeneratorViewProps {
  subjects: Subject[];
  units: Unit[];
  lessons?: Lesson[];
  questions: Question[];
  exams: Exam[];
  examTemplates: ExamTemplate[];
  printTemplates: PrintTemplate[];
  onSaveExam: (exam: Exam) => void;
  onSavePrintTemplate?: (tmpl: PrintTemplate) => void;
  onDeleteExam?: (examId: string) => void;
  onNavigate?: (tab: string) => void;
  initialExamToEdit?: ExamLibraryDocument | null;
  onClearExamToEdit?: () => void;
}

import {
  SplitWorkspaceLayout,
  uiClasses,
} from "../../../components/SplitWorkspaceLayout";

export interface QuestionSectionConfig {
  id: string;
  questionNumberLabel?: string;
  title: string;
  questionType: string;
  count: number;
  markPerQuestion: number;
  selectedQuestionIds?: string[];
  fontSize?: string;
  fontFamily?: string;
  textColor?: string;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  textAlign?: "right" | "center" | "left";
}

export const QUESTION_TYPES_LABEL: Record<string, string> = {
  all: "أسئلة متنوعة (جميع الأنواع)",
  true_false: "صح أو خطأ (True/False)",
  mcq: "اختر الإجابة الصحيحة (MCQ)",
  essay: "أسئلة مقالية وإنشائية (Essay)",
  problem: "مسائل حسابية وتطبيقية (Problem)",
  definition: "تعاريف ومفاهيم (Definition)",
  explain: "اشرح / وضح / علل (Explain)",
  reason: "علل / فسر (Reason)",
  fill_blanks: "أكمل الفراغات (Fill Blanks)",
  matching: "توصيل ومطابقة (Matching)",
  ordering: "ترتيب تسلسلي (Ordering)",
  diagram_label: "سمِّ الأجزاء على الرسم (Diagram Label)",
  table_query: "أسئلة جداول ورسوم بيانية (Table Query)",
  equation: "معادلات وموازنة (Equation)",
  grammar: "قواعد لغوية وإعراب (Grammar)",
  image_choice: "اختيار من صورة/شكل",
  listening: "استماع وفهم",
  intro: "مقدمة واستهلال",
  main_idea: "الفكرة الرئيسية",
  note: "ملاحظات هامة",
  custom: "نوع مخصص (Custom)",
};

const getArabicQuestionLabel = (index: number): string => {
  const labels = [
    "السؤال الأول",
    "السؤال الثاني",
    "السؤال الثالث",
    "السؤال الرابع",
    "السؤال الخامس",
    "السؤال السادس",
    "السؤال السابع",
    "السؤال الثامن",
    "السؤال التاسع",
    "السؤال العاشر",
  ];
  return labels[index - 1] || `السؤال ${index}`;
};

const getDefaultWordingForType = (type: string): string => {
  switch (type) {
    case "true_false":
      return "ضع علامة (صح) أو (خطأ) أمام العبارات التالية:";
    case "mcq":
      return "اختر الإجابة الصحيحة لكل من الفقرات التالية:";
    case "essay":
      return "أجب عن الأسئلة التالية:";
    case "problem":
      return "حل المسائل التالية:";
    case "definition":
      return "عرّف المصطلحات التالية:";
    case "explain":
    case "reason":
      return "علّل واشرح العبارات التالية:";
    case "fill_blanks":
      return "أكمل الفراغات التالية:";
    case "matching":
      return "صل بين عناصر العمود الأول وما يناسبها في العمود الثاني:";
    case "ordering":
      return "رتب الخطوات التالية ترتيباً صحيحاً:";
    case "diagram_label":
      return "اكتب البيانات المناسبة على الشكل:";
    case "table_query":
      return "أجب عن الأسئلة بناءً على الجدول أو الرسم البياني:";
    case "equation":
      return "اكتب واوزن المعادلات التالية:";
    case "grammar":
      return "أعرب العبارات التالية واستخرج القواعد المطلوبة:";
    case "all":
    default:
      return "أجب عن الأسئلة التالية:";
  }
};

export const ExamGeneratorView: React.FC<ExamGeneratorViewProps> = ({
  subjects,
  units,
  lessons: lessonsProp,
  questions,
  exams,
  examTemplates,
  printTemplates,
  onSaveExam,
  onSavePrintTemplate,
  onDeleteExam,
  onNavigate,
  initialExamToEdit,
  onClearExamToEdit,
}) => {
  const egSavedUi = useMemo(() => storage.getUiState("exam_generator_ui", {
    selectedSubjectId: subjects?.[0]?.id || "",
    selectedUnitIds: ["all"],
    selectedLessonIds: ["all"],
    selectedMode: "auto" as const,
    collapsedSections: { "sec-1": true, "sec-2": true, "sec-3": true },
  }), []);

  const [currentUser, setCurrentUser] = useState<User | null>(() => storage.getCurrentUser());

  useEffect(() => {
    const handleUserChange = () => {
      setCurrentUser(storage.getCurrentUser());
    };
    window.addEventListener("storage", handleUserChange);
    window.addEventListener("auth-changed", handleUserChange);
    return () => {
      window.removeEventListener("storage", handleUserChange);
      window.removeEventListener("auth-changed", handleUserChange);
    };
  }, []);

  const allowedSubjects = useMemo(
    () => filterAllowedSubjects(currentUser, subjects && subjects.length > 0 ? subjects : storage.getSubjects()),
    [currentUser, subjects]
  );

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    () => egSavedUi.selectedSubjectId || allowedSubjects?.[0]?.id || "",
  );

  // Synchronize selectedSubjectId if not authorized for current user
  useEffect(() => {
    if (allowedSubjects.length > 0) {
      const isAllowed = allowedSubjects.some((s) => s.id === selectedSubjectId);
      if (!isAllowed) {
        setSelectedSubjectId(allowedSubjects[0].id);
        setSelectedUnitIds(["all"]);
        setSelectedLessonIds(["all"]);
      }
    }
  }, [allowedSubjects, selectedSubjectId]);
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>(
    egSavedUi.selectedUnitIds || ["all"],
  );
  const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>(
    egSavedUi.selectedLessonIds || ["all"],
  );
  const [isUnitsDropdownOpen, setIsUnitsDropdownOpen] = useState(false);
  const [isLessonsDropdownOpen, setIsLessonsDropdownOpen] = useState(false);
  const [showExecutionCenterModal, setShowExecutionCenterModal] = useState(false);

  const isAllUnitsSelected =
    selectedUnitIds.includes("all") || selectedUnitIds.length === 0;
  const isAllLessonsSelected =
    selectedLessonIds.includes("all") || selectedLessonIds.length === 0;

  const selectedUnitId = isAllUnitsSelected ? "all" : selectedUnitIds[0] || "all";
  const selectedLessonId = isAllLessonsSelected ? "all" : selectedLessonIds[0] || "all";

  // Data Fallbacks from Storage to ensure Curriculum Tree is always connected
  const rawUnits = useMemo(
    () => (units && units.length > 0 ? units : storage.getUnits()),
    [units]
  );
  const rawLessons = useMemo(
    () => (lessonsProp && lessonsProp.length > 0 ? lessonsProp : storage.getLessons()),
    [lessonsProp]
  );
  const rawQuestions = useMemo(
    () => (questions && questions.length > 0 ? questions : storage.getQuestions()),
    [questions]
  );

  const allUnits = useMemo(() => filterAllowedItemsBySubject(currentUser, rawUnits), [currentUser, rawUnits]);
  const allLessons = useMemo(() => filterAllowedItemsBySubject(currentUser, rawLessons), [currentUser, rawLessons]);
  const allQuestions = useMemo(() => filterAllowedItemsBySubject(currentUser, rawQuestions), [currentUser, rawQuestions]);

  const currentSubjectUnits = useMemo(() => {
    return allUnits.filter(
      (u) => u && (u.subjectId === selectedSubjectId || selectedSubjectId === "all" || !selectedSubjectId),
    );
  }, [allUnits, selectedSubjectId]);

  const currentUnitLessons = useMemo(() => {
    return allLessons.filter((l) => {
      if (!l) return false;
      const matchesSubject =
        !selectedSubjectId ||
        selectedSubjectId === "all" ||
        l.subjectId === selectedSubjectId ||
        allUnits.some((u) => u.id === l.unitId && (u.subjectId === selectedSubjectId || selectedSubjectId === "all"));

      const matchesUnit = isAllUnitsSelected || selectedUnitIds.includes(l.unitId);

      return matchesSubject && matchesUnit;
    });
  }, [allLessons, allUnits, selectedSubjectId, selectedUnitIds, isAllUnitsSelected]);

  const getUnitQuestionsCount = (unitId: string) => {
    return allQuestions.filter(
      (q) => q && q.unitId === unitId && q.status !== "archived" && !q.isArchived,
    ).length;
  };

  const getLessonQuestionsCount = (lessonId: string) => {
    return allQuestions.filter(
      (q) => q && q.lessonId === lessonId && q.status !== "archived" && !q.isArchived,
    ).length;
  };

  const handleToggleUnit = (unitId: string) => {
    if (isAllUnitsSelected) {
      setSelectedUnitIds([unitId]);
    } else {
      let next: string[];
      if (selectedUnitIds.includes(unitId)) {
        next = selectedUnitIds.filter((id) => id !== unitId);
      } else {
        next = [...selectedUnitIds, unitId];
      }
      if (next.length === 0 || next.length === currentSubjectUnits.length) {
        setSelectedUnitIds(["all"]);
      } else {
        setSelectedUnitIds(next);
      }
    }
    setSelectedLessonIds(["all"]);
  };

  const handleToggleLesson = (lessonId: string) => {
    if (isAllLessonsSelected) {
      setSelectedLessonIds([lessonId]);
    } else {
      let next: string[];
      if (selectedLessonIds.includes(lessonId)) {
        next = selectedLessonIds.filter((id) => id !== lessonId);
      } else {
        next = [...selectedLessonIds, lessonId];
      }
      if (next.length === 0 || next.length === currentUnitLessons.length) {
        setSelectedLessonIds(["all"]);
      } else {
        setSelectedLessonIds(next);
      }
    }
  };
  const [selectedMode, setSelectedMode] = useState<"auto" | "semi" | "manual">(
    egSavedUi.selectedMode || "auto",
  );
  // Collapsible Sections State - Folded/Collapsed by default when window opens
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >(egSavedUi.collapsedSections || {
    "sec-1": true,
    "sec-2": true,
    "sec-3": true,
  });

  useEffect(() => {
    storage.saveUiState("exam_generator_ui", {
      selectedSubjectId,
      selectedUnitIds,
      selectedLessonIds,
      selectedMode,
      collapsedSections,
    });
  }, [selectedSubjectId, selectedUnitIds, selectedLessonIds, selectedMode, collapsedSections]);

  const handleAddSection = () => {
    const newId = "sec-" + Date.now();
    const nextIdx = customSections.length + 1;
    const takenTypes = new Set(
      customSections
        .filter((s) => s.questionType && s.questionType !== "all")
        .map((s) => s.questionType),
    );
    const preferredTypes = [
      "true_false",
      "mcq",
      "essay",
      "problem",
      "definition",
      "fill_blanks",
      "matching",
      "reason",
    ];
    const availableType =
      preferredTypes.find((t) => !takenTypes.has(t)) || "all";

    const newSec: QuestionSectionConfig = {
      id: newId,
      questionNumberLabel: getArabicQuestionLabel(nextIdx),
      title: getDefaultWordingForType(availableType),
      questionType: availableType,
      count: 3,
      markPerQuestion: 5,
      fontSize: "12pt",
    };
    setCustomSections((prev) =>
      autoDistributeMarks([...prev, newSec], totalMarks),
    );
    // Fold/collapse new section by default upon addition as requested
    setCollapsedSections((prev) => ({ ...prev, [newId]: true }));
  };

  const toggleSectionCollapse = (id: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [id]: prev[id] === false ? true : false,
    }));
  };

  // Custom Question Structure Sections State
  const [customSections, setCustomSections] = useState<QuestionSectionConfig[]>(
    [
      {
        id: "sec-1",
        questionNumberLabel: "السؤال الأول",
        title:
          "ضع علامة (صح) أو (خطأ) أمام العبارات التالية:",
        questionType: "true_false",
        count: 3,
        markPerQuestion: 5,
        fontSize: "12pt",
      },
      {
        id: "sec-2",
        questionNumberLabel: "السؤال الثاني",
        title:
          "اختر الإجابة الصحيحة لكل من الفقرات التالية:",
        questionType: "mcq",
        count: 3,
        markPerQuestion: 5,
        fontSize: "12pt",
      },
      {
        id: "sec-3",
        questionNumberLabel: "السؤال الثالث",
        title:
          "أجب عن الأسئلة التالية:",
        questionType: "essay",
        count: 2,
        markPerQuestion: 10,
        fontSize: "12pt",
      },
    ],
  );

  // Exclusion Criteria States
  const [excludePreviouslyUsed, setExcludePreviouslyUsed] =
    useState<boolean>(true);
  const [excludePartialUnitExams, setExcludePartialUnitExams] =
    useState<boolean>(true);
  const [filterOnlyApproved, setFilterOnlyApproved] = useState<boolean>(true);
  const [isExclusionCollapsed, setIsExclusionCollapsed] =
    useState<boolean>(true);
  const [isExamTitleCollapsed, setIsExamTitleCollapsed] =
    useState<boolean>(true);
  const [isPaperComponentsCollapsed, setIsPaperComponentsCollapsed] =
    useState<boolean>(true);
  const [isStructureSectionCollapsed, setIsStructureSectionCollapsed] =
    useState<boolean>(true);

  // Manual & Semi-auto State
  const [hideUsedQuestions, setHideUsedQuestions] = useState<boolean>(false);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [showAlgorithmModal, setShowAlgorithmModal] = useState<boolean>(false);
  const [showClearExamConfirm, setShowClearExamConfirm] =
    useState<boolean>(false);
  const [activeModalSectionId, setActiveModalSectionId] = useState<
    string | null
  >(null);

  // Ensure selectedSubjectId is always set to a valid allowed subject
  useEffect(() => {
    if (allowedSubjects && allowedSubjects.length > 0) {
      const isValid = allowedSubjects.some((s) => s.id === selectedSubjectId);
      if (!isValid && !initialExamToEdit) {
        const defaultSub = allowedSubjects[0];
        setSelectedSubjectId(defaultSub.id);
        if (defaultSub.totalMarks) {
          setTotalMarks(defaultSub.totalMarks);
        }
      }
    }
  }, [allowedSubjects, selectedSubjectId, initialExamToEdit]);

  // Load initial exam model for editing when provided from library
  useEffect(() => {
    if (!initialExamToEdit) {
      setGeneratedExam(null);
      if (allowedSubjects && allowedSubjects.length > 0 && !selectedSubjectId) {
        setSelectedSubjectId(allowedSubjects[0].id);
        if (allowedSubjects[0].totalMarks) {
          setTotalMarks(allowedSubjects[0].totalMarks);
        }
      }
      setCustomSections([
        {
          id: "sec-1",
          questionNumberLabel: "السؤال الأول",
          title:
          "ضع علامة (صح) أو (خطأ) أمام العبارات التالية:",
          questionType: "true_false",
          count: 3,
          markPerQuestion: 5,
        },
        {
          id: "sec-2",
          questionNumberLabel: "السؤال الثاني",
          title:
          "اختر الإجابة الصحيحة لكل من الفقرات التالية:",
          questionType: "mcq",
          count: 3,
          markPerQuestion: 5,
        },
        {
          id: "sec-3",
          questionNumberLabel: "السؤال الثالث",
          title:
          "أجب عن الأسئلة التالية:",
          questionType: "essay",
          count: 2,
          markPerQuestion: 10,
        },
      ]);
      setExcludePreviouslyUsed(true);
      setExcludePartialUnitExams(true);
      setFilterOnlyApproved(true);
      setSelectedQuestionIds([]);
      setSelectedMode("auto");
      setTotalMarks(100);
      setDurationMinutes(90);
      setCurrentStep(1);
      return;
    }

    // Security check on editing exam
    const initialSubId = initialExamToEdit.scope?.subjectId || (initialExamToEdit as any).subjectId;
    if (initialSubId && !canAccessSubject(currentUser, initialSubId)) {
      showToast("⚠️ ليس لديك صلاحية الوصول إلى مادة هذا النموذج.");
      if (onClearExamToEdit) onClearExamToEdit();
      return;
    }
    if (!canPerformAction(currentUser, "edit", "exams")) {
      showToast("⚠️ ليس لديك صلاحية تعديل نماذج الاختبارات.");
      if (onClearExamToEdit) onClearExamToEdit();
      return;
    }

    // 1. Scope (subject, unit, lesson)
    if (initialSubId) {
      setSelectedSubjectId(initialSubId);
    }
    const initialUnitIds = initialExamToEdit.scope?.unitIds || (initialExamToEdit as any).unitIds;
    if (Array.isArray(initialUnitIds) && initialUnitIds.length > 0) {
      setSelectedUnitIds(initialUnitIds);
    } else {
      setSelectedUnitIds(["all"]);
    }
    const initialLessonIds = initialExamToEdit.scope?.lessonIds || (initialExamToEdit as any).lessonIds;
    if (Array.isArray(initialLessonIds) && initialLessonIds.length > 0) {
      setSelectedLessonIds(initialLessonIds);
    } else {
      setSelectedLessonIds(["all"]);
    }

    // 2. Mode, Title, Total Marks
    if (initialExamToEdit.generationMethod) {
      setSelectedMode(initialExamToEdit.generationMethod as any);
    }
    if (initialExamToEdit.title) {
      setExamTitle(initialExamToEdit.title);
    }
    if (initialExamToEdit.totalMarks) {
      setTotalMarks(initialExamToEdit.totalMarks);
    }

    // 3. Question IDs
    const qIds =
      initialExamToEdit.usedQuestionIds &&
      initialExamToEdit.usedQuestionIds.length > 0
        ? initialExamToEdit.usedQuestionIds
        : (initialExamToEdit.questionSnapshots || []).map((s) => s.questionId);
    setSelectedQuestionIds(qIds);

    // 4. Custom Sections Restoration
    let reconstructedSections: QuestionSectionConfig[] = [];

    if (
      initialExamToEdit.sections &&
      Array.isArray(initialExamToEdit.sections) &&
      initialExamToEdit.sections.length > 0
    ) {
      reconstructedSections = initialExamToEdit.sections.map((sec: any, idx: number) => {
        const secId = sec.id || `sec-${idx + 1}`;
        let secSelectedIds = sec.selectedQuestionIds || [];
        if (secSelectedIds.length === 0) {
          const rawV0 = initialExamToEdit.versions?.[0]?.questions || [];
          const matchingV0 = rawV0.filter(
            (q: any) => q.sectionId === secId || (!q.sectionId && idx === 0),
          );
          if (matchingV0.length > 0) {
            secSelectedIds = matchingV0.map((q: any) => q.questionId || q.id);
          } else if (initialExamToEdit.questionSnapshots) {
            const matchingSnaps = initialExamToEdit.questionSnapshots.filter(
              (s: any) => s.sectionId === secId || s.questionType === sec.questionType,
            );
            secSelectedIds = matchingSnaps.map((s: any) => s.questionId);
          }
        }
        return {
          id: secId,
          questionNumberLabel: sec.questionNumberLabel || getArabicQuestionLabel(idx + 1),
          title: sec.title !== undefined ? sec.title : getDefaultWordingForType(sec.questionType || "all"),
          questionType: sec.questionType || "all",
          count: sec.count || secSelectedIds.length || 1,
          markPerQuestion: sec.markPerQuestion || 5,
          selectedQuestionIds: secSelectedIds,
          fontSize: sec.fontSize || "12pt",
        };
      });
    } else if (
      initialExamToEdit.questionSnapshots &&
      initialExamToEdit.questionSnapshots.length > 0
    ) {
      // Group questions by sectionId if distinct sectionIds exist; otherwise group by questionType
      const validSecIds = new Set(
        initialExamToEdit.questionSnapshots
          .map((s) => s.sectionId)
          .filter((id): id is string => Boolean(id) && id !== "sec-1")
      );

      const sectionsMap = new Map<
        string,
        {
          sectionId: string;
          questionType: string;
          allocatedMarks: number;
          questionIds: string[];
        }
      >();

      initialExamToEdit.questionSnapshots.forEach((snap) => {
        const key =
          validSecIds.size > 0 && snap.sectionId
            ? snap.sectionId
            : `sec_type_${snap.questionType || "all"}`;

        if (!sectionsMap.has(key)) {
          const newSecId = `sec-${sectionsMap.size + 1}`;
          sectionsMap.set(key, {
            sectionId: newSecId,
            questionType: snap.questionType || "all",
            allocatedMarks: snap.allocatedMarks || 5,
            questionIds: [],
          });
        }
        sectionsMap.get(key)!.questionIds.push(snap.questionId);
      });

      if (sectionsMap.size > 0) {
        reconstructedSections = Array.from(sectionsMap.values()).map(
          (data, idx) => ({
            id: data.sectionId,
            questionNumberLabel: getArabicQuestionLabel(idx + 1),
            title: getDefaultWordingForType(data.questionType),
            questionType: data.questionType,
            count: data.questionIds.length,
            markPerQuestion: data.allocatedMarks,
            selectedQuestionIds: data.questionIds,
            fontSize: "12pt",
          })
        );
      }
    }

    if (reconstructedSections.length > 0) {
      setCustomSections(reconstructedSections);
    }

    // 5. Version A & Version B questions
    let versionAQuestions: ExamQuestionEntry[] = [];

    const rawV0 = initialExamToEdit.versions?.[0]?.questions;

    if (rawV0 && rawV0.length > 0) {
      versionAQuestions = rawV0.map((eq, idx) => {
        const matchingSec =
          reconstructedSections.find((s) =>
            s.selectedQuestionIds?.includes(eq.questionId)
          ) || reconstructedSections.find((s) => s.id === eq.sectionId);

        return {
          ...eq,
          sectionId: matchingSec ? matchingSec.id : eq.sectionId || "sec-1",
          questionOrder: eq.questionOrder || idx + 1,
        };
      });
    } else {
      let order = 1;
      if (reconstructedSections.length > 0) {
        reconstructedSections.forEach((sec) => {
          (sec.selectedQuestionIds || []).forEach((qId) => {
            const snap = (initialExamToEdit.questionSnapshots || []).find(
              (s) => s.questionId === qId
            );
            versionAQuestions.push({
              id: qId,
              questionId: qId,
              allocatedMarks: snap?.allocatedMarks || sec.markPerQuestion || 5,
              sectionId: sec.id,
              questionOrder: order++,
            });
          });
        });
      } else {
        versionAQuestions = (initialExamToEdit.questionSnapshots || []).map(
          (snap, idx) => ({
            id: snap.questionId,
            questionId: snap.questionId,
            allocatedMarks: snap.allocatedMarks || 5,
            sectionId: snap.sectionId || "sec-1",
            questionOrder: idx + 1,
          })
        );
      }
    }

    const versionBQuestions = initialExamToEdit.versions?.[1]?.questions;

    const loadedExam: Exam = {
      durationMinutes: initialExamToEdit.durationMinutes || 90,
      id: initialExamToEdit.examId,
      title: initialExamToEdit.title,
      subjectId: initialExamToEdit.scope?.subjectId || "",
      unitIds: initialExamToEdit.scope?.unitIds || [],
      lessonIds: initialExamToEdit.scope?.lessonIds || [],
      totalQuestions:
        initialExamToEdit.totalQuestions || versionAQuestions.length,
      totalMarks: initialExamToEdit.totalMarks || 100,
      difficultyProfile: "balanced",
      generationType:
        initialExamToEdit.generationMethod === "auto"
          ? "auto"
          : initialExamToEdit.generationMethod === "semi"
            ? "semi_auto"
            : "manual",
      versions: [
        {
          versionCode: initialExamToEdit.versions?.[0]?.versionCode || "أ",
          questions: versionAQuestions,
        },
        ...(versionBQuestions
          ? [
              {
                versionCode: initialExamToEdit.versions?.[1]?.versionCode || "ب",
                questions: versionBQuestions,
              },
            ]
          : []),
      ],
      createdAt: initialExamToEdit.createdAt || new Date().toISOString(),
      createdBy: initialExamToEdit.createdByName || "المعلم",
      status: initialExamToEdit.status === "published" ? "finalized" : "draft",
      libraryDoc: initialExamToEdit,
    };

    setDurationMinutes(loadedExam.durationMinutes || 90);
    setGeneratedExam(loadedExam);
    if (initialExamToEdit.printTemplate) {
      setActiveTemplate(initialExamToEdit.printTemplate);
    }
  }, [initialExamToEdit]);

  // Helper to calculate sub-items/paragraphs count and sub-item mark for a question
  const getQuestionSubItemsDetails = (
    q: Question | QuestionSnapshot | undefined,
    allocatedMark: number,
  ) => {
    if (!q)
      return {
        subCount: 1,
        subTypeLabel: "فقرة",
        markPerSubItem: allocatedMark,
        formatted: `${allocatedMark} درجة`,
      };

    let subCount = 1;
    let subTypeLabel = "فقرة";
    const qType = "type" in q ? q.type : q.questionType;

    if (qType === "mcq" && q.distractors && q.distractors.length > 0) {
      subCount = q.distractors.length;
      subTypeLabel = "خيارات/فقرات";
    } else if (
      qType === "matching" &&
      q.matchingPairs &&
      q.matchingPairs.length > 0
    ) {
      subCount = q.matchingPairs.length;
      subTypeLabel = "فقرات توصيل";
    } else if (
      qType === "ordering" &&
      q.sequenceItems &&
      q.sequenceItems.length > 0
    ) {
      subCount = q.sequenceItems.length;
      subTypeLabel = "فقرات ترتيب";
    } else if (q.text) {
      // Check for bullet points or numbered lines e.g. 1-, 2-, 3-
      const lines = q.text
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      if (lines.length > 1) {
        subCount = lines.length;
        subTypeLabel = "أجزاء/فقرات";
      }
    }

    const rawMark = subCount > 0 ? allocatedMark / subCount : allocatedMark;
    const markPerSubItem = Math.round(rawMark * 100) / 100;

    return {
      subCount,
      subTypeLabel,
      markPerSubItem,
      formatted:
        subCount > 1
          ? `${subCount} ${subTypeLabel} × ${markPerSubItem} درجة`
          : `${allocatedMark} درجة`,
    };
  };

  const autoDistributeMarks = (
    sections: QuestionSectionConfig[],
    targetTotalMarks: number,
  ) => {
    if (sections.length === 0) return sections;
    const totalQCount = sections.reduce((acc, s) => acc + (s.count || 1), 0);
    if (totalQCount === 0) return sections;

    const rawMarkPerQ = targetTotalMarks / totalQCount;
    const markPerQ = Math.round(rawMarkPerQ * 100) / 100;

    return sections.map((sec) => {
      return {
        ...sec,
        markPerQuestion: Math.max(0.1, markPerQ),
      };
    });
  };

  // Function to equalize total exam marks across all configured questions and sections
  const handleEqualizeMarks = (targetTotalMarks?: number) => {
    const currentTotalMarks = typeof targetTotalMarks === "number" ? targetTotalMarks : totalMarks;

    if (customSections.length === 0) {
      showToast("⚠️ يرجى إضافة أسئلة إلى هيكلية الامتحان أولاً للتوزيع.");
      return;
    }

    const targetMarkPerSection = currentTotalMarks / customSections.length;

    const updatedSections = customSections.map((sec) => {
      const count = sec.count || 1;
      const markPerSubItem = Math.round((targetMarkPerSection / count) * 100) / 100;
      return {
        ...sec,
        markPerQuestion: Math.max(0.1, markPerSubItem),
      };
    });

    setCustomSections(updatedSections);

    if (generatedExam) {
      setGeneratedExam({
        ...generatedExam,
        totalMarks: currentTotalMarks,
      });
    }

    showToast(
      `✨ تم توزيع العلامة الكلية (${currentTotalMarks} درجة) بالتساوي. سيتم ضبط الفروقات العشرية تلقائياً.`,
    );
  };

  // Clear Exam (Empty paper & remove from DB)
  const handleClearExam = () => {
    if (!generatedExam) return;
    setShowClearExamConfirm(true);
  };

  const confirmClearExam = () => {
    // We intentionally DO NOT delete from DB anymore.
    // The user wants to keep the generated exams in the library.
    resetAllGeneratorFormFields();
    showToast("تم تفريغ ورقة الاختبار وإعادة ضبط كافة الحقول بنجاح. النسخة السابقة محفوظة في المكتبة.");
  };

  const cancelClearExam = () => {
    setShowClearExamConfirm(false);
  };

  // Swap sub-question in Semi-Auto mode
  const handleSwapQuestion = (currentQuestionId: string, sectionId: string) => {
    if (!canPerformAction(currentUser, "edit", "exams")) {
      showToast("⚠️ ليس لديك صلاحية تعديل أسئلة الاختبار.");
      return;
    }
    if (!canAccessSubject(currentUser, selectedSubjectId)) {
      showToast("⚠️ ليس لديك صلاحية الوصول إلى هذه المادة.");
      return;
    }
    if (!generatedExam || !generatedExam.versions?.[0]) return;

    const currentQuestion = allQuestions.find((q) => q.id === currentQuestionId);
    if (!currentQuestion) return;

    // Find all question IDs currently used in the exam
    const currentlyUsedIds = new Set(
      generatedExam.versions[0].questions?.map((eq) => eq.questionId) || [],
    );

    // Find candidate replacement questions of same type and same subject
    const candidates = availableQuestions.filter(
      (q) =>
        (q.type === currentQuestion.type ||
          (currentQuestion.type as string) === "all") &&
        !currentlyUsedIds.has(q.id),
    );

    if (candidates.length === 0) {
      showToast("لا توجد أسئلة بديلة أخرى من نفس النوع متوفرة في بنك الأسئلة.");
      return;
    }

    // Pick candidate with highest weight or random
    const replacement = candidates[0];

    const updatedQuestions = generatedExam.versions[0].questions.map((eq) => {
      if (eq.questionId === currentQuestionId) {
        return { ...eq, questionId: replacement.id };
      }
      return eq;
    });

    const updatedExam = {
      ...generatedExam,
      versions: [
        {
          ...generatedExam.versions[0],
          questions: updatedQuestions,
        },
        ...(generatedExam.versions.slice(1) || []),
      ],
    };

    setGeneratedExam(updatedExam);
    showToast("تم استبدال السؤال بسؤال جديد بنجاح!");
  };

  const handleRemoveQuestionFromGeneratedExam = (
    questionIdToRemove: string,
  ) => {
    if (!canPerformAction(currentUser, "edit", "exams")) {
      showToast("⚠️ ليس لديك صلاحية تعديل أو حذف أسئلة من نموذج الاختبار.");
      return;
    }
    if (!canAccessSubject(currentUser, selectedSubjectId)) {
      showToast("⚠️ ليس لديك صلاحية الوصول إلى هذه المادة.");
      return;
    }
    if (!generatedExam || !generatedExam.versions?.[0]) return;
    const currentQuestions = generatedExam.versions[0].questions || [];
    const updatedQuestions = currentQuestions.filter(
      (eq) => eq.questionId !== questionIdToRemove,
    );

    if (updatedQuestions.length === 0) {
      showToast("لا يمكن حذف جميع الأسئلة من نموذج الاختبار.");
      return;
    }

    const updatedTotalMarks = updatedQuestions.reduce(
      (acc, eq) => acc + (eq.allocatedMarks || 5),
      0,
    );

    const updatedExam: Exam = {
      ...generatedExam,
      totalQuestions: updatedQuestions.length,
      totalMarks: updatedTotalMarks,
      versions: [
        {
          ...generatedExam.versions[0],
          questions: updatedQuestions,
        },
        ...(generatedExam.versions.slice(1) || []),
      ],
    };

    if (updatedExam.libraryDoc) {
      const updatedSnapshots = (
        updatedExam.libraryDoc.questionSnapshots || []
      ).filter((s) => s.questionId !== questionIdToRemove);
      const updatedUsedIds = (
        updatedExam.libraryDoc.usedQuestionIds || []
      ).filter((id) => id !== questionIdToRemove);
      updatedExam.libraryDoc = {
        ...updatedExam.libraryDoc,
        title: examTitle,
        durationMinutes: durationMinutes,
        totalQuestions: updatedQuestions.length,
        totalMarks: updatedTotalMarks,
        usedQuestionIds: updatedUsedIds,
        questionSnapshots: updatedSnapshots,
        updatedAt: new Date().toISOString(),
      };
      examLibraryService.saveExamToLibrary(updatedExam.libraryDoc);
    } else {
      storage.saveExam(updatedExam);
    }

    setGeneratedExam(updatedExam);
    showToast(
      "تم حذف السؤال من النموذج وإعادته بنجاح إلى بنك الأسئلة المتاحة ✨",
    );
  };

  // Config parameters
  const [educationalLevel, setEducationalLevel] = useState<string>("ثانوي");
  const [semester, setSemester] = useState<string>("الفصل الأول");
  const [examTitle, setExamTitle] = useState(
    "الامتحان النهائي لمادة العلوم العامة - الفصل الأول",
  );
  const [academicTerm, setAcademicTerm] = useState("الفصل الدراسي الأول 2026");
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [totalMarks, setTotalMarks] = useState(100);
  const [durationMinutes, setDurationMinutes] = useState(90);
  const [generateVersionB, setGenerateVersionB] = useState(false);
  const [showAnswerKey, setShowAnswerKey] = useState(false);

  const [showInstitutionLogo, setShowInstitutionLogo] = useState(false);
  const [showStudentBox, setShowStudentBox] = useState(true);
  const [showGradingTable, setShowGradingTable] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [instructionsText, setInstructionsText] = useState(
    "أجب عن جميع الأسئلة الآتية.\nاكتب بخط واضح ومقروء.\nراجع إجاباتك قبل تسليم الورقة.",
  );

  // Generation Loading
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const [activeTemplate, setActiveTemplate] = useState<PrintTemplate>(
    printTemplates.find((t) => t.isDefault && t.type === "exam") ||
      printTemplates[0] || {
        id: "tmpl-def-exam",
        name: "قالب A4 قياسي للامتحان",
        type: "exam",
        orientation: "portrait",
        marginsCm: { top: 2, bottom: 2, left: 1.5, right: 1.5 },
        headerContent: {
          schoolName: storage.getSettings().academyName || "المثنى لطلاب الهندسة",
          showHijriDate: true,
          showGregorianDate: true,
          subjectName: "",
          differentFirstPage: false,
        },
        footerContent: {
          teacherName: "إعداد قسم المناهج والتأليف",
          showPageNumber: true,
          copyrightNotice: "حقوق الطبع محفوظة © 2026",
        },
        watermark: {
          enabled: false,
          type: "text",
          text: "مسودة",
          opacity: 0.1,
          orientation: "diagonal",
        },
        typography: {
          fontFamily: "'Amiri', serif",
          baseFontSize: 12,
          headingSize: 16,
          studentBoxFontSize: 11,
          questionFontSize: 11,
          optionsFontSize: 10,
          marksFontSize: 10,
          questionSpacing: 12,
        },
        sideText: {
          right: {
            text: "",
            direction: "bottom-to-top",
            align: "center",
            fontFamily: "",
            fontSize: "12pt",
            color: "#000000",
            margin: "5px",
          },
          left: {
            text: "",
            direction: "top-to-bottom",
            align: "center",
            fontFamily: "",
            fontSize: "12pt",
            color: "#000000",
            margin: "5px",
          },
        },
        isDefault: true,
      },
  );

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [settingsTab, setSettingsTab] = useState<
    "margins" | "headerFooter" | "typography" | "spacing" | "watermark" | "sideText"
  >("margins");
  const [zoomLevel, setZoomLevel] = useState(100);

  const handleUpdateTypography = (key: keyof PrintTemplate["typography"], value: any) => {
    setActiveTemplate((prev) => ({
      ...prev,
      typography: {
        ...prev.typography,
        fontFamily: prev.typography?.fontFamily || "Cairo",
        baseFontSize: prev.typography?.baseFontSize || 12,
        headingSize: prev.typography?.headingSize || 18,
        [key]: value,
      },
    }));
  };

  const [toastMessage, setToastMessage] = useState("");
  const showToast = (msg: string) => {
    setToastMessage(msg);

    setTimeout(() => setToastMessage(""), 3000);
  };
  // Multi-Auto state
  const [showAutoMultiModal, setShowAutoMultiModal] = useState(false);
  const [multiExamCount, setMultiExamCount] = useState(3);
  const useAllQuestionsPerModel = false;
  const [multiExamDrafts, setMultiExamDrafts] = useState<Exam[] | null>(null);
  const [isMultiGenerating, setIsMultiGenerating] = useState(false);

  const [showNewTemplatePrompt, setShowNewTemplatePrompt] = useState(false);
  const [showEditTemplatePrompt, setShowEditTemplatePrompt] = useState(false);
  const [showDeleteTemplateConfirm, setShowDeleteTemplateConfirm] =
    useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");

  const handleSave = () => {
    if (onSavePrintTemplate) {
      onSavePrintTemplate(activeTemplate);
    } else {
      storage.savePrintTemplate(activeTemplate);
    }
    showToast("تم تطبيق القالب بنجاح!");
  };

  const resetTemplateSettings = () => {
    const defaultTmpl = storage
      .getPrintTemplates()
      .find((t) => t.id === "tmpl-def-exam");
    if (defaultTmpl) {
      setActiveTemplate(defaultTmpl);
      showToast("تمت استعادة القالب الافتراضي");
      return;
    }
    setActiveTemplate({
      ...activeTemplate,
      orientation: "portrait",
      marginsCm: { top: 2.5, bottom: 2.5, left: 2.0, right: 2.5 },
      headerContent: {
        ...activeTemplate.headerContent,
        rightText: "",
        centerText: "",
        leftText: "",
        differentFirstPage: false,
      },
      footerContent: {
        ...activeTemplate.footerContent,
        showPageNumber: true,
      },
      typography: {
        fontFamily: "'Amiri', serif",
        baseFontSize: 12,
        headingSize: 16,
        studentBoxFontSize: 11,
        questionFontSize: 11,
        optionsFontSize: 10,
        marksFontSize: 10,
        questionSpacing: 12,
      },
      watermark: {
        enabled: false,
        type: "text",
        text: "نظام إديوتيك",
        opacity: 0.1,
        orientation: "diagonal",
      },
    });
  };

  const handleSaveTemplateAsDefault = () => {
    const tmplToSave = {
      ...activeTemplate,
      id: "tmpl-def-exam",
      name: "القالب الافتراضي للامتحان",
    };
    if (onSavePrintTemplate) {
      onSavePrintTemplate(tmplToSave);
    } else {
      storage.savePrintTemplate(tmplToSave);
    }
    showToast("تم حفظ إعدادات القالب كافتراضية بنجاح!");
  };

  const handleSaveAsNewTemplate = () => {
    setNewTemplateName("قالب مخصص " + new Date().toLocaleDateString());
    setShowNewTemplatePrompt(true);
  };

  const confirmSaveNewTemplate = () => {
    if (newTemplateName.trim()) {
      const newId = "tmpl-" + Date.now();
      const newTmpl = {
        ...activeTemplate,
        id: newId,
        name: newTemplateName.trim(),
        isDefault: false,
      };
      if (onSavePrintTemplate) {
        onSavePrintTemplate(newTmpl);
      } else {
        storage.savePrintTemplate(newTmpl);
      }
      setActiveTemplate(newTmpl);
      setShowNewTemplatePrompt(false);
      showToast("تم حفظ القالب بنجاح!");
    }
  };
  const [generatedExam, setGeneratedExam] = useState<Exam | null>(null);

  const resetAllGeneratorFormFields = () => {
    // 1. Clear generated exam and edit mode
    setGeneratedExam(null);
    setSelectedQuestionIds([]);
    setCurrentStep(1);
    if (onClearExamToEdit) {
      onClearExamToEdit();
    }

    // 2. Reset Subject, Units, Lessons
    const firstSubject = subjects?.[0];
    const defaultSubjectId = firstSubject?.id || "";
    setSelectedSubjectId(defaultSubjectId);
    setSelectedUnitIds(["all"]);
    setSelectedLessonIds(["all"]);
    setIsUnitsDropdownOpen(false);
    setIsLessonsDropdownOpen(false);

    // 3. Reset Mode & Structure Sections
    setSelectedMode("auto");
    setCustomSections([
      {
        id: "sec-1",
        questionNumberLabel: "السؤال الأول",
        title: "ضع علامة (صح) أو (خطأ) أمام العبارات التالية:",
        questionType: "true_false",
        count: 3,
        markPerQuestion: 5,
        fontSize: "12pt",
      },
      {
        id: "sec-2",
        questionNumberLabel: "السؤال الثاني",
        title: "اختر الإجابة الصحيحة لكل من الفقرات التالية:",
        questionType: "mcq",
        count: 3,
        markPerQuestion: 5,
        fontSize: "12pt",
      },
      {
        id: "sec-3",
        questionNumberLabel: "السؤال الثالث",
        title: "أجب عن الأسئلة التالية:",
        questionType: "essay",
        count: 2,
        markPerQuestion: 10,
        fontSize: "12pt",
      },
    ]);
    setCollapsedSections({ "sec-1": true, "sec-2": true, "sec-3": true });

    // 4. Reset Exclusions & Filtering Parameters
    setExcludePreviouslyUsed(true);
    setExcludePartialUnitExams(true);
    setFilterOnlyApproved(true);
    setHideUsedQuestions(false);
    setActiveModalSectionId(null);
    setShowAlgorithmModal(false);
    setShowClearExamConfirm(false);

    // 5. Reset Academic and Title Info
    setEducationalLevel("ثانوي");
    setSemester("الفصل الأول");
    setAcademicTerm("الفصل الدراسي الأول 2026");
    if (firstSubject) {
      setTotalMarks(firstSubject.totalMarks || 100);
      setExamTitle(`امتحان شامل - ${firstSubject.name}`);
    } else {
      setTotalMarks(100);
      setExamTitle("الامتحان النهائي لمادة العلوم العامة - الفصل الأول");
    }
    setDurationMinutes(90);
    setTotalQuestions(5);

    // 6. Reset Paper Components & Options
    setGenerateVersionB(false);
    setShowAnswerKey(false);
    setShowInstitutionLogo(false);
    setShowStudentBox(true);
    setShowGradingTable(false);
    setShowInstructions(false);
    setInstructionsText(
      "أجب عن جميع الأسئلة الآتية.\nاكتب بخط واضح ومقروء.\nراجع إجاباتك قبل تسليم الورقة."
    );

    // 7. Reset Collapsible Panels & Dialogs
    setIsExclusionCollapsed(true);
    setIsExamTitleCollapsed(true);
    setIsPaperComponentsCollapsed(true);
    setIsStructureSectionCollapsed(true);
    setIsSettingsOpen(false);
    setZoomLevel(100);

    // 8. Reset Multi-Auto State
    setShowAutoMultiModal(false);
    setMultiExamDrafts(null);
    setIsMultiGenerating(false);

    // 9. Reset Stored UI state
    storage.saveUiState("exam_generator_ui", {
      selectedSubjectId: defaultSubjectId,
      selectedUnitIds: ["all"],
      selectedLessonIds: ["all"],
      selectedMode: "auto",
      collapsedSections: { "sec-1": true, "sec-2": true, "sec-3": true },
    });
  };

  const currentSubject =
    allowedSubjects.find((s) => s.id === selectedSubjectId);


  useEffect(() => {
    if (initialExamToEdit) return;

    const sub = allowedSubjects.find((s) => s.id === selectedSubjectId);
    if (!sub) return;

    let base = "";
    if (isAllUnitsSelected) {
      base = `امتحان شامل - ${sub.name}`;
    } else {
      base = `امتحان ${sub.name}`;
      if (selectedUnitIds.length === 1) {
        const unit = currentSubjectUnits.find((u) => u.id === selectedUnitIds[0]);
        if (unit) {
          base += ` - ${unit.title}`;
        }
      } else if (selectedUnitIds.length > 1) {
        base += ` - (${selectedUnitIds.length} وحدات)`;
      }

      if (!isAllLessonsSelected) {
        if (selectedLessonIds.length === 1) {
          const lesson = currentUnitLessons.find((l) => l.id === selectedLessonIds[0]);
          if (lesson) {
            base += ` - ${lesson.title}`;
          }
        } else if (selectedLessonIds.length > 1) {
          base += ` - (${selectedLessonIds.length} دروس)`;
        }
      }
    }

    setExamTitle(base);
  }, [selectedSubjectId, selectedUnitIds, selectedLessonIds, allowedSubjects, currentSubjectUnits, currentUnitLessons, initialExamToEdit, isAllUnitsSelected, isAllLessonsSelected]);

  const previewTemplate = useMemo(() => {
    const settings = storage.getSettings();
    const academyName = settings.academyName || "المثنى لطلاب الهندسة";

    const customSchool =
      activeTemplate.headerContent?.schoolName &&
      !activeTemplate.headerContent.schoolName.includes("وزارة التربية والتعليم") &&
      !activeTemplate.headerContent.schoolName.includes("الإدارة العامة للامتحانات")
        ? activeTemplate.headerContent.schoolName
        : academyName;

    return {
      ...activeTemplate,
      type: "exam" as const,
      headerContent: {
        ...activeTemplate.headerContent,
        subjectName: currentSubject?.name,
        centerLogo: showInstitutionLogo,
        rightText: activeTemplate.headerContent?.rightText || "نموذج اختبار معتمد",
        centerText: educationalLevel || activeTemplate.headerContent?.centerText || "الثالث الثانوي المهني",
        leftText: activeTemplate.headerContent?.leftText || "رياضيات فيزياء كيمياء رسم صناعي رسم حاسوب",
        schoolName: customSchool,
        logoUrl: showInstitutionLogo ? (activeTemplate.headerContent?.logoUrl || settings.logoUrl) : undefined,
      },
    };
  }, [activeTemplate, currentSubject?.name, showInstitutionLogo, educationalLevel]);

  const scopeHierarchyText = useMemo(() => {
    const subName = currentSubject?.name || "المادة";
    let scopeDesc = "";
    if (isAllUnitsSelected) {
      scopeDesc = "امتحان شامل لكافة الوحدات";
    } else if (selectedUnitIds.length === 1) {
      const u = currentSubjectUnits.find((unit) => unit.id === selectedUnitIds[0]);
      scopeDesc = u?.title || "وحدة محددة";
      if (!isAllLessonsSelected && selectedLessonIds.length === 1) {
        const l = currentUnitLessons.find((les) => les.id === selectedLessonIds[0]);
        if (l?.title) {
          scopeDesc += ` | ${l.title}`;
        }
      } else if (!isAllLessonsSelected && selectedLessonIds.length > 1) {
        scopeDesc += ` | (${selectedLessonIds.length} دروس)`;
      }
    } else {
      scopeDesc = `وحدات محددة (${selectedUnitIds.length})`;
    }
    return `نموذج اختباري معتمد | ${subName} - ${scopeDesc}`;
  }, [currentSubject, isAllUnitsSelected, selectedUnitIds, currentSubjectUnits, isAllLessonsSelected, selectedLessonIds, currentUnitLessons]);

  useEffect(() => {
    if (initialExamToEdit) return;
    const sub = allowedSubjects.find(s => s.id === selectedSubjectId);
    if (sub && sub.totalMarks) {
        setTotalMarks(sub.totalMarks);
    }
  }, [selectedSubjectId, allowedSubjects, initialExamToEdit]);


  // Helper to map question ID to its usage history in past saved exams (strictly active from Exams_Library + Storage)
  const getUsedQuestionsMap = () => {
    const map: Record<
      string,
      { examTitle: string; createdAt: string; isPartialUnit: boolean }[]
    > = {};

    // Get live active exams from Exams_Library
    const libraryDocs = examLibraryService.getExamsLibrary();
    const activeLibraryIds = new Set(libraryDocs.map((doc) => doc.examId));

    // Get live active exams from storage
    const storageExams = storage.getExams();
    const activeStorageIds = new Set(storageExams.map((e) => e.id));

    // 1. Process active library documents
    libraryDocs.forEach((doc) => {
      const docSubId = doc?.scope?.subjectId || (doc as any)?.subjectId;
      if (
        doc &&
        (docSubId === selectedSubjectId || selectedSubjectId === "all")
      ) {
        const docUnitIds = doc.scope?.unitIds || (doc as any)?.unitIds;
        const isPartialUnit = Boolean(
          Array.isArray(docUnitIds) &&
          docUnitIds.length > 0 &&
          docUnitIds.length < currentSubjectUnits.length,
        );

        const usedIds = new Set<string>([
          ...(doc.usedQuestionIds || []),
          ...(doc.questionSnapshots || []).map((s) => s.questionId),
          ...((doc.versions || []).flatMap((v) => (v.questions || []).map((q: any) => q.questionId)).filter(Boolean)),
        ]);

        usedIds.forEach((qId) => {
          if (!map[qId]) map[qId] = [];
          if (!map[qId].some((item) => item.examTitle === doc.title)) {
            map[qId].push({
              examTitle: doc.title || "نموذج اختبار سابق",
              createdAt: doc.createdAt || "تاريخ سابق",
              isPartialUnit,
            });
          }
        });
      }
    });

    // 2. Process active storage exams ONLY if NOT already in activeLibraryIds (to prevent stale question tracking)
    storageExams.forEach((exam) => {
      if (exam && !activeLibraryIds.has(exam.id) && activeStorageIds.has(exam.id)) {
        if (
          exam.subjectId === selectedSubjectId ||
          selectedSubjectId === "all"
        ) {
          const isPartialUnit = Boolean(
            exam.unitIds &&
            exam.unitIds.length > 0 &&
            exam.unitIds.length < currentSubjectUnits.length,
          );

          exam.versions?.forEach((ver) => {
            ver.questions?.forEach((eq) => {
              if (!map[eq.questionId]) map[eq.questionId] = [];
              if (
                !map[eq.questionId].some(
                  (item) => item.examTitle === exam.title,
                )
              ) {
                map[eq.questionId].push({
                  examTitle: exam.title || "امتحان سابق",
                  createdAt: exam.createdAt || "تاريخ سابق",
                  isPartialUnit,
                });
              }
            });
          });
        }
      }
    });

    return map;
  };

  const usedQuestionsMap = getUsedQuestionsMap();

  const computeExcludeIds = (): string[] => {
    if (!excludePreviouslyUsed) return [];

    const excludeIds: string[] = [];

    Object.entries(usedQuestionsMap).forEach(([qId, historyList]) => {
      if (selectedUnitId === "all") {
        if (excludePartialUnitExams) {
          excludeIds.push(qId);
        } else {
          const usedInFullExam = historyList.some((h) => !h.isPartialUnit);
          if (usedInFullExam) {
            excludeIds.push(qId);
          }
        }
      } else {
        if (excludePartialUnitExams) {
          excludeIds.push(qId);
        } else {
          const usedInThisUnit = historyList.some((h) => h.isPartialUnit);
          if (usedInThisUnit) {
            excludeIds.push(qId);
          }
        }
      }
    });

    return excludeIds;
  };

  const excludedQuestionIds = computeExcludeIds();

  // Dynamic Available Questions Filter with:
  // 1. Cascading hierarchy (Subject -> Unit -> Lesson)
  // 2. Status Filter (Pro-Tip 1: Filter out 'draft' questions)
  // 3. Exclusion Logic (Pro-Tip 2: Exclude IDs used in previous exams)
  const availableQuestions = allQuestions.filter((q) => {
    if (!q) return false;
    const subjectMatch =
      selectedSubjectId === "all" || !selectedSubjectId || q.subjectId === selectedSubjectId;

    let unitMatch = true;
    if (!isAllUnitsSelected) {
      unitMatch = !!(q.unitId && selectedUnitIds.includes(q.unitId));
    }

    let lessonMatch = true;
    if (!isAllLessonsSelected) {
      lessonMatch = !!(
        (q.lessonId && selectedLessonIds.includes(q.lessonId)) ||
        (Array.isArray(q.lessonIds) && q.lessonIds.some((lid) => selectedLessonIds.includes(lid)))
      );
    }

    const scopeMatch = subjectMatch && unitMatch && lessonMatch;
    const isApproved = filterOnlyApproved ? (q.status !== "archived" && !q.isArchived) : true;
    const isNotExcluded = !excludedQuestionIds.includes(q.id);

    return scopeMatch && isApproved && isNotExcluded;
  });

  const questionWarnings = React.useMemo(() => {
    let missingAnswers = 0;
    let duplicateCount = 0;
    
    // Check for missing answers
    availableQuestions.forEach(q => {
      if (!q.answer || q.answer.trim() === "") missingAnswers++;
    });

    // Simple duplicate check (same title, or very high similarity)
    const texts = availableQuestions.map(q => q.text.replace(/<[^>]+>/g, '').trim());
    const uniqueTexts = new Set(texts);
    duplicateCount = texts.length - uniqueTexts.size;

    return { missingAnswers, duplicateCount };
  }, [availableQuestions]);

  const isQuestionTypeMatch = (q: Question, typeKey: string): boolean => {
    if (typeKey === "all") return true;
    if (q.type === typeKey) return true;
    if (q.customTypeName && q.customTypeName === typeKey) return true;
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
      typeKey === "essay" &&
      (q.type === ("essay" as any) ||
        q.type === ("written" as any) ||
        q.type === ("explain" as any) ||
        q.type === ("reason" as any) ||
        q.type === ("definition" as any))
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
    return false;
  };

  const handleToggleManualQuestion = (q: Question) => {
    const isCurrentlySelected =
      selectedQuestionIds.includes(q.id) ||
      customSections.some((s) => s.selectedQuestionIds?.includes(q.id));

    if (isCurrentlySelected) {
      // Remove from selectedQuestionIds
      setSelectedQuestionIds((prev) => prev.filter((id) => id !== q.id));
      // Remove from customSections
      setCustomSections((prev) =>
        prev.map((s) => ({
          ...s,
          selectedQuestionIds: (s.selectedQuestionIds || []).filter(
            (id) => id !== q.id,
          ),
        })),
      );
    } else {
      // Add to selectedQuestionIds
      setSelectedQuestionIds((prev) =>
        prev.includes(q.id) ? prev : [...prev, q.id],
      );
      // Assign to best matching customSection
      setCustomSections((prev) => {
        if (prev.length === 0) return prev;
        // 1. Find section matching question type with available slot
        let targetIdx = prev.findIndex(
          (s) =>
            isQuestionTypeMatch(q, s.questionType) &&
            (s.selectedQuestionIds?.length || 0) < s.count,
        );
        // 2. Find any section matching question type
        if (targetIdx === -1) {
          targetIdx = prev.findIndex((s) =>
            isQuestionTypeMatch(q, s.questionType),
          );
        }
        // 3. Fallback to first section
        if (targetIdx === -1) {
          targetIdx = 0;
        }

        return prev.map((s, idx) => {
          if (idx === targetIdx) {
            const cur = s.selectedQuestionIds || [];
            const newIds = cur.includes(q.id) ? cur : [...cur, q.id];
            return {
              ...s,
              selectedQuestionIds: newIds,
              count: Math.max(s.count || 1, newIds.length),
            };
          }
          return s;
        });
      });
    }
  };

  const getAvailableCountForSectionType = (typeKey: string) => {
    if (typeKey === "all") return availableQuestions.length;
    return availableQuestions.filter((q) => isQuestionTypeMatch(q, typeKey))
      .length;
  };

  const getTotalCountInBankForSectionType = (typeKey: string) => {
    const scopeQuestions = allQuestions.filter((q) => {
      if (!q) return false;
      const subjectMatch =
        selectedSubjectId === "all" || !selectedSubjectId || q.subjectId === selectedSubjectId;

      let unitMatch = true;
      if (!isAllUnitsSelected) {
        unitMatch = !!(q.unitId && selectedUnitIds.includes(q.unitId));
      }

      let lessonMatch = true;
      if (!isAllLessonsSelected) {
        lessonMatch = !!(
          (q.lessonId && selectedLessonIds.includes(q.lessonId)) ||
          (Array.isArray(q.lessonIds) && q.lessonIds.some((lid) => selectedLessonIds.includes(lid)))
        );
      }

      const scopeMatch = subjectMatch && unitMatch && lessonMatch;

      return (
        scopeMatch &&
        !q.isArchived &&
        q.status !== "archived"
      );
    });
    if (typeKey === "all") return scopeQuestions.length;
    return scopeQuestions.filter((q) => isQuestionTypeMatch(q, typeKey)).length;
  };

  const uniqueCustomTypesInBank = Array.from(
    new Set(allQuestions.map((q) => q.customTypeName).filter(Boolean) as string[]),
  );

  const allSelectableTypes = [
    { key: "all", label: "أسئلة متنوعة (جميع الأنواع)" },
    { key: "true_false", label: "صح أو خطأ (True/False)" },
    { key: "mcq", label: "اختر الإجابة الصحيحة (MCQ)" },
    { key: "essay", label: "أسئلة مقالية وإنشائية (Essay)" },
    { key: "problem", label: "مسائل حسابية وتطبيقية (Problem)" },
    { key: "definition", label: "تعاريف ومفاهيم (Definition)" },
    { key: "explain", label: "اشرح / وضح / علل (Explain)" },
    { key: "reason", label: "علل / فسر (Reason)" },
    { key: "fill_blanks", label: "أكمل الفراغات (Fill Blanks)" },
    { key: "matching", label: "توصيل ومطابقة (Matching)" },
    { key: "ordering", label: "ترتيب تسلسلي (Ordering)" },
    { key: "diagram_label", label: "سمِّ الأجزاء على الرسم (Diagram Label)" },
    { key: "table_query", label: "أسئلة جداول ورسوم بيانية (Table Query)" },
    { key: "equation", label: "معادلات وموازنة (Equation)" },
    { key: "grammar", label: "قواعد لغوية وإعراب (Grammar)" },
    { key: "image_choice", label: "اختيار من صورة/شكل" },
    { key: "listening", label: "استماع وفهم" },
    ...uniqueCustomTypesInBank.map((ct) => ({
      key: ct,
      label: `نوع مخصص: ${ct}`,
    })),
  ];

  const generateAutoMultiDrafts = async () => {
    if (!canPerformAction(currentUser, "generate", "exams")) {
      showToast("⚠️ ليس لديك صلاحية توليد الاختبارات.");
      return;
    }
    if (!selectedSubjectId || selectedSubjectId === "all") {
      showToast("⚠️ يرجى تحديد مادة دراسية أولاً لتوليد الامتحان.");
      return;
    }
    if (!canAccessSubject(currentUser, selectedSubjectId)) {
      showToast("⚠️ ليس لديك صلاحية الوصول إلى هذه المادة الدراسية.");
      return;
    }
    if (availableQuestions.length === 0) {
      showToast(
        "⚠️ لا يمكن التوليد المتعدد: جميع الأسئلة المتاحة لهذا النطاق مستخدمة في اختبارات سابقة!",
      );
      return;
    }
    setIsMultiGenerating(true);
    try {
      if (multiExamCount < 1) return;

      const groupedQuestions: Record<string, Question[]> = {};
      availableQuestions.forEach(q => {
        const t = q.type;
        if (!groupedQuestions[t]) groupedQuestions[t] = [];
        groupedQuestions[t].push(q);
      });

      // shuffle questions in each group
      Object.keys(groupedQuestions).forEach(t => {
        groupedQuestions[t] = [...groupedQuestions[t]].sort(() => Math.random() - 0.5);
      });

      const examDrafts: Exam[] = [];
      const buckets: Question[][] = Array.from({ length: multiExamCount }, () => []);

      // Distribute questions across models
      Object.keys(groupedQuestions).forEach(t => {
        const qList = groupedQuestions[t];
        if (useAllQuestionsPerModel) {
          for (let i = 0; i < multiExamCount; i++) {
            const shuffled = [...qList].sort(() => Math.random() - 0.5);
            buckets[i].push(...shuffled);
          }
        } else {
          let currentBucket = 0;
          qList.forEach(q => {
            buckets[currentBucket].push(q);
            currentBucket = (currentBucket + 1) % multiExamCount;
          });
        }
      });

      const selectedSubject = allowedSubjects.find(s => s.id === selectedSubjectId);
      const subjectName = selectedSubject?.name || "المادة";
      
      const selectedUnit = currentSubjectUnits.find(u => u.id === selectedUnitId);
      const unitName = selectedUnit?.title || "";
      
      const selectedLesson = currentUnitLessons.find(l => l.id === selectedLessonId);
      const lessonName = selectedLesson?.title || "";

      let baseTitle = `امتحان ${subjectName}`;
      if (selectedUnitId !== "all" && unitName) {
        baseTitle += ` ${unitName}`;
        if (selectedLessonId !== "all" && lessonName) {
           baseTitle += ` ${lessonName}`;
        }
      }

      buckets.forEach((bucketQs, idx) => {
        // Enforce strict uniqueness within each model
        const seenInBucket = new Set<string>();
        const uniqueBucketQs: Question[] = [];
        bucketQs.forEach((q) => {
          if (!seenInBucket.has(q.id)) {
            seenInBucket.add(q.id);
            uniqueBucketQs.push(q);
          }
        });

        const examTitle = `${baseTitle} - نموذج (${idx + 1})`;
        
        // Group uniqueBucketQs by type to form sections
        const bGrouped: Record<string, Question[]> = {};
        uniqueBucketQs.forEach(q => {
           if (!bGrouped[q.type]) bGrouped[q.type] = [];
           bGrouped[q.type].push(q);
        });

        const sectionTypes = Object.keys(bGrouped);
        const numSections = sectionTypes.length;
        if (numSections === 0) return;

        let overallQuestionOrder = 1;
        const versionAQuestions: any[] = [];
        const sections: any[] = [];
        const marksMap: Record<string, number> = {};

        // Calculate exact marks per section, distributing any remainder to the last section
        const exactSectionMark = totalMarks / numSections;
        const baseSectionMark = Math.round(exactSectionMark * 100) / 100;
        let sumOfSectionsSoFar = 0;

        sectionTypes.forEach((type, sIdx) => {
           const isLastSection = sIdx === numSections - 1;
           const targetSecMark = isLastSection ? Number((totalMarks - sumOfSectionsSoFar).toFixed(2)) : baseSectionMark;
           sumOfSectionsSoFar += targetSecMark;

           const qs = bGrouped[type];
           const secId = `sec-${sIdx + 1}`;
           
           // Calculate exact marks per item within this section, distributing any remainder to the last item
           const exactItemMark = targetSecMark / qs.length;
           const baseItemMark = Math.round(exactItemMark * 100) / 100;
           let sumOfItemsSoFar = 0;
           
           sections.push({
              id: secId,
              questionNumberLabel: getArabicQuestionLabel(sIdx + 1),
              title: getDefaultWordingForType(type),
              questionType: type,
              count: qs.length,
              markPerQuestion: Math.max(0.1, baseItemMark),
              fontSize: "12pt",
           });

           qs.forEach((q, qIdx) => {
              const isLastItem = qIdx === qs.length - 1;
              const mark = isLastItem ? Number((targetSecMark - sumOfItemsSoFar).toFixed(2)) : baseItemMark;
              sumOfItemsSoFar += mark;

              marksMap[q.id] = mark;
              versionAQuestions.push({
                  id: q.id,
                  questionId: q.id,
                  allocatedMarks: mark,
                  sectionId: secId,
                  questionOrder: overallQuestionOrder++,
                  shuffledDistractors: q.type === "mcq" && q.distractors ? [...q.distractors].sort(() => Math.random() - 0.5).map((d: any) => typeof d === 'string' ? d : d.text) : undefined
              });
           });
        });

        const snapshots = examLibraryService.createQuestionSnapshots(uniqueBucketQs, marksMap, {});

        const examId = `exam-multi-${Date.now()}-${idx}`;
        const libraryDoc = {
          durationMinutes,
          examId,
          title: examTitle,
          scope: {
            subjectId: selectedSubjectId,
            unitIds: isAllUnitsSelected ? currentSubjectUnits.map(u => u.id) : selectedUnitIds,
            lessonIds: isAllLessonsSelected ? [] : selectedLessonIds,
            isComprehensive: isAllUnitsSelected,
          },
          generationMethod: "auto" as const,
          usedQuestionIds: uniqueBucketQs.map(q => q.id),
          questionSnapshots: snapshots,
          sections,
          versions: [{ versionCode: String(idx + 1), questions: versionAQuestions }],
          totalQuestions: uniqueBucketQs.length,
          totalMarks,
          status: "published" as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdById: currentUser?.id || "usr-teacher-1",
          createdByName: currentUser?.name || "المعلم",
        };

        const draftExam: Exam = {
          durationMinutes,
          id: examId,
          title: examTitle,
          subjectId: selectedSubjectId,
          unitIds: isAllUnitsSelected ? currentSubjectUnits.map(u => u.id) : selectedUnitIds,
          lessonIds: isAllLessonsSelected ? [] : selectedLessonIds,
          totalQuestions: uniqueBucketQs.length,
          totalMarks,
          difficultyProfile: "balanced",
          generationType: "auto",
          versions: [{ versionCode: String(idx + 1), questions: versionAQuestions }],
          createdAt: new Date().toISOString().substring(0, 10),
          createdBy: currentUser?.name || "المعلم",
          status: "finalized",
          libraryDoc,
        };

        examDrafts.push(draftExam);
      });

      setMultiExamDrafts(examDrafts);

    } catch (e) {
      console.error(e);
      showToast("حدث خطأ أثناء التوليد المتعدد");
    } finally {
      setIsMultiGenerating(false);
    }
  };

  const handleApproveMultiDrafts = () => {
    if (!multiExamDrafts) return;
    if (!canPerformAction(currentUser, "create", "exams")) {
      showToast("⚠️ ليس لديك صلاحية حفظ نماذج الاختبارات في المكتبة.");
      return;
    }
    if (!canAccessSubject(currentUser, selectedSubjectId)) {
      showToast("⚠️ ليس لديك صلاحية الوصول إلى هذه المادة الدراسية.");
      return;
    }
    multiExamDrafts.forEach(draft => {
      if (draft.libraryDoc) {
        examLibraryService.saveExamToLibrary({
          ...draft.libraryDoc,
          createdById: currentUser?.id || "usr-teacher-1",
          createdByName: currentUser?.name || "المعلم",
        } as any);
      }
      onSaveExam(draft);
    });
    showToast(`تم حفظ ${multiExamDrafts.length} نماذج اختبار في المكتبة بنجاح!`);
    setMultiExamDrafts(null);
    setShowAutoMultiModal(false);
  };
  const handleGenerateExam = async () => {
    if (!canPerformAction(currentUser, "generate", "exams")) {
      showToast("⚠️ ليس لديك صلاحية توليد الاختبارات.");
      return;
    }
    if (!selectedSubjectId || selectedSubjectId === "all") {
      showToast("⚠️ يرجى تحديد مادة دراسية أولاً لتوليد الامتحان.");
      return;
    }
    if (!canAccessSubject(currentUser, selectedSubjectId)) {
      showToast("⚠️ ليس لديك صلاحية الوصول إلى هذه المادة الدراسية.");
      return;
    }
    if (selectedMode !== "manual" && availableQuestions.length === 0) {
      showToast(
        "⚠️ لا يمكن توليد الاختبار: جميع أسئلة هذا النطاق مستخدمة سابقاً في مكتبة الاختبارات! تم إيقاف التوليد لمنع تكرار الأسئلة.",
      );
      return;
    }

    const currentSum = Math.round(customSections.reduce((acc, s) => acc + (s.count || 1) * s.markPerQuestion, 0) * 100) / 100;
    if (Math.abs(currentSum - totalMarks) > 1.0) {
      showToast(
        `⚠️ لا يمكن توليد الاختبار: مجموع علامات الأسئلة (${currentSum}) لا يساوي علامة المادة (${totalMarks}).`,
      );
      return;
    }

    // Gather all manually selected question IDs across customSections and selectedQuestionIds
    const manualFromSections = customSections.flatMap(
      (s) => s.selectedQuestionIds || [],
    );
    const allManualPickedIds = Array.from(
      new Set([...selectedQuestionIds, ...manualFromSections]),
    );

    // Manual mode specific validation
    if (selectedMode === "manual") {
      if (allManualPickedIds.length === 0) {
        showToast(
          "⚠️ يرجى تحديد الأسئلة يدوياً من قسم الهيكل قبل الضغط على توليد.",
        );
        return;
      }
    } else {
      // Validation Check for Auto / Semi modes
      for (const sec of customSections) {
        const manualCount = sec.selectedQuestionIds?.length || 0;
        if (manualCount >= sec.count) {
          continue;
        }
        const availCount = getAvailableCountForSectionType(sec.questionType);

        if (sec.questionType !== "all" && availCount === 0) {
          showToast(
            `⚠️ لا يمكن توليد الاختبار: لا يوجد أسئلة متاحة من نوع [${QUESTION_TYPES_LABEL[sec.questionType] || sec.questionType}] في النطاق المحدد!`,
          );
          return;
        }
        if (sec.count > availCount) {
          showToast(
            `⚠️ لا يمكن توليد الاختبار: العدد المطلوب (${sec.count}) لـ [${sec.questionNumberLabel}] يتجاوز الأسئلة المتاحة (${availCount}).`,
          );
          return;
        }
      }

      const totalRequestedQuestions = customSections.reduce((acc, s) => acc + (s.count || 0), 0);
      if (totalRequestedQuestions > availableQuestions.length) {
        showToast(
          `⚠️ لا يمكن توليد الاختبار: إجمالي الأسئلة المطلوبة (${totalRequestedQuestions}) يتجاوز عدد الأسئلة المتاحة غير المستخدمة (${availableQuestions.length}).`,
        );
        return;
      }
    }

    setIsGenerating(true);
    try {
      const excludeIds = computeExcludeIds();
      let eligibleQuestions = availableQuestions.filter(
        (q) => !excludeIds.includes(q.id),
      );

      if (eligibleQuestions.length === 0 && selectedMode !== "manual") {
        showToast(
          "⚠️ جميع أسئلة هذا النطاق مستخدمة سابقاً في مكتبة الاختبارات! تم إيقاف التوليد لمنع التكرار.",
        );
        setIsGenerating(false);
        return;
      }

      let versionAQuestions: ExamQuestionEntry[] = [];
      let overallQuestionOrder = 1;
      const selectedQuestionIdsA = new Set<string>();

      const getQuestionScore = (q: Question) => {
        if (typeof q.finalWeightScore === "number" && q.finalWeightScore > 0)
          return q.finalWeightScore;
        const importanceScore = (q.importance || 3) * 20;
        const pastCycleBonus = q.isPastCycle ? 15 : 0;
        const difficultyScore =
          q.difficulty === "medium" ? 10 : q.difficulty === "hard" ? 8 : 5;
        return importanceScore + pastCycleBonus + difficultyScore;
      };

      // Prepare effective sections with manual question allocation
      let effectiveSections = customSections.map((s) => ({
        ...s,
        selectedQuestionIds: [...(s.selectedQuestionIds || [])],
      }));

      if (selectedMode === "manual") {
        const assignedSet = new Set(
          effectiveSections.flatMap((s) => s.selectedQuestionIds || []),
        );
        const unassignedIds = allManualPickedIds.filter(
          (id) => !assignedSet.has(id),
        );

        for (const qId of unassignedIds) {
          const qObj = allQuestions.find((q) => q.id === qId);
          if (!qObj) continue;

          let targetSec = effectiveSections.find(
            (s) =>
              isQuestionTypeMatch(qObj, s.questionType) &&
              (s.selectedQuestionIds?.length || 0) < s.count,
          );
          if (!targetSec) {
            targetSec = effectiveSections.find((s) =>
              isQuestionTypeMatch(qObj, s.questionType),
            );
          }
          if (!targetSec) {
            targetSec = effectiveSections[0];
          }
          if (targetSec) {
            targetSec.selectedQuestionIds = [
              ...(targetSec.selectedQuestionIds || []),
              qId,
            ];
            targetSec.count = Math.max(
              targetSec.count || 1,
              targetSec.selectedQuestionIds.length,
            );
          }
        }
      }

      // Loop through each configured section
      for (let sIdx = 0; sIdx < effectiveSections.length; sIdx++) {
        const sec = effectiveSections[sIdx];
        let secPool = eligibleQuestions.filter((q) =>
          isQuestionTypeMatch(q, sec.questionType),
        );

        // Exclude already picked in earlier sections
        secPool = secPool.filter((q) => !selectedQuestionIdsA.has(q.id));

        let pickedForSec: Question[] = [];

        // Exact manual question resolution
        const manualIds = sec.selectedQuestionIds || [];
        const manualQuestions = manualIds
          .map((id) => allQuestions.find((q) => q.id === id))
          .filter((q): q is Question => Boolean(q) && !selectedQuestionIdsA.has(q.id));

        if (manualQuestions.length > 0) {
          if (selectedMode === "manual") {
            // Strictly use the teacher's selected questions in their exact order
            pickedForSec = manualQuestions;
          } else {
            // Semi/Auto mode: Include selected questions first, then fill remaining up to sec.count
            const neededMore = Math.max(0, sec.count - manualQuestions.length);
            const poolWithoutManual = secPool.filter((q) => !manualIds.includes(q.id));
            const sorted = [...poolWithoutManual].sort(
              (a, b) => getQuestionScore(b) - getQuestionScore(a),
            );
            pickedForSec = [...manualQuestions, ...sorted.slice(0, neededMore)];
          }
        } else {
          if (selectedMode === "manual") {
            // Check for remaining unassigned manual picks
            const remainingManual = allManualPickedIds
              .filter((id) => !selectedQuestionIdsA.has(id))
              .map((id) => allQuestions.find((q) => q.id === id))
              .filter((q): q is Question => Boolean(q));

            if (remainingManual.length > 0) {
              pickedForSec = remainingManual.slice(0, sec.count || 1);
            } else if (secPool.length > 0) {
              const sorted = [...secPool].sort(
                (a, b) => getQuestionScore(b) - getQuestionScore(a),
              );
              pickedForSec = sorted.slice(0, sec.count);
            }
          } else {
            const sorted = [...secPool].sort(
              (a, b) => getQuestionScore(b) - getQuestionScore(a),
            );
            pickedForSec = sorted.slice(0, sec.count);
          }
        }

        if (pickedForSec.length === 0) {
          if (selectedMode === "manual" && effectiveSections.length > 1 && selectedQuestionIdsA.size > 0) {
            continue;
          }
          showToast(`⚠️ تعذر إيجاد أسئلة لقسم [${sec.questionNumberLabel}]. يرجى التحقق من بنك الأسئلة أو اختيار أسئلة يدوياً.`);
          setIsGenerating(false);
          return;
        }

        pickedForSec.forEach((q, qIdx) => {
          selectedQuestionIdsA.add(q.id);
          
          let mark = sec.markPerQuestion;
          let isAbsoluteLastItem = (sIdx === customSections.length - 1) && (qIdx === pickedForSec.length - 1);
          if (isAbsoluteLastItem) {
              let sumOfAllOtherItems = versionAQuestions.reduce((acc, eq) => acc + eq.allocatedMarks, 0);
              mark = Number((totalMarks - sumOfAllOtherItems).toFixed(2));
          }
          
          versionAQuestions.push({
            id: q.id,
            questionId: q.id,
            allocatedMarks: mark,
            sectionId: sec.id,
            questionOrder: overallQuestionOrder++,
          });
        });
      }

      if (versionAQuestions.length === 0) {
        showToast("لا توجد أسئلة متطابقة مع الأقسام والمعايير المحددة.");
        setIsGenerating(false);
        return;
      }

      // Version B generation
      let versionBQuestions = [...versionAQuestions]
        .reverse()
        .map((eq, i) => ({ ...eq, questionOrder: i + 1 }));

      if (generateVersionB && selectedMode !== "manual") {
        let overallOrderB = 1;
        const versionBEntries: typeof versionAQuestions = [];
        const selectedQuestionIdsB = new Set<string>();

        customSections.forEach((sec, sIdx) => {
          let secPoolB = eligibleQuestions.filter(
            (q) =>
              (sec.questionType === "all" || q.type === sec.questionType) &&
              !selectedQuestionIdsA.has(q.id) &&
              !selectedQuestionIdsB.has(q.id),
          );

          if (secPoolB.length >= sec.count) {
            const sortedB = [...secPoolB].sort(
              (a, b) => getQuestionScore(b) - getQuestionScore(a),
            );
            const pickedB = sortedB.slice(0, sec.count);
            pickedB.forEach((q, qIdx) => {
              selectedQuestionIdsB.add(q.id);
              let mark = sec.markPerQuestion;
              let isAbsoluteLastItem = (sec === customSections[customSections.length - 1]) && (qIdx === pickedB.length - 1);
              if (isAbsoluteLastItem) {
                  let sumOfAllOtherItems = versionBEntries.reduce((acc, eq) => acc + eq.allocatedMarks, 0);
                  mark = Number((totalMarks - sumOfAllOtherItems).toFixed(2));
              }

              versionBEntries.push({
                id: q.id,
                questionId: q.id,
                allocatedMarks: mark,
                sectionId: sec.id,
                questionOrder: overallOrderB++,
              });
            });
          }
        });

        if (versionBEntries.length === versionAQuestions.length) {
          versionBQuestions = versionBEntries;
        }
      }

      const calculatedTotalMarks = customSections.reduce(
        (acc, sec) => acc + sec.count * sec.markPerQuestion,
        0,
      );
      const calculatedTotalQuestions = customSections.reduce(
        (acc, sec) => acc + sec.count,
        0,
      );

      setTotalMarks(calculatedTotalMarks);
      setTotalQuestions(calculatedTotalQuestions);

      let rationale =
        "تم إعداد ورقة الامتحان وفق التحديد اليدوي المباشر للأسئلة مع تطبيق مصفوفة الهيكل وتوزيع العلامات المعتمدة.";
      
      // AI Copilot is ONLY invoked for Smart / Semi / Auto modes, strictly NEVER for manual mode
      if (selectedMode !== "manual") {
        rationale =
          "تم استخدام مصفوفة الهيكلية المخصصة للأسئلة والتوزيع التلقائي للمحاور مع تفعيل معايير الاستبعاد القياسية.";
        try {
          const allowedUnitTitles = currentSubjectUnits
            .filter((u) => isAllUnitsSelected || selectedUnitIds.includes(u.id))
            .map((u) => u.title);

          const aiRes = await aiService.generateExamCopilot(
            currentSubject?.name || "المادة",
            allowedUnitTitles.length > 0 ? allowedUnitTitles : ["الوحدة الأولى"],
            calculatedTotalQuestions,
            calculatedTotalMarks,
          );
          if (aiRes.pedagogicalRationale) rationale = aiRes.pedagogicalRationale;
        } catch (err) {
          console.warn("Copilot fallback used:", err);
        }
      }

      // Construct Question Snapshots & Library Document for Exams_Library collection
      const usedIdsList = Array.from(selectedQuestionIdsA);
      const usedQuestionsPool = allQuestions.filter((q) =>
        usedIdsList.includes(q.id),
      );

      const marksMap: Record<string, number> = {};
      const sectionMap: Record<string, string> = {};
      versionAQuestions.forEach((eq) => {
        marksMap[eq.questionId] = eq.allocatedMarks;
        if (eq.sectionId) {
          sectionMap[eq.questionId] = eq.sectionId;
        }
      });

      const snapshots = examLibraryService.createQuestionSnapshots(
        usedQuestionsPool,
        marksMap,
        sectionMap,
      );
      const examId = "exam-" + Date.now();

      const libraryDoc = {
          durationMinutes,
          examId,
        title: examTitle,
        scope: {
          subjectId: selectedSubjectId,
          unitIds:
            isAllUnitsSelected
              ? currentSubjectUnits.map((u) => u.id)
              : selectedUnitIds,
          lessonIds: isAllLessonsSelected ? [] : selectedLessonIds,
          isComprehensive: isAllUnitsSelected,
        },
        generationMethod: (selectedMode === "auto"
          ? "auto"
          : selectedMode === "semi"
            ? "semi"
            : "manual") as "auto" | "semi" | "manual",
        usedQuestionIds: usedIdsList,
        questionSnapshots: snapshots,
        sections: customSections.map((sec) => {
          const secQuestions = versionAQuestions
            .filter((eq) => eq.sectionId === sec.id)
            .map((eq) => eq.questionId);
          return {
            ...sec,
            selectedQuestionIds:
              secQuestions.length > 0
                ? secQuestions
                : sec.selectedQuestionIds || [],
          };
        }),
        versions: [
          {
            versionCode: "أ",
            questions: versionAQuestions,
          },
          ...(versionBQuestions
            ? [
                {
                  versionCode: "ب",
                  questions: versionBQuestions,
                },
              ]
            : []),
        ],
        totalQuestions: calculatedTotalQuestions,
        totalMarks: calculatedTotalMarks,
        showStudentBox,
        showInstructions,
        instructionsText,
        showGradingTable,
        status: "published" as const,
        printTemplate: activeTemplate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdById: currentUser?.id || "usr-teacher-1",
        createdByName: currentUser?.name || "المعلم",
      };

      // Persist to Exams_Library Collection with question snapshots
      examLibraryService.saveExamToLibrary(libraryDoc);

      const newExam: Exam = {
        durationMinutes,
        id: examId,
        title: examTitle,
        subjectId: selectedSubjectId,
        unitIds:
          isAllUnitsSelected
            ? currentSubjectUnits.map((u) => u.id)
            : selectedUnitIds,
        lessonIds: isAllLessonsSelected ? [] : selectedLessonIds,
        totalQuestions: calculatedTotalQuestions,
        totalMarks: calculatedTotalMarks,
        difficultyProfile: "balanced",
        generationType:
          selectedMode === "auto"
            ? "auto"
            : selectedMode === "semi"
              ? "semi_auto"
              : "manual",
        pedagogicalRationale: rationale,
        versions: [
          {
            versionCode: "أ",
            questions: versionAQuestions,
          },
          ...(generateVersionB
            ? [
                {
                  versionCode: "ب",
                  questions: versionBQuestions,
                },
              ]
            : []),
        ],
        createdAt: new Date().toISOString().substring(0, 10),
        createdBy: currentUser?.name || "المعلم",
        status: "finalized",
        libraryDoc,
      };

      setGeneratedExam(newExam);
      onSaveExam(newExam);
      showToast(
        selectedMode === "manual"
          ? "تم إعداد ورقة الاختبار بالأسئلة المحددة يدوياً وتجهيزها في المعاينة بنجاح! 📝✨"
          : "تم توليد الامتحان وتجميد لقطة الأسئلة (Snapshots) في مكتبة الامتحانات بنجاح!",
      );
    } catch (e: any) {
      console.error(e);
      if (e.message === "MISSING_AI_SETTINGS") {
        window.dispatchEvent(new CustomEvent("open-ai-settings"));
      } else {
        showToast("⚠️ حدث خطأ أثناء معالجة الاختبار: " + (e?.message || ""));
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const examItems = useMemo(() => {
    const activeUnit = selectedUnitIds.length === 1 ? currentSubjectUnits.find(u => u.id === selectedUnitIds[0]) : undefined;
    const activeLesson = !isAllLessonsSelected && selectedLessonIds.length === 1 ? currentUnitLessons.find(l => l.id === selectedLessonIds[0]) : undefined;

    return generateExamPrintItems({
      template: previewTemplate,
      title: examTitle || generatedExam?.title || "وثيقة الاختبار",
      durationMinutes,
      totalMarks: totalMarks || generatedExam?.totalMarks,
      showStudentBox,
      showInstructions,
      instructionsText,
      showGradingTable,
      sections: customSections,
      questions: generatedExam?.libraryDoc?.questionSnapshots || allQuestions,
      versionQuestions: generatedExam?.versions?.[0]?.questions,
      showAnswerKey,
      canSwap: selectedMode === "semi",
      onSwapQuestion: handleSwapQuestion,
      onRemoveQuestion: handleRemoveQuestionFromGeneratedExam,
      groupingEnabled: false,
      subjectName: currentSubject?.name,
      educationalLevel,
      academicTerm,
      unitTitle: activeUnit?.title,
      lessonTitle: activeLesson?.title,
      hierarchyText: scopeHierarchyText,
    });
  }, [
    examTitle,
    generatedExam,
    durationMinutes,
    totalMarks,
    showStudentBox,
    showInstructions,
    instructionsText,
    showGradingTable,
    customSections,
    allQuestions,
    showAnswerKey,
    selectedMode,
    handleSwapQuestion,
    handleRemoveQuestionFromGeneratedExam,
    previewTemplate,
    currentSubject?.name,
    educationalLevel,
    academicTerm,
    selectedUnitIds,
    currentSubjectUnits,
    isAllLessonsSelected,
    selectedLessonIds,
    currentUnitLessons,
    scopeHierarchyText,
  ]);

  return (
    <>
      {initialExamToEdit && (
        <div className="bg-amber-50 dark:bg-amber-950/80 border-b border-amber-200 dark:border-amber-800 p-3 px-5 flex items-center justify-between gap-3 text-xs font-bold text-amber-900 dark:text-amber-200 shadow-2xs z-40">
          <div className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 animate-pulse" />
            <span>
              أنت الآن تقوم بتعديل النموذج المحمل من مكتبة الامتحانات:{" "}
              <strong className="underline decoration-amber-400 decoration-2">
                {initialExamToEdit.title}
              </strong>
            </span>
          </div>
          {onClearExamToEdit && (
            <button
              type="button"
              onClick={() => {
                onClearExamToEdit();
                setGeneratedExam(null);
              }}
              className="px-3 py-1 rounded-lg bg-amber-200/80 dark:bg-amber-900 hover:bg-amber-300 text-amber-900 dark:text-amber-100 transition text-[11px] font-black cursor-pointer shrink-0"
            >
              إلغاء التعديل والبدء بإنشاء جديد ✕
            </button>
          )}
        </div>
      )}
      <SplitWorkspaceLayout
        header={
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 border-b border-slate-200 dark:border-slate-800 shadow-sm z-30">
            <div>
              <h1 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <span>
                  محرك توليد الاختبارات بالذكاء الاصطناعي (AI Exam Generator)
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                توليد امتحان رسمي موزون وفق مصفوفة المواصفات، توزيع العلامات
                تلقائياً، وإنشاء نماذج امتحانية متعددة (أ، ب) وسلّم التصحيح.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("refresh-data-all"))}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs shadow-sm transition border border-slate-300 dark:border-slate-700 cursor-pointer flex items-center justify-center"
                title="تحديث البيانات يدوياً من المصدر المركزي"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  resetAllGeneratorFormFields();
                  showToast("تمت إعادة ضبط جميع الحقول وخيارات التوليد بنجاح للبدء باختبار جديد!");
                }}
                className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold text-xs shadow-sm transition flex items-center gap-1.5 border border-rose-200 dark:border-rose-800 cursor-pointer"
                title="إعادة ضبط كافة الحقول والبدء باختبار جديد"
              >
                <RotateCcw className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>اختبار جديد / إعادة ضبط</span>
              </button>

              <button
                onClick={() => {
                  if (!canPerformAction(currentUser, "generate", "exams")) {
                    showToast("⚠️ ليس لديك صلاحية استخدام مساعد الذكاء الاصطناعي لتوليد الاختبارات.");
                    return;
                  }
                  if (!canAccessSubject(currentUser, selectedSubjectId)) {
                    showToast("⚠️ ليس لديك صلاحية الوصول إلى هذه المادة الدراسية.");
                    return;
                  }
                  setShowExecutionCenterModal(true);
                }}
                disabled={!canPerformAction(currentUser, "generate", "exams") || !canAccessSubject(currentUser, selectedSubjectId)}
                className={`px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs shadow-sm transition flex items-center gap-1.5 border border-slate-300 dark:border-slate-700 ${
                  !canPerformAction(currentUser, "generate", "exams") || !canAccessSubject(currentUser, selectedSubjectId)
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer"
                }`}
                title={!canPerformAction(currentUser, "generate", "exams") ? "ليس لديك صلاحية توليد الاختبارات" : "مركز التنفيذ العالمي للذكاء الاصطناعي"}
              >
                <Sliders className="w-4 h-4 text-emerald-500" />
                <span>مركز التنفيذ (14B)</span>
              </button>

              <button
                onClick={() => {
                  if (!canPerformAction(currentUser, "export", "exams")) {
                    showToast("⚠️ ليس لديك صلاحية طباعة أو تصدير ورقة الامتحان.");
                    return;
                  }
                  setIsPrintModalOpen(true);
                }}
                disabled={!generatedExam || !canPerformAction(currentUser, "export", "exams")}
                className={`px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-sm transition flex items-center gap-2 ${
                  !generatedExam || !canPerformAction(currentUser, "export", "exams")
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer"
                }`}
                title={!canPerformAction(currentUser, "export", "exams") ? "ليس لديك صلاحية طباعة أو تصدير ورقة الامتحان" : "طباعة ورقة الامتحان (A4)"}
              >
                <Printer className="w-4 h-4" />
                <span>طباعة ورقة الامتحان (A4)</span>
              </button>
            </div>
          </div>
        }
        rightContent={
          <div className="flex flex-col relative h-[calc(100vh-8rem)] text-xs">
            {/* Stepper Header */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm mb-4 border border-slate-100 dark:border-slate-800/60 shrink-0">
              <div className="flex items-center justify-between">
                {[
                  { id: 1, label: "الإعدادات" },
                  { id: 2, label: "الصفحة" },
                  { id: 3, label: "الهيكل" },
                  { id: 4, label: "إصدار" },
                ].map((step, idx) => (
                  <div
                    key={step.id}
                    className="flex flex-col items-center gap-1 relative z-10 flex-1"
                  >
                    <button
                      onClick={() => setCurrentStep(step.id)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        currentStep === step.id
                          ? "bg-blue-600 text-white shadow-md shadow-blue-600/20 ring-4 ring-blue-50 dark:ring-blue-900/20"
                          : currentStep > step.id
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
                            : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                      }`}
                    >
                      {currentStep > step.id ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        step.id
                      )}
                    </button>
                    <span
                      className={`text-[10px] font-bold ${currentStep === step.id ? "text-blue-700 dark:text-blue-400" : "text-slate-500 dark:text-slate-400"}`}
                    >
                      {step.label}
                    </span>
                    {idx < 3 && (
                      <div
                        className={`absolute top-4 left-0 w-[calc(100%-2rem)] h-0.5 -translate-x-1/2 -z-10 rounded ${
                          currentStep > step.id
                            ? "bg-blue-200 dark:bg-blue-900/50"
                            : "bg-slate-100 dark:bg-slate-800"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pb-24 space-y-4">
              {currentStep === 1 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {/* Mode Selector */}
                  <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm space-y-4">
                    <label className="font-extrabold text-slate-900 dark:text-white">
                      نمط التوليد والبرمجة الامتحانية:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setSelectedMode("auto")}
                        className={`p-2.5 rounded-xl border text-center font-bold transition ${
                          selectedMode === "auto"
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        توليد آلي 100%
                      </button>

                      <button
                        onClick={() => setSelectedMode("semi")}
                        className={`p-2.5 rounded-xl border text-center font-bold transition ${
                          selectedMode === "semi"
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        شبه تلقائي
                      </button>

                      <button
                        onClick={() => setSelectedMode("manual")}
                        className={`p-2.5 rounded-xl border text-center font-bold transition ${
                          selectedMode === "manual"
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        تحديد يدوي
                      </button>
                    </div>
                    {selectedMode === "auto" && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (!canPerformAction(currentUser, "generate", "exams")) {
                              showToast("⚠️ ليس لديك صلاحية توليد نماذج الاختبارات.");
                              return;
                            }
                            if (!canAccessSubject(currentUser, selectedSubjectId)) {
                              showToast("⚠️ ليس لديك صلاحية الوصول إلى هذه المادة الدراسية.");
                              return;
                            }
                            setShowAutoMultiModal(true);
                          }}
                          disabled={!canPerformAction(currentUser, "generate", "exams") || !canAccessSubject(currentUser, selectedSubjectId)}
                          className={`w-full py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs hover:bg-indigo-100 transition flex items-center justify-center gap-2 ${
                            !canPerformAction(currentUser, "generate", "exams") || !canAccessSubject(currentUser, selectedSubjectId)
                              ? "opacity-50 cursor-not-allowed"
                              : "cursor-pointer"
                          }`}
                          title={!canPerformAction(currentUser, "generate", "exams") ? "ليس لديك صلاحية توليد الاختبارات" : undefined}
                        >
                          <Sparkles className="w-4 h-4" />
                          <span>توليد آلي لنماذج متعددة (استخدام كافة الأسئلة المتوفرة)</span>
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Configuration Form */}
                  <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          المادة الدراسية المستهدفة
                        </label>
                        <select
                          value={selectedSubjectId}
                          onChange={(e) => {
                            const newId = e.target.value;
                            setSelectedSubjectId(newId);
                            setSelectedUnitIds(["all"]);
                            setSelectedLessonIds(["all"]);
                            const sub = allowedSubjects.find((s) => s.id === newId);
                            if (sub && sub.totalMarks) {
                              setTotalMarks(sub.totalMarks);
                              setCustomSections((prev) =>
                                autoDistributeMarks(prev, sub.totalMarks),
                              );
                            }
                          }}
                          className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 font-bold text-xs cursor-pointer"
                        >
                          {!selectedSubjectId && (
                            <option value="">-- اختر المادة الدراسية --</option>
                          )}
                          {allowedSubjects.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Multi-Select Unit Dropdown with Checkboxes */}
                      <div className="relative">
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between text-xs">
                          <span>الوحدة الدراسية</span>
                          {!isAllUnitsSelected && (
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                              محدد: {selectedUnitIds.length} من {currentSubjectUnits.length}
                            </span>
                          )}
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setIsUnitsDropdownOpen(!isUnitsDropdownOpen);
                            setIsLessonsDropdownOpen(false);
                          }}
                          className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold text-xs flex items-center justify-between shadow-2xs hover:border-blue-500 transition cursor-pointer"
                        >
                          <span className="truncate">
                            {isAllUnitsSelected
                              ? "جميع وحدات المادة"
                              : selectedUnitIds.length === 1
                              ? currentSubjectUnits.find((u) => u.id === selectedUnitIds[0])?.title || "وحدة محددة"
                              : `وحدات محددة (${selectedUnitIds.length}): ${selectedUnitIds
                                  .map((id) => currentSubjectUnits.find((u) => u.id === id)?.title)
                                  .filter(Boolean)
                                  .join("، ")}`}
                          </span>
                          <ChevronDown className={`w-4 h-4 shrink-0 transition-transform text-slate-400 ${isUnitsDropdownOpen ? "rotate-180" : ""}`} />
                        </button>

                        {isUnitsDropdownOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setIsUnitsDropdownOpen(false)}
                            />
                            <div className="absolute z-50 mt-1.5 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-2.5 space-y-1 font-bold text-xs max-h-72 overflow-y-auto">
                              <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100 dark:border-slate-800 mb-1">
                                <span className="text-[10px] text-slate-400">اختر وحدات الاختبار</span>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedUnitIds(["all"]);
                                      setSelectedLessonIds(["all"]);
                                    }}
                                    className="text-[10px] text-blue-600 hover:underline cursor-pointer"
                                  >
                                    اختيار الكل
                                  </button>
                                  {!isAllUnitsSelected && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedUnitIds(["all"]);
                                        setSelectedLessonIds(["all"]);
                                      }}
                                      className="text-[10px] text-red-500 hover:underline cursor-pointer"
                                    >
                                      إلغاء التحديد
                                    </button>
                                  )}
                                </div>
                              </div>

                              <label
                                className={`flex items-center gap-2.5 p-2 rounded-lg transition cursor-pointer select-none ${
                                  isAllUnitsSelected
                                    ? "bg-blue-50 dark:bg-blue-950/50 text-blue-900 dark:text-blue-200 font-extrabold"
                                    : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isAllUnitsSelected}
                                  onChange={() => {
                                    setSelectedUnitIds(["all"]);
                                    setSelectedLessonIds(["all"]);
                                  }}
                                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                                />
                                <span className="flex-1 font-extrabold text-xs">جميع وحدات المادة</span>
                              </label>

                              <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                              {currentSubjectUnits.map((u) => {
                                const isChecked = !isAllUnitsSelected && selectedUnitIds.includes(u.id);
                                const qCount = getUnitQuestionsCount(u.id);
                                return (
                                  <label
                                    key={u.id}
                                    className={`flex items-center gap-2.5 p-2 rounded-lg transition cursor-pointer select-none ${
                                      isChecked
                                        ? "bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 font-bold"
                                        : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => handleToggleUnit(u.id)}
                                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                                    />
                                    <span className="flex-1 font-bold text-xs truncate">{u.title}</span>
                                    <span className="text-[10px] font-mono text-slate-400 shrink-0 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                      {qCount} أسئلة
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Multi-Select Lesson Dropdown with Checkboxes */}
                      <div className="relative">
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between text-xs">
                          <span>الدرس المستهدف</span>
                          {!isAllLessonsSelected && (
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                              محدد: {selectedLessonIds.length} من {currentUnitLessons.length}
                            </span>
                          )}
                        </label>

                        <button
                          type="button"
                          onClick={() => {
                            setIsLessonsDropdownOpen(!isLessonsDropdownOpen);
                            setIsUnitsDropdownOpen(false);
                          }}
                          className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold text-xs flex items-center justify-between shadow-2xs hover:border-blue-500 transition cursor-pointer"
                        >
                          <span className="truncate">
                            {isAllLessonsSelected
                              ? selectedUnitIds.length === 1
                                ? `جميع دروس (${currentSubjectUnits.find((u) => u.id === selectedUnitIds[0])?.title || "الوحدة"})`
                                : "جميع دروس الوحدات المختارة"
                              : selectedLessonIds.length === 1
                              ? currentUnitLessons.find((l) => l.id === selectedLessonIds[0])?.title || "درس محدد"
                              : `دروس محددة (${selectedLessonIds.length}): ${selectedLessonIds
                                  .map((id) => currentUnitLessons.find((l) => l.id === id)?.title)
                                  .filter(Boolean)
                                  .join("، ")}`}
                          </span>
                          <ChevronDown className={`w-4 h-4 shrink-0 transition-transform text-slate-400 ${isLessonsDropdownOpen ? "rotate-180" : ""}`} />
                        </button>

                        {isLessonsDropdownOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setIsLessonsDropdownOpen(false)}
                            />
                            <div className="absolute z-50 mt-1.5 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-2.5 space-y-1 font-bold text-xs max-h-72 overflow-y-auto">
                              <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100 dark:border-slate-800 mb-1">
                                <span className="text-[10px] text-slate-400">اختر دروس الاختبار</span>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedLessonIds(["all"])}
                                    className="text-[10px] text-blue-600 hover:underline cursor-pointer"
                                  >
                                    اختيار الكل
                                  </button>
                                  {!isAllLessonsSelected && (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedLessonIds(["all"])}
                                      className="text-[10px] text-red-500 hover:underline cursor-pointer"
                                    >
                                      إلغاء التحديد
                                    </button>
                                  )}
                                </div>
                              </div>

                              <label
                                className={`flex items-center gap-2.5 p-2 rounded-lg transition cursor-pointer select-none ${
                                  isAllLessonsSelected
                                    ? "bg-blue-50 dark:bg-blue-950/50 text-blue-900 dark:text-blue-200 font-extrabold"
                                    : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isAllLessonsSelected}
                                  onChange={() => setSelectedLessonIds(["all"])}
                                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                                />
                                <span className="flex-1 font-extrabold text-xs">
                                  {selectedUnitIds.length === 1
                                    ? `جميع دروس (${currentSubjectUnits.find((u) => u.id === selectedUnitIds[0])?.title || "الوحدة"})`
                                    : "جميع دروس الوحدات المختارة"}
                                </span>
                              </label>

                              <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                              {currentUnitLessons.length === 0 ? (
                                <div className="p-3 text-center text-slate-400 text-xs font-semibold">
                                  لا توجد دروس معرفة للنطاق المحدد
                                </div>
                              ) : (
                                currentUnitLessons.map((l, lIdx) => {
                                  const isChecked = !isAllLessonsSelected && selectedLessonIds.includes(l.id);
                                  const qCount = getLessonQuestionsCount(l.id);
                                  const parentUnit = allUnits.find((u) => u.id === l.unitId);
                                  return (
                                    <label
                                      key={l.id || `les_${lIdx}`}
                                      className={`flex items-center gap-2.5 p-2 rounded-lg transition cursor-pointer select-none ${
                                        isChecked
                                          ? "bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 font-bold"
                                          : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => handleToggleLesson(l.id)}
                                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <span className="font-bold text-xs truncate block">{l.title}</span>
                                        {parentUnit && (
                                          <span className="text-[10px] text-slate-400 font-normal truncate block">
                                            {parentUnit.title}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[10px] font-mono text-slate-400 shrink-0 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                        {qCount} أسئلة
                                      </span>
                                    </label>
                                  );
                                })
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* AI Criteria */}
                  <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm space-y-4">
                    <label className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-500" />
                      معايير الذكاء الاصطناعي
                    </label>
                    <div className="space-y-3">
                      <label className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer">
                        <input
                          type="checkbox"
                          checked={excludePreviouslyUsed}
                          onChange={(e) =>
                            setExcludePreviouslyUsed(e.target.checked)
                          }
                          className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                        />
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            عدم تكرار أسئلة تم استخدامها في نماذج سابقة
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            سيتم استبعاد الأسئلة الواردة في اختبارات الوحدات
                            السابقة تلقائياً لضمان تنوع النماذج.
                          </span>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filterOnlyApproved}
                          onChange={(e) =>
                            setFilterOnlyApproved(e.target.checked)
                          }
                          className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                        />
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            اعتماد الأسئلة الموثقة والمعتمدة فقط
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            لن يقوم المولد باختيار أي أسئلة لا تزال في حالة
                            مسودة (Draft).
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>
                  {/* Exam Title & Basic Parameters Section (Collapsible) */}
                  <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm space-y-4 transition-all">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 cursor-pointer select-none">
                        <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="font-extrabold text-slate-900 dark:text-white text-xs">
                          عنوان ومعلمات وثيقة الامتحان
                        </span>

                        {/* Summary Badge when collapsed */}
                        {false && (
                          <span className="text-[10px] font-bold text-blue-800 dark:text-blue-300 bg-blue-100/90 dark:bg-blue-900/60 px-2 py-0.5 rounded-full mr-2 truncate max-w-[200px]">
                            {examTitle || "بدون عنوان"} ({totalMarks} درجة •{" "}
                            {durationMinutes} دقيقة)
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        className="px-2 py-1 rounded-lg bg-slate-200/80 dark:bg-slate-700/80 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-[10px] flex items-center gap-1 transition"
                      ></button>
                    </div>

                    <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700/60">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            عنوان وثيقة الامتحان
                          </label>
                          <input
                            type="text"
                            value={examTitle}
                            onChange={(e) => {
                              const val = e.target.value;
                              setExamTitle(val);
                              if (generatedExam) {
                                const updatedLibDoc = generatedExam.libraryDoc
                                  ? { ...generatedExam.libraryDoc, title: val }
                                  : undefined;
                                setGeneratedExam({
                                  ...generatedExam,
                                  title: val,
                                  libraryDoc: updatedLibDoc,
                                });
                              }
                            }}
                            className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                            placeholder="مثال: امتحان نهاية الفصل الدراسي الأول"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            المرحلة الدراسية
                          </label>
                          <select
                            value={educationalLevel}
                            onChange={(e) => setEducationalLevel(e.target.value)}
                            className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                          >
                            <option value="ابتدائي">المرحلة الابتدائية</option>
                            <option value="متوسط">المرحلة المتوسطة</option>
                            <option value="ثانوي">المرحلة الثانوية</option>
                            <option value="جامعي">المرحلة الجامعية</option>
                            <option value="أخرى">أخرى</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            الفصل الدراسي
                          </label>
                          <select
                            value={semester}
                            onChange={(e) => setSemester(e.target.value)}
                            className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                          >
                            <option value="الفصل الأول">الفصل الدراسي الأول</option>
                            <option value="الفصل الثاني">الفصل الدراسي الثاني</option>
                            <option value="الفصل الثالث">الفصل الدراسي الثالث</option>
                            <option value="صيفي">الفصل الصيفي</option>
                            <option value="أخرى">أخرى</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            العام الدراسي / الملاحظات
                          </label>
                          <input
                            type="text"
                            value={academicTerm}
                            onChange={(e) => setAcademicTerm(e.target.value)}
                            className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                            placeholder="مثال: 2025/2026"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            مجموع درجات الامتحان
                          </label>
                          <input
                            type="number"
                            value={totalMarks}
                            readOnly
                            className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-500 font-bold cursor-not-allowed"
                            title="علامة المادة ثابتة كما هي محددة في المنهج"
                          />
                          <button
                            type="button"
                            onClick={() => handleEqualizeMarks()}
                            className="mt-1.5 w-full py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-[11px] flex items-center justify-center gap-1.5 shadow-2xs transition"
                            title="توزيع العلامة الكلية (مثلاً 100) بالتساوي على إجمالي الأسئلة والفقرات"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>
                              توزيع العلامات بالتساوي ({totalMarks} درجة) ⚡
                            </span>
                          </button>
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            زمن الامتحان (بالدقائق)
                          </label>
                          <input
                            type="number"
                            value={durationMinutes}
                            onChange={(e) => {
                              const val = Math.max(1, Number(e.target.value) || 0);
                              setDurationMinutes(val);
                              if (generatedExam) {
                                const updatedLibDoc = generatedExam.libraryDoc
                                  ? { ...generatedExam.libraryDoc, durationMinutes: val }
                                  : undefined;
                                setGeneratedExam({
                                  ...generatedExam,
                                  durationMinutes: val,
                                  libraryDoc: updatedLibDoc,
                                });
                              }
                            }}
                            className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 font-bold"
                          />
                        </div>

                        <div className="flex items-center sm:pt-6">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={generateVersionB}
                              onChange={(e) =>
                                setGenerateVersionB(e.target.checked)
                              }
                              className="rounded text-blue-600"
                            />
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              إنشاء نموذج (ب) متعدد
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Custom Exam Paper Components (Collapsible) */}
                  <div className="bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/50 rounded-xl p-3.5 space-y-3 transition-all">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 cursor-pointer select-none">
                        <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                        <span className="font-extrabold text-slate-900 dark:text-white text-xs">
                          مكوّنات ورقة الأسئلة المخصّصة
                        </span>

                        {/* Summary Badge when collapsed */}
                        {false && (
                          <span className="text-[10px] font-bold text-purple-800 dark:text-purple-300 bg-purple-100/90 dark:bg-purple-900/60 px-2 py-0.5 rounded-full mr-2">
                            {
                              [
                                showInstitutionLogo,
                                showStudentBox,
                                showGradingTable,
                                showInstructions,
                              ].filter(Boolean).length
                            }{" "}
                            خيارات مفعّلة
                          </span>
                        )}
                      </div>

                      <button
                        type="button"

                        className="px-2 py-1 rounded-lg bg-purple-100 dark:bg-purple-900/50 hover:bg-purple-200 dark:hover:bg-purple-900 text-purple-900 dark:text-purple-200 font-bold text-[10px] flex items-center gap-1 transition"
                      ></button>
                    </div>

                    {true && (
                      <div className="space-y-2 pt-2 border-t border-purple-200/60 dark:border-purple-800/40">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showInstitutionLogo}
                            onChange={(e) =>
                              setShowInstitutionLogo(e.target.checked)
                            }
                            className="rounded text-purple-600"
                          />
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            إظهار شعار المؤسسة في منتصف الترويسة
                          </span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showStudentBox}
                            onChange={(e) =>
                              setShowStudentBox(e.target.checked)
                            }
                            className="rounded text-purple-600"
                          />
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            إظهار مربع بيانات الطالب والشعبة
                          </span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showGradingTable}
                            onChange={(e) =>
                              setShowGradingTable(e.target.checked)
                            }
                            className="rounded text-purple-600"
                          />
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            إظهار جدول تفنيط ورصد درجات الأسئلة للمعلم والمصحح
                          </span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showInstructions}
                            onChange={(e) =>
                              setShowInstructions(e.target.checked)
                            }
                            className="rounded text-purple-600"
                          />
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            إظهار صندوق التعليمات والإرشادات العامة
                          </span>
                        </label>

                        {showInstructions && (
                          <div className="mt-2 pl-6 pr-2">
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                              نص التعليمات والإرشادات (كل سطر تعليمية):
                            </label>
                            <div className="w-full rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 min-h-[120px] overflow-hidden">
                              <RichTextEditor
                                value={instructionsText}
                                onChange={setInstructionsText}
                                placeholder="أجب عن الأسئلة التالية بوضوح...<br>ممنوع استخدام الآلة الحاسبة..."
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {currentStep === 2 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm overflow-hidden flex flex-col border border-slate-100 dark:border-slate-800">
                    {/* Template Selector */}
                    <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 space-y-3">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Layers className="w-4 h-4 text-blue-600" />
                        <span>القالب الحالي:</span>
                      </h3>
                      <div className="flex gap-2 items-center">
                        <select
                          className="flex-1 p-3 text-sm font-bold rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                          value={activeTemplate.id}
                          onChange={(e) => {
                            const allTmpls = storage.getPrintTemplates();
                            const tmpl = allTmpls.find(
                              (t) => t.id === e.target.value,
                            );
                            if (tmpl) setActiveTemplate(tmpl);
                          }}
                        >
                          {storage.getPrintTemplates().map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setNewTemplateName(activeTemplate.name);
                              setShowEditTemplatePrompt(true);
                            }}
                            className="p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-xs"
                            title="تعديل اسم القالب"
                          >
                            <Edit2 className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                activeTemplate.id === "tmpl-1" ||
                                activeTemplate.id === "tmpl-def"
                              ) {
                                showToast("لا يمكن حذف القالب الافتراضي!");
                                return;
                              }
                              setShowDeleteTemplateConfirm(true);
                            }}
                            className="p-3 rounded-xl border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/30 transition shadow-xs"
                            title="حذف القالب"
                          >
                            <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                          </button>
                        </>
                      </div>
                    </div>
                    <div className="p-0 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row">
                      <div className="sm:w-1/3 bg-slate-50 dark:bg-slate-800/40 p-3 flex flex-col gap-1 border-b sm:border-b-0 sm:border-l border-slate-200 dark:border-slate-700">
                        <button
                          onClick={() => setSettingsTab("margins")}
                          className={`text-right px-3 py-2 text-xs font-bold rounded-lg transition ${settingsTab === "margins" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" : "text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"}`}
                        >
                          الهوامش والأبعاد
                        </button>
                        <button
                          onClick={() => setSettingsTab("headerFooter")}
                          className={`text-right px-3 py-2 text-xs font-bold rounded-lg transition ${settingsTab === "headerFooter" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" : "text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"}`}
                        >
                          الرأس والتذييل
                        </button>
                        <button
                          onClick={() => setSettingsTab("sideText")}
                          className={`text-right px-3 py-2 text-xs font-bold rounded-lg transition ${settingsTab === "sideText" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" : "text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"}`}
                        >
                          هوامش الجوانب
                        </button>
                        <button
                          onClick={() => setSettingsTab("typography")}
                          className={`text-right px-3 py-2 text-xs font-bold rounded-lg transition ${settingsTab === "typography" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" : "text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"}`}
                        >
                          الخطوط والتنسيق
                        </button>
                        <button
                          onClick={() => setSettingsTab("spacing")}
                          className={`text-right px-3 py-2 text-xs font-bold rounded-lg transition ${settingsTab === "spacing" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" : "text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"}`}
                        >
                          ضبط المسافات والعناصر
                        </button>
                        <button
                          onClick={() => setSettingsTab("watermark")}
                          className={`text-right px-3 py-2 text-xs font-bold rounded-lg transition ${settingsTab === "watermark" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" : "text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"}`}
                        >
                          العلامة المائية
                        </button>
                        <div className="flex-1"></div>
                        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                          <div className="flex flex-col gap-2 w-full">
                            <button
                              type="button"
                              onClick={handleSaveAsNewTemplate}
                              className="w-full justify-center px-2.5 py-2 text-[10px] font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg transition text-center flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              حفظ كقالب جديد
                            </button>
                            <button
                              type="button"
                              onClick={handleSaveTemplateAsDefault}
                              className="w-full justify-center px-2.5 py-2 text-[10px] font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg transition text-center flex items-center gap-1"
                            >
                              <Settings className="w-3 h-3" />
                              حفظ كافتراضي
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleSave();
                              }}
                              className="w-full justify-center px-2.5 py-2 text-[10px] font-bold text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg transition text-center flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              تطبيق القالب وحفظ
                            </button>
                            <button
                              type="button"
                              onClick={resetTemplateSettings}
                              className="w-full justify-center px-2.5 py-2 text-[10px] font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition text-center flex items-center gap-1"
                            >
                              استعادة الأولي
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="sm:w-2/3 p-4 text-xs space-y-4">
                        {settingsTab === "margins" && (
                          <>
                            <div>
                              <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                                اتجاه الورقة
                              </label>
                              <select
                                value={activeTemplate.orientation}
                                onChange={(e) =>
                                  setActiveTemplate({
                                    ...activeTemplate,
                                    orientation: e.target.value as any,
                                  })
                                }
                                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-blue-500 outline-none"
                              >
                                <option value="portrait">
                                  عمودي (Portrait)
                                </option>
                                <option value="landscape">
                                  أفقي (Landscape)
                                </option>
                              </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                                  الهامش العلوي (سم)
                                </label>
                                <input
                                  type="number"
                                  step="0.1"
                                  value={activeTemplate.marginsCm.top}
                                  onChange={(e) =>
                                    setActiveTemplate({
                                      ...activeTemplate,
                                      marginsCm: {
                                        ...activeTemplate.marginsCm,
                                        top: Number(e.target.value),
                                      },
                                    })
                                  }
                                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                />
                              </div>
                              <div>
                                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                                  الهامش السفلي (سم)
                                </label>
                                <input
                                  type="number"
                                  step="0.1"
                                  value={activeTemplate.marginsCm.bottom}
                                  onChange={(e) =>
                                    setActiveTemplate({
                                      ...activeTemplate,
                                      marginsCm: {
                                        ...activeTemplate.marginsCm,
                                        bottom: Number(e.target.value),
                                      },
                                    })
                                  }
                                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                />
                              </div>
                              <div>
                                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                                  الهامش الأيمن (سم)
                                </label>
                                <input
                                  type="number"
                                  step="0.1"
                                  value={activeTemplate.marginsCm.right}
                                  onChange={(e) =>
                                    setActiveTemplate({
                                      ...activeTemplate,
                                      marginsCm: {
                                        ...activeTemplate.marginsCm,
                                        right: Number(e.target.value),
                                      },
                                    })
                                  }
                                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                />
                              </div>
                              <div>
                                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                                  الهامش الأيسر (سم)
                                </label>
                                <input
                                  type="number"
                                  step="0.1"
                                  value={activeTemplate.marginsCm.left}
                                  onChange={(e) =>
                                    setActiveTemplate({
                                      ...activeTemplate,
                                      marginsCm: {
                                        ...activeTemplate.marginsCm,
                                        left: Number(e.target.value),
                                      },
                                    })
                                  }
                                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                />
                              </div>
                            </div>
                          </>
                        )}

                        {settingsTab === "headerFooter" && (
                          <>
                            <div className="space-y-3">
                              <h4 className="font-bold text-blue-600 dark:text-blue-400 border-b border-blue-100 pb-1">
                                إعدادات الرأس (نصوص تظهر أسفل بعضها)
                              </h4>
                              <div>
                                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                                  النص 1: اسم المادة (تلقائي)
                                </label>
                                <input
                                  type="text"
                                  value={
                                    activeTemplate.headerContent.rightText ?? currentSubject?.name ?? ""
                                  }
                                  onChange={(e) =>
                                    setActiveTemplate({
                                      ...activeTemplate,
                                      headerContent: {
                                        ...activeTemplate.headerContent,
                                        rightText: e.target.value,
                                      },
                                    })
                                  }
                                  placeholder={
                                    currentSubject?.name ||
                                    "اسم المادة من شجرة المنهاج"
                                  }
                                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                                />
                              </div>
                              <div>
                                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                                  النص 2: اسم الوحدة (تلقائي)
                                </label>
                                <input
                                  type="text"
                                  value={
                                    activeTemplate.headerContent.centerText ?? (currentSubjectUnits.find(u => selectedUnitIds.includes(u.id))?.title || generatedExam?.title || "")
                                  }
                                  onChange={(e) =>
                                    setActiveTemplate({
                                      ...activeTemplate,
                                      headerContent: {
                                        ...activeTemplate.headerContent,
                                        centerText: e.target.value,
                                      },
                                    })
                                  }
                                  placeholder={
                                    currentSubjectUnits.find(u => selectedUnitIds.includes(u.id))?.title ||
                                    generatedExam?.title ||
                                    "اسم الوحدة من شجرة المنهاج"
                                  }
                                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                                />
                              </div>
                              <div>
                                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                                  النص 3: عنوان الدرس / الاختبار (تلقائي)
                                </label>
                                <input
                                  type="text"
                                  value={
                                    activeTemplate.headerContent.leftText ?? (currentUnitLessons.find(l => selectedLessonIds.includes(l.id))?.title || examTitle || "")
                                  }
                                  onChange={(e) =>
                                    setActiveTemplate({
                                      ...activeTemplate,
                                      headerContent: {
                                        ...activeTemplate.headerContent,
                                        leftText: e.target.value,
                                      },
                                    })
                                  }
                                  placeholder={currentUnitLessons.find(l => selectedLessonIds.includes(l.id))?.title || examTitle || "عنوان الدرس أو الاختبار"}
                                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                                />
                              </div>
                              <label className="flex items-center gap-2 cursor-pointer mt-2">
                                <input
                                  type="checkbox"
                                  checked={
                                    activeTemplate.headerContent
                                      .differentFirstPage || false
                                  }
                                  onChange={(e) =>
                                    setActiveTemplate({
                                      ...activeTemplate,
                                      headerContent: {
                                        ...activeTemplate.headerContent,
                                        differentFirstPage: e.target.checked,
                                      },
                                    })
                                  }
                                  className="rounded text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-slate-700 dark:text-slate-300">
                                  رأس وتذييل مختلف للصفحة الأولى
                                </span>
                              </label>
                            </div>

                            <div className="space-y-3 pt-2">
                              <h4 className="font-bold text-blue-600 dark:text-blue-400 border-b border-blue-100 pb-1">
                                إعدادات التذييل
                              </h4>
                              <div>
                                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                                  نص التذييل (حقوق النشر / اسم المعلم)
                                </label>
                                <input
                                  type="text"
                                  value={
                                    activeTemplate.footerContent
                                      .copyrightNotice || ""
                                  }
                                  onChange={(e) =>
                                    setActiveTemplate({
                                      ...activeTemplate,
                                      footerContent: {
                                        ...activeTemplate.footerContent,
                                        copyrightNotice: e.target.value,
                                      },
                                    })
                                  }
                                  placeholder="جميع الحقوق محفوظة - نظام إديوتيك لإدارة المناهج © 2026"
                                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                />
                              </div>
                              <label className="flex items-center gap-2 cursor-pointer mt-2">
                                <input
                                  type="checkbox"
                                  checked={
                                    activeTemplate.footerContent.showPageNumber
                                  }
                                  onChange={(e) =>
                                    setActiveTemplate({
                                      ...activeTemplate,
                                      footerContent: {
                                        ...activeTemplate.footerContent,
                                        showPageNumber: e.target.checked,
                                      },
                                    })
                                  }
                                  className="rounded text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-slate-700 dark:text-slate-300">
                                  عرض رقم الصفحة
                                </span>
                              </label>
                              
                              <label className="flex items-center gap-2 cursor-pointer mt-2">
                                <input
                                  type="checkbox"
                                  checked={
                                    activeTemplate.footerContent.showEndOfQuestionsMarker || false
                                  }
                                  onChange={(e) =>
                                    setActiveTemplate({
                                      ...activeTemplate,
                                      footerContent: {
                                        ...activeTemplate.footerContent,
                                        showEndOfQuestionsMarker: e.target.checked,
                                      },
                                    })
                                  }
                                  className="rounded text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-slate-700 dark:text-slate-300">
                                  عرض عبارة "انتهت الأسئلة" في نهاية الصفحة الأخيرة
                                </span>
                              </label>
                              {activeTemplate.footerContent.showPageNumber && (
                                <div className="mt-3 p-3 bg-slate-100 dark:bg-slate-800/50 rounded-lg space-y-3 border border-slate-200 dark:border-slate-700">
                                  <h5 className="font-bold text-[10px] text-slate-500 mb-2">
                                    تنسيق رقم الصفحة
                                  </h5>

                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1 text-[10px]">
                                        الموضع
                                      </label>
                                      <select
                                        value={
                                          activeTemplate.footerContent
                                            .pageNumberSettings?.align || "left"
                                        }
                                        onChange={(e) =>
                                          setActiveTemplate({
                                            ...activeTemplate,
                                            footerContent: {
                                              ...activeTemplate.footerContent,
                                              pageNumberSettings: {
                                                ...activeTemplate.footerContent
                                                  .pageNumberSettings,
                                                align: e.target.value as any,
                                              },
                                            },
                                          })
                                        }
                                        className="w-full p-1.5 text-[11px] rounded border border-slate-200 dark:border-slate-700 dark:bg-slate-800"
                                      >
                                        <option value="right">يمين</option>
                                        <option value="center">المنتصف</option>
                                        <option value="left">يسار</option>
                                      </select>
                                    </div>

                                    <div>
                                      <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1 text-[10px]">
                                        الخط
                                      </label>
                                      <select
                                        value={
                                          activeTemplate.footerContent
                                            .pageNumberSettings?.fontFamily ||
                                          ""
                                        }
                                        onChange={(e) =>
                                          setActiveTemplate({
                                            ...activeTemplate,
                                            footerContent: {
                                              ...activeTemplate.footerContent,
                                              pageNumberSettings: {
                                                ...activeTemplate.footerContent
                                                  .pageNumberSettings,
                                                fontFamily: e.target.value,
                                              },
                                            },
                                          })
                                        }
                                        className="w-full p-1.5 text-[11px] rounded border border-slate-200 dark:border-slate-700 dark:bg-slate-800"
                                      >
                                        <option value="">(افتراضي)</option>
                                        <option value="Cairo">Cairo</option>
                                        <option value="Tajawal">Tajawal</option>
                                        <option value="Almarai">Almarai</option>
                                        <option value="Arial, Helvetica, sans-serif">
                                          Arial
                                        </option>
                                        <option value="'Courier New', Courier, monospace">
                                          Courier New
                                        </option>
                                      </select>
                                    </div>

                                    <div>
                                      <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1 text-[10px]">
                                        الحجم
                                      </label>
                                      <input
                                        type="number"
                                        placeholder="تلقائي"
                                        value={
                                          activeTemplate.footerContent
                                            .pageNumberSettings?.fontSize || ""
                                        }
                                        onChange={(e) =>
                                          setActiveTemplate({
                                            ...activeTemplate,
                                            footerContent: {
                                              ...activeTemplate.footerContent,
                                              pageNumberSettings: {
                                                ...activeTemplate.footerContent
                                                  .pageNumberSettings,
                                                fontSize: e.target.value
                                                  ? Number(e.target.value)
                                                  : undefined,
                                              },
                                            },
                                          })
                                        }
                                        className="w-full p-1.5 text-[11px] rounded border border-slate-200 dark:border-slate-700 dark:bg-slate-800"
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1 text-[10px]">
                                        اللون
                                      </label>
                                      <input
                                        type="color"
                                        value={
                                          activeTemplate.footerContent
                                            .pageNumberSettings?.color ||
                                          "#64748B"
                                        }
                                        onChange={(e) =>
                                          setActiveTemplate({
                                            ...activeTemplate,
                                            footerContent: {
                                              ...activeTemplate.footerContent,
                                              pageNumberSettings: {
                                                ...activeTemplate.footerContent
                                                  .pageNumberSettings,
                                                color: e.target.value,
                                              },
                                            },
                                          })
                                        }
                                        className="w-full h-7 p-0 rounded border border-slate-200 dark:border-slate-700 dark:bg-slate-800 cursor-pointer"
                                      />
                                    </div>
                                  </div>
                                  <label className="flex items-center gap-2 cursor-pointer mt-2 text-[10px]">
                                    <input
                                      type="checkbox"
                                      checked={
                                        activeTemplate.footerContent
                                          .pageNumberSettings?.bold || false
                                      }
                                      onChange={(e) =>
                                        setActiveTemplate({
                                          ...activeTemplate,
                                          footerContent: {
                                            ...activeTemplate.footerContent,
                                            pageNumberSettings: {
                                              ...activeTemplate.footerContent
                                                .pageNumberSettings,
                                              bold: e.target.checked,
                                            },
                                          },
                                        })
                                      }
                                      className="rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-slate-700 dark:text-slate-300 font-bold">
                                      خط عريض (Bold)
                                    </span>
                                  </label>
                                </div>
                              )}
                            </div>
                          </>
                        )}

                        {settingsTab === "typography" && (
                          <>
                            <div className="space-y-2">
                              <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                                عائلة الخط (Font Family)
                              </label>
                              <select
                                value={
                                  [
                                    "Cairo",
                                    "Tajawal",
                                    "Almarai",
                                    "'IBM Plex Sans Arabic', sans-serif",
                                    "'Noto Naskh Arabic', serif",
                                    "'Traditional Arabic', serif",
                                    "'Amiri', serif",
                                    "'Aref Ruqaa', serif",
                                    "'Times New Roman', Times, serif",
                                    "Arial, Helvetica, sans-serif",
                                    "'Courier New', Courier, monospace",
                                  ].includes(
                                    activeTemplate.typography?.fontFamily ||
                                      "Cairo",
                                  )
                                    ? activeTemplate.typography?.fontFamily ||
                                      "Cairo"
                                    : "custom"
                                }
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val !== "custom") {
                                    setActiveTemplate({
                                      ...activeTemplate,
                                      typography: {
                                        ...activeTemplate.typography,
                                        fontFamily: val,
                                      } as any,
                                    });
                                  } else {
                                    setActiveTemplate({
                                      ...activeTemplate,
                                      typography: {
                                        ...activeTemplate.typography,
                                        fontFamily: "Tahoma",
                                      } as any,
                                    });
                                  }
                                }}
                                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                              >
                                <optgroup label="خطوط عربية حديثة">
                                  <option value="Cairo">
                                    Cairo (عصري ومقروء)
                                  </option>
                                  <option value="Tajawal">
                                    Tajawal (رسمي وحديث)
                                  </option>
                                  <option value="Almarai">
                                    Almarai (مريح للعين)
                                  </option>
                                  <option value="'IBM Plex Sans Arabic', sans-serif">
                                    IBM Plex Sans (تقني وأكاديمي)
                                  </option>
                                </optgroup>
                                <optgroup label="خطوط عربية أكاديمية">
                                  <option value="'Traditional Arabic', serif">
                                    Traditional Arabic (كلاسيكي أكاديمي ومقرر
                                    وزارياً)
                                  </option>
                                  <option value="'Noto Naskh Arabic', serif">
                                    Noto Naskh Arabic (نسخ قياسي)
                                  </option>
                                  <option value="'Amiri', serif">
                                    Amiri (أميري للمطبوعات)
                                  </option>
                                  <option value="'Aref Ruqaa', serif">
                                    Aref Ruqaa (رقعة)
                                  </option>
                                </optgroup>
                                <optgroup label="خطوط قياسية وإنجليزية">
                                  <option value="'Times New Roman', Times, serif">
                                    Times New Roman (أكاديمي إنجليزي)
                                  </option>
                                  <option value="Arial, Helvetica, sans-serif">
                                    Arial (قياسي أساسي)
                                  </option>
                                  <option value="'Courier New', Courier, monospace">
                                    Courier New (أكواد برمجية)
                                  </option>
                                </optgroup>
                                <option value="custom">إدخال خط مخصص...</option>
                              </select>

                              {![
                                "Cairo",
                                "Tajawal",
                                "Almarai",
                                "'IBM Plex Sans Arabic', sans-serif",
                                "'Noto Naskh Arabic', serif",
                                "'Traditional Arabic', serif",
                                "'Amiri', serif",
                                "'Aref Ruqaa', serif",
                                "'Times New Roman', Times, serif",
                                "Arial, Helvetica, sans-serif",
                                "'Courier New', Courier, monospace",
                              ].includes(
                                activeTemplate.typography?.fontFamily ||
                                  "Cairo",
                              ) && (
                                <input
                                  type="text"
                                  placeholder="اكتب اسم الخط هنا (مثل: Tahoma)"
                                  value={
                                    activeTemplate.typography?.fontFamily || ""
                                  }
                                  onChange={(e) =>
                                    setActiveTemplate({
                                      ...activeTemplate,
                                      typography: {
                                        ...activeTemplate.typography,
                                        fontFamily: e.target.value,
                                      } as any,
                                    })
                                  }
                                  className="w-full p-2 mt-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                />
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                                  حجم الخط الأساسي (pt)
                                </label>
                                <input
                                  type="number"
                                  value={
                                    activeTemplate.typography?.baseFontSize ||
                                    12
                                  }
                                  onChange={(e) =>
                                    setActiveTemplate({
                                      ...activeTemplate,
                                      typography: {
                                        ...activeTemplate.typography,
                                        baseFontSize: Number(e.target.value),
                                      } as any,
                                    })
                                  }
                                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                />
                              </div>
                              <div>
                                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                                  حجم خط عنوان الاختبار (pt)
                                </label>
                                <input
                                  type="number"
                                  value={
                                    activeTemplate.typography?.headingSize || 16
                                  }
                                  onChange={(e) =>
                                    setActiveTemplate({
                                      ...activeTemplate,
                                      typography: {
                                        ...activeTemplate.typography,
                                        headingSize: Number(e.target.value),
                                      } as any,
                                    })
                                  }
                                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                                  حجم خط بيانات الطالب (pt)
                                </label>
                                <input
                                  type="number"
                                  value={
                                    activeTemplate.typography?.studentBoxFontSize ||
                                    11
                                  }
                                  onChange={(e) =>
                                    setActiveTemplate({
                                      ...activeTemplate,
                                      typography: {
                                        ...activeTemplate.typography,
                                        studentBoxFontSize: Number(e.target.value),
                                      } as any,
                                    })
                                  }
                                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                />
                              </div>
                              <div>
                                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                                  حجم خط الأسئلة (pt)
                                </label>
                                <input
                                  type="number"
                                  value={
                                    activeTemplate.typography?.questionFontSize ||
                                    11
                                  }
                                  onChange={(e) =>
                                    setActiveTemplate({
                                      ...activeTemplate,
                                      typography: {
                                        ...activeTemplate.typography,
                                        questionFontSize: Number(e.target.value),
                                      } as any,
                                    })
                                  }
                                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                                  حجم خط الاختيارات (pt)
                                </label>
                                <input
                                  type="number"
                                  value={
                                    activeTemplate.typography?.optionsFontSize ||
                                    10
                                  }
                                  onChange={(e) =>
                                    setActiveTemplate({
                                      ...activeTemplate,
                                      typography: {
                                        ...activeTemplate.typography,
                                        optionsFontSize: Number(e.target.value),
                                      } as any,
                                    })
                                  }
                                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                />
                              </div>
                              <div>
                                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                                  حجم خط الدرجات (pt)
                                </label>
                                <input
                                  type="number"
                                  value={
                                    activeTemplate.typography?.marksFontSize ||
                                    10
                                  }
                                  onChange={(e) =>
                                    setActiveTemplate({
                                      ...activeTemplate,
                                      typography: {
                                        ...activeTemplate.typography,
                                        marksFontSize: Number(e.target.value),
                                      } as any,
                                    })
                                  }
                                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                />
                              </div>
                            </div>

                            <div className="space-y-4 border-t border-slate-100 dark:border-slate-800 pt-4 mt-4">
                              {/* Question Spacing control with range slider and direct numeric input */}
                              <div className="bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-200/50 dark:border-slate-800/80">
                                <div className="flex justify-between items-center mb-2">
                                  <label className="text-slate-700 dark:text-slate-300 font-bold text-xs">
                                    المسافة بين الأسئلة (px)
                                  </label>
                                  <span className="text-xs font-mono bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md font-bold">
                                    {activeTemplate.typography?.questionSpacing !== undefined
                                      ? activeTemplate.typography.questionSpacing
                                      : 12} px
                                  </span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <input
                                    type="range"
                                    min="0"
                                    max="80"
                                    step="1"
                                    value={
                                      activeTemplate.typography?.questionSpacing !== undefined
                                        ? activeTemplate.typography.questionSpacing
                                        : 12
                                    }
                                    onChange={(e) =>
                                      setActiveTemplate({
                                        ...activeTemplate,
                                        typography: {
                                          ...activeTemplate.typography,
                                          questionSpacing: Number(e.target.value),
                                        } as any,
                                      })
                                    }
                                    className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                                  />
                                  <input
                                    type="number"
                                    min="0"
                                    max="150"
                                    value={
                                      activeTemplate.typography?.questionSpacing !== undefined
                                        ? activeTemplate.typography.questionSpacing
                                        : 12
                                    }
                                    onChange={(e) =>
                                      setActiveTemplate({
                                        ...activeTemplate,
                                        typography: {
                                          ...activeTemplate.typography,
                                          questionSpacing: Math.max(0, Number(e.target.value)),
                                        } as any,
                                      })
                                    }
                                    className="w-18 p-1.5 text-center rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                  />
                                </div>
                                <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">
                                  <span>0px (ملتصق)</span>
                                  <span>12px (افتراضي)</span>
                                  <span>40px (متباعد)</span>
                                  <span>80px (واسع جداً)</span>
                                </div>
                              </div>
                            </div>
                          </>
                        )}

                        {settingsTab === "spacing" && (
                          <>
                            <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-4">
                              ضبط المسافات والعناصر
                            </h4>
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    المسافة بين البطاقات
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={activeTemplate.typography?.cardSpacing ?? 16}
                                    onChange={(e) => handleUpdateTypography("cardSpacing", parseInt(e.target.value) || 0)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 text-left"
                                    dir="ltr"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    الهوامش داخل البطاقة
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={activeTemplate.typography?.cardPadding ?? 12}
                                    onChange={(e) => handleUpdateTypography("cardPadding", parseInt(e.target.value) || 0)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 text-left"
                                    dir="ltr"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    التباعد بين السؤال وخياراته
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={activeTemplate.typography?.questionOptionSpacing ?? 8}
                                    onChange={(e) => handleUpdateTypography("questionOptionSpacing", parseInt(e.target.value) || 0)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 text-left"
                                    dir="ltr"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    المسافة بين الأسئلة (والأسئلة التابعة)
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={activeTemplate.typography?.questionSpacing ?? 16}
                                    onChange={(e) => handleUpdateTypography("questionSpacing", parseInt(e.target.value) || 0)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 text-left"
                                    dir="ltr"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    المسافة بين العناصر (نصوص، جداول، صور)
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={activeTemplate.typography?.elementSpacing ?? 8}
                                    onChange={(e) => handleUpdateTypography("elementSpacing", parseInt(e.target.value) || 0)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 text-left"
                                    dir="ltr"
                                  />
                                </div>
                              </div>
                            </div>
                          </>
                        )}

                        {settingsTab === "watermark" && (
                          <>
                            <label className="flex items-center gap-2 cursor-pointer mb-4">
                              <input
                                type="checkbox"
                                checked={
                                  activeTemplate.watermark?.enabled || false
                                }
                                onChange={(e) =>
                                  setActiveTemplate({
                                    ...activeTemplate,
                                    watermark: {
                                      ...activeTemplate.watermark,
                                      enabled: e.target.checked,
                                    } as any,
                                  })
                                }
                                className="rounded text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-slate-900 dark:text-slate-100 font-bold">
                                تفعيل العلامة المائية
                              </span>
                            </label>

                            {activeTemplate.watermark?.enabled && (
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                                    نص العلامة المائية
                                  </label>
                                  <input
                                    type="text"
                                    value={
                                      activeTemplate.watermark?.text ||
                                      "نظام إديوتيك"
                                    }
                                    onChange={(e) =>
                                      setActiveTemplate({
                                        ...activeTemplate,
                                        watermark: {
                                          ...activeTemplate.watermark,
                                          text: e.target.value,
                                        } as any,
                                      })
                                    }
                                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                  />
                                </div>
                                <div>
                                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                                    الشفافية:{" "}
                                    {Math.round(
                                      (activeTemplate.watermark?.opacity ||
                                        0.1) * 100,
                                    )}
                                    %
                                  </label>
                                  <input
                                    type="range"
                                    min="0.05"
                                    max="0.5"
                                    step="0.01"
                                    value={
                                      activeTemplate.watermark?.opacity || 0.1
                                    }
                                    onChange={(e) =>
                                      setActiveTemplate({
                                        ...activeTemplate,
                                        watermark: {
                                          ...activeTemplate.watermark,
                                          opacity: Number(e.target.value),
                                        } as any,
                                      })
                                    }
                                    className="w-full accent-blue-600"
                                  />
                                  <p className="text-[10px] text-slate-500 mt-1">
                                    يُنصح بـ 10% إلى 15% لعدم التشويش على
                                    المعادلات
                                  </p>
                                </div>
                                <div>
                                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                                    التوجيه
                                  </label>
                                  <select
                                    value={
                                      activeTemplate.watermark?.orientation ||
                                      "diagonal"
                                    }
                                    onChange={(e) =>
                                      setActiveTemplate({
                                        ...activeTemplate,
                                        watermark: {
                                          ...activeTemplate.watermark,
                                          orientation: e.target.value as any,
                                        } as any,
                                      })
                                    }
                                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                  >
                                    <option value="diagonal">
                                      قطري (Diagonal - 45°)
                                    </option>
                                    <option value="horizontal">
                                      أفقي (Horizontal)
                                    </option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                                    حجم الخط:{" "}
                                    {activeTemplate.watermark?.fontSize ||
                                      (activeTemplate.orientation ===
                                      "landscape"
                                        ? 120
                                        : 100)}
                                    px
                                  </label>
                                  <input
                                    type="range"
                                    min="20"
                                    max="300"
                                    step="5"
                                    value={
                                      activeTemplate.watermark?.fontSize ||
                                      (activeTemplate.orientation ===
                                      "landscape"
                                        ? 120
                                        : 100)
                                    }
                                    onChange={(e) =>
                                      setActiveTemplate({
                                        ...activeTemplate,
                                        watermark: {
                                          ...activeTemplate.watermark,
                                          fontSize: Number(e.target.value),
                                        } as any,
                                      })
                                    }
                                    className="w-full accent-blue-600"
                                  />
                                </div>

                                <label className="flex items-center gap-2 cursor-pointer mt-2">
                                  <input
                                    type="checkbox"
                                    checked={
                                      activeTemplate.watermark?.fitToPage ||
                                      false
                                    }
                                    onChange={(e) =>
                                      setActiveTemplate({
                                        ...activeTemplate,
                                        watermark: {
                                          ...activeTemplate.watermark,
                                          fitToPage: e.target.checked,
                                        } as any,
                                      })
                                    }
                                    className="rounded text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-slate-900 dark:text-slate-100 font-bold text-xs">
                                    احتواء داخل الصفحة (التفاف النص الطويل لعدم
                                    تجاوز الهامش)
                                  </span>
                                </label>

                                <div className="mt-3">
                                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                                    موضع العلامة المائية
                                  </label>
                                  <select
                                    value={
                                      activeTemplate.watermark?.layer || "below"
                                    }
                                    onChange={(e) =>
                                      setActiveTemplate({
                                        ...activeTemplate,
                                        watermark: {
                                          ...activeTemplate.watermark,
                                          layer: e.target.value as any,
                                        } as any,
                                      })
                                    }
                                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                  >
                                    <option value="below">
                                      خلف النص (أسفل)
                                    </option>
                                    <option value="above">
                                      فوق النص (أعلى)
                                    </option>
                                  </select>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-3">
                                  <div>
                                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                                      لون العلامة المائية
                                    </label>
                                    <div className="flex gap-2 items-center">
                                      <input
                                        type="color"
                                        value={
                                          activeTemplate.watermark?.color ||
                                          "#64748b"
                                        }
                                        onChange={(e) =>
                                          setActiveTemplate({
                                            ...activeTemplate,
                                            watermark: {
                                              ...activeTemplate.watermark,
                                              color: e.target.value,
                                            } as any,
                                          })
                                        }
                                        className="w-8 h-8 rounded cursor-pointer border border-slate-200 dark:border-slate-700 p-0 overflow-hidden"
                                      />
                                      <input
                                        type="text"
                                        value={
                                          activeTemplate.watermark?.color ||
                                          "#64748b"
                                        }
                                        onChange={(e) =>
                                          setActiveTemplate({
                                            ...activeTemplate,
                                            watermark: {
                                              ...activeTemplate.watermark,
                                              color: e.target.value,
                                            } as any,
                                          })
                                        }
                                        className="flex-1 p-2 text-[10px] rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                                        dir="ltr"
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                                      نوع الخط
                                    </label>
                                    <select
                                      value={
                                        [
                                          "Cairo",
                                          "Tajawal",
                                          "Almarai",
                                          "'IBM Plex Sans Arabic', sans-serif",
                                          "'Noto Naskh Arabic', serif",
                                          "'Traditional Arabic', serif",
                                          "'Amiri', serif",
                                          "'Aref Ruqaa', serif",
                                          "'Times New Roman', Times, serif",
                                          "Arial, Helvetica, sans-serif",
                                          "'Courier New', Courier, monospace",
                                          "",
                                        ].includes(
                                          activeTemplate.watermark
                                            ?.fontFamily || "",
                                        )
                                          ? activeTemplate.watermark
                                              ?.fontFamily || ""
                                          : "custom"
                                      }
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        if (val !== "custom") {
                                          setActiveTemplate({
                                            ...activeTemplate,
                                            watermark: {
                                              ...activeTemplate.watermark,
                                              fontFamily: val,
                                            } as any,
                                          });
                                        } else {
                                          setActiveTemplate({
                                            ...activeTemplate,
                                            watermark: {
                                              ...activeTemplate.watermark,
                                              fontFamily: "Tahoma",
                                            } as any,
                                          });
                                        }
                                      }}
                                      className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                    >
                                      <option value="">
                                        افتراضي (خط القالب)
                                      </option>
                                      <optgroup label="خطوط عربية حديثة">
                                        <option value="Cairo">
                                          Cairo (عصري ومقروء)
                                        </option>
                                        <option value="Tajawal">
                                          Tajawal (رسمي وحديث)
                                        </option>
                                        <option value="Almarai">
                                          Almarai (مريح للعين)
                                        </option>
                                        <option value="'IBM Plex Sans Arabic', sans-serif">
                                          IBM Plex Sans (تقني وأكاديمي)
                                        </option>
                                      </optgroup>
                                      <optgroup label="خطوط عربية أكاديمية">
                                        <option value="'Traditional Arabic', serif">
                                          Traditional Arabic (كلاسيكي أكاديمي
                                          ومقرر وزارياً)
                                        </option>
                                        <option value="'Noto Naskh Arabic', serif">
                                          Noto Naskh Arabic (نسخ قياسي)
                                        </option>
                                        <option value="'Amiri', serif">
                                          Amiri (أميري للمطبوعات)
                                        </option>
                                        <option value="'Aref Ruqaa', serif">
                                          Aref Ruqaa (رقعة)
                                        </option>
                                      </optgroup>
                                      <optgroup label="خطوط قياسية وإنجليزية">
                                        <option value="'Times New Roman', Times, serif">
                                          Times New Roman (أكاديمي إنجليزي)
                                        </option>
                                        <option value="Arial, Helvetica, sans-serif">
                                          Arial (قياسي أساسي)
                                        </option>
                                        <option value="'Courier New', Courier, monospace">
                                          Courier New (أكواد برمجية)
                                        </option>
                                      </optgroup>
                                      <option value="custom">
                                        إدخال خط مخصص...
                                      </option>
                                    </select>

                                    {![
                                      "Cairo",
                                      "Tajawal",
                                      "Almarai",
                                      "'IBM Plex Sans Arabic', sans-serif",
                                      "'Noto Naskh Arabic', serif",
                                      "'Traditional Arabic', serif",
                                      "'Amiri', serif",
                                      "'Aref Ruqaa', serif",
                                      "'Times New Roman', Times, serif",
                                      "Arial, Helvetica, sans-serif",
                                      "'Courier New', Courier, monospace",
                                      "",
                                    ].includes(
                                      activeTemplate.watermark?.fontFamily ||
                                        "",
                                    ) && (
                                      <input
                                        type="text"
                                        placeholder="اكتب اسم الخط هنا (مثل: Tahoma)"
                                        value={
                                          activeTemplate.watermark
                                            ?.fontFamily || ""
                                        }
                                        onChange={(e) =>
                                          setActiveTemplate({
                                            ...activeTemplate,
                                            watermark: {
                                              ...activeTemplate.watermark,
                                              fontFamily: e.target.value,
                                            } as any,
                                          })
                                        }
                                        className="w-full p-2 mt-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                      />
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                        {settingsTab === "sideText" && (
                          <div className="space-y-6">
                            {/* Right Margin Text */}
                            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-white dark:bg-slate-800">
                              <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-3 text-sm">
                                نص الهامش الأيمن
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                                    النص (يُترك فارغاً للإلغاء)
                                  </label>
                                  <input
                                    type="text"
                                    value={
                                      activeTemplate.sideText?.right?.text || ""
                                    }
                                    onChange={(e) =>
                                      setActiveTemplate({
                                        ...activeTemplate,
                                        sideText: {
                                          ...activeTemplate.sideText,
                                          right: {
                                            ...activeTemplate.sideText?.right,
                                            text: e.target.value,
                                          } as any,
                                        },
                                      })
                                    }
                                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                                  />
                                </div>
                                <div>
                                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                                    اتجاه الكتابة
                                  </label>
                                  <select
                                    value={
                                      activeTemplate.sideText?.right
                                        ?.direction || "top-to-bottom"
                                    }
                                    onChange={(e) =>
                                      setActiveTemplate({
                                        ...activeTemplate,
                                        sideText: {
                                          ...activeTemplate.sideText,
                                          right: {
                                            ...activeTemplate.sideText?.right,
                                            direction: e.target.value as any,
                                          } as any,
                                        },
                                      })
                                    }
                                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                                  >
                                    <option value="top-to-bottom">
                                      من الأعلى للأسفل
                                    </option>
                                    <option value="bottom-to-top">
                                      من الأسفل للأعلى
                                    </option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                                    محاذاة النص
                                  </label>
                                  <select
                                    value={
                                      activeTemplate.sideText?.right?.align ||
                                      "center"
                                    }
                                    onChange={(e) =>
                                      setActiveTemplate({
                                        ...activeTemplate,
                                        sideText: {
                                          ...activeTemplate.sideText,
                                          right: {
                                            ...activeTemplate.sideText?.right,
                                            align: e.target.value as any,
                                          } as any,
                                        },
                                      })
                                    }
                                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                                  >
                                    <option value="start">
                                      بداية (أعلى/أسفل)
                                    </option>
                                    <option value="center">وسط</option>
                                    <option value="end">
                                      نهاية (أسفل/أعلى)
                                    </option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                                    الخط
                                  </label>
                                  <select
                                    value={
                                      activeTemplate.sideText?.right
                                        ?.fontFamily || ""
                                    }
                                    onChange={(e) =>
                                      setActiveTemplate({
                                        ...activeTemplate,
                                        sideText: {
                                          ...activeTemplate.sideText,
                                          right: {
                                            ...activeTemplate.sideText?.right,
                                            fontFamily: e.target.value,
                                          } as any,
                                        },
                                      })
                                    }
                                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                                  >
                                    <option value="">الافتراضي</option>
                                    <option value="Cairo, sans-serif">
                                      Cairo
                                    </option>
                                    <option value="Tajawal, sans-serif">
                                      Tajawal
                                    </option>
                                    <option value="Almarai, sans-serif">
                                      Almarai
                                    </option>
                                    <option value="'Amiri', serif">
                                      Amiri
                                    </option>
                                    <option value="'Noto Naskh Arabic', serif">
                                      Noto Naskh Arabic
                                    </option>
                                    <option value="'Noto Kufi Arabic', sans-serif">
                                      Noto Kufi Arabic
                                    </option>
                                    <option value="Arial, sans-serif">
                                      Arial
                                    </option>
                                    <option value="'Times New Roman', serif">
                                      Times New Roman
                                    </option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                                    الحجم
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="مثال: 12pt"
                                    value={
                                      activeTemplate.sideText?.right?.fontSize || "12pt"
                                    }
                                    onChange={(e) =>
                                      setActiveTemplate({
                                        ...activeTemplate,
                                        sideText: {
                                          ...activeTemplate.sideText,
                                          right: {
                                            ...activeTemplate.sideText?.right,
                                            fontSize: e.target.value,
                                          } as any,
                                        },
                                      })
                                    }
                                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                                  />
                                </div>
                                <div>
                                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                                    اللون
                                  </label>
                                  <input
                                    type="color"
                                    value={
                                      activeTemplate.sideText?.right?.color ||
                                      "#000000"
                                    }
                                    onChange={(e) =>
                                      setActiveTemplate({
                                        ...activeTemplate,
                                        sideText: {
                                          ...activeTemplate.sideText,
                                          right: {
                                            ...activeTemplate.sideText?.right,
                                            color: e.target.value,
                                          } as any,
                                        },
                                      })
                                    }
                                    className="w-full h-9 rounded cursor-pointer"
                                  />
                                </div>
                                <div>
                                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                                    الإزاحة الجانبية (عن حافة الصفحة)
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="مثال: 5px"
                                    value={
                                      activeTemplate.sideText?.right?.margin ||
                                      ""
                                    }
                                    onChange={(e) =>
                                      setActiveTemplate({
                                        ...activeTemplate,
                                        sideText: {
                                          ...activeTemplate.sideText,
                                          right: {
                                            ...activeTemplate.sideText?.right,
                                            margin: e.target.value,
                                          } as any,
                                        },
                                      })
                                    }
                                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Left Margin Text */}
                            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-white dark:bg-slate-800">
                              <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-3 text-sm">
                                نص الهامش الأيسر
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                                    النص (يُترك فارغاً للإلغاء)
                                  </label>
                                  <input
                                    type="text"
                                    value={
                                      activeTemplate.sideText?.left?.text || ""
                                    }
                                    onChange={(e) =>
                                      setActiveTemplate({
                                        ...activeTemplate,
                                        sideText: {
                                          ...activeTemplate.sideText,
                                          left: {
                                            ...activeTemplate.sideText?.left,
                                            text: e.target.value,
                                          } as any,
                                        },
                                      })
                                    }
                                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                                  />
                                </div>
                                <div>
                                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                                    اتجاه الكتابة
                                  </label>
                                  <select
                                    value={
                                      activeTemplate.sideText?.left
                                        ?.direction || "top-to-bottom"
                                    }
                                    onChange={(e) =>
                                      setActiveTemplate({
                                        ...activeTemplate,
                                        sideText: {
                                          ...activeTemplate.sideText,
                                          left: {
                                            ...activeTemplate.sideText?.left,
                                            direction: e.target.value as any,
                                          } as any,
                                        },
                                      })
                                    }
                                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                                  >
                                    <option value="top-to-bottom">
                                      من الأعلى للأسفل
                                    </option>
                                    <option value="bottom-to-top">
                                      من الأسفل للأعلى
                                    </option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                                    محاذاة النص
                                  </label>
                                  <select
                                    value={
                                      activeTemplate.sideText?.left?.align ||
                                      "center"
                                    }
                                    onChange={(e) =>
                                      setActiveTemplate({
                                        ...activeTemplate,
                                        sideText: {
                                          ...activeTemplate.sideText,
                                          left: {
                                            ...activeTemplate.sideText?.left,
                                            align: e.target.value as any,
                                          } as any,
                                        },
                                      })
                                    }
                                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                                  >
                                    <option value="start">
                                      بداية (أعلى/أسفل)
                                    </option>
                                    <option value="center">وسط</option>
                                    <option value="end">
                                      نهاية (أسفل/أعلى)
                                    </option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                                    الإزاحة الجانبية (عن حافة الصفحة)
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="مثال: 5px"
                                    value={
                                      activeTemplate.sideText?.left?.margin ||
                                      ""
                                    }
                                    onChange={(e) =>
                                      setActiveTemplate({
                                        ...activeTemplate,
                                        sideText: {
                                          ...activeTemplate.sideText,
                                          left: {
                                            ...activeTemplate.sideText?.left,
                                            margin: e.target.value,
                                          } as any,
                                        },
                                      })
                                    }
                                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {currentStep === 3 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {/* Custom Question Structure Builder (هيكلية المحاور والأسئلة الفرعية) */}
                  <div className="bg-gradient-to-br from-blue-50/70 to-indigo-50/70 dark:from-slate-800/80 dark:to-slate-900/80 border border-blue-200 dark:border-blue-800/50 rounded-xl p-4 space-y-3.5 transition-all">
                    <div className="flex items-center justify-between border-b border-blue-200 dark:border-slate-700 pb-2.5 flex-wrap gap-2">
                      <div className="flex items-center gap-2 cursor-pointer select-none">
                        <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="font-extrabold text-slate-900 dark:text-white text-xs">
                          هيكلية وصيغ الأسئلة الرئيسية (Questions Structure)
                        </span>
                        <span className="text-[10px] font-bold text-blue-800 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded-full shrink-0">
                          {customSections.length} أسئلة رئيسية
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {customSections.length > 0 && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                const allCollapsed: Record<string, boolean> =
                                  {};
                                customSections.forEach(
                                  (s) => (allCollapsed[s.id] = true),
                                );
                                setCollapsedSections(allCollapsed);
                              }}
                              className="px-2 py-1 rounded-lg bg-slate-200/80 dark:bg-slate-700/80 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-[10px] flex items-center gap-1 transition"
                              title="طي جميع الأسئلة لتوفير مساحة المعاينة"
                            >
                              <span>طي الكل</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const allExpanded: Record<string, boolean> = {};
                                customSections.forEach(
                                  (s) => (allExpanded[s.id] = false),
                                );
                                setCollapsedSections(allExpanded);
                              }}
                              className="px-2 py-1 rounded-lg bg-slate-200/80 dark:bg-slate-700/80 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-[10px] flex items-center gap-1 transition"
                              title="توسيع جميع الأسئلة للتعديل"
                            >
                              <span>توسيع الكل</span>
                            </button>
                          </>
                        )}
                        {true && (
                          <button
                            type="button"
                            onClick={handleAddSection}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition"
                            title="إضافة سؤال رئيسي جديد إلى هيكل الاختبار"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>إضافة سؤال رئيسي جديد</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {true && (
                      <>
                        {/* Fast Presets */}
                        <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-bold">
                          <span className="text-slate-500">
                            نماذج هيكلية جاهزة:
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setCustomSections(
                                autoDistributeMarks(
                                  [
                                    {
                                      id: "sec-1",
                                      questionNumberLabel: "السؤال الأول",
                                      title:
                                        "ضع علامة (صح) أو (خطأ) أمام العبارات التالية:",
                                      questionType: "true_false",
                                      count: 4,
                                      markPerQuestion: 5,
                                    },
                                    {
                                      id: "sec-2",
                                      questionNumberLabel: "السؤال الثاني",
                                      title:
                                        "اختر الإجابة الصحيحة لكل من الفقرات التالية:",
                                      questionType: "mcq",
                                      count: 4,
                                      markPerQuestion: 5,
                                    },
                                    {
                                      id: "sec-3",
                                      questionNumberLabel: "السؤال الثالث",
                                      title:
                                        "أجب عن الأسئلة التالية:",
                                      questionType: "essay",
                                      count: 2,
                                      markPerQuestion: 10,
                                    },
                                  ],
                                  totalMarks,
                                ),
                              )
                            }
                            className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-blue-500 text-slate-700 dark:text-slate-200 transition"
                          >
                            3 أسئلة قياسي (صح/خطأ + اختيارات + مقالي)
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setCustomSections(
                                autoDistributeMarks(
                                  [
                                    {
                                      id: "sec-1",
                                      questionNumberLabel: "السؤال الأول",
                                      title:
                                        "أجب بوضع علامة (صح) أو (خطأ) أمام العبارات الآتية:",
                                      questionType: "true_false",
                                      count: 5,
                                      markPerQuestion: 4,
                                    },
                                    {
                                      id: "sec-2",
                                      questionNumberLabel: "السؤال الثاني",
                                      title:
                                        "اختر الإجابة الصحيحة من بين القوسين لكل فقرة:",
                                      questionType: "mcq",
                                      count: 5,
                                      markPerQuestion: 4,
                                    },
                                  ],
                                  totalMarks,
                                ),
                              )
                            }
                            className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-blue-500 text-slate-700 dark:text-slate-200 transition"
                          >
                            اختبار موضوعي (صح/خطأ + اختيارات)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (availableQuestions.length === 0) {
                                showToast("لا يوجد أسئلة متوفرة في النطاق المحدد!");
                                return;
                              }
                              const groupedByType = availableQuestions.reduce((acc, q) => {
                                const type = q.type || "mcq";
                                acc[type] = (acc[type] || 0) + 1;
                                return acc;
                              }, {} as Record<string, number>);
                              
                              const newSections = Object.entries(groupedByType).map(([type, count], idx) => ({
                                id: "sec-all-" + Date.now() + "-" + idx,
                                questionNumberLabel: getArabicQuestionLabel(idx + 1),
                                title: getDefaultWordingForType(type),
                                questionType: type,
                                count: count as number,
                                markPerQuestion: 2,
                                fontSize: "12pt"
                              }));
                              
                              setCustomSections(autoDistributeMarks(newSections, totalMarks));
                              showToast(`تم إدراج جميع الأسئلة المتوفرة (${availableQuestions.length} سؤال) وتوزيع علامة المادة (${totalMarks} درجة) تلقائياً`);
                            }}
                            className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700 hover:border-emerald-500 text-emerald-700 dark:text-emerald-300 transition font-bold"
                          >
                            إدراج جميع أسئلة النطاق ({availableQuestions.length} سؤال)
                          </button>
                        </div>

                        {/* Sections List */}
                        <div className="space-y-3 pt-1">
                          {customSections.map((sec, idx) => {
                            const labelName = getArabicQuestionLabel(idx + 1);
                            const isCollapsed =
                              collapsedSections[sec.id] !== false;
                            const availableForType =
                              getAvailableCountForSectionType(sec.questionType);
                            const isCountExceeded =
                              sec.count > availableForType;
                            const hasZeroAvailable =
                              availableForType === 0 &&
                              sec.questionType !== "all";

                            const takenInOtherSections = new Set(
                              customSections
                                .filter(
                                  (s, sIdx) =>
                                    sIdx !== idx &&
                                    s.questionType &&
                                    s.questionType !== "all",
                                )
                                .map((s) => s.questionType),
                            );

                            return (
                              <div
                                key={sec.id}
                                className={`bg-white dark:bg-slate-800/90 border rounded-xl p-3 space-y-2.5 shadow-2xs relative transition-all ${
                                  hasZeroAvailable || isCountExceeded
                                    ? "border-amber-300 dark:border-amber-800/80 ring-1 ring-amber-400/30"
                                    : "border-blue-200/80 dark:border-slate-700"
                                }`}
                              >
                                {/* Section Card Header */}
                                <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-2">
                                  <div
                                    className="flex items-center gap-2 overflow-hidden cursor-pointer select-none flex-1 min-w-0"
                                    onClick={() =>
                                      toggleSectionCollapse(sec.id)
                                    }
                                  >
                                    <span className="font-black text-blue-700 dark:text-blue-400 text-xs px-2 py-0.5 bg-blue-50 dark:bg-blue-900/40 rounded border border-blue-200 dark:border-blue-800 shrink-0">
                                      {labelName}
                                    </span>

                                    {/* Collapsed view summary or Type selector */}
                                    {isCollapsed ? (
                                      <div className="flex items-center gap-2 overflow-hidden text-xs min-w-0 flex-1">
                                        <span
                                          className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[180px] sm:max-w-[280px]"
                                          title={stripHtml(sec.title) || getDefaultWordingForType(sec.questionType)}
                                        >
                                          {stripHtml(sec.title) || getDefaultWordingForType(sec.questionType)}
                                        </span>
                                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 shrink-0 bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded">
                                          {QUESTION_TYPES_LABEL[
                                            sec.questionType
                                          ] || sec.questionType}{" "}
                                          ({sec.count} فقرات •{" "}
                                          {sec.count * sec.markPerQuestion}{" "}
                                          درجات)
                                        </span>
                                        {hasZeroAvailable && (
                                          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0">
                                            <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                            <span>غير متوفر</span>
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <select
                                        value={sec.questionType}
                                        onChange={(e) => {
                                          const newType = e.target.value;
                                          const updated = [...customSections];
                                          updated[idx].questionType = newType;
                                          updated[idx].title =
                                            getDefaultWordingForType(newType);
                                          setCustomSections(updated);
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className={`p-1.5 rounded-lg border font-bold text-[11px] outline-none transition ${
                                          hasZeroAvailable
                                            ? "border-amber-500 bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200"
                                            : "border-slate-300 dark:border-slate-600 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                                        }`}
                                      >
                                        {allSelectableTypes
                                          .map((typeOpt) => {
                                            const countInBank = getAvailableCountForSectionType(typeOpt.key);
                                            const totalCount = getTotalCountInBankForSectionType(typeOpt.key);
                                            return { ...typeOpt, countInBank, totalCount };
                                          })
                                          .filter((opt) => {
                                            if (
                                              opt.key !== "all" &&
                                              takenInOtherSections.has(opt.key) &&
                                              opt.key !== sec.questionType
                                            ) {
                                              return false;
                                            }
                                            return (
                                              opt.key === "all" ||
                                              opt.totalCount > 0 ||
                                              opt.key === sec.questionType
                                            );
                                          })
                                          .map((opt) => (
                                            <option
                                              key={opt.key}
                                              value={opt.key}
                                              className={
                                                opt.countInBank === 0 &&
                                                opt.totalCount === 0
                                                  ? "text-slate-400 dark:text-slate-500"
                                                  : "font-semibold"
                                              }
                                            >
                                              {opt.label} (المتاح: {opt.countInBank} / الكلي: {opt.totalCount})
                                            </option>
                                          ))}
                                      </select>
                                    )}
                                  </div>

                                  {/* Controls on Left Side */}
                                  <div className="flex items-center gap-1 shrink-0">
                                    {idx > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const arr = [...customSections];
                                          const temp = arr[idx];
                                          arr[idx] = arr[idx - 1];
                                          arr[idx - 1] = temp;
                                          setCustomSections(arr);
                                        }}
                                        className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-600 dark:text-slate-300 font-bold text-[10px]"
                                        title="تحريك لأعلى"
                                      >
                                        ▲
                                      </button>
                                    )}
                                    {idx < customSections.length - 1 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const arr = [...customSections];
                                          const temp = arr[idx];
                                          arr[idx] = arr[idx + 1];
                                          arr[idx + 1] = temp;
                                          setCustomSections(arr);
                                        }}
                                        className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-600 dark:text-slate-300 font-bold text-[10px]"
                                        title="تحريك لأسفل"
                                      >
                                        ▼
                                      </button>
                                    )}
                                    {customSections.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newSections =
                                            customSections.filter(
                                              (_, i) => i !== idx,
                                            );
                                          setCustomSections(newSections);
                                        }}
                                        className="px-2 py-0.5 rounded bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 font-bold text-[10px] hover:bg-red-100 transition print:hidden"
                                        title="حذف هذا السؤال الرئيسي"
                                      >
                                        حذف
                                      </button>
                                    )}

                                    {/* Question Card Collapse Toggle on the Left */}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        toggleSectionCollapse(sec.id)
                                      }
                                      className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-[10px] flex items-center gap-1 transition shrink-0 print:hidden"
                                      title={
                                        isCollapsed
                                          ? "توسيع هذا السؤال للتعديل"
                                          : "طي هذا السؤال لتوفير المساحة"
                                      }
                                    >
                                      <span>
                                        {isCollapsed ? "توسيع" : "طي"}
                                      </span>
                                    </button>
                                  </div>
                                </div>

                                {/* Expanded Section Body */}
                                {!isCollapsed && (
                                  <>
                                    {/* Main Wording / Prompt Input with Rich Styling Toolbar */}
                                    <div className="space-y-1.5">
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-200">
                                            صيغة وتوجيه السؤال الرئيسي (
                                            {labelName}):
                                          </label>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const updated = [
                                                ...customSections,
                                              ];
                                              updated[idx].title =
                                                getDefaultWordingForType(
                                                  sec.questionType,
                                                );
                                              setCustomSections(updated);
                                            }}
                                            className="text-[10px] font-bold text-blue-700 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 transition cursor-pointer flex items-center gap-1 shrink-0"
                                            title="استعادة النص التوجيهي الافتراضي المناسب لنوع هذا السؤال"
                                          >
                                            <span>صيغة افتراضية 🔄</span>
                                          </button>
                                        </div>

                                        {/* Formatting Toolbar */}
                                        <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-800/90 p-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
                                          {/* Font Family */}
                                          <select
                                            value={sec.fontFamily || "Cairo"}
                                            onChange={(e) => {
                                              const updated = [
                                                ...customSections,
                                              ];
                                              updated[idx].fontFamily =
                                                e.target.value;
                                              setCustomSections(updated);
                                            }}
                                            className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 outline-none"
                                            title="نوع الخط"
                                          >
                                            <option value="Cairo">
                                              خط كايرو (Cairo)
                                            </option>
                                            <option value="Amiri">
                                              خط أميري (Amiri)
                                            </option>
                                            <option value="Noto Kufi Arabic">
                                              كوفي حديث (Kufi)
                                            </option>
                                            <option value="sans-serif">
                                              خط بسيط (Sans)
                                            </option>
                                          </select>

                                          {/* Font Size */}
                                          <select
                                            value={sec.fontSize || "12pt"}
                                            onChange={(e) => {
                                              const updated = [
                                                ...customSections,
                                              ];
                                              updated[idx].fontSize =
                                                e.target.value;
                                              setCustomSections(updated);
                                            }}
                                            className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 outline-none"
                                            title="حجم الخط"
                                          >
                                            <option value="12pt">
                                              افتراضي (12pt)
                                            </option>
                                            <option value="14pt">
                                              قياسي (14px)
                                            </option>
                                            <option value="16pt">
                                              كبير (16px)
                                            </option>
                                            <option value="18pt">
                                              كبير جداً (18px)
                                            </option>
                                            <option value="20pt">
                                              ضخم (20px)
                                            </option>
                                          </select>

                                          <div className="w-[1px] h-3.5 bg-slate-300 dark:bg-slate-700 mx-0.5" />

                                          {/* Bold */}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const updated = [
                                                ...customSections,
                                              ];
                                              updated[idx].isBold =
                                                sec.isBold === undefined
                                                  ? false
                                                  : !sec.isBold;
                                              setCustomSections(updated);
                                            }}
                                            className={`p-1 rounded font-black text-[11px] transition shrink-0 ${
                                              sec.isBold !== false
                                                ? "bg-blue-600 text-white shadow-2xs"
                                                : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-200"
                                            }`}
                                          >
                                            <Bold className="w-3 h-3" />
                                          </button>

                                          {/* Italic */}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const updated = [
                                                ...customSections,
                                              ];
                                              updated[idx].isItalic =
                                                !sec.isItalic;
                                              setCustomSections(updated);
                                            }}
                                            className={`p-1 rounded transition shrink-0 ${
                                              sec.isItalic
                                                ? "bg-blue-600 text-white shadow-2xs"
                                                : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-200"
                                            }`}
                                            title="خط مائل I"
                                          >
                                            <Italic className="w-3 h-3" />
                                          </button>

                                          {/* Underline */}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const updated = [
                                                ...customSections,
                                              ];
                                              updated[idx].isUnderline =
                                                !sec.isUnderline;
                                              setCustomSections(updated);
                                            }}
                                            className={`p-1 rounded transition shrink-0 ${
                                              sec.isUnderline
                                                ? "bg-blue-600 text-white shadow-2xs"
                                                : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-200"
                                            }`}
                                            title="سطر تحت النص U"
                                          >
                                            <Underline className="w-3 h-3" />
                                          </button>

                                          <div className="w-[1px] h-3.5 bg-slate-300 dark:bg-slate-700 mx-0.5" />

                                          {/* Align Right */}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const updated = [
                                                ...customSections,
                                              ];
                                              updated[idx].textAlign = "right";
                                              setCustomSections(updated);
                                            }}
                                            className={`p-1 rounded transition shrink-0 ${
                                              (sec.textAlign || "right") ===
                                              "right"
                                                ? "bg-blue-600 text-white shadow-2xs"
                                                : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-200"
                                            }`}
                                          >
                                            <AlignRight className="w-3 h-3" />
                                          </button>

                                          {/* Align Center */}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const updated = [
                                                ...customSections,
                                              ];
                                              updated[idx].textAlign = "center";
                                              setCustomSections(updated);
                                            }}
                                            className={`p-1 rounded transition shrink-0 ${
                                              sec.textAlign === "center"
                                                ? "bg-blue-600 text-white shadow-2xs"
                                                : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-200"
                                            }`}
                                          >
                                            <AlignCenter className="w-3 h-3" />
                                          </button>

                                          {/* Align Left */}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const updated = [
                                                ...customSections,
                                              ];
                                              updated[idx].textAlign = "left";
                                              setCustomSections(updated);
                                            }}
                                            className={`p-1 rounded transition shrink-0 ${
                                              sec.textAlign === "left"
                                                ? "bg-blue-600 text-white shadow-2xs"
                                                : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-200"
                                            }`}
                                          >
                                            <AlignLeft className="w-3 h-3" />
                                          </button>

                                          <div className="w-[1px] h-3.5 bg-slate-300 dark:bg-slate-700 mx-0.5" />

                                          {/* Color Picker */}
                                          <div className="flex items-center gap-1 pl-0.5">
                                            <input
                                              type="color"
                                              value={sec.textColor || "#0f172a"}
                                              onChange={(e) => {
                                                const updated = [
                                                  ...customSections,
                                                ];
                                                updated[idx].textColor =
                                                  e.target.value;
                                                setCustomSections(updated);
                                              }}
                                              className="w-5 h-5 rounded cursor-pointer border border-slate-300 dark:border-slate-700 p-0 bg-transparent"
                                              title="لون النص"
                                            />
                                          </div>
                                        </div>
                                      </div>

                                      {/* Main Question Title / Wording Textarea */}
                                      <div className="w-full min-h-[120px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden mt-2">
                                        <RichTextEditor
                                          value={
                                            sec.title !== undefined
                                              ? sec.title
                                              : getDefaultWordingForType(sec.questionType)
                                          }
                                          onChange={(newVal) => {
                                          const updated = [
                                            ...customSections,
                                          ];
                                          updated[idx].title = newVal;
                                          setCustomSections(updated);
                                        }}
                                          placeholder="اكتب صيغة السؤال هنا..."
                                        />
                                      </div>
                                    </div>

                                    {/* Selected Questions List UI */}
                                    {sec.selectedQuestionIds &&
                                      sec.selectedQuestionIds.length > 0 && (
                                        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 max-h-32 overflow-y-auto mb-2 shadow-inner">
                                          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1.5 px-1 font-bold">
                                            <span>
                                              الأسئلة المختارة يدوياً (
                                              {sec.selectedQuestionIds.length}):
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const idsToRemove = sec.selectedQuestionIds || [];
                                                setSelectedQuestionIds((prev) =>
                                                  prev.filter((id) => !idsToRemove.includes(id)),
                                                );
                                                const updated = [
                                                  ...customSections,
                                                ];
                                                updated[
                                                  idx
                                                ].selectedQuestionIds = [];
                                                setCustomSections(updated);
                                              }}
                                              className="text-red-500 hover:text-red-700 transition cursor-pointer"
                                            >
                                              مسح الاختيارات
                                            </button>
                                          </div>
                                          <div className="space-y-1">
                                            {sec.selectedQuestionIds.map(
                                              (qid, subIdx) => {
                                                const qObj = allQuestions.find(
                                                  (q) => q.id === qid,
                                                );
                                                return (
                                                  <div
                                                    key={qid}
                                                    className="flex justify-between items-start gap-2 bg-white dark:bg-slate-800 p-1.5 rounded border border-slate-200 dark:border-slate-700 text-xs shadow-2xs group relative"
                                                  >
                                                    <div className="truncate flex-1 font-semibold text-slate-700 dark:text-slate-300">
                                                      <span className="text-[10px] text-slate-400 font-mono ml-1">
                                                        {subIdx + 1}.
                                                      </span>
                                                      {qObj
                                                        ? qObj.text.length > 40
                                                          ? qObj.text.substring(
                                                              0,
                                                              40,
                                                            ) + "..."
                                                          : qObj.text
                                                        : qid}
                                                    </div>
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        setSelectedQuestionIds((prev) =>
                                                          prev.filter((id) => id !== qid),
                                                        );
                                                        const updated = [
                                                          ...customSections,
                                                        ];
                                                        updated[
                                                          idx
                                                        ].selectedQuestionIds =
                                                          updated[
                                                            idx
                                                          ].selectedQuestionIds?.filter(
                                                            (id) => id !== qid,
                                                          );
                                                        setCustomSections(
                                                          updated,
                                                        );
                                                      }}
                                                      className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition p-0.5 bg-red-50 dark:bg-red-900/40 rounded cursor-pointer"
                                                      title="إزالة السؤال"
                                                    >
                                                      <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                  </div>
                                                );
                                              },
                                            )}
                                          </div>
                                        </div>
                                      )}

                                    {/* Section Action Controls */}
                                    <div className="flex items-center justify-between mt-1">
                                      {selectedMode === "semi" && (
                                        <div className="flex items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setActiveModalSectionId(sec.id)
                                            }
                                            className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-2xs"
                                          >
                                            <CheckSquare className="w-3.5 h-3.5" />
                                            <span>
                                              اختيار أسئلة هذا السؤال (
                                              {sec.selectedQuestionIds
                                                ?.length || 0}{" "}
                                              / {sec.count})
                                            </span>
                                          </button>
                                          <span className="text-[10px] text-slate-500 font-semibold">
                                            نوع المفتاح:{" "}
                                            {sec.questionType === "true_false"
                                              ? "صح/خطأ"
                                              : sec.questionType === "mcq"
                                                ? "اختيارات"
                                                : sec.questionType === "essay"
                                                  ? "مقالي"
                                                  : "متنوع"}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                    {/* Manual Section Question Selector Trigger */}
                                    {selectedMode === "manual" && (
                                      <div className="pt-1 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setActiveModalSectionId(sec.id)
                                          }
                                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-2xs"
                                        >
                                          <CheckSquare className="w-3.5 h-3.5" />
                                          <span>
                                            اختيار أسئلة هذا السؤال (
                                            {sec.selectedQuestionIds?.length ||
                                              0}{" "}
                                            / {sec.count})
                                          </span>
                                        </button>
                                        <span className="text-[10px] text-slate-500 font-semibold">
                                          نوع المفتاح:{" "}
                                          {sec.questionType === "true_false"
                                            ? "صح/خطأ"
                                            : sec.questionType === "mcq"
                                              ? "اختيارات"
                                              : sec.questionType === "essay"
                                                ? "مقالي"
                                                : "متنوع"}
                                        </span>
                                      </div>
                                    )}

                                    {/* Number of Sub-questions & Marks */}
                                    <div className="space-y-1.5">
                                      <div className="grid grid-cols-3 gap-2 text-[11px]">
                                        <div>
                                          <label className="block font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                                            عدد الفقرات:
                                          </label>
                                          <input
                                            type="number"
                                            min={1}
                                            max={availableForType}
                                            value={sec.count}
                                            onChange={(e) => {
                                              const updated = [
                                                ...customSections,
                                              ];
                                              let newVal = Math.max(
                                                1,
                                                Number(e.target.value),
                                              );
                                              if (newVal > availableForType) {
                                                newVal = availableForType;
                                              }
                                              updated[idx].count = Math.max(
                                                1,
                                                newVal,
                                              );
                                              setCustomSections(updated);
                                            }}
                                            className={`w-full p-1.5 rounded-md border font-extrabold outline-none transition ${
                                              isCountExceeded
                                                ? "border-red-500 bg-red-50 dark:bg-red-950/50 text-red-900 dark:text-red-200 focus:ring-2 focus:ring-red-500/20"
                                                : "border-slate-300 dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                                            }`}
                                          />
                                        </div>

                                        <div>
                                          <label className="block font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                                            درجة السؤال:
                                          </label>
                                          <input
                                            type="number"
                                            min={1}
                                            max={500}
                                            value={Math.round(
                                              sec.count * sec.markPerQuestion,
                                            )}
                                            onChange={(e) => {
                                              const updated = [
                                                ...customSections,
                                              ];
                                              const sectionTotal = Math.max(
                                                0,
                                                Number(e.target.value),
                                              );
                                              updated[idx].markPerQuestion =
                                                sectionTotal / (sec.count || 1);
                                              setCustomSections(updated);
                                            }}
                                            className="w-full p-1.5 rounded-md border border-slate-300 dark:border-slate-700 dark:bg-slate-900 font-extrabold text-slate-900 dark:text-slate-100"
                                          />
                                        </div>

                                        <div className="flex flex-col justify-end">
                                          <span className="text-[10px] text-slate-500 font-semibold">
                                            الدرجة للفقرة:
                                          </span>
                                          <span className="font-mono font-black text-blue-700 dark:text-blue-400 text-xs">
                                            {Math.round(
                                              sec.markPerQuestion * 10,
                                            ) / 10}{" "}
                                            درجات
                                          </span>
                                        </div>
                                      </div>

                                      {hasZeroAvailable && (
                                        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-[11px] font-bold shadow-2xs">
                                          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                          <div className="space-y-0.5">
                                            <p className="leading-snug">
                                              ⚠️ عذراً، لا توجد أسئلة من نوع [
                                              {QUESTION_TYPES_LABEL[
                                                sec.questionType
                                              ] || sec.questionType}
                                              ] مسجلة في{" "}
                                              {selectedLessonId !== "all"
                                                ? `الدرس (${currentUnitLessons.find((l) => l.id === selectedLessonId)?.title || "المحدد"})`
                                                : selectedUnitId !== "all"
                                                  ? `الوحدة (${currentSubjectUnits.find((u) => u.id === selectedUnitId)?.title || "المحددة"})`
                                                  : `المادة (${currentSubject?.name || "المحددة"})`}
                                              . يرجى تغيير نوع السؤال أو إضافة
                                              أسئلة للبنك.
                                            </p>
                                          </div>
                                        </div>
                                      )}

                                      {/* Mark Distribution Formula Explanation */}
                                      <div className="p-2 rounded-lg bg-blue-50/90 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-900/60 text-blue-900 dark:text-blue-200 text-[10px] font-bold flex items-center justify-between gap-2">
                                        <span>
                                          💡 يتوزّع إجمالي هذا السؤال (
                                          {Math.round(
                                            sec.count * sec.markPerQuestion,
                                          )}{" "}
                                          درجة) على {sec.count} فقرات بواقع{" "}
                                          <span className="text-emerald-700 dark:text-emerald-400 font-black">
                                            {Math.round(
                                              sec.markPerQuestion * 10,
                                            ) / 10}{" "}
                                            درجات لكل فقرة
                                          </span>{" "}
                                          تلقائياً.
                                        </span>
                                      </div>

                                      {/* Red Count Validation Message */}
                                      {isCountExceeded && (
                                        <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 text-[10px] font-extrabold flex items-center gap-1.5">
                                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-600 dark:text-red-400" />
                                          <span>
                                            ⚠️ العدد المطلوب ({sec.count})
                                            يتجاوز الأسئلة المتاحة. أقصى عدد
                                            متوفر هو ({availableForType}).
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Add New Section Button (Bottom) */}
                        <button
                          type="button"
                          onClick={handleAddSection}
                          className="w-full py-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-300 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-2xs"
                        >
                          <Plus className="w-4 h-4" />
                          <span>
                            إضافة سؤال رئيسي جديد (
                            {getArabicQuestionLabel(customSections.length + 1)})
                          </span>
                        </button>
                      </>
                    )}
                  </div>

                  {/* Manual & Semi-Auto Question Picker Section */}
                  {(selectedMode === "manual" || selectedMode === "semi") && (
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 mt-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-blue-600" />
                          <span className="font-extrabold text-slate-900 dark:text-white text-xs">
                            بنك أسئلة {currentSubject?.name} (
                            {availableQuestions.length} سؤال متاح)
                          </span>
                        </div>

                        {/* Filter toggle: Hide previously used questions */}
                        <label className="flex items-center gap-1.5 cursor-pointer bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
                          <input
                            type="checkbox"
                            checked={hideUsedQuestions}
                            onChange={(e) =>
                              setHideUsedQuestions(e.target.checked)
                            }
                            className="rounded text-blue-600"
                          />
                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            إخفاء الأسئلة المستخدمة سابقاً
                          </span>
                        </label>
                      </div>

                      <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1">
                        {availableQuestions
                          .filter((q) => {
                            const isUsed = Boolean(
                              usedQuestionsMap[q.id]?.length,
                            );
                            if (hideUsedQuestions && isUsed) return false;
                            return true;
                          })
                          .map((q, idx) => {
                            const usageHistory = usedQuestionsMap[q.id];
                            const isUsed = Boolean(
                              usageHistory && usageHistory.length > 0,
                            );
                            const isSelected =
                              selectedQuestionIds.includes(q.id) ||
                              customSections.some((s) =>
                                s.selectedQuestionIds?.includes(q.id),
                              );

                            return (
                              <div
                                key={q.id}
                                onClick={() => {
                                  if (selectedMode === "manual") {
                                    handleToggleManualQuestion(q);
                                  }
                                }}
                                className={`p-3 rounded-xl border transition relative flex flex-col gap-2 ${
                                  selectedMode === "manual" ? "cursor-pointer" : ""
                                } ${
                                  isSelected
                                    ? "bg-blue-50/80 border-blue-400 dark:bg-blue-950/30 dark:border-blue-700 ring-1 ring-blue-400/50"
                                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-start gap-2 flex-1">
                                    {selectedMode === "manual" && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleToggleManualQuestion(q);
                                        }}
                                        className="mt-0.5 text-blue-600 shrink-0 cursor-pointer"
                                      >
                                        {isSelected ? (
                                          <CheckSquare className="w-4 h-4 text-blue-600" />
                                        ) : (
                                          <Square className="w-4 h-4 text-slate-400" />
                                        )}
                                      </button>
                                    )}
                                    <div 
                                      className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-relaxed"
                                      style={{ fontFamily: activeTemplate.typography?.fontFamily || "Cairo" }}
                                    >
                                      <MathText 
                                        text={cleanQuestionTextForRender(q.text || "", "12pt")} 
                                        style={{ fontFamily: activeTemplate.typography?.fontFamily || "Cairo" }}
                                      />
                                    </div>
                                  </div>

                                  {/* Status Badge for Previously Used Questions */}
                                  {isUsed && (
                                    <div className="group relative shrink-0">
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700 cursor-help">
                                        <History className="w-3 h-3 text-amber-600" />
                                        <span>مُستخدم سابقاً</span>
                                      </span>

                                      {/* Tooltip on Hover */}
                                      <div className="absolute left-0 top-6 hidden group-hover:block z-30 w-64 p-2.5 bg-slate-900 text-white text-[11px] rounded-lg shadow-xl border border-slate-700 space-y-1">
                                        <div className="font-bold border-b border-slate-700 pb-1 text-amber-400 flex items-center gap-1">
                                          <History className="w-3 h-3" />
                                          سجل استخدام هذا السؤال:
                                        </div>
                                        {usageHistory?.map((h, hIdx) => (
                                          <div
                                            key={hIdx}
                                            className="text-[10px] text-slate-300"
                                          >
                                            • استُخدم في:{" "}
                                            <span className="text-white font-semibold">
                                              {h.examTitle}
                                            </span>
                                            <br />
                                            &nbsp;&nbsp;التاريخ: {
                                              h.createdAt
                                            }{" "}
                                            {h.isPartialUnit
                                              ? "(اختبار وحدة جزئية)"
                                              : "(اختبار شامل)"}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700/50 pt-1.5">
                                  <span className="font-mono bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                                    النوع:{" "}
                                    {q.type === "mcq"
                                      ? "اختيار من متعدد"
                                      : q.type === "true_false"
                                        ? "صح/خطأ"
                                        : "مقال"}
                                  </span>
                                  <span>درجة الأهمية: {q.importance}/5</span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                      {selectedMode === "manual" && (
                        <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400 text-left">
                          تم تحديد {Array.from(new Set([...selectedQuestionIds, ...customSections.flatMap((s) => s.selectedQuestionIds || [])])).length} من أصل{" "}
                          {totalQuestions} سؤال مطلوب
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {currentStep === 4 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {/* Exclusion Criteria Section (معايير الاستبعاد) */}
                  <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-3.5 space-y-3 transition-all">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 cursor-pointer select-none">
                        <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span className="font-extrabold text-amber-900 dark:text-amber-300 text-xs">
                          معايير الاستبعاد (Exclusion Criteria)
                        </span>

                        {/* Summary Badge when collapsed */}
                        {false && (
                          <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100/90 dark:bg-amber-900/60 px-2 py-0.5 rounded-full mr-2">
                            {filterOnlyApproved ? "المعتمدة فقط" : "كل الحالات"}{" "}
                            •{" "}
                            {excludePreviouslyUsed
                              ? "منع التكرار"
                              : "تكرار مسموح"}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowAlgorithmModal(true)}
                          className="text-[10px] font-bold text-amber-800 dark:text-amber-400 underline hover:text-amber-900 flex items-center gap-1"
                        >
                          <Code className="w-3 h-3" />
                          <span>عرض الخوارزمية (Pseudo-code)</span>
                        </button>

                        <button
                          type="button"

                          className="px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/50 hover:bg-amber-200 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 font-bold text-[10px] flex items-center gap-1 transition"
                        ></button>
                      </div>
                    </div>

                    {true && (
                      <div className="space-y-2 pt-1 border-t border-amber-200/60 dark:border-amber-800/40">
                        <label className="flex items-start gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={filterOnlyApproved}
                            onChange={(e) =>
                              setFilterOnlyApproved(e.target.checked)
                            }
                            className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                          />
                          <div>
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                              استبعاد أسئلة "المسودة" والاقتصار على الأسئلة
                              المعتمدة (Question Status = Approved)
                            </span>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                              يضمن اقتصار العدادات والتوليد على الأسئلة الجاهزة
                              والمعتمدة فقط دون المسودات.
                            </p>
                          </div>
                        </label>

                        <label className="flex items-start gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={excludePreviouslyUsed}
                            onChange={(e) =>
                              setExcludePreviouslyUsed(e.target.checked)
                            }
                            className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                          />
                          <div>
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                              عدم تكرار أسئلة تم استخدامها في نماذج سابقة
                              (Exclusion Logic)
                            </span>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                              تنعكس الأسئلة المستبعدة فوراً على العدادات
                              الديناميكية (NOT IN Excluded IDs).
                            </p>
                          </div>
                        </label>

                        {/* Sub-option: shown if scope is 'all' (جميع الوحدات) */}
                        {selectedUnitId === "all" && excludePreviouslyUsed && (
                          <div className="mr-6 pr-3 border-r-2 border-amber-300 dark:border-amber-700 pt-1">
                            <label className="flex items-start gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={excludePartialUnitExams}
                                onChange={(e) =>
                                  setExcludePartialUnitExams(e.target.checked)
                                }
                                className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                              />
                              <div>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                                  استبعاد الأسئلة التي وردت في اختبارات الوحدات
                                  الجزئية
                                </span>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                  حظر الأسئلة المستعملة في اختيارات دروس أو
                                  وحدات منفردة أيضاً.
                                </p>
                              </div>
                            </label>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {(questionWarnings.missingAnswers > 0 || questionWarnings.duplicateCount > 0) && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl mb-3 flex items-start gap-2.5">
                      <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-red-700 dark:text-red-400 mb-1">
                          تحذيرات قبل توليد الاختبار
                        </h4>
                        <ul className="list-disc list-inside text-xs text-red-600 dark:text-red-300 space-y-1">
                          {questionWarnings.missingAnswers > 0 && (
                            <li>
                              يوجد <strong>{questionWarnings.missingAnswers} سؤال</strong> ضمن النطاق المحدد بدون إجابة مسجلة. (قد يظهر الاختبار بدون نموذج إجابة كامل).
                            </li>
                          )}
                          {questionWarnings.duplicateCount > 0 && (
                            <li>
                              تم رصد <strong>{questionWarnings.duplicateCount} سؤال</strong> يحتمل أن يكون مكرراً في بنك الأسئلة للنطاق المحدد.
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={handleGenerateExam}
                    disabled={isGenerating || !canPerformAction(currentUser, "generate", "exams") || !canAccessSubject(currentUser, selectedSubjectId)}
                    className={`w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 mt-2 ${
                      isGenerating || !canPerformAction(currentUser, "generate", "exams") || !canAccessSubject(currentUser, selectedSubjectId)
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-pointer"
                    }`}
                    title={!canPerformAction(currentUser, "generate", "exams") ? "ليس لديك صلاحية توليد الاختبارات" : undefined}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>
                          جاري حساب الأوزان وتوليد الامتحان بالذكاء الاصطناعي...
                        </span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>توليد ورقة الامتحان الآن</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
            {/* Sticky Bottom Bar */}
          </div>
        }
        bottomBarContent={
          <>
            <button
              type="button"
              onClick={() => {
                if (!canPerformAction(currentUser, "create", "exams")) {
                  showToast("⚠️ ليس لديك صلاحية حفظ المسودات.");
                  return;
                }
                if (!canAccessSubject(currentUser, selectedSubjectId)) {
                  showToast("⚠️ ليس لديك صلاحية الوصول إلى هذه المادة الدراسية.");
                  return;
                }
                showToast("تم حفظ إعدادات النموذج كمسودة بنجاح! 💾");
              }}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              حفظ كمسودة
            </button>
            <div className="flex gap-2">
              {currentStep > 1 && (
                <button
                  onClick={() => setCurrentStep((prev) => prev - 1)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
                >
                  السابق
                </button>
              )}
              {currentStep < 4 ? (
                <button
                  onClick={() => setCurrentStep((prev) => prev + 1)}
                  className="px-6 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-600/20 transition"
                >
                  التالي
                </button>
              ) : (
                <button
                  onClick={handleGenerateExam}
                  disabled={isGenerating || !canPerformAction(currentUser, "generate", "exams") || !canAccessSubject(currentUser, selectedSubjectId)}
                  className={`px-6 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-600/20 transition flex items-center gap-2 ${
                    isGenerating || !canPerformAction(currentUser, "generate", "exams") || !canAccessSubject(currentUser, selectedSubjectId)
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer"
                  }`}
                  title={!canPerformAction(currentUser, "generate", "exams") ? "ليس لديك صلاحية توليد الاختبارات" : undefined}
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  توليد الامتحان
                </button>
              )}
            </div>
          </>
        }
        leftContent={
          <div className="w-full flex flex-col h-full relative">
            
            {generatedExam && generatedExam.versions?.[0]?.questions && (
              <div className="mb-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm shrink-0">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">إحصائيات الاختبار المولد</h3>
                    <p className="text-[10px] text-slate-500">توزيع المستويات وأنماط الأسئلة</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-center">
                    <div className="text-[10px] text-slate-500 mb-1">الأسئلة السهلة</div>
                    <div className="text-lg font-black text-emerald-600">
                      {allQuestions.filter(q => generatedExam.versions[0].questions.some(eq => eq.questionId === q.id) && q.difficulty === 'easy').length}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-center">
                    <div className="text-[10px] text-slate-500 mb-1">متوسطة الصعوبة</div>
                    <div className="text-lg font-black text-amber-500">
                      {allQuestions.filter(q => generatedExam.versions[0].questions.some(eq => eq.questionId === q.id) && q.difficulty === 'medium').length}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-center">
                    <div className="text-[10px] text-slate-500 mb-1">الأسئلة الصعبة</div>
                    <div className="text-lg font-black text-red-500">
                      {allQuestions.filter(q => generatedExam.versions[0].questions.some(eq => eq.questionId === q.id) && q.difficulty === 'hard').length}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-center">
                    <div className="text-[10px] text-slate-500 mb-1">إجمالي العلامات</div>
                    <div className="text-lg font-black text-blue-600">
                      {generatedExam.totalMarks}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs shrink-0">
              <span className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>معاينة ورقة الامتحان المطبوعة (A4)</span>
              </span>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (!canPerformAction(currentUser, "create", "exams") && !canPerformAction(currentUser, "edit", "exams")) {
                      showToast("⚠️ ليس لديك صلاحية حفظ أو تعديل الاختبارات.");
                      return;
                    }
                    if (!canAccessSubject(currentUser, selectedSubjectId)) {
                      showToast("⚠️ ليس لديك صلاحية الوصول إلى هذه المادة الدراسية.");
                      return;
                    }
                    if (generatedExam?.libraryDoc) {
                      const updatedDoc: ExamLibraryDocument = {
                        ...generatedExam.libraryDoc,
                        title: examTitle,
                        durationMinutes: durationMinutes,
                        sections: customSections,
                        versions: generatedExam.versions,
                        totalQuestions: generatedExam.totalQuestions,
                        totalMarks: generatedExam.totalMarks,
                        showStudentBox,
                        showInstructions,
                        instructionsText,
                        showGradingTable,
                        printTemplate: activeTemplate,
                        updatedAt: new Date().toISOString(),
                        createdById: currentUser?.id || generatedExam.libraryDoc.createdById || "usr-teacher-1",
                        createdByName: currentUser?.name || generatedExam.libraryDoc.createdByName || "المعلم",
                      };
                      examLibraryService.saveExamToLibrary(updatedDoc);
                      if (onSaveExam) {
                        onSaveExam({
                          ...generatedExam,
                          title: examTitle,
                          durationMinutes: durationMinutes,
                          libraryDoc: updatedDoc,
                          createdBy: currentUser?.name || generatedExam.createdBy || "المعلم",
                        });
                      }
                      showToast(
                        "تم ترحيل النموذج وحفظه بنجاح في مكتبة النماذج وإعادة ضبط كافة الحقول لبدء إعداد اختبار جديد! 📚✨",
                      );
                      // Reset all form fields and return to initial state
                      resetAllGeneratorFormFields();
                    } else if (
                      customSections.some(
                        (s) => (s.selectedQuestionIds?.length || 0) > 0,
                      ) ||
                      selectedQuestionIds.length > 0
                    ) {
                      // Generate and save directly if user configured sections/questions
                      await handleGenerateExam();
                      showToast(
                        "تم ترحيل النموذج وحفظه بنجاح في مكتبة النماذج وإعادة ضبط كافة الحقول لبدء إعداد اختبار جديد! 📚✨",
                      );
                      resetAllGeneratorFormFields();
                    } else {
                      showToast(
                        "يرجى الضغط على 'توليد ورقة الامتحان' أولاً لتشكل نموذجاً قابلاً للحفظ في المكتبة.",
                      );
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                  title="حفظ النموذج في مكتبة النماذج وتفريغ الصفحة لاختبار جديد"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>حفظ في مكتبة النماذج 📚</span>
                </button>

                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate("exams-library")}
                    className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold hover:bg-blue-100 transition flex items-center gap-1"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>مكتبة الاختبارات</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowAnswerKey(!showAnswerKey)}
                  className="px-3 py-1.5 rounded-lg bg-purple-100 text-purple-900 text-xs font-bold hover:bg-purple-200 transition"
                >
                  {showAnswerKey ? "عرض ورقة الطلاب" : "عرض سلّم التصحيح"}
                </button>

                {generatedExam && (
                  <button
                    type="button"
                    onClick={handleClearExam}
                    className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 dark:bg-red-900/50 dark:text-red-300 border border-red-200 dark:border-red-800 text-xs font-bold hover:bg-red-100 transition flex items-center gap-1 shadow-2xs"
                    title="تفريغ ورقة الاختبار وإعادة التهيئة لتوليد جديد"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>تفريغ وإعادة تهيئة</span>
                  </button>
                )}
              </div>
            </div>

            {/* Zoom Controller */}
            <div className="flex items-center justify-center py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
               <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
                  <button
                    onClick={() => setZoomLevel(Math.max(40, zoomLevel - 10))}
                    className="p-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                    title="تصغير"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 w-9 text-center cursor-pointer hover:text-slate-800 dark:hover:text-slate-100" onClick={() => setZoomLevel(100)} title="إعادة التكبير 100%">
                    {Math.round(zoomLevel)}%
                  </span>
                  <button
                    onClick={() => setZoomLevel(Math.min(200, zoomLevel + 10))}
                    className="p-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                    title="تكبير"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
               </div>
            </div>
            <div className="flex-1 overflow-y-auto w-full pb-8">
              <div className="min-w-[794px] mx-auto origin-top transition-all" style={{ zoom: zoomLevel / 100 }}>
                <PaginatedA4Preview
                  template={previewTemplate}
                  title={examTitle}
                  hierarchyText={scopeHierarchyText}
                  items={examItems}
                />
              </div>
            </div>
          </div>
        }
      />

      {showNewTemplatePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              حفظ كقالب جديد
            </h3>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              أدخل اسم القالب الجديد:
            </label>
            <input
              type="text"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none mb-6"
              autoFocus
            />
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowNewTemplatePrompt(false)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                إلغاء
              </button>
              <button
                onClick={confirmSaveNewTemplate}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-md"
              >
                حفظ القالب
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Manual Section Question Picker */}
      {activeModalSectionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl shadow-2xl max-w-2xl w-full p-5 border border-slate-200 dark:border-slate-800 space-y-4">
            {(() => {
              const sec = customSections.find(
                (s) => s.id === activeModalSectionId,
              );
              if (!sec) return null;

              const secFilteredPool = allQuestions.filter((q) => {
                if (!q) return false;
                const subjectMatch =
                  selectedSubjectId === "all" || !selectedSubjectId || q.subjectId === selectedSubjectId;
                let unitMatch = true;
                if (!isAllUnitsSelected) {
                  unitMatch = !!(q.unitId && selectedUnitIds.includes(q.unitId));
                }
                let lessonMatch = true;
                if (!isAllLessonsSelected) {
                  lessonMatch = !!(
                    (q.lessonId && selectedLessonIds.includes(q.lessonId)) ||
                    (Array.isArray(q.lessonIds) && q.lessonIds.some((lid) => selectedLessonIds.includes(lid)))
                  );
                }
                const isApproved = filterOnlyApproved ? (q.status !== "archived" && !q.isArchived) : true;
                const typeMatch = isQuestionTypeMatch(q, sec.questionType);
                return subjectMatch && unitMatch && lessonMatch && isApproved && typeMatch;
              });

              const currentSelected = sec.selectedQuestionIds || [];

              return (
                <>
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="w-5 h-5 text-blue-600" />
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                        تحديد أسئلة: {sec.questionNumberLabel} ({stripHtml(sec.title)})
                      </h3>
                    </div>
                    <button
                      onClick={() => setActiveModalSectionId(null)}
                      className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 font-bold text-xs"
                    >
                      إغلاق Window
                    </button>
                  </div>

                  <p className="text-xs text-slate-500">
                    مفلتر لنوع الأسئلة:{" "}
                    <span className="font-bold text-blue-600">
                      {QUESTION_TYPES_LABEL[sec.questionType] || sec.questionType}
                    </span>{" "}
                    (تم تحديد {currentSelected.length} أسئلة)
                  </p>

                  <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
                    {secFilteredPool.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs font-bold">
                        لا توجد أسئلة متوفرة من هذا النوع في النطاق التعليمي المحدد.
                      </div>
                    ) : (
                      secFilteredPool.map((q) => {
                        const isChecked = currentSelected.includes(q.id);
                        return (
                          <div
                            key={q.id}
                            onClick={() => {
                              let newIds: string[] = [];
                              if (isChecked) {
                                newIds = currentSelected.filter(
                                  (id) => id !== q.id,
                                );
                                setSelectedQuestionIds((prev) =>
                                  prev.filter((id) => id !== q.id),
                                );
                              } else {
                                newIds = [...currentSelected, q.id];
                                setSelectedQuestionIds((prev) =>
                                  prev.includes(q.id) ? prev : [...prev, q.id],
                                );
                              }
                              const updated = customSections.map((s) =>
                                s.id === sec.id
                                  ? {
                                      ...s,
                                      selectedQuestionIds: newIds,
                                      count: newIds.length > 0 ? newIds.length : s.count,
                                    }
                                  : s,
                              );
                              setCustomSections(updated);
                            }}
                            className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                              isChecked
                                ? "bg-blue-50 border-blue-400 dark:bg-blue-950/40"
                                : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            <div className="mt-0.5 text-blue-600">
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                            <div 
                              className="flex-1 text-xs font-semibold leading-relaxed"
                              style={{ fontFamily: activeTemplate.typography?.fontFamily || "Cairo" }}
                            >
                              <MathText 
                                text={cleanQuestionTextForRender(q.text || "", "12pt")} 
                                style={{ fontFamily: activeTemplate.typography?.fontFamily || "Cairo" }}
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-3">
                    <span className="text-xs font-bold text-blue-600">
                      تم اختيار {currentSelected.length} أسئلة لهذا القسم
                    </span>
                    <button
                      onClick={() => setActiveModalSectionId(null)}
                      className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md cursor-pointer"
                    >
                      تأكيد وحفظ الاختيار
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Pseudo-code Algorithm Modal */}
      {showAlgorithmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 text-slate-100 rounded-2xl shadow-2xl max-w-3xl w-full p-6 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-amber-400 flex items-center gap-2">
                <Code className="w-5 h-5" />
                <span>
                  خوارزمية منع تكرار الأسئلة واستبعاد الأرشيف (Pseudo-code
                  Algorithm)
                </span>
              </h3>
              <button
                onClick={() => setShowAlgorithmModal(false)}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                إغلاق
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              توضيح لمنطق الـ Backend الخاص باستعلام{" "}
              <code className="text-amber-300 font-mono">Exam_Archive</code>{" "}
              وتمرير مصفوفة الاستبعاد{" "}
              <code className="text-amber-300 font-mono">exclude_ids = []</code>
              ، وتوليد النماذج المتعددة (A, B) بمجموعات أسئلة غير متقاطعة:
            </p>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto max-h-[420px] font-mono text-[11px] text-emerald-400 space-y-1 dir-ltr text-left">
              <pre className="whitespace-pre">
                {`/**
 * خوارزمية توليد الامتحان واستبعاد الأسئلة المستعملة سابقاً (EduTech Backend)
 */
async function generateExamWithExclusionCriteria({
  subjectId,
  unitId,
  totalQuestions,
  excludePreviouslyUsed = true,
  excludePartialUnitExams = true,
  generateVersionB = true
}) {
  // 1. الاستعلام عن أرشيف الامتحانات السابقة (Exam_Archive)
  const pastExams = await db.Exam_Archive.find({ subjectId });

  // 2. استخراج مصفوفة معرفات الأسئلة المستعملة سابقاً (exclude_ids)
  const exclude_ids = new Set();

  pastExams.forEach((exam) => {
    const isPartialUnitExam = exam.unitIds && exam.unitIds.length < ALL_UNITS_COUNT;

    if (excludePreviouslyUsed) {
      if (unitId === "all" && !excludePartialUnitExams) {
        if (!isPartialUnitExam) {
          exam.questions.forEach(q => exclude_ids.add(q.questionId));
        }
      } else {
        exam.questions.forEach(q => exclude_ids.add(q.questionId));
      }
    }
  });

  // 3. الاستعلام من قاعدة البيانات واستبعاد exclude_ids
  // SELECT * FROM Questions WHERE subject_id = :subjectId AND id NOT IN (:exclude_ids)
  let availablePool = await db.Questions.find({
    subjectId,
    unitId: unitId !== "all" ? unitId : undefined,
    id: { $nin: Array.from(exclude_ids) }
  });

  // 4. ترتيب وترجيح الأسئلة حسب الوزن ومستويات بلوم
  availablePool.sort((a, b) => b.finalWeightScore - a.finalWeightScore);

  // 5. اختيار أسئلة النموذج (أ)
  const selectedQuestionsA = availablePool.slice(0, totalQuestions);

  // 6. اختيار أسئلة النموذج (ب) من مجموعة غير متقاطعة (Mutually Exclusive Sets)
  let selectedQuestionsB = [];
  if (generateVersionB) {
    const remainingPoolForB = availablePool.filter(
      q => !selectedQuestionsA.some(sq => sq.id === q.id)
    );

    if (remainingPoolForB.length >= totalQuestions) {
      selectedQuestionsB = remainingPoolForB.slice(0, totalQuestions);
    } else {
      selectedQuestionsB = shuffleArray([...selectedQuestionsA]);
    }
  }

  // 7. حفظ وتحديث سجل Exam_Archive
  return await db.Exam_Archive.create({
    subjectId,
    versions: [
      { versionCode: "أ", questions: selectedQuestionsA },
      { versionCode: "ب", questions: selectedQuestionsB }
    ],
    createdAt: new Date().toISOString()
  });
}`}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowAlgorithmModal(false)}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs"
              >
                مفهوم الخوارزمية واضح - إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditTemplatePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              تعديل اسم القالب
            </h3>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              الاسم الجديد:
            </label>
            <input
              type="text"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none mb-6"
              autoFocus
            />
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowEditTemplatePrompt(false)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  if (newTemplateName.trim()) {
                    const updated = {
                      ...activeTemplate,
                      name: newTemplateName.trim(),
                    };
                    storage.savePrintTemplate(updated);
                    setActiveTemplate(updated);
                    setShowEditTemplatePrompt(false);
                    showToast("تم تعديل الاسم بنجاح!");
                  }
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-md"
              >
                حفظ التعديل
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteTemplateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-sm w-full p-6 border border-red-200 dark:border-red-900/30">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/50 rounded-full">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold">تأكيد حذف القالب</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm leading-relaxed">
              هل أنت متأكد من رغبتك في حذف القالب "{activeTemplate.name}"؟ لا
              يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteTemplateConfirm(false)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  storage.deletePrintTemplate(activeTemplate.id);
                  const remaining = storage.getPrintTemplates();
                  setActiveTemplate(
                    remaining.find((t) => t.isDefault) || remaining[0],
                  );
                  setShowDeleteTemplateConfirm(false);
                  showToast("تم حذف القالب بنجاح.");
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition shadow-md"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Exam Confirmation Modal */}
      {showClearExamConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-sm w-full p-6 border border-red-200 dark:border-red-900/30">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/50 rounded-full">
                <RotateCcw className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold">تأكيد تفريغ الاختبار</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm leading-relaxed">
              هل أنت متأكد من رغبتك في تفريغ واجهة الاختبار؟ سيتم مسح الأسئلة
              الحالية من الشاشة للبدء بتوليد جديد، مع الاحتفاظ بالنسخة التي تم توليدها مسبقاً في مكتبة الاختبارات.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={cancelClearExam}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={confirmClearExam}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition shadow-md"
              >
                تأكيد التفريغ
              </button>
            </div>
          </div>
        </div>
      )}

      {showAutoMultiModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 my-auto flex flex-col space-y-5">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">
                    توليد آلي لنماذج متعددة
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    سيتم توزيع الأسئلة المتوفرة بشكل عادل ومنطقي على النماذج دون تكرار.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAutoMultiModal(false);
                  setMultiExamDrafts(null);
                }}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!multiExamDrafts ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    حدد عدد النماذج المطلوبة:
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={multiExamCount}
                    onChange={e => setMultiExamCount(Number(e.target.value))}
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-lg font-black text-center"
                  />
                  <p className="text-xs text-slate-500 mt-2 text-center">
                    سيتم استخدام <strong className="text-indigo-600">{availableQuestions.length}</strong> سؤال متوفر حالياً لتوزيعها على {multiExamCount} نموذج.
                  </p>
                  
                </div>
                <button
                  type="button"
                  onClick={generateAutoMultiDrafts}
                  disabled={isMultiGenerating || availableQuestions.length === 0}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isMultiGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  توليد النماذج الآن
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 text-sm font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  تم إنشاء {multiExamDrafts.length} نماذج بنجاح. يرجى مراجعتها أدناه.
                </div>
                
                <div className="max-h-[40vh] overflow-y-auto space-y-3 pr-2">
                  {multiExamDrafts.map((draft, idx) => (
                    <div key={draft.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                      <h3 className="font-extrabold text-slate-900 dark:text-white mb-2">{draft.title}</h3>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="px-2 py-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 font-bold">
                          الأسئلة: {draft.totalQuestions}
                        </span>
                        <span className="px-2 py-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 font-bold">
                          العلامة الإجمالية: {draft.totalMarks}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setMultiExamDrafts(null)}
                    className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 transition"
                  >
                    تراجع / إعادة التوليد
                  </button>
                  <button
                    type="button"
                    onClick={handleApproveMultiDrafts}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-md transition"
                  >
                    اعتماد النماذج وإرسالها للمكتبة
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {toastMessage && (
        <div className="fixed bottom-4 left-4 z-50 bg-slate-800 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-fade-in-up">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="font-bold text-sm">{toastMessage}</span>
        </div>
      )}
      {/* Print Modal */}
      <PrintPreviewModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title={`${currentSubject?.name || "المادة"} - نموذج اختباري - ${examTitle}`}
        extraToolbarContent={
          <button
            type="button"
            onClick={() => setShowAnswerKey(!showAnswerKey)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              showAnswerKey
                ? "bg-purple-600 hover:bg-purple-700 text-white"
                : "bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 hover:bg-purple-200"
            }`}
          >
            <span>{showAnswerKey ? "عرض ورقة الطلاب 📄" : "عرض سلّم الحل والجواب 🔑"}</span>
          </button>
        }
      >
        <PaginatedA4Preview
          template={previewTemplate}
          title={examTitle}
          hierarchyText={scopeHierarchyText}
          items={examItems}
        />
      </PrintPreviewModal>

      {/* Global AI Execution Center for Exam Copilot */}
      {showExecutionCenterModal && (
        <AIExecutionCenterModal
          isOpen={showExecutionCenterModal}
          onClose={() => setShowExecutionCenterModal(false)}
          taskType="generate_exam"
          taskPayload={{
            title: "توليد ومراجعة هيكل الامتحان (Copilot)",
            subjectName: currentSubject?.name || "المادة",
            previewText: `المادة: ${currentSubject?.name || "عام"} | الوحدات: ${
              currentSubjectUnits
                .filter((u) => isAllUnitsSelected || selectedUnitIds.includes(u.id))
                .map((u) => u.title)
                .join(", ") || "جميع الوحدات المسموحة"
            } | إجمالي الأسئلة: ${totalQuestions}`,
          }}
          onExecute={async (opts) => {
            if (!canPerformAction(currentUser, "generate", "exams") || !canAccessSubject(currentUser, selectedSubjectId)) {
              showToast("⚠️ ليس لديك صلاحية استخدام مساعد الذكاء الاصطناعي على هذه المادة.");
              throw new Error("Unauthorized AI execution on restricted subject or permission");
            }
            const allowedUnitTitles = currentSubjectUnits
              .filter((u) => isAllUnitsSelected || selectedUnitIds.includes(u.id))
              .map((u) => u.title);

            const res = await aiService.generateExamCopilot(
              currentSubject?.name || "المادة",
              allowedUnitTitles.length > 0 ? allowedUnitTitles : ["الوحدة الأولى"],
              totalQuestions,
              totalMarks,
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
            if (res && res.pedagogicalRationale) {
              setToastMessage("تم استلام التوصية التربوية وتحديث معايير التوليد بنجاح.");
              setTimeout(() => setToastMessage(null), 3000);
            }
          }}
        />
      )}
    </>
  );
};
