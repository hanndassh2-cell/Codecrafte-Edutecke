import React, { useState } from "react";
import { Editor } from "@tiptap/react";
import {
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Layers,
  ChevronDown,
  HelpCircle,
  FileText,
  Award,
  Clock,
  BookOpen,
  Eye,
  Star,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Image as ImageIcon,
  Table as TableIcon,
  Smile,
  Zap,
  BarChart2,
  Sliders,
  CheckSquare,
  Square,
  X,
} from "lucide-react";
import { validateCurriculumContext } from "../../../utils/curriculumValidator";
import {
  Question,
  QuestionType,
  Subject,
  Unit,
  Lesson,
  BookReference,
} from "../../../types/index";
import { storage } from "../../../services/storage";
import {
  filterAllowedSubjects,
  filterAllowedItemsBySubject,
  canPerformAction,
  canAccessSubject,
} from "../../../services/rbacEngine";
import { RichTextEditor } from "../../editor/components/RichTextEditor";
import { QuestionRenderer } from "../../../components/QuestionRenderer";
import { AIQuestionSolverModal } from "../../editor/components/AIQuestionSolverModal";
import { EditorRibbon } from "../../editor/components/EditorRibbon";
import { ImageInsertModal } from "../../editor/components/ImageInsertModal";
import { TableInsertModal } from "../../editor/components/TableInsertModal";
import { LinkInsertModal } from "../../editor/components/LinkInsertModal";
import { AiDistractorModal } from "../../ai/components/AiDistractorModal";
import { SplitWorkspaceLayout } from "../../../components/SplitWorkspaceLayout";
import { MathText } from "../../../components/MathText";

// Map emojis and badges for all 20 question types
export const QUESTION_TYPE_EMOJIS: Record<
  QuestionType,
  { emoji: string; bg: string }
> = {
  intro: {
    emoji: "📖",
    bg: "bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300",
  },
  main_idea: {
    emoji: "💡",
    bg: "bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300",
  },
  note: {
    emoji: "📝",
    bg: "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300",
  },
  definition: {
    emoji: "📑",
    bg: "bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300",
  },
  explain: {
    emoji: "🔍",
    bg: "bg-cyan-100 dark:bg-cyan-900/60 text-cyan-700 dark:text-cyan-300",
  },
  reason: {
    emoji: "🤔",
    bg: "bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300",
  },
  true_false: {
    emoji: "⚖️",
    bg: "bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300",
  },
  mcq: {
    emoji: "🎯",
    bg: "bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300",
  },
  problem: {
    emoji: "🧮",
    bg: "bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300",
  },
  fill_blanks: {
    emoji: "✍️",
    bg: "bg-orange-100 dark:bg-orange-900/60 text-orange-700 dark:text-orange-300",
  },
  diagram_label: {
    emoji: "🗺️",
    bg: "bg-pink-100 dark:bg-pink-900/60 text-pink-700 dark:text-pink-300",
  },
  table_query: {
    emoji: "📊",
    bg: "bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300",
  },
  matching: {
    emoji: "🔗",
    bg: "bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300",
  },
  ordering: {
    emoji: "🔢",
    bg: "bg-lime-100 dark:bg-lime-900/60 text-lime-700 dark:text-lime-300",
  },
  image_choice: {
    emoji: "🖼️",
    bg: "bg-fuchsia-100 dark:bg-fuchsia-900/60 text-fuchsia-700 dark:text-fuchsia-300",
  },
  equation: {
    emoji: "🧪",
    bg: "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300",
  },
  grammar: {
    emoji: "🔤",
    bg: "bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300",
  },
  listening: {
    emoji: "🎧",
    bg: "bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300",
  },
  essay: {
    emoji: "📄",
    bg: "bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200",
  },
  custom: {
    emoji: "⚙️",
    bg: "bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200",
  },
};

interface QuestionEditorPageProps {
  editingQuestion: Question | null;
  initialSubjectId?: string;
  initialUnitId?: string;
  initialLessonId?: string;
  subjects: Subject[];
  units: Unit[];
  lessons: Lesson[];
  QUESTION_TYPES_LABEL: Record<QuestionType, string>;
  onSave: (question: Question) => void;
  onCancel: () => void;
}

export const QuestionEditorPage: React.FC<QuestionEditorPageProps> = ({
  editingQuestion,
  initialSubjectId,
  initialUnitId,
  initialLessonId,
  subjects,
  units,
  lessons,
  QUESTION_TYPES_LABEL,
  onSave,
  onCancel,
}) => {
  const currentUser = React.useMemo(() => storage.getCurrentUser(), []);
  const allowedSubjects = React.useMemo(() => filterAllowedSubjects(currentUser, subjects), [currentUser, subjects]);
  const allowedUnits = React.useMemo(() => filterAllowedItemsBySubject(currentUser, units), [currentUser, units]);
  const allowedLessons = React.useMemo(() => filterAllowedItemsBySubject(currentUser, lessons), [currentUser, lessons]);

  // Form States
  const [showAISolver, setShowAISolver] = useState(false);
  const [formSubjectId, setFormSubjectId] = useState<string>(
    editingQuestion ? editingQuestion.subjectId : initialSubjectId || allowedSubjects[0]?.id || ""
  );
  const [formUnitId, setFormUnitId] = useState<string>(
    editingQuestion ? editingQuestion.unitId : initialUnitId || ""
  );
  const [formLessonId, setFormLessonId] = useState<string>(
    editingQuestion ? editingQuestion.lessonId : initialLessonId || ""
  );
  const [formType, setFormType] = useState<QuestionType>(
    editingQuestion ? editingQuestion.type : "mcq"
  );

  const [formMarks, setFormMarks] = useState<number>(
    (editingQuestion as any)?.marks || 1
  );

  const [formText, setFormText] = useState<string>(
    editingQuestion ? editingQuestion.text : ""
  );
  const [formLineSpacing, setFormLineSpacing] = useState<number>(
    editingQuestion && editingQuestion.lineSpacing !== undefined ? editingQuestion.lineSpacing : 0
  );
  const [formAnswer, setFormAnswer] = useState<string>(() => {
    if (editingQuestion) {
      if (editingQuestion.answer) return editingQuestion.answer;
      if (editingQuestion.type === "mcq" || editingQuestion.type === "true_false") {
        const correctOpt = editingQuestion.distractors?.find((d) => d.isCorrect);
        return correctOpt ? correctOpt.text : "";
      }
    }
    return "";
  });
  const [formDifficulty, setFormDifficulty] = useState<
    "easy" | "medium" | "hard"
  >(editingQuestion ? editingQuestion.difficulty : "medium");
  const [formImportance, setFormImportance] = useState<1 | 2 | 3 | 4 | 5>(
    editingQuestion ? editingQuestion.importance : 4
  );
  const [formStatus, setFormStatus] = useState<
    "active" | "archived" | "requires_review" | "uncategorized"
  >(editingQuestion ? editingQuestion.status || "active" : "active");
  const [formIsPastCycle, setFormIsPastCycle] = useState<boolean>(
    editingQuestion ? editingQuestion.isPastCycle : false
  );
  
  const [formPastCyclesInfo, setFormPastCyclesInfo] = useState<string>(
    editingQuestion ? editingQuestion.pastCyclesInfo || "" : ""
  );
  
  const [bookRef, setBookRef] = useState<BookReference>(
    editingQuestion?.bookReference || {
      bookSource: "",
      pageNumber: "",
      questionTitle: "",
      exerciseNumber: "",
      showInCard: true,
      showInPrint: true,
    }
  );

  const [formFutureProb, setFormFutureProb] = useState<number>(
    editingQuestion ? editingQuestion.futureProbability || 85 : 85
  );

  // Distractors state for MCQ / True-False
  const [formDistractors, setFormDistractors] = useState<
    { id: string; text: string; isCorrect: boolean }[]
  >(() => {
    if (editingQuestion?.distractors && editingQuestion.distractors.length > 0) {
      return editingQuestion.distractors.map((d: any, i: number) => {
        const isStr = typeof d === "string";
        return {
          id: isStr ? "d-" + i : d.id || "d-" + i,
          text: isStr ? d : d.text || "",
          isCorrect: isStr ? false : !!d.isCorrect,
        };
      });
    }
    return [
      { id: "d1", text: "", isCorrect: true },
      { id: "d2", text: "", isCorrect: false },
      { id: "d3", text: "", isCorrect: false },
      { id: "d4", text: "", isCorrect: false },
    ];
  });

  // Editor & Ribbon state
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
  const [activeRibbonTab, setActiveRibbonTab] = useState<any>("home");
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [showAiDistractorModal, setShowAiDistractorModal] = useState(false);
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(true);
  const [showSolutionPreview, setShowSolutionPreview] = useState(true);

  // Available units & lessons
  const availableUnits = (allowedUnits || []).filter((u) => u && u.subjectId === formSubjectId);
  const availableLessons = (allowedLessons || []).filter((l) => l && l.unitId === formUnitId);

  const handleInsertImage = (url: string) => {
    if (activeEditor) {
      activeEditor.chain().focus().setImage({ src: url }).run();
    }
  };

  const handleInsertTable = (rows: number, cols: number, withHeader: boolean) => {
    if (activeEditor) {
      activeEditor
        .chain()
        .focus()
        .insertTable({ rows, cols, withHeaderRow: withHeader })
        .run();
    }
  };

  const handleInsertLink = (url: string) => {
    if (activeEditor) {
      activeEditor.chain().focus().setLink({ href: url }).run();
    }
  };

  const handleOptionChange = (id: string, text: string) => {
    setFormDistractors((prev) =>
      prev.map((opt) => (opt.id === id ? { ...opt, text } : opt))
    );
  };

  const handleSetCorrectOption = (id: string) => {
    setFormDistractors((prev) =>
      prev.map((opt) => ({
        ...opt,
        isCorrect: opt.id === id,
      }))
    );
    // If the correct option has text, sync it to formAnswer
    const target = formDistractors.find((opt) => opt.id === id);
    if (target && target.text) {
      setFormAnswer(target.text);
    }
  };

  const handleAddOption = () => {
    const newId = "d-" + Date.now();
    setFormDistractors((prev) => [
      ...prev,
      { id: newId, text: "", isCorrect: prev.length === 0 },
    ]);
  };

  const handleRemoveOption = (id: string) => {
    if (formDistractors.length <= 2) {
      alert("يجب إبقاء خيارين على الأقل للسؤال الاختياري.");
      return;
    }
    setFormDistractors((prev) => {
      const filtered = prev.filter((d) => d.id !== id);
      // Ensure at least one option remains correct
      if (!filtered.some((d) => d.isCorrect) && filtered.length > 0) {
        filtered[0].isCorrect = true;
      }
      return filtered;
    });
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (editingQuestion) {
      if (!canPerformAction(currentUser, "edit", "questions")) {
        alert("ليس لديك صلاحية لتعديل الأسئلة.");
        return;
      }
      if (editingQuestion.subjectId && !canAccessSubject(currentUser, editingQuestion.subjectId)) {
        alert("ليس لديك صلاحية على المادة الدراسية الحالية للسؤال.");
        return;
      }
    } else {
      if (!canPerformAction(currentUser, "create", "questions")) {
        alert("ليس لديك صلاحية لإنشاء أسئلة جديدة.");
        return;
      }
    }

    if (!formSubjectId) {
      alert("يرجى اختيار المادة الدراسية.");
      return;
    }
    if (!canAccessSubject(currentUser, formSubjectId)) {
      alert("ليس لديك صلاحية للوصول إلى المادة الدراسية المختارة.");
      return;
    }
    if (availableUnits.length > 0 && !formUnitId) {
      alert("يرجى اختيار الوحدة الدراسية.");
      return;
    }
    if (availableLessons.length > 0 && !formLessonId) {
      alert("يرجى اختيار الدرس.");
      return;
    }
    if (!formText.trim()) {
      alert("يرجى إدخال نص السؤال قبل الحفظ.");
      return;
    }

    if (formType === "mcq" || formType === "true_false") {
      const emptyOptions = formDistractors.filter((d) => !d.text.trim());
      if (emptyOptions.length > 0) {
        alert("يرجى تعبئة جميع الخيارات أو حذف الخيارات الفارغة.");
        return;
      }
      if (formDistractors.length < 2) {
        alert("يجب إضافة خيارين على الأقل للسؤال.");
        return;
      }
      const hasCorrect = formDistractors.some((d) => d.isCorrect);
      if (!hasCorrect) {
        alert("يرجى تحديد الخيار الصحيح من بين الخيارات.");
        return;
      }
    } else {
      if (!formAnswer.trim()) {
        alert("يرجى إدخال الإجابة أو الحل النموذجي قبل الحفظ.");
        return;
      }
    }

    const weight = Number(
      (formImportance * 0.5 + (formFutureProb / 100) * 2.5).toFixed(1)
    );

    const resolvedUnitId = formUnitId;
    const resolvedLessonId = formLessonId;
    
    // DATA-1 Guardrail
    const validation = validateCurriculumContext(formSubjectId, resolvedUnitId, resolvedLessonId);
    if (!validation.isValid) {
      alert("فشل التحقق من المنهاج:\n\n" + validation.errors.join("\n"));
      console.error("[DATA-1] QuestionEditorPage Curriculum Validation Failed:", validation.errors);
      return;
    }

    const targetSubject = subjects.find((s) => s.id === formSubjectId);
    const targetUnit = units.find((u) => u.id === resolvedUnitId);
    const targetLesson = lessons.find((l) => l.id === resolvedLessonId);

    // Build distractors array for saving
    let distractorsPayload = undefined;
    if (formType === "mcq" || formType === "true_false") {
      distractorsPayload = formDistractors.map((d) => ({
        id: d.id,
        text: d.text,
        isCorrect: d.isCorrect,
      }));
    }

    // Determine correct answer text
    let answerPayload = formAnswer;
    if (!answerPayload && (formType === "mcq" || formType === "true_false") && formDistractors.length > 0) {
      const correctOpt = formDistractors.find((d) => d.isCorrect);
      if (correctOpt) {
        answerPayload = correctOpt.text;
      }
    }

    const savedQuestion: Question = {
      id: editingQuestion ? editingQuestion.id : "q-" + Date.now(),
      subjectId: formSubjectId,
      unitId: resolvedUnitId,
      lessonId: resolvedLessonId,
      subjectName: targetSubject?.name || "",
      unitTitle: targetUnit?.title || "",
      lessonTitle: targetLesson?.title || "",
      type: formType,
      text: formText,
      answer: answerPayload,
      lineSpacing: formLineSpacing,
      difficulty: formDifficulty,
      importance: formImportance,
      status: formStatus,
      tags: ["بنك الأسئلة"],
      isPastCycle: formIsPastCycle,
      pastCyclesInfo: formPastCyclesInfo,
      occurrencesCount: formIsPastCycle ? 2 : 0,
      futureProbability: formFutureProb,
      finalWeightScore: weight,
      distractors: distractorsPayload,
      ...(formMarks ? { marks: formMarks } : {}),
            createdAt: editingQuestion
        ? editingQuestion.createdAt
        : new Date().toISOString().substring(0, 10),
      updatedAt: new Date().toISOString(),
      bookReference: bookRef.bookSource || bookRef.pageNumber || bookRef.questionTitle || bookRef.exerciseNumber ? bookRef : undefined,
    };

    onSave(savedQuestion);
  };

  const typeConfig = QUESTION_TYPE_EMOJIS[formType] || QUESTION_TYPE_EMOJIS.mcq;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900 w-full animate-in fade-in duration-200" dir="rtl">
      {/* Fixed Header Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3.5 shrink-0 flex items-center justify-between gap-4 select-none z-10 shadow-xs">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-extrabold text-xs flex items-center gap-2 transition cursor-pointer shadow-3xs"
          >
            <ArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>العودة إلى بنك الأسئلة</span>
          </button>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

          <div className="flex items-center gap-3">
            <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold shadow-3xs ${typeConfig.bg}`}>
              {typeConfig.emoji}
            </span>
            <div>
              <h1 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2 leading-tight">
                <span>{editingQuestion ? "تعديل بطاقة سؤال" : "إضافة بطاقة سؤال جديدة"}</span>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-[#0f6cbd] dark:text-blue-300 text-[10px] font-extrabold">
                  {QUESTION_TYPES_LABEL[formType] || formType}
                </span>
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 hidden md:block">
                محرّر بطاقات الأسئلة الكامل (Word/KaTeX Engine) - تصميم احترافي متكامل
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSubmit()}
            className="px-5 py-2.5 rounded-xl bg-[#0f6cbd] hover:bg-[#115ea3] active:bg-[#004e8c] text-white font-extrabold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>حفظ السؤال في البنك</span>
          </button>
        </div>
      </div>

        {/* Fixed Ribbon Toolbar */}
        <div className="bg-slate-100/90 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 shadow-2xs shrink-0">
          <EditorRibbon
            activeRibbonTab={activeRibbonTab}
            setActiveRibbonTab={setActiveRibbonTab}
            activeEditor={activeEditor}
            setIsImageModalOpen={setIsImageModalOpen}
            setIsTableModalOpen={setIsTableModalOpen}
            setIsLinkModalOpen={setIsLinkModalOpen}
            setIsAiAssistantOpen={() => setShowAiDistractorModal(true)}
          />
        </div>

        {/* Scrollable Main Workspace Layout */}
        <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 bg-slate-50/40 dark:bg-slate-950/40">
          <SplitWorkspaceLayout
            header={
              <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-5 py-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 mb-4 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-[#0f6cbd] dark:text-blue-300 flex items-center justify-center font-bold">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-extrabold text-slate-900 dark:text-white">
                      بطاقة إنشاء السؤال المتكاملة (Question Card Builder)
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      حرر صياغة السؤال مع المعادلة، الجدول، الخيارات والتنسيقات في بيئة بطاقة موحدة
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPropertiesPanel(!showPropertiesPanel)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer ${
                      showPropertiesPanel
                        ? "bg-blue-100 text-[#0f6cbd] dark:bg-blue-900/60 dark:text-blue-200"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>خصائص السؤال</span>
                  </button>
                </div>
              </div>
            }
          rightContent={
            <div className="space-y-5">
              {/* Question Properties Bar */}
              {showPropertiesPanel && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-4 shadow-2xs animate-in fade-in duration-150">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                    <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      <span>التصنيف والخصائص الأكاديمية للسؤال</span>
                    </h3>
                    <span className="text-[10px] font-bold text-slate-400">الخطوة الأولى</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    {/* Subject */}
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        المادة الدراسية
                      </label>
                      <select
                        value={formSubjectId}
                        onChange={(e) => {
                          setFormSubjectId(e.target.value);
                          setFormUnitId("");
                          setFormLessonId("");
                        }}
                        className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-blue-500"
                      >
                        {allowedSubjects.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Unit */}
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        الوحدة الدراسية
                      </label>
                      <select
                        value={formUnitId}
                        onChange={(e) => {
                          setFormUnitId(e.target.value);
                          setFormLessonId("");
                        }}
                        className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">اختر الوحدة...</option>
                        {availableUnits.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Lesson */}
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        الدرس المقرر
                      </label>
                      <select
                        value={formLessonId}
                        onChange={(e) => setFormLessonId(e.target.value)}
                        className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">اختر الدرس...</option>
                        {availableLessons.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Question Type */}
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        نوع السؤال (الـ 20 نوعاً)
                      </label>
                      <select
                        value={formType}
                        onChange={(e) => setFormType(e.target.value as QuestionType)}
                        className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-extrabold focus:ring-2 focus:ring-blue-500"
                      >
                        {Object.entries(QUESTION_TYPES_LABEL).map(([key, label]) => (
                          <option key={key} value={key}>
                            {QUESTION_TYPE_EMOJIS[key as QuestionType]?.emoji || "📝"} {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1 border-t border-slate-100 dark:border-slate-800/80">
                    {/* Difficulty */}
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        مستوى الصعوبة
                      </label>
                      <select
                        value={formDifficulty}
                        onChange={(e) =>
                          setFormDifficulty(e.target.value as "easy" | "medium" | "hard")
                        }
                        className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                      >
                        <option value="easy">سهل (Easy)</option>
                        <option value="medium">متوسط (Medium)</option>
                        <option value="hard">صعب / متميز (Hard)</option>
                      </select>
                    </div>

                    {/* Importance */}
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        درجة الأهمية (1 - 5)
                      </label>
                      <select
                        value={formImportance}
                        onChange={(e) => setFormImportance(Number(e.target.value) as any)}
                        className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                      >
                        <option value={1}>⭐ (1) أولوية بسيطة</option>
                        <option value={2}>⭐⭐ (2) أولوية متوسطة</option>
                        <option value={3}>⭐⭐⭐ (3) أولوية هامة</option>
                        <option value={4}>⭐⭐⭐⭐ (4) هامة جداً</option>
                        <option value={5}>⭐⭐⭐⭐⭐ (5) جوهرية/امتحانية</option>
                      </select>
                    </div>

                    {/* Past Cycles */}
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        وارد في دورة سابقة؟
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setFormIsPastCycle(!formIsPastCycle)}
                          className={`flex-1 p-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 border ${
                            formIsPastCycle
                              ? "bg-purple-100 dark:bg-purple-900/60 text-purple-900 dark:text-purple-200 border-purple-300"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>{formIsPastCycle ? "نعم ورد سابقاً" : "لا"}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Past Cycle Info details if active */}
                  {formIsPastCycle && (
                    <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-800/60 text-xs flex items-center gap-3">
                      <span className="font-bold text-purple-800 dark:text-purple-300 shrink-0">
                        تفاصيل الدورة السابقة:
                      </span>
                      <input
                        type="text"
                        placeholder="مثال: دورة 2024 الفصل الأول - الفرع العلمي"
                        value={formPastCyclesInfo}
                        onChange={(e) => setFormPastCyclesInfo(e.target.value)}
                        className="flex-1 p-1.5 rounded-lg border border-purple-300 dark:border-purple-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                  )}
                </div>
              )}

              
              {/* Book Reference Panel */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-4 shadow-2xs animate-in fade-in duration-150 mt-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-emerald-600" />
                    المرجع الكتابي للبطاقة (Metadata)
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">اسم الكتاب / المصدر</label>
                    <input
                      type="text"
                      placeholder="مثال: كتاب الرياضيات"
                      value={bookRef.bookSource || ""}
                      onChange={(e) => setBookRef({ ...bookRef, bookSource: e.target.value })}
                      className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">رقم الصفحة</label>
                    <input
                      type="text"
                      placeholder="مثال: 127"
                      value={bookRef.pageNumber || ""}
                      onChange={(e) => setBookRef({ ...bookRef, pageNumber: e.target.value })}
                      className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">عنوان السؤال</label>
                    <input
                      type="text"
                      placeholder="مثال: حل المعادلة التالية"
                      value={bookRef.questionTitle || ""}
                      onChange={(e) => setBookRef({ ...bookRef, questionTitle: e.target.value })}
                      className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">رقم التمرين (اختياري)</label>
                    <input
                      type="text"
                      placeholder="مثال: تمرين 4"
                      value={bookRef.exerciseNumber || ""}
                      onChange={(e) => setBookRef({ ...bookRef, exerciseNumber: e.target.value })}
                      className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-6 text-xs pt-2">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={bookRef.showInCard || false}
                      onChange={(e) => setBookRef({ ...bookRef, showInCard: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                    />
                    إظهار المرجع في البطاقة
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={bookRef.showInPrint || false}
                      onChange={(e) => setBookRef({ ...bookRef, showInPrint: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                    />
                    إظهار المرجع في الطباعة والمعاينة
                  </label>
                </div>
              </div>
              {/* Primary Question Card Canvas (بطاقة السؤال) */}

              <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-blue-500/40 dark:border-blue-600/50 shadow-md overflow-hidden transition">
                {/* Card Header Bar */}
                <div className="bg-gradient-to-r from-blue-50 via-slate-50 to-indigo-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900 p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold shadow-xs ${typeConfig.bg}`}>
                      {typeConfig.emoji}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-slate-900 dark:text-white">
                          بطاقة سؤال: {QUESTION_TYPES_LABEL[formType]}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        صياغة النص الأساسي للسؤال باستخدام المحرر التفاعلي (Word/KaTeX)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                      الصعوبة: {formDifficulty === "easy" ? "سهل" : formDifficulty === "medium" ? "متوسط" : "صعب"}
                    </span>
                  </div>
                </div>

                {/* Card Main Body: Question Rich Text Editor */}
                <div className="p-5 space-y-4">
                  <div>
                    <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span>نص وصياغة السؤال (Question Body):</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        يدعم المعادلات والجداول والصور واللصق الذكي من Word
                      </span>
                    </label>

                    <div className="border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden min-h-[220px] bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-blue-500 shadow-2xs">
                      <RichTextEditor
                        value={formText}
                        lineSpacing={formLineSpacing}
                        onLineSpacingChange={(val) => setFormLineSpacing(val)}
                        onChange={(val) => setFormText(val)}
                        onFocus={(editor) => setActiveEditor(editor)}
                        placeholder="أدخل نص السؤال هنا... يمكنك إضافة رموز ومعادلات كيميائية/رياضية وإدراج جداول وصور مباشرة"
                      />
                    </div>
                    

                  </div>

                  {/* MCQ & True/False Distractor Options Section */}
                  {(formType === "mcq" || formType === "true_false") && (
                    <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-500" />
                            <span>خيارات الإجابة والتشتيت (Answer Options):</span>
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            أدخل الخيارات وحدد الخيار الصحيح بفرز علامة الاختيار
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setShowAiDistractorModal(true)}
                            className="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 text-purple-700 dark:text-purple-300 font-bold text-xs border border-purple-200 dark:border-purple-800 transition flex items-center gap-1.5"
                          >
                            <Zap className="w-3.5 h-3.5 text-purple-600" />
                            <span>توليد الخيارات بالذكاء الاصطناعي</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleAddOption}
                            className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 font-bold text-xs border border-blue-200 dark:border-blue-800 transition flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>إضافة خيار</span>
                          </button>
                        </div>
                      </div>

                      {/* Options Grid */}
                      <div className="space-y-2.5">
                        {formDistractors.map((option, idx) => {
                          const optionLetter = ["أ", "ب", "ج", "د", "هـ", "و"][idx] || `${idx + 1}`;
                          return (
                            <div
                              key={option.id}
                              className={`p-3 rounded-xl border transition flex items-center gap-3 ${
                                option.isCorrect
                                  ? "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 shadow-2xs"
                                  : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => handleSetCorrectOption(option.id)}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition ${
                                  option.isCorrect
                                    ? "bg-emerald-600 text-white shadow-xs"
                                    : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-emerald-100 hover:text-emerald-700"
                                }`}
                                title={option.isCorrect ? "الإجابة الصحيحة" : "انقر لتحديد كإجابة صحيحة"}
                              >
                                {option.isCorrect ? <Check className="w-4 h-4" /> : optionLetter}
                              </button>

                              <div className="flex-1 min-w-[200px] border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 shadow-sm bg-white dark:bg-slate-900">
                                <RichTextEditor
                                  value={option.text}
                                  onChange={(val) => handleOptionChange(option.id, val)}
                                  placeholder={`أدخل الخيار (${optionLetter})...`}
                                />
                              </div>

                              {option.isCorrect && (
                                <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300 shrink-0 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-1 rounded-md">
                                  الإجابة الصحيحة
                                </span>
                              )}

                              {formDistractors.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOption(option.id)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition shrink-0"
                                  title="حذف الخيار"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Model Answer / Solution Steps Section */}
                  <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Award className="w-4 h-4 text-emerald-600" />
                        <span>الإجابة النموذجية وخطة الحل التفصيلية (Model Answer & Solution Plan):</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowAISolver(true)}
                          className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg text-[11px] font-bold transition shadow-2xs border border-indigo-100 dark:border-indigo-800"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>حل السؤال بالذكاء الاصطناعي</span>
                        </button>
                      </div>
                    </div>

                    <div className="border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden min-h-[140px] bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-blue-500 shadow-2xs">
                      <RichTextEditor
                        value={formAnswer}
                        onChange={(val) => setFormAnswer(val)}
                        onFocus={(editor) => setActiveEditor(editor)}
                        placeholder="أدخل الإجابة النموذجية والخطوات بالتفصيل للمعلم والطالب..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          }
          leftContent={
            /* Live A4 Card Preview Sheet */
            <div className="space-y-4 sticky top-24">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
                <div className="flex flex-col gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Eye className="w-4 h-4 text-blue-600" />
                      <span>المعاينة الحية لبطاقة السؤال (Live Sheet Preview)</span>
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-extrabold">
                      A4 Card Sheet
                    </span>
                  </div>
                  
                  {/* Card Line Spacing Control (In Card) */}
                  <div className="bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-lg border border-slate-200/50 dark:border-slate-800/80 flex items-center justify-between gap-3">
                    <label className="text-slate-600 dark:text-slate-400 font-bold text-[10px] whitespace-nowrap">
                      تباعد الأسطر بالبطاقة:
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      step="1"
                      value={formLineSpacing}
                      onChange={(e) => setFormLineSpacing(Number(e.target.value))}
                      className="flex-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                    />
                    <span className="text-[10px] font-mono bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-bold w-6 text-center">
                      {formLineSpacing}
                    </span>
                  </div>
                </div>

                {/* Paper Canvas */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-md space-y-4 text-slate-900 text-xs font-sans min-h-[380px]">
                  {/* Badges bar */}
                  <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 pb-3 text-[10px]">
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">
                      {subjects.find((s) => s.id === formSubjectId)?.name || "المادة"}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold">
                      {units.find((u) => u.id === formUnitId)?.title || "الوحدة"}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-bold">
                      {lessons.find((l) => l.id === formLessonId)?.title || "الدرس"}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 font-bold flex items-center gap-1 mr-auto">
                      <Star className="w-3 h-3 fill-current" />
                      <span>{formImportance}/5</span>
                    </span>
                  </div>

                  {/* Question Body & Card Rendered */}
                  <div className="pt-2">
                    {formText ? (

                      <QuestionRenderer
                        question={{
                          id: "live-editor-q",
                          text: formText,
                          type: formType,
                          lineSpacing: formLineSpacing,
                          distractors: formDistractors,
                          answer: formAnswer,
                          bookReference: bookRef,
                        }}

                        questionNumber={1}
                        numberFormat="dash"
                        showMarks={false}
                        showAnswerKey={showSolutionPreview}
                        mode="card"
                      />
                    ) : (
                      <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center text-slate-400 italic text-xs">
                        نص السؤال سيظهر هنا مع التنسيق والمعادلات والجداول ومكوّن الترقيم المستقل...
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowSolutionPreview(!showSolutionPreview)}
                      className="text-[11px] text-blue-600 font-bold hover:underline flex items-center gap-1"
                    >
                      <Award className="w-3.5 h-3.5 text-purple-600" />
                      <span>{showSolutionPreview ? "إخفاء الإجابة النموذجية" : "إظهار الإجابة النموذجية"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          }
        />
      </div>

        {/* Fixed Footer */}
        <div className="px-5 py-3.5 bg-slate-50/90 dark:bg-slate-800/70 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 select-none">
          <div className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
            قم بتحديد خيارات السؤال، صياغة السؤال والملاحظات، ثم اضغط على "حفظ السؤال" لحفظه في بنك الأسئلة.
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 transition border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={() => handleSubmit()}
              className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#0f6cbd] hover:bg-[#115ea3] active:bg-[#004e8c] text-white shadow-md flex items-center gap-2 transition cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>حفظ السؤال في البنك</span>
            </button>
          </div>
        </div>

        {/* Nested Sub-Modals */}
        <ImageInsertModal
          isOpen={isImageModalOpen}
          onClose={() => setIsImageModalOpen(false)}
          onInsert={handleInsertImage}
        />
        <TableInsertModal
          isOpen={isTableModalOpen}
          onClose={() => setIsTableModalOpen(false)}
          onInsert={handleInsertTable}
        />
        <LinkInsertModal
          isOpen={isLinkModalOpen}
          onClose={() => setIsLinkModalOpen(false)}
          onInsert={handleInsertLink}
        />
        {showAiDistractorModal && (
          <AiDistractorModal
            questionText={formText}
            answerText={formAnswer}
            questionType={formType}
            subjectName={subjects.find((s) => s.id === formSubjectId)?.name || "المادة"}
            onClose={() => setShowAiDistractorModal(false)}
            onApplyDistractors={(distractors) => {
              const newOptions = distractors.map((item, i) => ({
                id: "d" + (i + 1),
                text: typeof item === "string" ? item : item.text || "",
                isCorrect: typeof item === "string" ? i === 0 : !!item.isCorrect,
              }));
              if (newOptions.length > 0) {
                setFormDistractors(newOptions);
              }
              setShowAiDistractorModal(false);
            }}
          />
        )}
      {/* AI Solver Modal */}
      {showAISolver && (
        <AIQuestionSolverModal
          question={{
            id: editingQuestion?.id || "temp",
            subjectId: formSubjectId,
            unitId: formUnitId,
            lessonId: formLessonId,
            type: formType,
            text: formText,
            answer: formAnswer,
            difficulty: formDifficulty,
            importance: formImportance,
            distractors: formType === 'mcq' || formType === 'true_false' ? formDistractors.map((d, i) => ({ id: `d${i}`, text: d.text, isCorrect: d.isCorrect })) : undefined
          } as any}
          onClose={() => setShowAISolver(false)}
          onInsert={(ans) => setFormAnswer(ans)}
        />
      )}
    </div>
  );
};
