import { TopBar } from "../../editor/components/TopBar";
import { EditorPanel } from "../../editor/components/EditorPanel";
import { PreviewPanel } from "../../editor/components/PreviewPanel";
import { StatusBar } from "../../editor/components/StatusBar";
import { MediaLibraryPanel } from "../../editor/components/MediaLibraryPanel";
import { SubjectModal } from "../../curriculum/components/SubjectModal";
import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpenCheck,
  Type,
  Palette,
  Printer,
  Download,
  FileCode,
  CheckCircle2,
  Plus,
  Trash2,
  Settings,
  Edit2,
  Sparkles,
  Database,
  ArrowRight,
  Layout,
  Layers,
  ChevronDown,
  ChevronUp,
  GripVertical,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sliders,
  FileText,
  CheckSquare,
  Wand2,
  Home,
  RotateCw,
  AlertTriangle,
} from "lucide-react";
import {
  Lesson,
  Subject,
  Unit,
  Question,
  PrintTemplate,
} from "../../../types/index";
import { storage } from "../../../services/storage";
import { A4PaperPreview } from "../../../components/A4PaperPreview";
import { PaginatedA4Preview } from "../../../components/PaginatedA4Preview";
import { MathText, formatPastedEquation } from "../../../components/MathText";
import { QuestionTextBuilder } from "../../questions/components/QuestionTextBuilder";
import { SplitWorkspaceLayout } from "../../../components/SplitWorkspaceLayout";
import { canPerformAction, canAccessSubject, filterAllowedSubjects } from "../../../services/rbacEngine";
import { ShieldAlert } from "lucide-react";

const QUESTION_TYPES_LABEL: Record<string, string> = {
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

interface LessonEditorViewProps {
  initialView?: "outline" | "preview";
  lessonId?: string;
  lessons: Lesson[];
  subjects: Subject[];
  units: Unit[];
  questions: Question[];
  printTemplates: PrintTemplate[];
  onSaveLesson: (lesson: Lesson) => void;
  onSaveUnit?: (unit: Unit) => void;
  onDeleteUnit?: (unitId: string) => void;
  onDeleteLesson?: (lessonId: string) => void;
  onSaveSubject?: (subject: Subject) => void;
  onDeleteSubject?: (subjectId: string) => void;
  onToggleTheme?: () => void;
  onBack: () => void;
  onChangeLesson?: (lessonId: string) => void;
}

export const LessonEditorView: React.FC<LessonEditorViewProps> = ({
  lessonId,
  initialView = "outline",
  lessons,
  subjects,
  units,
  questions,
  printTemplates,
  onSaveLesson,
  onSaveUnit,
  onDeleteUnit,
  onDeleteLesson,
  onSaveSubject,
  onDeleteSubject,
  onToggleTheme,
  onBack,
  onChangeLesson,
}) => {
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  // Enter this workspace through an explicit curriculum lesson. Falling back to
  // the first lesson could silently write the teacher's content into the wrong record.
  const currentLesson = lessonId
    ? lessons.find((l) => l && l.id === lessonId)
    : undefined;
  const currentSubject =
    subjects.find((s) => s && s.id === currentLesson?.subjectId);
  const currentUnit =
    units.find((u) => u && u.id === currentLesson?.unitId);

  const currentUser = useMemo(() => storage.getCurrentUser(), []);
  
  const isSubjectAllowed = useMemo(() => {
    if (!currentUser) return true;
    return currentSubject ? canAccessSubject(currentUser, currentSubject.id) : true;
  }, [currentUser, currentSubject]);

  const canEditLesson = useMemo(() => {
    if (!currentUser) return true;
    return canPerformAction(currentUser, "edit", "lessons") && isSubjectAllowed;
  }, [currentUser, isSubjectAllowed]);

  const canCreateLesson = useMemo(() => {
    if (!currentUser) return true;
    return canPerformAction(currentUser, "create", "lessons") && isSubjectAllowed;
  }, [currentUser, isSubjectAllowed]);

  const canDeleteLesson = useMemo(() => {
    if (!currentUser) return true;
    return canPerformAction(currentUser, "delete", "lessons") && isSubjectAllowed;
  }, [currentUser, isSubjectAllowed]);

  const canCreateCurriculum = useMemo(() => {
    if (!currentUser) return true;
    return canPerformAction(currentUser, "create", "curriculum") && isSubjectAllowed;
  }, [currentUser, isSubjectAllowed]);

  const canEditCurriculum = useMemo(() => {
    if (!currentUser) return true;
    return canPerformAction(currentUser, "edit", "curriculum") && isSubjectAllowed;
  }, [currentUser, isSubjectAllowed]);

  const canDeleteCurriculum = useMemo(() => {
    if (!currentUser) return true;
    return canPerformAction(currentUser, "delete", "curriculum") && isSubjectAllowed;
  }, [currentUser, isSubjectAllowed]);

  const allowedSubjects = useMemo(
    () => filterAllowedSubjects(currentUser, subjects),
    [currentUser, subjects]
  );

  const [selectedSubjectId, setSelectedSubjectId] = useState(
    currentSubject?.id || "",
  );
  const [selectedUnitId, setSelectedUnitId] = useState(currentUnit?.id || "");
  const [selectedLessonId, setSelectedLessonId] = useState(
    currentLesson?.id || "",
  );

  React.useEffect(() => {
    if (currentLesson) {
      setSelectedLessonId(currentLesson.id);
      setSelectedUnitId(currentLesson.unitId);
      const u = units.find((unit) => unit && unit.id === currentLesson.unitId);
      if (u) {
        setSelectedSubjectId(u.subjectId);
      }
    }
  }, [currentLesson, units]);

  const [activeTemplate, setActiveTemplate] = useState<PrintTemplate>(
    (currentLesson?.defaultTemplateId
      ? printTemplates.find((t) => t.id === currentLesson.defaultTemplateId)
      : null) ||
      printTemplates.find((t) => t.isDefault && t.type === "lesson") ||
      printTemplates[0] || {
        id: "tmpl-def",
        name: "قالب A4 قياسي",
        type: "lesson",
        orientation: "portrait",
        marginsCm: { top: 2, bottom: 2, left: 1.5, right: 1.5 },
        headerContent: {
          schoolName: "مدارس إديوتيك النموذجية",
          showHijriDate: true,
          showGregorianDate: true,
          subjectName: currentSubject?.name || "المادة الدراسية",
        },
        footerContent: {
          teacherName: "إعداد قسم المناهج والتأليف",
          showPageNumber: true,
          copyrightNotice: "نظام إديوتيك © 2026",
        },
        isDefault: true,
      },
  );

  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(() => {
    if (!currentLesson?.updatedAt) return null;
    const parsed = new Date(currentLesson.updatedAt);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  });
  const [editorZoom, setEditorZoom] = useState(1);
  const [paragraphs, setParagraphs] = useState<
    {
      id: string;
      title: string;
      body: string;
      type: string;
      style?: any;
    }[]
  >(currentLesson?.contentParagraphs || []);

  // Sync paragraphs, questions, header content, and status whenever selected lesson or curriculum changes
  React.useEffect(() => {
    if (currentLesson) {
      setParagraphs(currentLesson.contentParagraphs || []);
      setDebouncedParagraphs(currentLesson.contentParagraphs || []);
      if (currentLesson.questionIds) {
        setSelectedQuestionIds(currentLesson.questionIds);
      }
      setStatus((currentLesson.status as any) || "draft");
      setIsDirty(false);
      setSaveError(null);
      const parsedUpdatedAt = currentLesson.updatedAt
        ? new Date(currentLesson.updatedAt)
        : null;
      setLastSavedAt(
        parsedUpdatedAt && !Number.isNaN(parsedUpdatedAt.getTime())
          ? parsedUpdatedAt
          : null,
      );
    }
  }, [currentLesson?.id]);

  // Automatically keep header texts matched with the curriculum tree
  React.useEffect(() => {
    if (currentSubject || currentUnit || currentLesson) {
      setActiveTemplate((prev) => ({
        ...prev,
        headerContent: {
          ...prev.headerContent,
          rightText: currentSubject?.name || prev.headerContent.rightText || "",
          centerText: currentUnit?.title || prev.headerContent.centerText || "",
          leftText: currentLesson?.title || prev.headerContent.leftText || "",
          subjectName: currentSubject?.name || prev.headerContent.subjectName || "",
        },
      }));
    }
  }, [currentLesson?.id, currentLesson?.title, currentUnit?.id, currentUnit?.title, currentSubject?.id, currentSubject?.name]);

  const [debouncedParagraphs, setDebouncedParagraphs] = useState(paragraphs);
  
  React.useEffect(() => {
    // If structural changes occurred (card added, removed, reordered, or type changed), update instantly
    const isStructuralChange = 
      paragraphs.length !== debouncedParagraphs.length ||
      paragraphs.some((p, i) => !debouncedParagraphs[i] || p.id !== debouncedParagraphs[i].id || p.type !== debouncedParagraphs[i].type);

    if (isStructuralChange) {
      setDebouncedParagraphs(paragraphs);
      return;
    }

    const timer = setTimeout(() => {
      setDebouncedParagraphs(paragraphs);
    }, 300);
    return () => clearTimeout(timer);
  }, [paragraphs]);

  // Selected questions attached to this lesson
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>(
    currentLesson?.questionIds || []
  );

  // Grouping Engine Configuration (Persisted per lesson)
  const [groupingEnabled, setGroupingEnabled] = useState<boolean>(() => {
    return currentLesson?.groupingEnabled !== undefined ? currentLesson.groupingEnabled : true;
  });
  const [groupingColumns, setGroupingColumns] = useState<any>(() => {
    return currentLesson?.groupingColumns || "auto";
  });
  const [groupingNumberingStyle, setGroupingNumberingStyle] = useState<any>(() => {
    return currentLesson?.groupingNumberingStyle || "paren-num";
  });
  const [groupingDensity, setGroupingDensity] = useState<any>(() => {
    return currentLesson?.groupingDensity || "compact";
  });

  React.useEffect(() => {
    if (currentLesson) {
      setGroupingEnabled(currentLesson.groupingEnabled !== undefined ? currentLesson.groupingEnabled : true);
      setGroupingColumns(currentLesson.groupingColumns || "auto");
      setGroupingNumberingStyle(currentLesson.groupingNumberingStyle || "paren-num");
      setGroupingDensity(currentLesson.groupingDensity || "compact");
    }
  }, [currentLesson?.id, currentLesson?.groupingEnabled, currentLesson?.groupingColumns, currentLesson?.groupingNumberingStyle, currentLesson?.groupingDensity]);

  // Synchronize selectedQuestionIds with question cards present in paragraphs
  React.useEffect(() => {
    const qIdsInParagraphs = new Set<string>();
    paragraphs.forEach((p) => {
      if (p.type === "questions" && p.body) {
        try {
          if (p.body.startsWith("[") || p.body.startsWith("{")) {
            const parsed = JSON.parse(p.body);
            const list = Array.isArray(parsed) ? parsed : [parsed];
            list.forEach((q: any) => { if (q && q.id) qIdsInParagraphs.add(q.id); });
          }
        } catch (e) {}
      }
    });

    const currentArray = Array.from(qIdsInParagraphs);
    setSelectedQuestionIds((prev) => {
      if (prev.length === currentArray.length && prev.every((id, idx) => id === currentArray[idx])) {
        return prev;
      }
      return currentArray;
    });
  }, [paragraphs]);

  const [toastMessage, setToastMessage] = useState("");
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  // Curriculum Tree Actions
  const handleAddUnit = () => {
    if (!canCreateCurriculum) {
      showToast("لا تملك صلاحية إنشاء وحدات دراسية");
      return;
    }
    const sId = currentSubject?.id;
    if (!sId) {
      alert("يرجى تحديد مادة دراسية أولاً.");
      return;
    }
    const subjectUnits = units.filter((u) => u && u.subjectId === sId);
    const newUnit: Unit = {
      id: "unit-" + Date.now(),
      subjectId: sId,
      code: `U${subjectUnits.length + 1}`,
      title: `الوحدة الجديدة ${subjectUnits.length + 1}`,
      description: "",
      orderIndex: units.length + 1,
      status: "active",
    };
    if (onSaveUnit) {
      onSaveUnit(newUnit);
    } else {
      storage.saveUnit(newUnit);
    }
    showToast("تمت إضافة وحدة جديدة إلى المنهج");
  };

  const handleAddLesson = (unitId: string) => {
    if (!canCreateLesson) {
      showToast("لا تملك صلاحية إنشاء دروس جديدة");
      return;
    }
    const targetUnitId = unitId || selectedUnitId || currentUnit?.id;
    const sId = currentSubject?.id;
    if (!targetUnitId || !sId) {
      alert("يرجى تحديد المادة والوحدة الدراسية أولاً.");
      return;
    }
    const unitLessons = lessons.filter((l) => l.unitId === targetUnitId);
    const newLesson: Lesson = {
      id: "les-" + Date.now(),
      unitId: targetUnitId,
      subjectId: sId,
      title: `درس جديد ${unitLessons.length + 1}`,
      orderIndex: unitLessons.length + 1,
      durationMinutes: 45,
      objectives: ["أهداف الدرس الجديدة"],
      contentParagraphs: [],
      status: "draft",
    };
    onSaveLesson(newLesson);
    if (onChangeLesson) onChangeLesson(newLesson.id);
    showToast("تمت إضافة درس جديد وتحديده");
  };

  const handleRenameUnit = (unitId: string, newTitle: string) => {
    if (!canEditCurriculum) {
      showToast("لا تملك صلاحية تعديل الوحدات الدراسية");
      return;
    }
    const targetUnit = units.find((u) => u.id === unitId);
    if (!targetUnit) return;
    const updatedUnit: Unit = { ...targetUnit, title: newTitle };
    if (onSaveUnit) {
      onSaveUnit(updatedUnit);
    } else {
      storage.saveUnit(updatedUnit);
    }
    showToast("تم تعديل اسم الوحدة بنجاح");
  };

  const handleDeleteUnit = (unitId: string) => {
    if (!canDeleteCurriculum) {
      showToast("لا تملك صلاحية حذف الوحدات الدراسية");
      return;
    }
    if (onDeleteUnit) {
      onDeleteUnit(unitId);
    } else {
      storage.deleteUnit(unitId);
    }
    showToast("تم حذف الوحدة بنجاح");
  };

  const handleRenameLesson = (lessonId: string, newTitle: string) => {
    if (!canEditLesson) {
      showToast("لا تملك صلاحية تعديل هذا الدرس");
      return;
    }
    const targetLesson = lessons.find((l) => l.id === lessonId);
    if (!targetLesson) return;
    const updatedLesson: Lesson = { ...targetLesson, title: newTitle };
    onSaveLesson(updatedLesson);
    showToast("تم تعديل اسم الدرس بنجاح");
  };

  const handleDuplicateLesson = (lessonId: string) => {
    if (!canCreateLesson) {
      showToast("لا تملك صلاحية تكرار وإنشاء الدروس");
      return;
    }
    const targetLesson = lessons.find((l) => l.id === lessonId);
    if (!targetLesson) return;
    const duplicateLesson: Lesson = {
      ...targetLesson,
      id: "les-" + Date.now(),
      title: `${targetLesson.title} (نسخة)`,
      contentParagraphs: JSON.parse(JSON.stringify(targetLesson.contentParagraphs || [])),
    };
    onSaveLesson(duplicateLesson);
    if (onChangeLesson) onChangeLesson(duplicateLesson.id);
    showToast("تم تكرار الدرس بنجاح");
  };

  const handleDeleteLessonHandler = (lessonId: string) => {
    if (!canDeleteLesson) {
      showToast("لا تملك صلاحية حذف هذا الدرس");
      return;
    }
    if (onDeleteLesson) {
      onDeleteLesson(lessonId);
    } else {
      storage.deleteLesson(lessonId);
    }
    const remaining = lessons.filter((l) => l.id !== lessonId);
    if (remaining.length > 0 && onChangeLesson) {
      onChangeLesson(remaining[0].id);
    }
    showToast("تم حذف الدرس بنجاح");
  };

  const handleMoveLesson = (lessonId: string, targetUnitId?: string, direction?: "up" | "down") => {
    if (!canEditLesson) {
      showToast("لا تملك صلاحية نقل أو إعادة ترتيب الدروس");
      return;
    }
    const targetLesson = lessons.find((l) => l.id === lessonId);
    if (!targetLesson) return;

    if (direction) {
      const unitLessons = lessons
        .filter((l) => l.unitId === targetLesson.unitId)
        .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
      const currIdx = unitLessons.findIndex((l) => l.id === lessonId);
      if (currIdx === -1) return;
      const swapIdx = direction === "up" ? currIdx - 1 : currIdx + 1;
      if (swapIdx >= 0 && swapIdx < unitLessons.length) {
        const otherLesson = unitLessons[swapIdx];
        const tempOrder = targetLesson.orderIndex || currIdx + 1;
        const otherOrder = otherLesson.orderIndex || swapIdx + 1;
        onSaveLesson({ ...targetLesson, orderIndex: otherOrder });
        onSaveLesson({ ...otherLesson, orderIndex: tempOrder });
        showToast(direction === "up" ? "تم تحريك الدرس للأعلى" : "تم تحريك الدرس للأسفل");
      }
    } else if (targetUnitId && targetUnitId !== targetLesson.unitId) {
      const updatedLesson: Lesson = { ...targetLesson, unitId: targetUnitId };
      onSaveLesson(updatedLesson);
      showToast("تم نقل الدرس إلى الوحدة الجديدة بنجاح");
    }
  };
  const [showNewTemplatePrompt, setShowNewTemplatePrompt] = useState(false);
  const [showEditTemplatePrompt, setShowEditTemplatePrompt] = useState(false);
  const [showDeleteTemplateConfirm, setShowDeleteTemplateConfirm] =
    useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");

  const [status, setStatus] = useState<"draft" | "review" | "approved">(
    (currentLesson?.status as "draft" | "review" | "approved") || "draft",
  );

  const attachedQuestions = selectedQuestionIds
    .map((id) => questions.find((q) => q.id === id))
    .filter(Boolean) as Question[];

  // Add new custom paragraph
  const addParagraph = () => {
    if (!canEditLesson) {
      showToast("عفواً، لا تملك صلاحية تحرير هذا الدرس (وضع القراءة فقط)");
      return;
    }
    const newP = {
      id: "p-" + Date.now(),
      title: `فقرة جديدة رقم ${paragraphs.length + 1}`,
      body: "اكتب المحتوى العلمي أو التوضيحي هنا...",
      type: "concept",
    };
    setParagraphs([...paragraphs, newP]);
  };

  const removeParagraph = (id: string) => {
    if (!canEditLesson) {
      showToast("عفواً، لا تملك صلاحية تحرير هذا الدرس (وضع القراءة فقط)");
      return;
    }
    const target = paragraphs.find((p) => p.id === id);
    if (target && target.type === "questions") {
      try {
        if (target.body && (target.body.startsWith("[") || target.body.startsWith("{"))) {
          const parsed = JSON.parse(target.body);
          const qList = Array.isArray(parsed) ? parsed : [parsed];
          const removedQIds = new Set(qList.map((q: any) => q && q.id).filter(Boolean));
          if (removedQIds.size > 0) {
            setSelectedQuestionIds((prev) => prev.filter((qId) => !removedQIds.has(qId)));
          }
        }
      } catch (e) {}
    }
    const updated = paragraphs.filter((p) => p.id !== id);
    setParagraphs(updated);
    setDebouncedParagraphs(updated);
  };

  const handleAddQuestion = React.useCallback(() => setIsAddingQuestion(true), []);
  const handleRemoveQuestion = React.useCallback((id: string) => {
    setSelectedQuestionIds((prev) => prev.filter((qId) => qId !== id));
  }, []);
  const latestDataRef = React.useRef({
    currentLesson,
    status,
    paragraphs,
    selectedQuestionIds,
    activeTemplate,
    groupingEnabled,
    groupingColumns,
    groupingNumberingStyle,
    groupingDensity,
  });
  React.useEffect(() => {
    latestDataRef.current = {
      currentLesson,
      status,
      paragraphs,
      selectedQuestionIds,
      activeTemplate,
      groupingEnabled,
      groupingColumns,
      groupingNumberingStyle,
      groupingDensity,
    };
  }, [
    currentLesson,
    status,
    paragraphs,
    selectedQuestionIds,
    activeTemplate,
    groupingEnabled,
    groupingColumns,
    groupingNumberingStyle,
    groupingDensity,
  ]);

  const saveInFlightRef = React.useRef<Promise<boolean> | null>(null);

  const handleSave = React.useCallback(async (skipToast?: boolean): Promise<boolean> => {
    if (saveInFlightRef.current) return saveInFlightRef.current;
    const data = latestDataRef.current;
    if (!data.currentLesson) return false;
    if (!canEditLesson) {
      showToast("عفواً، لا تملك صلاحية تحرير هذا الدرس (وضع القراءة فقط)");
      return false;
    }

    const saveTask = (async () => {
      // Yield once so the in-flight promise is registered before persistence
      // begins; repeated clicks then await the same transaction.
      await Promise.resolve();
      setIsSaving(true);
      setSaveError(null);
      try {
        // Also save the active template so unsaved template tweaks are kept
        storage.savePrintTemplate(data.activeTemplate);

        const savedAt = new Date();
        const updated: Lesson = {
          ...data.currentLesson,
          status: data.status,
          contentParagraphs: data.paragraphs,
          questionIds: data.selectedQuestionIds,
          defaultTemplateId: data.activeTemplate.id,
          groupingEnabled: data.groupingEnabled,
          groupingColumns: data.groupingColumns,
          groupingNumberingStyle: data.groupingNumberingStyle,
          groupingDensity: data.groupingDensity,
          updatedAt: savedAt.toISOString(),
        };
        storage.saveLessonNormalized(updated, data.paragraphs);
        onSaveLesson(updated);
        setLastSavedAt(savedAt);
        setIsDirty(false);
        if (!skipToast) {
          showToast("تم حفظ تغييرات الدرس بنجاح!");
        }
        return true;
      } catch (error) {
        console.error("[LessonEditor] Failed to save lesson", error);
        setSaveError("تعذر حفظ تغييرات الدرس");
        showToast("تعذر الحفظ. بقيت التغييرات في شاشة التحرير، أعد المحاولة.");
        return false;
      } finally {
        setIsSaving(false);
        saveInFlightRef.current = null;
      }
    })();

    saveInFlightRef.current = saveTask;
    return saveTask;
  }, [onSaveLesson, canEditLesson]);
  
  const filteredUnits = React.useMemo(
    () => units.filter((u) => u && u.subjectId === currentSubject?.id),
    [units, currentSubject?.id]
  );
  
  const handleSelectLesson = React.useCallback(
    (id: string) => {
      if (onChangeLesson) onChangeLesson(id);
    },
    [onChangeLesson]
  );
  
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (isDirty && paragraphs.length > 0) {
        handleSave();
      }
    }, 10000);
    return () => clearTimeout(timer);
  }, [paragraphs, selectedQuestionIds, isDirty, handleSave]);

  const handleSaveTemplateAsDefault = () => {
    storage.savePrintTemplate({
      ...activeTemplate,
      id: "tmpl-def",
      name: "القالب الافتراضي",
    });
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
      storage.savePrintTemplate(newTmpl);
      setActiveTemplate(newTmpl);
      setShowNewTemplatePrompt(false);
      showToast("تم حفظ القالب بنجاح!");
    }
  };

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<
    "margins" | "headerFooter" | "spacing" | "watermark" | "sideText"
  >("margins");

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

  const resetTemplateSettings = () => {
    const defaultTmpl = storage
      .getPrintTemplates()
      .find((t) => t.id === "tmpl-def");
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
        fontFamily: "Cairo",
        baseFontSize: 12,
        headingSize: 22,
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
  // Transient UI Session States always reset to Standard View defaults on fresh open/refresh
  const [cardsZoomLevel, setCardsZoomLevel] = useState(100);
  const [previewZoomLevel, setPreviewZoomLevel] = useState(100);
  const [showExitModal, setShowExitModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(initialView === "preview");
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState<
    "content" | "page_setup"
  >("content");

  // Preview is opened only as a full document window.
  const [isPreviewCollapsed, setIsPreviewCollapsed] = useState(initialView !== "preview");

  // Drag and Drop for paragraphs
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [stylingParagraphId, setStylingParagraphId] = useState<string | null>(
    null,
  );
  const [isQuestionsCollapsed, setIsQuestionsCollapsed] = useState(false);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [draggedQuestionIdx, setDraggedQuestionIdx] = useState<number | null>(
    null,
  );
  const [collapsedParagraphIds, setCollapsedParagraphIds] = useState<
    Set<string>
  >(
    () =>
      new Set(
        (currentLesson?.contentParagraphs || []).map(
          (p) => p.id,
        ),
      ),
  );

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = "move";
    // For firefox
    e.dataTransfer.setData("text/html", e.currentTarget.parentNode as any);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === index) return;

    const next = [...paragraphs];
    const draggedItem = next[draggedIdx];
    next.splice(draggedIdx, 1);
    next.splice(index, 0, draggedItem);

    setDraggedIdx(index);
    setParagraphs(next);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
  };

  const handleBack = React.useCallback(() => {
    if (isDirty) {
      setShowExitModal(true);
    } else {
      onBack();
    }
  }, [isDirty, onBack]);

  const prepareDocumentOutput = React.useCallback(async (): Promise<boolean> => {
    // Flush the editor debounce before opening preview/export. The output must
    // always reflect the exact text currently visible to the teacher.
    setDebouncedParagraphs(latestDataRef.current.paragraphs);
    if (!isDirty) return true;
    return handleSave(true);
  }, [handleSave, isDirty]);

  const handlePreviewFullscreen = React.useCallback(async () => {
    if (isFullscreen) {
      setIsFullscreen(false);
      setIsPreviewCollapsed(true);
      return;
    }
    if (!(await prepareDocumentOutput())) return;
    setIsFullscreen(true);
    setIsPreviewCollapsed(false);
  }, [isFullscreen, prepareDocumentOutput]);

  const handlePrint = React.useCallback(async () => {
    if (!(await prepareDocumentOutput())) return;
    setIsPrintModalOpen(true);
  }, [prepareDocumentOutput]);

  const handleExportPdf = handlePrint;
  const handleExportWord = handlePrint;
  const handleImportWord = React.useCallback(() => {
    showToast("افتح البطاقة ثم اختر «إدراج محتوى» لاستيراد Word أو PDF أو HTML أو TXT");
  }, []);

  const { wordCount, charCount } = React.useMemo(() => {
    let wCount = 0;
    let cCount = 0;
    paragraphs.forEach(p => {
      const text = p.body || "";
      wCount += text.split(/\s+/).filter(Boolean).length;
      cCount += text.length;
    });
    return { wordCount: wCount, charCount: cCount };
  }, [paragraphs]);

  const pageCount = React.useMemo(() => Math.max(1, Math.ceil(paragraphs.length / 3)), [paragraphs.length]);
  const lastSavedLabel = React.useMemo(
    () =>
      lastSavedAt
        ? lastSavedAt.toLocaleTimeString("ar-EG", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "لم يُحفظ بعد",
    [lastSavedAt],
  );

  React.useEffect(() => {
    if (isDirty && saveError) setSaveError(null);
  }, [isDirty, saveError]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        handlePrint();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        if (!canEditLesson) {
          showToast("عفواً، لا تملك صلاحية تحرير هذا الدرس");
          return;
        }
        showToast("إضافة بطاقة جديدة");
        const newId = "p-" + Date.now();
        setParagraphs(prev => [...prev, {
          id: newId,
          title: "عنوان جديد",
          type: "title",
          body: ""
        }]);
        setIsDirty(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrint, handleSave, canEditLesson]);

  if (!currentLesson || !currentSubject || !currentUnit) {
    return (
      <div className="flex min-h-[420px] h-full flex-col items-center justify-center bg-slate-50 p-8 text-center dark:bg-slate-900" dir="rtl">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 shadow-sm dark:bg-blue-950/50 dark:text-blue-300">
          <BookOpenCheck className="h-8 w-8" />
        </div>
        <h2 className="mb-2 text-xl font-extrabold text-slate-800 dark:text-slate-100">
          اختر درسًا من مستكشف المناهج
        </h2>
        <p className="mb-6 max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          تعذّر العثور على مسار المادة والوحدة والدرس المطلوب. لم يتم فتح أي محتوى بديل حفاظًا على سلامة البيانات.
        </p>
        <button type="button" onClick={onBack} className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-blue-700">
          <ArrowRight className="h-4 w-4" />
          العودة إلى مستكشف المناهج
        </button>
      </div>
    );
  }

  if (!isSubjectAllowed) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8 text-center bg-slate-50 dark:bg-slate-900" dir="rtl">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4 shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mb-2">
          غير مصرح بالوصول إلى هذا الدرس
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
          عفواً، لا يملك حسابك الحالي صلاحية الوصول إلى مادة ({currentSubject?.name || "المحددة"}). يرجى مراجعة مسؤول النظام أو العودة للمواد المصرح بها.
        </p>
        <button
          onClick={onBack}
          className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة إلى شجرة المنهاج</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 w-full overflow-hidden relative"
      dir="rtl"
    >
      {toastMessage && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-5">
          <span className="font-bold text-sm">{toastMessage}</span>
        </div>
      )}

      {/* Top Bar */}
      <TopBar
        isSaving={isSaving}
        isDirty={isDirty}
        saveError={saveError}
        onBack={handleBack}
        subjectName={currentSubject?.name || ""}
        unitName={currentUnit?.title || ""}
        lessonName={currentLesson?.title || ""}
        status={status}
        onChangeStatus={canEditLesson ? (newStatus) => {
          setStatus(newStatus);
          setIsDirty(true);
        } : undefined}
        lastSaved={lastSavedLabel}
        onSave={canEditLesson ? () => handleSave() : undefined}
        onPreview={handlePreviewFullscreen}
        onPrint={handlePrint}
        onExportPdf={handleExportPdf}
        onExportWord={handleExportWord}
        onImportWord={handleImportWord}
        onToggleMediaLibrary={() => setIsMediaLibraryOpen(!isMediaLibraryOpen)}
        isMediaLibraryOpen={isMediaLibraryOpen}
        onOpenAiSettings={() => {
          const event = new CustomEvent("open-ai-content-assistant");
          window.dispatchEvent(event);
        }}
        onToggleTheme={() => {
          if (onToggleTheme) {
            onToggleTheme();
          } else {
            const currentSettings = storage.getSettings();
            const nextMode = currentSettings.themeMode === "dark" ? "light" : "dark";
            const nextPreset = nextMode === "dark" ? "dark" : "light";
            const updated = {
              ...currentSettings,
              themeMode: nextMode as any,
              themePreset: nextPreset as any,
              syncWithOs: false,
            };
            storage.saveSettings(updated);
          }
        }}
        onOpenSettings={() => setActiveMainTab("page_setup")}
        onLogout={() => setShowExitModal(true)}
      />

      {/* Read-only Alert Banner */}
      {!canEditLesson && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between text-xs font-bold text-amber-800 dark:text-amber-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>وضع القراءة والعرض فقط — لا تملك صلاحية تعديل هذا الدرس أو المادة التابعة له.</span>
          </div>
          <button
            onClick={handleBack}
            className="text-[11px] underline hover:text-amber-900 dark:hover:text-amber-200 cursor-pointer"
          >
            العودة للمنهاج
          </button>
        </div>
      )}

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Editor / Page Setup Panel */}
        {(
          <div hidden={isFullscreen} style={isFullscreen ? { display: "none" } : undefined} className="relative z-[30] flex h-full min-h-0 min-w-[300px] flex-1 flex-col overflow-visible">
            <EditorPanel
              readOnly={!canEditLesson}
              paragraphs={paragraphs}
              setParagraphs={(newP) => {
                setParagraphs(newP);
                setIsDirty(true);
              }}
              attachedQuestions={attachedQuestions}
              onAddQuestion={handleAddQuestion}
              onRemoveQuestion={handleRemoveQuestion}
              lesson={currentLesson}
              subject={currentSubject}
              unit={currentUnit}
              isNavCollapsed={true}
              isPreviewCollapsed={true}
              cardsZoomLevel={cardsZoomLevel}
              setCardsZoomLevel={setCardsZoomLevel}
              previewZoomLevel={previewZoomLevel}
              setPreviewZoomLevel={setPreviewZoomLevel}
              onSave={handleSave}
              onPreview={handlePreviewFullscreen}
              onPrint={handlePrint}
              onExportPdf={handleExportPdf}
              onExportWord={handleExportWord}
              onImportWord={handleImportWord}
              isSaving={isSaving}
              isDirty={isDirty}
              lastSaved={lastSavedLabel}
              onBack={handleBack}
              onSavedBack={onBack}
              activeMainTab={activeMainTab}
              setActiveMainTab={setActiveMainTab}
              pageSetupView={(
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">
                  {/* Header Info */}
                  <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-white/20 backdrop-blur-xs rounded-xl shrink-0">
                        <Layout className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-sm font-extrabold">إعداد الصفحة وقالب الطباعة للدرس</h2>
                        <p className="text-[11px] text-blue-100 font-medium mt-0.5">
                          تحديد المقاسات، الهوامش، رأس وتذييل الصفحة، الخطوط، والعلامة المائية
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setActiveMainTab("content")}
                        className="px-3.5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer border border-slate-700"
                      >
                        <Home className="w-4 h-4 text-blue-400" />
                        <span>العودة للدرس والبطاقات</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleSave();
                          showToast("تم تطبيق وحفظ إعدادات الصفحة بنجاح");
                        }}
                        className="px-3.5 py-2 rounded-xl bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                        <span>تطبيق وحفظ</span>
                      </button>
                    </div>
                  </div>

                  {/* Template Selector */}
                  <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-blue-600" />
                      <span>اختر القالب الحالي للطباعة:</span>
                    </h3>
                    <div className="flex gap-2 items-center">
                      <select
                        className="flex-1 p-2.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                        value={activeTemplate.id}
                        onChange={(e) => {
                          const allTmpls = storage.getPrintTemplates();
                          const tmpl = allTmpls.find((t) => t.id === e.target.value);
                          if (tmpl) setActiveTemplate(tmpl);
                        }}
                      >
                        {storage.getPrintTemplates().map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          setNewTemplateName(activeTemplate.name);
                          setShowEditTemplatePrompt(true);
                        }}
                        className="p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-xs cursor-pointer"
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
                        className="p-2.5 rounded-xl border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/30 transition shadow-xs cursor-pointer"
                        title="حذف القالب"
                      >
                        <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                      </button>
                    </div>
                  </div>

                  {/* Sub-tabs & Controls */}
                  <div className="flex flex-col md:flex-row">
                    {/* Left Navigation Menu */}
                    <div className="md:w-1/3 bg-slate-50 dark:bg-slate-800/40 p-3 flex flex-col gap-1.5 border-b md:border-b-0 md:border-l border-slate-200 dark:border-slate-800">
                      <button
                        onClick={() => setSettingsTab("margins")}
                        className={`text-right px-3 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-between ${
                          settingsTab === "margins"
                            ? "bg-blue-600 text-white shadow-xs"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
                        }`}
                      >
                        <span>الهوامش والأبعاد</span>
                        <span className="text-[10px] opacity-75">{activeTemplate.orientation === "landscape" ? "أفقي" : "عمودي"}</span>
                      </button>

                      <button
                        onClick={() => setSettingsTab("headerFooter")}
                        className={`text-right px-3 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-between ${
                          settingsTab === "headerFooter"
                            ? "bg-blue-600 text-white shadow-xs"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
                        }`}
                      >
                        <span>الرأس والتذييل</span>
                        <span className="text-[10px] opacity-75">الهيدر والفوتر</span>
                      </button>

                      <button
                        onClick={() => setSettingsTab("sideText")}
                        className={`text-right px-3 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-between ${
                          settingsTab === "sideText"
                            ? "bg-blue-600 text-white shadow-xs"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
                        }`}
                      >
                        <span>هوامش الجوانب</span>
                        <span className="text-[10px] opacity-75">نصوص الجوانب</span>
                      </button>

                      <button
                        onClick={() => setSettingsTab("spacing")}
                        className={`text-right px-3 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-between ${
                          settingsTab === "spacing"
                            ? "bg-blue-600 text-white shadow-xs"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
                        }`}
                      >
                        <span>ضبط المسافات والعناصر</span>
                      </button>

                      <button
                        onClick={() => setSettingsTab("watermark")}
                        className={`text-right px-3 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-between ${
                          settingsTab === "watermark"
                            ? "bg-blue-600 text-white shadow-xs"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
                        }`}
                      >
                        <span>العلامة المائية</span>
                        <span className="text-[10px] opacity-75">{activeTemplate.watermark?.enabled ? "مفعلة" : "معطلة"}</span>
                      </button>

                      <div className="flex-1 min-h-[20px]"></div>

                      <div className="flex flex-col gap-2 pt-3 border-t border-slate-200 dark:border-slate-800 w-full">
                        <button
                          type="button"
                          onClick={handleSaveAsNewTemplate}
                          className="w-full justify-center px-2.5 py-2 text-[10px] font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg transition text-center flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          حفظ كقالب جديد
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveTemplateAsDefault}
                          className="w-full justify-center px-2.5 py-2 text-[10px] font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg transition text-center flex items-center gap-1 cursor-pointer"
                        >
                          <Settings className="w-3 h-3" />
                          حفظ كافتراضي
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleSave();
                          }}
                          className="w-full justify-center px-2.5 py-2 text-[10px] font-bold text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg transition text-center flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          تطبيق القالب وحفظ
                        </button>
                        <button
                          type="button"
                          onClick={resetTemplateSettings}
                          className="w-full justify-center px-2.5 py-2 text-[10px] font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition text-center flex items-center gap-1 cursor-pointer"
                        >
                          استعادة الأولي
                        </button>
                      </div>
                    </div>

                    {/* Sub-tab Form Content */}
                    <div className="md:w-2/3 p-5 text-xs space-y-4">
                      {settingsTab === "margins" && (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                              اتجاه ورقة الدرس (Orientation)
                            </label>
                            <select
                              value={activeTemplate.orientation}
                              onChange={(e) =>
                                setActiveTemplate({
                                  ...activeTemplate,
                                  orientation: e.target.value as any,
                                })
                              }
                              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:border-blue-500 outline-none font-bold"
                            >
                              <option value="portrait">عمودي (Portrait - A4 رأسي)</option>
                              <option value="landscape">أفقي (Landscape - A4 أفقي)</option>
                            </select>
                          </div>

                          <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
                            <label className="block text-slate-700 dark:text-slate-300 font-bold mb-2">
                              هوامش الصفحة بالسنتيمتر (cm)
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1 text-[11px]">
                                  الهامش العلوي (Top)
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
                                  className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                                />
                              </div>

                              <div>
                                <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1 text-[11px]">
                                  الهامش السفلي (Bottom)
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
                                  className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                                />
                              </div>

                              <div>
                                <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1 text-[11px]">
                                  الهامش الأيمن (Right)
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
                                  className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                                />
                              </div>

                              <div>
                                <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1 text-[11px]">
                                  الهامش الأيسر (Left)
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
                                  className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {settingsTab === "headerFooter" && (
                        <div className="space-y-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
                              <h4 className="font-extrabold text-blue-700 dark:text-blue-400">
                                إعدادات رأس الصفحة (Header)
                              </h4>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveTemplate({
                                    ...activeTemplate,
                                    headerContent: {
                                      ...activeTemplate.headerContent,
                                      rightText: currentSubject?.name || "",
                                      centerText: currentUnit?.title || "",
                                      leftText: currentLesson?.title || "",
                                      subjectName: currentSubject?.name || "",
                                    },
                                  });
                                  showToast("تم إعادة مطابقة نصوص رأس الصفحة مع شجرة المنهاج بنجاح");
                                }}
                                className="text-[11px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/80 px-2.5 py-1 rounded-lg transition flex items-center gap-1 border border-blue-200 dark:border-blue-800 cursor-pointer"
                                title="إعادة جلب اسم المادة والوحدة والدرس تلقائياً من شجرة المنهاج"
                              >
                                <RotateCw className="w-3 h-3" />
                                <span>مزامنة من المنهاج</span>
                              </button>
                            </div>

                            <div>
                              <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                                اسم المادة (تلقائي من شجرة المنهاج)
                              </label>
                              <input
                                type="text"
                                value={activeTemplate.headerContent.rightText ?? currentSubject?.name ?? ""}
                                onChange={(e) =>
                                  setActiveTemplate({
                                    ...activeTemplate,
                                    headerContent: {
                                      ...activeTemplate.headerContent,
                                      rightText: e.target.value,
                                    },
                                  })
                                }
                                placeholder={currentSubject?.name || "اسم المادة من شجرة المنهاج"}
                                className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                              />
                            </div>

                            <div>
                              <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                                اسم الوحدة (تلقائي من شجرة المنهاج)
                              </label>
                              <input
                                type="text"
                                value={activeTemplate.headerContent.centerText ?? currentUnit?.title ?? ""}
                                onChange={(e) =>
                                  setActiveTemplate({
                                    ...activeTemplate,
                                    headerContent: {
                                      ...activeTemplate.headerContent,
                                      centerText: e.target.value,
                                    },
                                  })
                                }
                                placeholder={currentUnit?.title || "اسم الوحدة من شجرة المنهاج"}
                                className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                              />
                            </div>

                            <div>
                              <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                                عنوان الدرس (تلقائي من شجرة المنهاج)
                              </label>
                              <input
                                type="text"
                                value={activeTemplate.headerContent.leftText ?? currentLesson?.title ?? ""}
                                onChange={(e) =>
                                  setActiveTemplate({
                                    ...activeTemplate,
                                    headerContent: {
                                      ...activeTemplate.headerContent,
                                      leftText: e.target.value,
                                    },
                                  })
                                }
                                placeholder={currentLesson?.title || "عنوان الدرس من شجرة المنهاج"}
                                className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                              />
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer mt-2 pt-1">
                              <input
                                type="checkbox"
                                checked={activeTemplate.headerContent.differentFirstPage || false}
                                onChange={(e) =>
                                  setActiveTemplate({
                                    ...activeTemplate,
                                    headerContent: {
                                      ...activeTemplate.headerContent,
                                      differentFirstPage: e.target.checked,
                                    },
                                  })
                                }
                                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                              />
                              <span className="text-slate-700 dark:text-slate-300 font-bold">
                                رأس وتذييل مختلف للصفحة الأولى
                              </span>
                            </label>
                          </div>

                          <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                            <h4 className="font-extrabold text-blue-700 dark:text-blue-400 border-b border-slate-200 dark:border-slate-800 pb-1">
                              إعدادات تذييل الصفحة (Footer)
                            </h4>

                            <div>
                              <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                                نص التذييل (حقوق النشر / اسم المعلم / قسم المناهج)
                              </label>
                              <input
                                type="text"
                                value={activeTemplate.footerContent.copyrightNotice || ""}
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
                                className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                              />
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={activeTemplate.footerContent.showPageNumber}
                                onChange={(e) =>
                                  setActiveTemplate({
                                    ...activeTemplate,
                                    footerContent: {
                                      ...activeTemplate.footerContent,
                                      showPageNumber: e.target.checked,
                                    },
                                  })
                                }
                                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                              />
                              <span className="text-slate-700 dark:text-slate-300 font-bold">
                                عرض رقم الصفحة
                              </span>
                            </label>

                            {activeTemplate.footerContent.showPageNumber && (
                              <div className="p-3 bg-slate-100 dark:bg-slate-800/60 rounded-xl space-y-3 border border-slate-200 dark:border-slate-700">
                                <h5 className="font-extrabold text-[11px] text-slate-600 dark:text-slate-300">
                                  تنسيق رقم الصفحة
                                </h5>

                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1 text-[10px]">
                                      الموضع
                                    </label>
                                    <select
                                      value={activeTemplate.footerContent.pageNumberSettings?.align || "left"}
                                      onChange={(e) =>
                                        setActiveTemplate({
                                          ...activeTemplate,
                                          footerContent: {
                                            ...activeTemplate.footerContent,
                                            pageNumberSettings: {
                                              ...activeTemplate.footerContent.pageNumberSettings,
                                              align: e.target.value as any,
                                            },
                                          },
                                        })
                                      }
                                      className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 font-bold"
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
                                      value={activeTemplate.footerContent.pageNumberSettings?.fontFamily || ""}
                                      onChange={(e) =>
                                        setActiveTemplate({
                                          ...activeTemplate,
                                          footerContent: {
                                            ...activeTemplate.footerContent,
                                            pageNumberSettings: {
                                              ...activeTemplate.footerContent.pageNumberSettings,
                                              fontFamily: e.target.value,
                                            },
                                          },
                                        })
                                      }
                                      className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 font-bold"
                                    >
                                      <option value="">(افتراضي)</option>
                                      <option value="Cairo">Cairo</option>
                                      <option value="Tajawal">Tajawal</option>
                                      <option value="Almarai">Almarai</option>
                                      <option value="Arial, Helvetica, sans-serif">Arial</option>
                                      <option value="'Courier New', Courier, monospace">Courier New</option>
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1 text-[10px]">
                                      حجم الخط (px)
                                    </label>
                                    <input
                                      type="number"
                                      placeholder="تلقائي (11)"
                                      value={activeTemplate.footerContent.pageNumberSettings?.fontSize || ""}
                                      onChange={(e) =>
                                        setActiveTemplate({
                                          ...activeTemplate,
                                          footerContent: {
                                            ...activeTemplate.footerContent,
                                            pageNumberSettings: {
                                              ...activeTemplate.footerContent.pageNumberSettings,
                                              fontSize: e.target.value ? Number(e.target.value) : undefined,
                                            },
                                          },
                                        })
                                      }
                                      className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 font-bold"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1 text-[10px]">
                                      اللون
                                    </label>
                                    <input
                                      type="color"
                                      value={activeTemplate.footerContent.pageNumberSettings?.color || "#64748B"}
                                      onChange={(e) =>
                                        setActiveTemplate({
                                          ...activeTemplate,
                                          footerContent: {
                                            ...activeTemplate.footerContent,
                                            pageNumberSettings: {
                                              ...activeTemplate.footerContent.pageNumberSettings,
                                              color: e.target.value,
                                            },
                                          },
                                        })
                                      }
                                      className="w-full h-8 p-0 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 cursor-pointer"
                                    />
                                  </div>
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer mt-2 text-[10px]">
                                  <input
                                    type="checkbox"
                                    checked={activeTemplate.footerContent.pageNumberSettings?.bold || false}
                                    onChange={(e) =>
                                      setActiveTemplate({
                                        ...activeTemplate,
                                        footerContent: {
                                          ...activeTemplate.footerContent,
                                          pageNumberSettings: {
                                            ...activeTemplate.footerContent.pageNumberSettings,
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
                        </div>
                      )}

                      {settingsTab === "sideText" && (
                        <div className="space-y-6">
                          {/* Right Margin Text */}
                          <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-white dark:bg-slate-800 space-y-3">
                            <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm border-b border-slate-100 dark:border-slate-700 pb-2 flex items-center justify-between">
                              <span>نص الهامش الأيمن</span>
                              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-600 dark:text-slate-400">
                                <input
                                  type="checkbox"
                                  checked={activeTemplate.sideText?.right?.enabled || false}
                                  onChange={(e) =>
                                    setActiveTemplate({
                                      ...activeTemplate,
                                      sideText: {
                                        ...activeTemplate.sideText,
                                        right: {
                                          ...activeTemplate.sideText?.right,
                                          enabled: e.target.checked,
                                          text: activeTemplate.sideText?.right?.text || "نظام إديوتيك لإدارة المناهج والدروس",
                                        } as any,
                                      },
                                    })
                                  }
                                  className="rounded text-blue-600 focus:ring-blue-500"
                                />
                                <span>تفعيل</span>
                              </label>
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="sm:col-span-2">
                                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                                  النص (يُترك فارغاً للإلغاء)
                                </label>
                                <input
                                  type="text"
                                  value={activeTemplate.sideText?.right?.text || ""}
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
                                  placeholder="مثال: اسم الجهة التعليمية - قسم تطوير المناهج"
                                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-bold"
                                />
                              </div>
                              <div>
                                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                                  اتجاه الكتابة
                                </label>
                                <select
                                  value={activeTemplate.sideText?.right?.direction || "top-to-bottom"}
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
                                  <option value="top-to-bottom">من الأعلى للأسفل</option>
                                  <option value="bottom-to-top">من الأسفل للأعلى</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                                  محاذاة النص
                                </label>
                                <select
                                  value={activeTemplate.sideText?.right?.align || "center"}
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
                                  <option value="start">بداية (أعلى/أسفل)</option>
                                  <option value="center">وسط</option>
                                  <option value="end">نهاية (أسفل/أعلى)</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                                  الخط
                                </label>
                                <select
                                  value={activeTemplate.sideText?.right?.fontFamily || ""}
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
                                  <option value="Cairo, sans-serif">Cairo</option>
                                  <option value="Tajawal, sans-serif">Tajawal</option>
                                  <option value="Almarai, sans-serif">Almarai</option>
                                  <option value="'Amiri', serif">Amiri</option>
                                  <option value="'Noto Naskh Arabic', serif">Noto Naskh Arabic</option>
                                  <option value="'Noto Kufi Arabic', sans-serif">Noto Kufi Arabic</option>
                                  <option value="Arial, sans-serif">Arial</option>
                                  <option value="'Times New Roman', serif">Times New Roman</option>
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
                                  value={activeTemplate.sideText?.right?.color || "#000000"}
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
                                  الإزاحة الجانبية
                                </label>
                                <input
                                  type="text"
                                  placeholder="مثال: 5px"
                                  value={activeTemplate.sideText?.right?.margin || ""}
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
                          <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-white dark:bg-slate-800 space-y-3">
                            <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm border-b border-slate-100 dark:border-slate-700 pb-2 flex items-center justify-between">
                              <span>نص الهامش الأيسر</span>
                              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-600 dark:text-slate-400">
                                <input
                                  type="checkbox"
                                  checked={activeTemplate.sideText?.left?.enabled || false}
                                  onChange={(e) =>
                                    setActiveTemplate({
                                      ...activeTemplate,
                                      sideText: {
                                        ...activeTemplate.sideText,
                                        left: {
                                          ...activeTemplate.sideText?.left,
                                          enabled: e.target.checked,
                                          text: activeTemplate.sideText?.left?.text || "جميع الحقوق محفوظة للمؤسسة التعليمية",
                                        } as any,
                                      },
                                    })
                                  }
                                  className="rounded text-blue-600 focus:ring-blue-500"
                                />
                                <span>تفعيل</span>
                              </label>
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="sm:col-span-2">
                                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                                  النص (يُترك فارغاً للإلغاء)
                                </label>
                                <input
                                  type="text"
                                  value={activeTemplate.sideText?.left?.text || ""}
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
                                  placeholder="مثال: نسخة الدرس المعتمدة للطباعة"
                                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-bold"
                                />
                              </div>
                              <div>
                                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                                  اتجاه الكتابة
                                </label>
                                <select
                                  value={activeTemplate.sideText?.left?.direction || "top-to-bottom"}
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
                                  <option value="top-to-bottom">من الأعلى للأسفل</option>
                                  <option value="bottom-to-top">من الأسفل للأعلى</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                                  محاذاة النص
                                </label>
                                <select
                                  value={activeTemplate.sideText?.left?.align || "center"}
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
                                  <option value="start">بداية (أعلى/أسفل)</option>
                                  <option value="center">وسط</option>
                                  <option value="end">نهاية (أسفل/أعلى)</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                                  الخط
                                </label>
                                <select
                                  value={activeTemplate.sideText?.left?.fontFamily || ""}
                                  onChange={(e) =>
                                    setActiveTemplate({
                                      ...activeTemplate,
                                      sideText: {
                                        ...activeTemplate.sideText,
                                        left: {
                                          ...activeTemplate.sideText?.left,
                                          fontFamily: e.target.value,
                                        } as any,
                                      },
                                    })
                                  }
                                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                                >
                                  <option value="">الافتراضي</option>
                                  <option value="Cairo, sans-serif">Cairo</option>
                                  <option value="Tajawal, sans-serif">Tajawal</option>
                                  <option value="Almarai, sans-serif">Almarai</option>
                                  <option value="'Amiri', serif">Amiri</option>
                                  <option value="'Noto Naskh Arabic', serif">Noto Naskh Arabic</option>
                                  <option value="'Noto Kufi Arabic', sans-serif">Noto Kufi Arabic</option>
                                  <option value="Arial, sans-serif">Arial</option>
                                  <option value="'Times New Roman', serif">Times New Roman</option>
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
                                      activeTemplate.sideText?.left?.fontSize || "12pt"
                                    }
                                  onChange={(e) =>
                                    setActiveTemplate({
                                      ...activeTemplate,
                                      sideText: {
                                        ...activeTemplate.sideText,
                                        left: {
                                          ...activeTemplate.sideText?.left,
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
                                  value={activeTemplate.sideText?.left?.color || "#000000"}
                                  onChange={(e) =>
                                    setActiveTemplate({
                                      ...activeTemplate,
                                      sideText: {
                                        ...activeTemplate.sideText,
                                        left: {
                                          ...activeTemplate.sideText?.left,
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
                                  الإزاحة الجانبية
                                </label>
                                <input
                                  type="text"
                                  placeholder="مثال: 5px"
                                  value={activeTemplate.sideText?.left?.margin || ""}
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

                      {settingsTab === "spacing" && (
                        <div className="space-y-4">
                          <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-2">
                            ضبط المسافات والعناصر
                          </h4>
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
                      )}

                      {settingsTab === "watermark" && (
                        <div className="space-y-4">
                          <label className="flex items-center gap-2 cursor-pointer mb-2">
                            <input
                              type="checkbox"
                              checked={activeTemplate.watermark?.enabled || false}
                              onChange={(e) =>
                                setActiveTemplate({
                                  ...activeTemplate,
                                  watermark: {
                                    ...activeTemplate.watermark,
                                    enabled: e.target.checked,
                                  } as any,
                                })
                              }
                              className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
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
                                  value={activeTemplate.watermark?.text || "نظام إديوتيك"}
                                  onChange={(e) =>
                                    setActiveTemplate({
                                      ...activeTemplate,
                                      watermark: {
                                        ...activeTemplate.watermark,
                                        text: e.target.value,
                                      } as any,
                                    })
                                  }
                                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                                />
                              </div>

                              <div>
                                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                                  الشفافية: {Math.round((activeTemplate.watermark?.opacity || 0.1) * 100)}%
                                </label>
                                <input
                                  type="range"
                                  min="0.05"
                                  max="0.5"
                                  step="0.01"
                                  value={activeTemplate.watermark?.opacity || 0.1}
                                  onChange={(e) =>
                                    setActiveTemplate({
                                      ...activeTemplate,
                                      watermark: {
                                        ...activeTemplate.watermark,
                                        opacity: Number(e.target.value),
                                      } as any,
                                    })
                                  }
                                  className="w-full accent-blue-600 cursor-pointer"
                                />
                                <p className="text-[10px] text-slate-500 mt-1">
                                  يُنصح بـ 10% إلى 15% لعدم التشويش على نصوص الدرس
                                </p>
                              </div>

                              <div>
                                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                                  التوجيه
                                </label>
                                <select
                                  value={activeTemplate.watermark?.orientation || "diagonal"}
                                  onChange={(e) =>
                                    setActiveTemplate({
                                      ...activeTemplate,
                                      watermark: {
                                        ...activeTemplate.watermark,
                                        orientation: e.target.value as any,
                                      } as any,
                                    })
                                  }
                                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                                >
                                  <option value="diagonal">قطري (Diagonal - 45°)</option>
                                  <option value="horizontal">أفقي (Horizontal)</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                                  حجم الخط: {activeTemplate.watermark?.fontSize || (activeTemplate.orientation === "landscape" ? 120 : 100)} px
                                </label>
                                <input
                                  type="range"
                                  min="20"
                                  max="300"
                                  step="5"
                                  value={activeTemplate.watermark?.fontSize || (activeTemplate.orientation === "landscape" ? 120 : 100)}
                                  onChange={(e) =>
                                    setActiveTemplate({
                                      ...activeTemplate,
                                      watermark: {
                                        ...activeTemplate.watermark,
                                        fontSize: Number(e.target.value),
                                      } as any,
                                    })
                                  }
                                  className="w-full accent-blue-600 cursor-pointer"
                                />
                              </div>

                              <label className="flex items-center gap-2 cursor-pointer mt-2">
                                <input
                                  type="checkbox"
                                  checked={activeTemplate.watermark?.fitToPage || false}
                                  onChange={(e) =>
                                    setActiveTemplate({
                                      ...activeTemplate,
                                      watermark: {
                                        ...activeTemplate.watermark,
                                        fitToPage: e.target.checked,
                                      } as any,
                                    })
                                  }
                                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                                />
                                <span className="text-slate-900 dark:text-slate-100 font-bold text-xs">
                                  احتواء داخل الصفحة (التفاف النص الطويل لعدم تجاوز الهامش)
                                </span>
                              </label>

                              <div className="mt-3">
                                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                                  موضع العلامة المائية
                                </label>
                                <select
                                  value={activeTemplate.watermark?.layer || "below"}
                                  onChange={(e) =>
                                    setActiveTemplate({
                                      ...activeTemplate,
                                      watermark: {
                                        ...activeTemplate.watermark,
                                        layer: e.target.value as any,
                                      } as any,
                                    })
                                  }
                                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                                >
                                  <option value="below">خلف النص (أسفل)</option>
                                  <option value="above">فوق النص (أعلى)</option>
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
                                      value={activeTemplate.watermark?.color || "#64748b"}
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
                                      value={activeTemplate.watermark?.color || "#64748b"}
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
                                      ].includes(activeTemplate.watermark?.fontFamily || "")
                                        ? activeTemplate.watermark?.fontFamily || ""
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
                                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                                  >
                                    <option value="">افتراضي (خط القالب)</option>
                                    <optgroup label="خطوط عربية حديثة">
                                      <option value="Cairo">Cairo (عصري ومقروء)</option>
                                      <option value="Tajawal">Tajawal (رسمي وحديث)</option>
                                      <option value="Almarai">Almarai (مريح للعين)</option>
                                      <option value="'IBM Plex Sans Arabic', sans-serif">IBM Plex Sans (تقني وأكاديمي)</option>
                                    </optgroup>
                                    <optgroup label="خطوط عربية أكاديمية">
                                      <option value="'Traditional Arabic', serif">Traditional Arabic (كلاسيكي أكاديمي)</option>
                                      <option value="'Noto Naskh Arabic', serif">Noto Naskh Arabic (نسخ قياسي)</option>
                                      <option value="'Amiri', serif">Amiri (أميري للمطبوعات)</option>
                                      <option value="'Aref Ruqaa', serif">Aref Ruqaa (رقعة)</option>
                                    </optgroup>
                                    <optgroup label="خطوط قياسية وإنجليزية">
                                      <option value="'Times New Roman', Times, serif">Times New Roman (أكاديمي إنجليزي)</option>
                                      <option value="Arial, Helvetica, sans-serif">Arial (قياسي أساسي)</option>
                                      <option value="'Courier New', Courier, monospace">Courier New (أكواد برمجية)</option>
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
                                    "",
                                  ].includes(activeTemplate.watermark?.fontFamily || "") && (
                                    <input
                                      type="text"
                                      placeholder="اكتب اسم الخط هنا (مثل: Tahoma)"
                                      value={activeTemplate.watermark?.fontFamily || ""}
                                      onChange={(e) =>
                                        setActiveTemplate({
                                          ...activeTemplate,
                                          watermark: {
                                            ...activeTemplate.watermark,
                                            fontFamily: e.target.value,
                                          } as any,
                                        })
                                      }
                                      className="w-full p-2 mt-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                                    />
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            />
          </div>
        )}

        {/* Full-document preview window */}
        {!isPreviewCollapsed && (
          <div
            className={`h-full flex flex-col relative transition-all duration-300 ${
              isFullscreen
                ? "w-full"
                : "flex-1 w-1/2 basis-1/2 min-w-[300px]"
            }`}
          >
            <PreviewPanel
              returnLabel={initialView === "preview" ? "العودة لتفاصيل الدرس" : undefined}
              isPrintModalOpen={isPrintModalOpen}
              setIsPrintModalOpen={setIsPrintModalOpen}
              activeTemplate={activeTemplate}
              onTemplateChange={(newTpl) => {
                setActiveTemplate(newTpl);
                setIsDirty(true);
              }}
              subjectName={currentSubject?.name || ""}
              unitTitle={currentUnit?.title || ""}
              lesson={currentLesson}
              paragraphs={debouncedParagraphs}
              onUpdateParagraphs={(newP) => {
                setParagraphs(newP);
                setDebouncedParagraphs(newP);
                setIsDirty(true);
              }}
              attachedQuestions={attachedQuestions}
              zoomLevel={previewZoomLevel}
              setZoomLevel={setPreviewZoomLevel}
              isFullscreen={isFullscreen}
              setIsFullscreen={(next) => {
                if (!next && initialView === "preview") { handleBack(); return; }
                setIsFullscreen(next);
                if (!next) setIsPreviewCollapsed(true);
              }}
              isNavCollapsed={true}
              onCollapse={() => {
                if (initialView === "preview") { handleBack(); return; }
                setIsPreviewCollapsed(true);
                setIsFullscreen(false);
              }}
              groupingEnabled={groupingEnabled}
              onGroupingEnabledChange={(val) => {
                setGroupingEnabled(val);
                setIsDirty(true);
              }}
              groupingColumns={groupingColumns}
              onGroupingColumnsChange={(val) => {
                setGroupingColumns(val);
                setIsDirty(true);
              }}
              groupingNumberingStyle={groupingNumberingStyle}
              onGroupingNumberingStyleChange={(val) => {
                setGroupingNumberingStyle(val);
                setIsDirty(true);
              }}
              groupingDensity={groupingDensity}
              onGroupingDensityChange={(val) => {
                setGroupingDensity(val);
                setIsDirty(true);
              }}
            />
          </div>
        )}

        {/* Media Library */}
        <MediaLibraryPanel isOpen={isMediaLibraryOpen} onClose={() => setIsMediaLibraryOpen(false)} />
      </div>

      <StatusBar 
        wordCount={wordCount}
        charCount={charCount}
        cardCount={paragraphs.length}
        pageCount={pageCount}
        lastSaved={lastSavedLabel}
        isSaving={isSaving}
        isDirty={isDirty}
        saveError={saveError}
        zoomLevel={cardsZoomLevel}
        setZoomLevel={setCardsZoomLevel}
      />

      {/* Exit Confirmation Modal */}
      {showExitModal && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <BookOpenCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                  العودة إلى مستكشف المناهج
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  محرر إعداد الدروس
                </p>
              </div>
            </div>

            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-6 leading-relaxed">
              هل تود حفظ معلومات وتغييرات الدرس قبل العودة إلى المنهاج؟
            </p>

            <div className="flex flex-col sm:flex-row gap-2 justify-end">
              <button
                onClick={async () => {
                  if (!(await handleSave(true))) return;
                  setShowExitModal(false);
                  onBack();
                }}
                disabled={isSaving}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>حفظ وخروج</span>
              </button>

              <button
                onClick={() => {
                  setShowExitModal(false);
                  onBack();
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>خروج بدون حفظ</span>
              </button>

              <button
                onClick={() => setShowExitModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs transition-all cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Prompt Modal: Save as New Template */}
      {showNewTemplatePrompt && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 mb-2">
              حفظ القالب كقالب جديد
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">أدخل اسماً مميزاً لقالب الطباعة الجديد:</p>
            <input
              type="text"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-slate-100 mb-6 focus:border-blue-500 outline-none"
              placeholder="اسم القالب الجديد"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={confirmSaveNewTemplate}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer"
              >
                حفظ القالب
              </button>
              <button
                onClick={() => setShowNewTemplatePrompt(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prompt Modal: Edit Template Name */}
      {showEditTemplatePrompt && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 mb-2">
              تعديل اسم القالب
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">تحديث اسم القالب الحالي:</p>
            <input
              type="text"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-slate-100 mb-6 focus:border-blue-500 outline-none"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  if (newTemplateName.trim()) {
                    const updatedTmpl = { ...activeTemplate, name: newTemplateName.trim() };
                    storage.savePrintTemplate(updatedTmpl);
                    setActiveTemplate(updatedTmpl);
                    setShowEditTemplatePrompt(false);
                    showToast("تم تعديل اسم القالب بنجاح!");
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer"
              >
                حفظ التعديل
              </button>
              <button
                onClick={() => setShowEditTemplatePrompt(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal: Delete Template */}
      {showDeleteTemplateConfirm && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 mb-2">
              تأكيد حذف القالب
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
              هل أنت تأكد من رغبتك في حذف القالب "{activeTemplate.name}"؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  storage.deletePrintTemplate(activeTemplate.id);
                  const remaining = storage.getPrintTemplates();
                  setActiveTemplate(remaining[0] || activeTemplate);
                  setShowDeleteTemplateConfirm(false);
                  showToast("تم حذف القالب بنجاح!");
                }}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs cursor-pointer"
              >
                تأكيد الحذف
              </button>
              <button
                onClick={() => setShowDeleteTemplateConfirm(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subject Modal */}
      <SubjectModal
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        onSave={(newSubj) => {
          if (onSaveSubject) {
            onSaveSubject(newSubj);
          }
          setIsSubjectModalOpen(false);
        }}
        initialSubject={editingSubject}
        existingSubjectsCount={subjects.length}
      />
    </div>
  );
};
