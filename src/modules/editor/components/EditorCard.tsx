import React, { useState, useEffect } from "react";
import { GripVertical, ChevronDown, ChevronUp, Image as ImageIcon, Type, Target, Lightbulb, BookOpen, CheckSquare, Activity, Table as TableIcon, Sigma, FileText, Settings, Copy, Trash2, Lock, MoreVertical, ArrowUp, ArrowDown, Eye, EyeOff, Plus, Send, RefreshCw, Check, X, Info, HelpCircle, TrendingUp, BarChart2, ExternalLink, CheckCircle2, Sparkles, BetweenVerticalEnd, Hash, Tag } from "lucide-react";
import { RichTextEditor } from "./RichTextEditor";
import { CardShell } from "./CardShell";

import { AIQuestionSolverModal } from "./AIQuestionSolverModal";
import { EquationEditorModal } from "./EquationEditorModal";
import { MathText, formatPastedEquation, convertMathMLInText, convertWordLinearMathToTeX } from "../../../components/MathText";
import { QuestionRenderer, cleanQuestionTextForRender } from "../../../components/QuestionRenderer";
import { resolveQuestionAnswer, isOptionCorrect, hasAnswer } from "../../../utils/answerResolver";
import { QuestionNumberNode } from "../../../components/QuestionNumberNode";
import { convertScientificSymbolsAndFormulas } from "../../../services/smartPasteEngine";
import { storage } from "../../../services/storage";
import { examLibraryService } from "../../../services/examLibraryService";
import { UnifiedQuestionHubModal } from "./UnifiedQuestionHubModal";
import { parseQuestionsFromContent } from "../../../services/questionParser";
import { validateCurriculumContext } from "../../../utils/curriculumValidator";

const CARD_GUIDES: Record<string, string> = {
  title: "أدخل العنوان الرئيسي ومقدمة الدرس المخصصة للطلاب.",
  objectives: "تحديد الأهداف والمخرجات التعليمية المقررة.",
  concepts: "أدخل المصطلحات والتعاريف الأساسية.",
  explanation: "أدخل شرح الدرس بالتفصيل.",
  images: "أدخل رابط الصورة والتعليق التوضيحي الخاص بها.",
  tables: "أنشئ جداول منظمة للمقارنات والبيانات التعليمية.",
  math: "أدخل المعادلات الكيميائية والرياضية والصيغ العلمية.",
  activities: "أدخل أنشطة تفاعلية وتجارب عملية للطلاب.",
  questions: "أدخل أسئلة التقويم والتدريب مع إجاباتها.",
  notes: "أدخل تنبيهات وإرشادات إضافية هامة للطلاب.",
  examples: "أدخل أمثلة محلولة وتطبيقات عملية على الشرح.",
};

export const EditorCard = React.memo(({
  p,
  index,
  totalCards = 1,
  cardInfo,
  cardTypesList = [],
  isDragged,
  isActive,
  isCollapsed,
  shouldAutoFocus = false,
  autoFocusPosition = "end",
  onAutoFocusComplete,
  onRequestEditorFocus,
  onNavigateCard,
  setActiveParagraphId,
  setActiveEditor,
  handleDragStart,
  handleDragOver,
  handleDragEnd,
  updateParagraph,
  toggleCollapse,
  duplicateParagraph,
  moveParagraph,
  deleteParagraph,
  lesson,
  subject,
  unit,
  readOnly = false,
}: any) => {
  const Icon = cardInfo.icon || FileText;
  const guideText = CARD_GUIDES[p.type] || cardInfo.description || "";
  const [showSettings, setShowSettings] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isEquationModalOpen, setIsEquationModalOpen] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPickerModalOpen, setIsPickerModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);
  const [previewingQuestion, setPreviewingQuestion] = useState<any | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [expandedAnswers, setExpandedAnswers] = useState<Record<string, boolean>>({});

  const [questionType, setQuestionType] = useState("mcq");
  const [questionText, setQuestionText] = useState("");
  const [questionAnswer, setQuestionAnswer] = useState("");
  const [questionDifficulty, setQuestionDifficulty] = useState("medium");
  const [questionScore, setQuestionScore] = useState(1);
  const [questionTags, setQuestionTags] = useState("");
  const [questionStatus, setQuestionStatus] = useState("approved");
  const [questionImageUrl, setQuestionImageUrl] = useState("");
  const [questionAuthor, setQuestionAuthor] = useState("المعلم");
  const [questionGrade, setQuestionGrade] = useState("");
  const [questionTerm, setQuestionTerm] = useState("");
  const [questionCardColor, setQuestionCardColor] = useState("");
  
  const [bookSource, setBookSource] = useState("");
  const [pageNumber, setPageNumber] = useState("");
  const [exerciseNumber, setExerciseNumber] = useState("");
  const [questionTitle, setQuestionTitle] = useState("");
  const [, setTick] = useState(0);

  useEffect(() => {
    const handleSync = () => setTick((t) => t + 1);
    window.addEventListener("refresh-data-all", handleSync);
    window.addEventListener("storage-change", handleSync);
    return () => {
      window.removeEventListener("refresh-data-all", handleSync);
      window.removeEventListener("storage-change", handleSync);
    };
  }, []);
  
  const [mcqOptions, setMcqOptions] = useState([
    { text: "", isCorrect: true },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ]);

  const [matchingPairsState, setMatchingPairsState] = useState([
    { left: "", right: "" },
    { left: "", right: "" },
  ]);

  const [orderingItemsState, setOrderingItemsState] = useState(["", "", ""]);
  const [syncStatus, setSyncStatus] = useState<Record<string, string>>({});
  const [openMenuQuestionId, setOpenMenuQuestionId] = useState<string | null>(null);
  const [showStatsOverview, setShowStatsOverview] = useState(false);
  const [showAISolver, setShowAISolver] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  useEffect(() => {
    if (p.type !== "questions") return;
    
    // Parse questions from p.body
    let parsedQuestions: any[] = [];
    let isRawBodyText = false;

    try {
      if (p.body) {
        const parsed = JSON.parse(p.body);
        if (Array.isArray(parsed)) {
          parsedQuestions = parsed;
        } else if (parsed && typeof parsed === "object") {
          parsedQuestions = [parsed];
        }
      }
    } catch (e) {
      if (p.body && p.body.trim() && !p.body.startsWith("{") && !p.body.startsWith("[")) {
        isRawBodyText = true;
        const parseRes = parseQuestionsFromContent(p.body);
        if (parseRes && parseRes.questions && parseRes.questions.length > 0) {
          const typeMap: Record<string, string> = {
            explain_reason: "reason",
            computational: "problem",
            definition: "definition",
            mcq: "mcq",
            true_false: "true_false",
            ordering: "ordering",
            matching: "matching",
            essay: "essay",
            practical: "practical",
          };

          parsedQuestions = parseRes.questions.map((q, idx) => ({
            id: q.id || `q-${p.id}-${idx}`,
            type: typeMap[q.type] || "essay",
            text: q.questionText || p.body,
            answer: q.modelAnswer || "",
            distractors: q.options?.map((opt) => ({
              id: opt.id,
              text: opt.text,
              isCorrect: !!opt.isCorrect,
            })) || [],
            difficulty: q.difficulty || "medium",
            score: q.marks || 1,
            finalWeightScore: q.marks || 1,
            importance: 3 as const,
            tags: [],
            isPastCycle: false,
            occurrencesCount: 0,
            futureProbability: 0,
            subjectId: subject?.id || p.subjectId || "",
            unitId: unit?.id || p.unitId || "",
            lessonId: lesson?.id || p.lessonId || "",
            subjectName: subject?.name || "",
            unitTitle: unit?.title || "",
            lessonTitle: lesson?.title || "",
            createdAt: new Date().toISOString(),
          }));
        } else {
          parsedQuestions = [{
            id: `q-${p.id}`,
            type: "essay",
            text: p.body.replace(/<[^>]+>/g, "").trim() || p.body,
            answer: "",
            difficulty: "medium",
            score: 1,
            finalWeightScore: 1,
            importance: 3 as const,
            tags: [],
            isPastCycle: false,
            occurrencesCount: 0,
            futureProbability: 0,
            subjectId: subject?.id || p.subjectId || "",
            unitId: unit?.id || p.unitId || "",
            lessonId: lesson?.id || p.lessonId || "",
            subjectName: subject?.name || "",
            unitTitle: unit?.title || "",
            lessonTitle: lesson?.title || "",
            createdAt: new Date().toISOString()
          }];
        }
      }
    }

    if (parsedQuestions.length > 0) {
      let migrated = false;
      const currentBank = storage.getQuestions();
      parsedQuestions.forEach(q => {
        if (!q || !q.id) return;
        const exists = currentBank.some(bq => bq.id === q.id);
        if (!exists) {
          const fullyPopulated = {
            ...q,
            subjectId: subject?.id || q.subjectId || "",
            unitId: unit?.id || q.unitId || "",
            lessonId: lesson?.id || q.lessonId || "",
            subjectName: subject?.name || q.subjectName || "",
            unitTitle: unit?.title || q.unitTitle || "",
            lessonTitle: lesson?.title || q.lessonTitle || "",
          };
          
          const validation = validateCurriculumContext(fullyPopulated.subjectId, fullyPopulated.unitId, fullyPopulated.lessonId);
          if (validation.isValid) {
            storage.saveQuestion(fullyPopulated);
            migrated = true;
          } else {
            console.warn("[DATA-1] Skipping migration for invalid question context:", fullyPopulated.id);
          }
        }
      });

      if (isRawBodyText && updateParagraph) {
        updateParagraph(p.id, "body", JSON.stringify(parsedQuestions.map((q: any) => storage.stripQuestionForSSOT(q))));
      }

      if (migrated) {
        window.dispatchEvent(new CustomEvent("refresh-data-all"));
      }
    }
  }, [p.body, p.type, p.id, lesson?.id, subject?.id, unit?.id, subject?.name, unit?.title, lesson?.title]);

  const handleInputPaste = (
    e: React.ClipboardEvent<HTMLTextAreaElement | HTMLInputElement>,
    currentValue: string,
    onValueChange: (newValue: string) => void
  ) => {
    const clipboardData = e.clipboardData;
    const html = clipboardData?.getData("text/html");
    const text = clipboardData?.getData("text/plain");

    const rawToProcess = (html && (html.includes("math") || html.includes("Math") || html.includes("oMath") || html.includes("omath") || html.includes("■") || html.includes("<m:"))) ? html : (text || "");

    let formatted = formatPastedEquation(rawToProcess);
    if (formatted && formatted.includes("<") && formatted.includes(">")) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(formatted, "text/html");
      formatted = doc.body.textContent || formatted;
    }

    if (formatted) {
      e.preventDefault();
      const targetElement = e.currentTarget;
      const start = targetElement.selectionStart || 0;
      const end = targetElement.selectionEnd || 0;
      
      const finalInsert = formatted;
      const newValue = currentValue.substring(0, start) + finalInsert + currentValue.substring(end);
      onValueChange(newValue);

      setTimeout(() => {
        if (targetElement) {
          targetElement.setSelectionRange(
            start + finalInsert.length,
            start + finalInsert.length,
          );
        }
      }, 0);
    }
  };

  // Custom UI for Images
  const renderImageEditor = () => {
    // Basic structured parser for body if it's JSON, else treat as HTML
    let data = { url: "", caption: "", align: "center", size: "medium" };
    try { if (p.body.startsWith("{")) data = JSON.parse(p.body); } catch(e) {}
    
    return (
      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-b-xl space-y-4">
        <div className="flex items-center gap-4">
          <input type="text" placeholder="رابط الصورة (URL)" className="flex-1 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" value={data.url} onChange={e => updateParagraph(p.id, "body", JSON.stringify({...data, url: e.target.value}))} />
          <select className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" value={data.align} onChange={e => updateParagraph(p.id, "body", JSON.stringify({...data, align: e.target.value}))}>
            <option value="right">يمين</option>
            <option value="center">وسط</option>
            <option value="left">يسار</option>
          </select>
          <select className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" value={data.size} onChange={e => updateParagraph(p.id, "body", JSON.stringify({...data, size: e.target.value}))}>
            <option value="small">صغير</option>
            <option value="medium">متوسط</option>
            <option value="large">كبير</option>
          </select>
        </div>
        <input type="text" placeholder="التعليق التوضيحي (اختياري)" className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" value={data.caption} onChange={e => updateParagraph(p.id, "body", JSON.stringify({...data, caption: e.target.value}))} />
        {data.url && (
          <div className={`flex justify-${data.align === 'right' ? 'start' : data.align === 'left' ? 'end' : 'center'} mt-4`}>
            <div className="relative group">
              <img src={data.url} alt={data.caption} className={`rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 ${data.size === 'small' ? 'max-w-xs' : data.size === 'medium' ? 'max-w-md' : 'max-w-full'}`} />
              {data.caption && <p className="text-center text-xs text-slate-500 mt-2 font-medium">{data.caption}</p>}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Custom UI for Math
  const renderMathEditor = () => {
    return (
      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-b-xl flex flex-col gap-4">
        <div className="flex items-center justify-between sticky top-[36px] z-10 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-sm py-2 -my-2">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            رمز أو معادلة LaTeX / MathML
          </span>
          <button
            type="button"
            onClick={() => setIsEquationModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Sigma className="w-4 h-4" />
            <span>افتح محرر المعادلة الشامل</span>
          </button>
        </div>
        <textarea 
          placeholder="اكتب المعادلة هنا باستخدام LaTeX (مثال: E = mc^2)"
          className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-left font-mono text-sm [direction:ltr]"
          rows={4}
          value={p.body}
          onChange={e => updateParagraph(p.id, "body", e.target.value)}
          onPaste={e => handleInputPaste(e, p.body, val => updateParagraph(p.id, "body", val))}
        />
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">المعاينة البصرية (انقر على المعادلة لتعديلها مباشرة):</span>
          <div 
            onClick={() => setIsEquationModalOpen(true)}
            className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-inner overflow-x-auto min-h-[60px] flex items-center justify-center cursor-pointer hover:border-blue-400 transition-colors"
            title="انقر لتعديل المعادلة بمحرر المعادلة الشامل"
          >
            <MathText 
              text={p.body || "المعاينة تظهر هنا"} 
              onEquationClick={() => setIsEquationModalOpen(true)}
            />
          </div>
        </div>

        <EquationEditorModal
          isOpen={isEquationModalOpen}
          onClose={() => setIsEquationModalOpen(false)}
          initialEquation={p.body}
          onSave={(newEq) => updateParagraph(p.id, "body", newEq)}
        />
      </div>
    );
  };

  // Custom UI for Activities
  const renderActivityEditor = () => {
    let data = { type: "individual", duration: "10", tools: "", steps: "", isVisible: true };
    try { if (p.body.startsWith("{")) data = JSON.parse(p.body); } catch(e) {}
    
    return (
      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-b-xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700 sticky top-[36px] z-10 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-sm pt-2 -mt-2">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">إعدادات وعرض النشاط</span>
          <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={data.isVisible !== false}
              onChange={(e) => updateParagraph(p.id, "body", JSON.stringify({...data, isVisible: e.target.checked}))}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
            />
            <span className={`text-xs font-bold flex items-center gap-1 ${data.isVisible !== false ? "text-emerald-700 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
              {data.isVisible !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{data.isVisible !== false ? "إظهار النشاط في الدرس" : "إخفاء النشاط من الدرس"}</span>
            </span>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">نوع النشاط</label>
            <select className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" value={data.type} onChange={e => updateParagraph(p.id, "body", JSON.stringify({...data, type: e.target.value}))}>
              <option value="individual">فردي</option>
              <option value="group">جماعي</option>
              <option value="home">منزلي</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">المدة (دقائق)</label>
            <input type="number" min="1" className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" value={data.duration} onChange={e => updateParagraph(p.id, "body", JSON.stringify({...data, duration: e.target.value}))} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">الأدوات المطلوبة</label>
          <input type="text" placeholder="مثال: ورقة، قلم، آلة حاسبة" className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" value={data.tools} onChange={e => updateParagraph(p.id, "body", JSON.stringify({...data, tools: e.target.value}))} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">خطوات التنفيذ</label>
          <div className="min-h-[auto] border border-slate-200 dark:border-slate-700 rounded-xl">
            <RichTextEditor onOpenAI={() => setShowAISolver(true)}
              value={data.steps}
              isActive={isActive}
              autoFocus={shouldAutoFocus}
              autoFocusPosition={autoFocusPosition}
              onAutoFocusComplete={() => onAutoFocusComplete?.(p.id)}
              onNavigatePrevious={() => onNavigateCard?.(p.id, "previous")}
              onNavigateNext={() => onNavigateCard?.(p.id, "next")}
              lineSpacing={p.lineSpacing}
              onLineSpacingChange={(val) => updateParagraph(p.id, "lineSpacing", val)}
              onChange={(val) => updateParagraph(p.id, "body", JSON.stringify({ ...data, steps: val }))}
              placeholder="اكتب خطوات النشاط بالتفصيل..."
              readOnly={readOnly}
            />
          </div>
        </div>
      </div>
    );
  };

  // Custom UI for Questions - A state-of-the-art Question Manager
  const renderQuestionEditor = () => {
    // 1. Parse questions specifically from this card's p.body
    let parsedQuestions: any[] = [];
    try {
      if (p.body) {
        const parsed = JSON.parse(p.body);
        if (Array.isArray(parsed)) {
          parsedQuestions = parsed;
        } else if (parsed && typeof parsed === "object") {
          parsedQuestions = [{
            id: parsed.id || "q-" + Date.now(),
            type: parsed.type || "mcq",
            text: parsed.text || "",
            answer: parsed.answer || "",
            difficulty: parsed.difficulty || "medium",
            score: Number(parsed.score) || 1,
            finalWeightScore: Number(parsed.score) || 1,
            importance: 3,
            tags: [],
            isPastCycle: false,
            occurrencesCount: 0,
            futureProbability: 0,
            subjectId: subject?.id || p.subjectId || "",
            unitId: unit?.id || p.unitId || "",
            lessonId: lesson?.id || p.lessonId || "",
            subjectName: subject?.name || "",
            unitTitle: unit?.title || "",
            lessonTitle: lesson?.title || "",
            createdAt: new Date().toISOString()
          }];
        }
      }
    } catch (e) {
      if (p.body && p.body.trim() && !p.body.startsWith("{") && !p.body.startsWith("[")) {
        parsedQuestions = [{
          id: "q-" + Date.now(),
          type: "essay",
          text: p.body,
          answer: "",
          difficulty: "medium",
          score: 1,
          finalWeightScore: 1,
          importance: 3,
          tags: [],
          isPastCycle: false,
          occurrencesCount: 0,
          futureProbability: 0,
          subjectId: subject?.id || p.subjectId || "",
          unitId: unit?.id || p.unitId || "",
          lessonId: lesson?.id || p.lessonId || "",
          subjectName: subject?.name || "",
          unitTitle: unit?.title || "",
          lessonTitle: lesson?.title || "",
          createdAt: new Date().toISOString()
        }];
      }
    }

    // 2. Fetch latest version of each card question from storage bank to keep in sync
    const allBankQuestions = storage.getQuestions();
    const bankQuestionsMap = new Map(allBankQuestions.map(q => [q.id, q]));

    const cardQuestions = parsedQuestions.map((q) => {
      if (q && q.id && bankQuestionsMap.has(q.id)) {
        const bankQ = bankQuestionsMap.get(q.id)!;
        return {
          ...q,
          ...bankQ,
          bookReference: bankQ.bookReference || q.bookReference,
          answer: q.answer || bankQ.answer || "",
          distractors: (q.distractors && q.distractors.length > 0) ? q.distractors : bankQ.distractors,
          matchingPairs: (q.matchingPairs && q.matchingPairs.length > 0) ? q.matchingPairs : bankQ.matchingPairs,
          sequenceItems: (q.sequenceItems && q.sequenceItems.length > 0) ? q.sequenceItems : bankQ.sequenceItems,
          hideAnswer: q.hideAnswer === true || q.hideAnswer === "true",
          isVisible: q.isVisible !== false && q.isVisible !== "false",
        };
      }
      return {
        ...q,
        hideAnswer: q?.hideAnswer === true || q?.hideAnswer === "true",
        isVisible: q?.isVisible !== false && q?.isVisible !== "false",
      };
    }).filter(Boolean);

    const totalQuestions = cardQuestions.length;
    const mcqCount = cardQuestions.filter((q) => q.type === "mcq").length;
    const tfCount = cardQuestions.filter((q) => q.type === "true_false").length;
    const essayCount = cardQuestions.filter((q) => ["essay", "reason", "definition"].includes(q.type)).length;
    const practicalCount = cardQuestions.filter((q) => q.type === "practical").length;
    const totalScore = cardQuestions.reduce((sum, q) => sum + (Number(q.score) || 1), 0);
    
    const easyCount = cardQuestions.filter((q) => q.difficulty === "easy").length;
    const medCount = cardQuestions.filter((q) => q.difficulty === "medium" || !q.difficulty).length;
    const hardCount = cardQuestions.filter((q) => q.difficulty === "hard").length;

    const getQuestionTypeDetails = (type: string) => {
      switch(type) {
        case "mcq": return { label: "اختيار متعدد", icon: CheckSquare, color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20" };
        case "true_false": return { label: "صح أو خطأ", icon: CheckSquare, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20" };
        case "reason": return { label: "علل", icon: FileText, color: "text-amber-600 bg-amber-50 dark:bg-amber-900/20" };
        case "definition": return { label: "عرف", icon: Type, color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20" };
        case "fill_blanks": return { label: "أكمل", icon: Type, color: "text-teal-600 bg-teal-50 dark:bg-teal-900/20" };
        case "ordering": return { label: "رتب", icon: GripVertical, color: "text-purple-600 bg-purple-50 dark:bg-purple-900/20" };
        case "matching": return { label: "وصل", icon: Activity, color: "text-orange-600 bg-orange-50 dark:bg-orange-900/20" };
        case "essay": return { label: "سؤال مقالي", icon: FileText, color: "text-slate-600 bg-slate-50 dark:bg-slate-900/20" };
        case "problem": return { label: "حسابي", icon: Sigma, color: "text-rose-600 bg-rose-50 dark:bg-rose-900/20" };
        case "practical": return { label: "عملي", icon: Target, color: "text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20" };
        case "diagram_label": return { label: "رسم أو تخطيط", icon: ImageIcon, color: "text-pink-600 bg-pink-50 dark:bg-pink-900/20" };
        case "image_choice": return { label: "سؤال يعتمد على صورة", icon: ImageIcon, color: "text-violet-600 bg-violet-50 dark:bg-violet-900/20" };
        case "table_query": return { label: "سؤال يعتمد على جدول", icon: TableIcon, color: "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20" };
        case "equation": return { label: "سؤال يعتمد على معادلة", icon: Sigma, color: "text-rose-600 bg-rose-50 dark:bg-rose-900/20" };
        default: return { label: "سؤال مخصص", icon: FileText, color: "text-slate-600 bg-slate-50 dark:bg-slate-900/20" };
      }
    };

    const handleAddNewQuestion = () => {
      setEditingQuestion(null);
      setQuestionType("mcq");
      setQuestionText("");
      setQuestionAnswer("");
      setQuestionDifficulty("medium");
      setQuestionScore(1);
      setQuestionTags("");
      setQuestionStatus("approved");
      setQuestionImageUrl("");
      setQuestionAuthor("المعلم");
      setQuestionGrade(lesson?.grade || "");
      setQuestionTerm(lesson?.term || "");
      setQuestionCardColor("");
      setMcqOptions([
        { text: "", isCorrect: true },
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
      ]);
      setMatchingPairsState([
        { left: "", right: "" },
        { left: "", right: "" },
      ]);
      setOrderingItemsState(["", "", ""]);
      setIsModalOpen(true);
    };

    const handleEditQuestion = (q: any) => {
      setEditingQuestion(q);
      setQuestionType(q.type || "mcq");
      setQuestionText(q.text || "");
      setQuestionAnswer(q.answer || "");
      setQuestionDifficulty(q.difficulty || "medium");
      setQuestionScore(q.score || 1);
      setQuestionTags(q.tags ? q.tags.join(", ") : "");
      setQuestionStatus(q.status || "approved");
      setQuestionImageUrl(q.imageUrl || "");
      setQuestionAuthor(q.author || "المعلم");
      setQuestionGrade(q.grade || "");
      setQuestionTerm(q.term || "");
      setQuestionCardColor(q.cardColor || "");
      
      const bRef = typeof q.bookReference === 'object' ? q.bookReference : (q.bookReference ? { bookSource: q.bookReference } : null);
      setBookSource(bRef?.bookSource || "");
      setPageNumber(bRef?.pageNumber || "");
      setExerciseNumber(bRef?.exerciseNumber || "");
      setQuestionTitle(bRef?.questionTitle || "");

      if (q.type === "mcq" && q.distractors) {
        setMcqOptions(q.distractors.map((d: any) => ({ text: typeof d === 'string' ? d : d.text, isCorrect: typeof d === 'string' ? false : !!d.isCorrect })));
      } else {
        setMcqOptions([
          { text: "", isCorrect: true },
          { text: "", isCorrect: false },
          { text: "", isCorrect: false },
          { text: "", isCorrect: false },
        ]);
      }

      if (q.type === "matching" && q.matchingPairs) {
        setMatchingPairsState(q.matchingPairs);
      } else {
        setMatchingPairsState([
          { left: "", right: "" },
          { left: "", right: "" },
        ]);
      }

      if (q.type === "ordering" && q.sequenceItems) {
        setOrderingItemsState(q.sequenceItems);
      } else {
        setOrderingItemsState(["", "", ""]);
      }

      setIsModalOpen(true);
    };

    const handleSaveQuestionData = () => {
      const qId = editingQuestion?.id || "q-" + Date.now();
      
      const defaultBookSource = [subject?.name, unit?.title, lesson?.title].filter(Boolean).join(" - ");
      const bookRefPayload = (bookSource || pageNumber || exerciseNumber || questionTitle) ? {
        bookSource: bookSource || defaultBookSource || "",
        pageNumber: pageNumber || "",
        exerciseNumber: exerciseNumber || "",
        questionTitle: questionTitle || "",
        showInCard: true,
        showInPrint: true,
      } : (editingQuestion?.bookReference || {
        bookSource: defaultBookSource || "",
        pageNumber: "",
        exerciseNumber: "",
        questionTitle: "",
        showInCard: true,
        showInPrint: true,
      });

      const formattedQuestion: any = {
        id: qId,
        type: questionType,
        text: questionText,
        answer: questionAnswer,
        difficulty: questionDifficulty,
        score: Number(questionScore),
        finalWeightScore: Number(questionScore),
        importance: editingQuestion?.importance || 3,
        tags: questionTags ? questionTags.split(",").map(t => t.trim()).filter(Boolean) : [],
        subjectId: subject?.id || p.subjectId || "",
        unitId: unit?.id || p.unitId || "",
        lessonId: lesson?.id || p.lessonId || "",
        subjectName: subject?.name || "",
        unitTitle: unit?.title || "",
        lessonTitle: lesson?.title || "",
        grade: questionGrade,
        term: questionTerm,
        author: questionAuthor,
        status: questionStatus,
        cardColor: questionCardColor,
        bookReference: bookRefPayload,
        createdAt: editingQuestion?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (questionType === "mcq") {
        formattedQuestion.distractors = mcqOptions.map((o, idx) => ({
          id: `o-${idx}-${Date.now()}`,
          text: o.text,
          isCorrect: o.isCorrect
        }));
        // Auto set answer to the correct option's text
        const correctOpt = mcqOptions.find(o => o.isCorrect);
        formattedQuestion.answer = correctOpt ? correctOpt.text : "";
      } else if (questionType === "matching") {
        formattedQuestion.matchingPairs = matchingPairsState.filter(p => p.left && p.right);
      } else if (questionType === "ordering") {
        formattedQuestion.sequenceItems = orderingItemsState.filter(Boolean);
      }

      // DATA-1 Guardrail
      const validation = validateCurriculumContext(formattedQuestion.subjectId, formattedQuestion.unitId, formattedQuestion.lessonId);
      if (!validation.isValid) {
        alert("فشل الحفظ. السياق (المادة/الوحدة/الدرس) غير صالح:\n\n" + validation.errors.join("\n"));
        console.error("[DATA-1] EditorCard Curriculum Validation Failed:", validation.errors);
        return;
      }

      // Sync immediately with the question bank (Requirement 5)
      storage.saveQuestion(formattedQuestion);

      // Save list to paragraph while preserving custom local order
      const newQuestionsList = [...cardQuestions];
      const existingIndex = newQuestionsList.findIndex(q => q.id === formattedQuestion.id);
      if (existingIndex >= 0) {
        newQuestionsList[existingIndex] = formattedQuestion;
      } else {
        newQuestionsList.push(formattedQuestion);
      }
      updateParagraph(p.id, "body", JSON.stringify(newQuestionsList.map((q: any) => storage.stripQuestionForSSOT(q))));

      // Notify App.tsx to update global state in real-time
      window.dispatchEvent(new CustomEvent("refresh-data-all"));

      setIsModalOpen(false);
      setEditingQuestion(null);
    };

    const handleCopyQuestion = (q: any) => {
      const copiedId = "q-" + Date.now();
      const copied = {
        ...q,
        id: copiedId,
        text: q.text + " (نسخة مكررة)",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const validation = validateCurriculumContext(copied.subjectId, copied.unitId, copied.lessonId);
      if (!validation.isValid) {
        alert("فشل تكرار السؤال. السياق غير صالح:\n\n" + validation.errors.join("\n"));
        return;
      }

      storage.saveQuestion(copied);
      
      // Save list to paragraph while preserving custom local order
      const newQuestionsList = [...cardQuestions];
      const existingIndex = newQuestionsList.findIndex(existing => existing.id === q.id);
      if (existingIndex >= 0) {
        newQuestionsList.splice(existingIndex + 1, 0, copied);
      } else {
        newQuestionsList.push(copied);
      }
      updateParagraph(p.id, "body", JSON.stringify(newQuestionsList.map((q: any) => storage.stripQuestionForSSOT(q))));

      // Notify App.tsx to update global state in real-time
      window.dispatchEvent(new CustomEvent("refresh-data-all"));
    };

    const handleMoveQuestion = (index: number, direction: "up" | "down") => {
      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= cardQuestions.length) return;

      const newQuestions = [...cardQuestions];
      const temp = newQuestions[index];
      newQuestions[index] = newQuestions[newIndex];
      newQuestions[newIndex] = temp;

      // Update the local paragraph with the new order
      updateParagraph(p.id, "body", JSON.stringify(newQuestions.map((q: any) => storage.stripQuestionForSSOT(q))));
      
      // Update global lesson linkages array to match the new order if needed
      // (The global order relies on the lesson's questionIds array if it uses that, 
      // but primarily paragraph body holds the correct layout order for parsing.)
      window.dispatchEvent(new CustomEvent("refresh-data-all"));
    };

    const isQuestionUsedInTest = (qId: string) => {
      const exams = storage.getExams() || [];
      const usedInStoredExams = exams.some((exam) => 
        exam.versions?.some((ver) => 
          ver.questions?.some((q) => q.questionId === qId)
        )
      );

      const libraryExams = examLibraryService.getExamsLibrary() || [];
      const usedInLibrary = libraryExams.some((doc) => 
        doc.usedQuestionIds?.includes(qId)
      );

      return usedInStoredExams || usedInLibrary;
    };

    const isUsed = showDeleteConfirm ? isQuestionUsedInTest(showDeleteConfirm) : false;

    const handleDeleteClick = (qId: string) => {
      setShowDeleteConfirm(qId);
    };

    const executeDelete = (syncOption: "delete_bank" | "keep_bank" | "archive_bank") => {
      if (!showDeleteConfirm) return;
      
      const qId = showDeleteConfirm;
      const targetQuestion = cardQuestions.find(q => q.id === qId);

      if (syncOption === "delete_bank" && isQuestionUsedInTest(qId)) {
        alert("لا يمكن حذف هذا السؤال لأنه مستخدم في اختبارات حالية.");
        return;
      }
      
      // Synchronize deletion/unlinking with question bank
      if (syncOption === "delete_bank") {
        const res = storage.deleteQuestion(qId);
        if (res && !res.success) {
          alert(res.message || "لا يمكن حذف هذا السؤال لأنه مرتبط بمحتويات تعليمية.");
          setShowDeleteConfirm(null);
          return;
        }
      } else if (syncOption === "keep_bank") {
        // "إزالة من البطاقة فقط": Remove visual embedding from this card paragraph only.
        // DO NOT delete or zero out ANY question metadata or curriculum path or unassign from lesson.
      } else if (syncOption === "archive_bank") {
        storage.archiveQuestion(qId);
      }
      
      // Save remaining questions to paragraph body while preserving local order (removes from card only)
      const remainingQuestions = cardQuestions.filter(q => q.id !== qId);
      updateParagraph(p.id, "body", JSON.stringify(remainingQuestions.map((q: any) => storage.stripQuestionForSSOT(q))));

      // Notify App.tsx to update global state in real-time
      window.dispatchEvent(new CustomEvent("refresh-data-all"));

      setShowDeleteConfirm(null);
    };

    const handleSyncToBank = (q: any) => {
      const validation = validateCurriculumContext(q.subjectId, q.unitId, q.lessonId);
      if (!validation.isValid) {
        alert("فشل المزامنة. السياق غير صالح:\n\n" + validation.errors.join("\n"));
        return;
      }
      storage.saveQuestion(q);
      window.dispatchEvent(new CustomEvent("refresh-data-all"));
      setSyncStatus(prev => ({ ...prev, [q.id]: "تمت المزامنة بنجاح ✓" }));
      setTimeout(() => {
        setSyncStatus(prev => {
          const copy = { ...prev };
          delete copy[q.id];
          return copy;
        });
      }, 3000);
    };

    const handleInsertFromBank = (selectedQuestions: any[]) => {
      // For each selected question, we add the current lesson ID to its lessonIds
      selectedQuestions.forEach(q => {
        const nextLessonIds = [...(q.lessonIds || [])];
        if (lesson?.id && !nextLessonIds.includes(lesson.id)) {
          nextLessonIds.push(lesson.id);
        }
        
        const qToSave = {
          ...q,
          lessonIds: nextLessonIds,
          updatedAt: new Date().toISOString()
        };

        const validation = validateCurriculumContext(qToSave.subjectId, qToSave.unitId, qToSave.lessonId);
        if (validation.isValid) {
          storage.saveQuestion(qToSave);
        } else {
          console.warn("[DATA-1] Skipping invalid question from bank:", qToSave.id);
        }
      });

      // Also append to lesson.questionIds
      if (lesson) {
        const nextQuestionIds = [...(lesson.questionIds || [])];
        selectedQuestions.forEach(q => {
          if (!nextQuestionIds.includes(q.id)) {
            nextQuestionIds.push(q.id);
          }
        });
        storage.saveLesson({
          ...lesson,
          questionIds: nextQuestionIds
        });
      }

      // Re-fetch and update paragraph body while preserving local order
      const newQuestionsList = [...cardQuestions];
      selectedQuestions.forEach(q => {
        if (!newQuestionsList.some(existing => existing.id === q.id)) {
          newQuestionsList.push(q);
        }
      });
      updateParagraph(p.id, "body", JSON.stringify(newQuestionsList.map((q: any) => storage.stripQuestionForSSOT(q))));

      // Notify App.tsx to update global state in real-time
      window.dispatchEvent(new CustomEvent("refresh-data-all"));
    };

    const getQuestionSourceType = (q: any) => {
      const allLessons = storage.getLessons();
      const linkedLessonIds = new Set<string>();
      if (q.lessonId) linkedLessonIds.add(q.lessonId);
      if (Array.isArray(q.lessonIds)) {
        q.lessonIds.forEach((id: string) => linkedLessonIds.add(id));
      }
      allLessons.forEach((l) => {
        if (l.questionIds?.includes(q.id)) {
          linkedLessonIds.add(l.id);
        }
      });

      if (linkedLessonIds.size > 1) {
        return {
          label: "مشترك بين عدة دروس",
          icon: "🟣",
          color: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800",
        };
      } else if (lesson?.id && (q.lessonId === lesson.id || q.lessonIds?.includes(lesson.id))) {
        return {
          label: "تم إنشاؤه في هذا الدرس",
          icon: "🟢",
          color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
        };
      } else if (q.lessonTitle) {
        return {
          label: `مرتبط من درس: ${q.lessonTitle}`,
          icon: "🔵",
          color: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
        };
      } else {
        return {
          label: "مرتبط من بنك الأسئلة",
          icon: "🔵",
          color: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
        };
      }
    };

    return (
      <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl border-t border-slate-100 dark:border-slate-800 space-y-5">
        {/* Question Header & Controls Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-800 sticky top-[36px] z-10 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-sm pt-2 -mt-2">
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <span>أسئلة وتطبيقات الدرس الحالية</span>
            <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-2.5 py-0.5 rounded-full font-semibold">
              {totalQuestions}
            </span>
          </h4>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent("open-question-hub", { detail: { tab: "bank" } }));
              }}
              className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl shadow-xs transition-all cursor-pointer animate-pulse"
            >
              <ExternalLink className="w-4 h-4" />
              <span>إدراج من بنك الأسئلة</span>
            </button>
            <button
              onClick={() => {
                if (isModalOpen) {
                  setIsModalOpen(false);
                } else {
                  handleAddNewQuestion();
                }
              }}
              className={`flex items-center gap-1.5 text-xs font-bold py-2 px-4 rounded-xl shadow-xs transition-all cursor-pointer ${
                isModalOpen
                  ? "bg-slate-700 hover:bg-slate-800 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {isModalOpen ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span>{isModalOpen ? "إغلاق واجهة التصميم" : "إضافة سؤال جديد"}</span>
            </button>
          </div>
        </div>

        {/* Full-width Inline Question Creation & Design View */}
        {isModalOpen ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-blue-500/30 dark:border-blue-500/40 shadow-xl overflow-hidden transition-all animate-in fade-in zoom-in-98 duration-200">
            {/* Inline Header Bar */}
            <div className="p-4 bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-wrap justify-between items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>{editingQuestion ? "تعديل السؤال الحالي" : "إنشاء وتصميم سؤال جديد"}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 text-[10px] font-extrabold">
                      واجهة كاملة بالدرس
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    تصميم صياغة السؤال ونوعه وتصنيفه مباشرة تحت شريط الأدوات
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-bold bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <X className="w-4 h-4" />
                  <span>إلغاء الواجهة</span>
                </button>
                <button
                  onClick={handleSaveQuestionData}
                  className="px-5 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>حفظ وتأكيد السؤال</span>
                </button>
              </div>
            </div>

            {/* Inline Editor Body */}
            <div className="p-6 space-y-6 text-right" dir="rtl">
              {/* Contextual Toolbar (Progressive Disclosure) */}
              <details className="group bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 [&_summary::-webkit-details-marker]:hidden">
                <summary className="p-2 list-none flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none">
                  <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-500 ml-1">نوع السؤال:</span>
                      <select
                        value={questionType}
                        onChange={(e) => setQuestionType(e.target.value)}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold py-1.5 px-2 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="mcq">اختيار متعدد</option>
                        <option value="true_false">صح أو خطأ</option>
                        <option value="essay">سؤال مقالي</option>
                        <option value="reason">علل</option>
                        <option value="definition">عرف</option>
                        <option value="fill_blanks">أكمل الفراغ</option>
                        <option value="ordering">ترتيب</option>
                        <option value="matching">توصيل</option>
                        <option value="problem">مسألة حسابية</option>
                        <option value="practical">تطبيق عملي</option>
                        <option value="diagram_label">رسم أو تخطيط</option>
                        <option value="image_choice">يعتمد على صورة</option>
                        <option value="table_query">يعتمد على جدول</option>
                        <option value="equation">معادلة رياضية</option>
                      </select>
                    </div>

                    <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-1 hidden sm:block"></div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-500 ml-1 hidden sm:inline">الصعوبة:</span>
                      <select
                        value={questionDifficulty}
                        onChange={(e) => setQuestionDifficulty(e.target.value)}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold py-1.5 px-2 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="easy">سهل</option>
                        <option value="medium">متوسط</option>
                        <option value="hard">صعب</option>
                      </select>
                    </div>

                    <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-1 hidden sm:block"></div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-500 ml-1 hidden sm:inline">الحالة:</span>
                      <select
                        value={questionStatus}
                        onChange={(e) => setQuestionStatus(e.target.value)}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold py-1.5 px-2 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="approved">معتمد وموثق</option>
                        <option value="draft">مسودة قيد المراجعة</option>
                        <option value="archived">مؤرشف</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <Settings className="w-3.5 h-3.5 text-slate-500" />
                    <span>إعدادات متقدمة</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500 group-open:rotate-180 transition-transform" />
                  </div>
                </summary>

                <div className="p-4 border-t border-slate-200 dark:border-slate-700/50">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold text-slate-500">المهارة التعليمية (الوسوم)</label>
                      <input
                        type="text"
                        value={questionTags}
                        onChange={(e) => setQuestionTags(e.target.value)}
                        placeholder="مثال: الفهم والتحليل، الاستذكار"
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold text-slate-500">الصف والمرحلة</label>
                      <input
                        type="text"
                        value={questionGrade}
                        onChange={(e) => setQuestionGrade(e.target.value)}
                        placeholder="مثال: الصف الثالث الثانوي"
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold text-slate-500">مؤلف السؤال</label>
                      <input
                        type="text"
                        value={questionAuthor}
                        onChange={(e) => setQuestionAuthor(e.target.value)}
                        placeholder="أدخل اسم المعلم..."
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  {/* Book / Reference Metadata Section */}
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <span>البيانات المرجعية للبطاقة (Metadata)</span>
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-medium text-slate-500">الكتاب / المصدر</label>
                        <input
                          type="text"
                          value={bookSource}
                          onChange={(e) => setBookSource(e.target.value)}
                          placeholder="اسم الكتاب أو المصدر"
                          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[11px] font-medium text-slate-500">رقم الصفحة</label>
                        <input
                          type="text"
                          value={pageNumber}
                          onChange={(e) => setPageNumber(e.target.value)}
                          placeholder="مثال: 45"
                          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[11px] font-medium text-slate-500">رقم التمرين / السؤال</label>
                        <input
                          type="text"
                          value={exerciseNumber}
                          onChange={(e) => setExerciseNumber(e.target.value)}
                          placeholder="مثال: س3 أو 12"
                          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[11px] font-medium text-slate-500">عنوان السؤال الفرعي</label>
                        <input
                          type="text"
                          value={questionTitle}
                          onChange={(e) => setQuestionTitle(e.target.value)}
                          placeholder="عنوان فرعي اختياري"
                          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </details>

              {/* Main Workspace (Minimal Mode) */}
              <div className="space-y-6 w-full">
                
                {/* 1. Question Text */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-black text-slate-700 dark:text-slate-300">نص السؤال</label>
                  <RichTextEditor onOpenAI={() => setShowAISolver(true)}
                    value={questionText}
                    onChange={(val) => setQuestionText(val)}
                    placeholder="اكتب صيغة السؤال التعليمي بالتفصيل هنا..."
                  />
                </div>

                {/* 2. Specific Inputs (Based on Type) */}
                {questionType === "mcq" && (
                  <div className="space-y-3 bg-blue-50/40 dark:bg-slate-800/40 p-4 rounded-xl border border-blue-100 dark:border-slate-800">
                    <label className="block text-xs font-black text-blue-700 dark:text-blue-400">خيارات الإجابة المتعددة وتحديد الإجابة الصحيحة</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {mcqOptions.map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                          <input
                            type="radio"
                            name="correct-option-radio"
                            checked={opt.isCorrect}
                            onChange={() => {
                              setMcqOptions(mcqOptions.map((o, idx) => ({ ...o, isCorrect: idx === oIdx })));
                            }}
                            className="w-4 h-4 text-blue-600 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-slate-500 shrink-0">
                            {["أ", "ب", "ج", "د", "هـ", "و"][oIdx] || "-"}:
                          </span>
                          <div className="flex-1 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 rounded border border-transparent dark:border-slate-800 bg-white dark:bg-slate-900 min-w-[150px]">
                            <RichTextEditor onOpenAI={() => setShowAISolver(true)}
                              value={opt.text}
                              onChange={(val) => {
                                setMcqOptions(mcqOptions.map((o, idx) => idx === oIdx ? { ...o, text: val } : o));
                              }}
                              placeholder={`الخيار رقم ${oIdx + 1}`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {questionType === "true_false" && (
                  <div className="space-y-2 bg-emerald-50/40 dark:bg-slate-800/40 p-4 rounded-xl border border-emerald-100 dark:border-slate-800">
                    <label className="block text-xs font-black text-emerald-700 dark:text-emerald-400">الإجابة الصحيحة المقررة</label>
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => setQuestionAnswer("صح")}
                        className={`flex-1 py-3 px-4 rounded-xl border font-bold text-center transition-all cursor-pointer ${
                          questionAnswer === "صح" 
                            ? "bg-emerald-600 border-emerald-600 text-white shadow-xs" 
                            : "bg-white dark:bg-slate-900 border-slate-200 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        صح / صواب
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuestionAnswer("خطأ")}
                        className={`flex-1 py-3 px-4 rounded-xl border font-bold text-center transition-all cursor-pointer ${
                          questionAnswer === "خطأ" 
                            ? "bg-red-600 border-red-600 text-white shadow-xs" 
                            : "bg-white dark:bg-slate-900 border-slate-200 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        خطأ / خطأ
                      </button>
                    </div>
                  </div>
                )}

                {questionType === "matching" && (
                  <div className="space-y-3 bg-orange-50/40 dark:bg-slate-800/40 p-4 rounded-xl border border-orange-100 dark:border-slate-800">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs font-black text-orange-700 dark:text-orange-400">توصيل المجموعات والأزواج</label>
                      <button
                        type="button"
                        onClick={() => setMatchingPairsState([...matchingPairsState, { left: "", right: "" }])}
                        className="text-xs text-orange-600 font-bold hover:underline cursor-pointer"
                      >
                        + إضافة زوج توصيل جديد
                      </button>
                    </div>
                    <div className="space-y-2">
                      {matchingPairsState.map((pair, pIdx) => (
                        <div key={pIdx} className="flex gap-2 items-center">
                          <span className="text-xs font-bold text-slate-400 w-6 shrink-0">{pIdx + 1}</span>
                          <div className="flex-1 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 min-w-[120px]">
                            <RichTextEditor onOpenAI={() => setShowAISolver(true)}
                              value={pair.left}
                              onChange={(val) => {
                                setMatchingPairsState(matchingPairsState.map((item, idx) => idx === pIdx ? { ...item, left: val } : item));
                              }}
                              placeholder="العنصر من المجموعة (أ)"
                            />
                          </div>
                          <span className="text-slate-400 shrink-0">↔</span>
                          <div className="flex-1 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 min-w-[120px]">
                            <RichTextEditor onOpenAI={() => setShowAISolver(true)}
                              value={pair.right}
                              onChange={(val) => {
                                setMatchingPairsState(matchingPairsState.map((item, idx) => idx === pIdx ? { ...item, right: val } : item));
                              }}
                              placeholder="العنصر المقابل بالمجموعة (ب)"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setMatchingPairsState(matchingPairsState.filter((_, idx) => idx !== pIdx))}
                            className="p-2 text-slate-400 hover:text-red-500 rounded-lg shrink-0 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {questionType === "ordering" && (
                  <div className="space-y-3 bg-purple-50/40 dark:bg-slate-800/40 p-4 rounded-xl border border-purple-100 dark:border-slate-800">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs font-black text-purple-700 dark:text-purple-400">عناصر الترتيب التسلسلي</label>
                      <button
                        type="button"
                        onClick={() => setOrderingItemsState([...orderingItemsState, ""])}
                        className="text-xs text-purple-600 font-bold hover:underline cursor-pointer"
                      >
                        + إضافة عنصر ترتيب جديد
                      </button>
                    </div>
                    <div className="space-y-2">
                      {orderingItemsState.map((item, iIdx) => (
                        <div key={iIdx} className="flex gap-2 items-center">
                          <span className="text-xs font-bold text-slate-400 w-6 shrink-0">{iIdx + 1}</span>
                          <div className="flex-1 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 min-w-[200px]">
                            <RichTextEditor onOpenAI={() => setShowAISolver(true)}
                              value={item}
                              onChange={(val) => {
                                setOrderingItemsState(orderingItemsState.map((v, idx) => idx === iIdx ? val : v));
                              }}
                              placeholder={`العنصر رقم ${iIdx + 1} في الترتيب الصحيح`}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setOrderingItemsState(orderingItemsState.filter((_, idx) => idx !== iIdx))}
                            className="p-2 text-slate-400 hover:text-red-500 rounded-lg shrink-0 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(questionType === "image_choice" || questionType === "diagram_label") && (
                  <div className="space-y-1.5">
                    <label className="block text-sm font-black text-slate-700 dark:text-slate-300">رابط صورة السؤال</label>
                    <input
                      type="text"
                      value={questionImageUrl}
                      onChange={(e) => setQuestionImageUrl(e.target.value)}
                      placeholder="أدخل رابط الصورة (URL) الكامل هنا..."
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                )}

                {/* 3. Answer Text Block (Now for all types) */}
                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-black text-slate-700 dark:text-slate-300">الإجابة النموذجية أو خطوات الحل</label>
                      <button
                        type="button"
                        onClick={() => setShowAISolver(true)}
                        className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-300 rounded-xl transition text-xs font-bold"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        حل السؤال بالذكاء الاصطناعي
                      </button>
                    </div>
                    <RichTextEditor onOpenAI={() => setShowAISolver(true)}
                      value={questionAnswer}
                      onChange={(val) => setQuestionAnswer(val)}
                      placeholder="اكتب تفاصيل الإجابة الصحيحة أو النموذجية أو خطوات الحل (اختياري للأسئلة الموضوعية)..."
                    />
                  </div>

              </div>
            </div>

            {/* Inline Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex flex-wrap justify-between items-center gap-3">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                قم بتعبئة صياغة السؤال والخيارات ثم اضغط على حفظ وتأكيد لإضافته إلى تطبيقات الدرس.
              </span>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 font-bold rounded-xl transition cursor-pointer"
                >
                  إلغاء التغييرات
                </button>
                <button
                  onClick={handleSaveQuestionData}
                  className="px-5 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>حفظ وتأكيد السؤال</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Quick Summary & Statistics Ribbon */}
            <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-3xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <BarChart2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>إحصائيات الأسئلة:</span>
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-extrabold">
                  {totalQuestions} أسئلة
                </span>
                {mcqCount > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-semibold text-[11px]">
                    اختيار: {mcqCount}
                  </span>
                )}
                {tfCount > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-semibold text-[11px]">
                    صح/خطأ: {tfCount}
                  </span>
                )}
                {essayCount > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-semibold text-[11px]">
                    مقالي: {essayCount}
                  </span>
                )}
                {practicalCount > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-semibold text-[11px]">
                    عملي: {practicalCount}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    const allExpanded = cardQuestions.every((q: any) => expandedAnswers[q.id]);
                    if (allExpanded) {
                      setExpandedAnswers({});
                    } else {
                      const newMap: Record<string, boolean> = {};
                      cardQuestions.forEach((q: any) => { newMap[q.id] = true; });
                      setExpandedAnswers(newMap);
                    }
                  }}
                  className="px-2.5 py-1 text-xs bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold rounded-lg border border-purple-200 dark:border-purple-800/80 transition flex items-center gap-1.5 cursor-pointer shadow-3xs"
                  title="طي أو عرض جميع الإجابات النموذجية وسلم التصحيح لأسئلة هذه البطاقة"
                >
                  {cardQuestions.every((q: any) => expandedAnswers[q.id]) ? (
                    <ChevronUp className="w-3.5 h-3.5 text-purple-600" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-purple-600" />
                  )}
                  <span>
                    {cardQuestions.every((q: any) => expandedAnswers[q.id])
                      ? "طي جميع الإجابات"
                      : "عرض جميع الإجابات وسلم التصحيح"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowStatsOverview(!showStatsOverview)}
                  className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>{showStatsOverview ? "إخفاء التفاصيل" : "عرض تفاصيل الصعوبة"}</span>
                  {showStatsOverview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Expandable Difficulty & Details Panel */}
            {showStatsOverview && (
              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-3xs grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in fade-in duration-150">
                <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/40 text-center">
                  <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">مستوى سهل</div>
                  <div className="text-xl font-black text-emerald-800 dark:text-emerald-300 mt-1">{easyCount}</div>
                </div>
                <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-900/40 text-center">
                  <div className="text-xs font-bold text-amber-700 dark:text-amber-400">مستوى متوسط</div>
                  <div className="text-xl font-black text-amber-800 dark:text-amber-300 mt-1">{medCount}</div>
                </div>
                <div className="p-3 bg-rose-50/50 dark:bg-rose-950/20 rounded-xl border border-rose-100 dark:border-rose-900/40 text-center">
                  <div className="text-xs font-bold text-rose-700 dark:text-rose-400">مستوى صعب</div>
                  <div className="text-xl font-black text-rose-800 dark:text-rose-300 mt-1">{hardCount}</div>
                </div>
              </div>
            )}

            {/* Main Question Cards (100% Full Width) */}
            {cardQuestions.length === 0 ? (
              <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                  <FileText className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-slate-700 dark:text-slate-300">لا توجد أسئلة مضافة في هذا الدرس حالياً</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  يمكنك إنشاء سؤال جديد ومخصص لهذا الدرس أو استيراد أسئلة جاهزة من بنك الأسئلة المركزي.
                </p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={handleAddNewQuestion}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة سؤال جديد</span>
                  </button>
                  <button
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent("open-question-hub", { detail: { tab: "bank" } }));
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>استعراض بنك الأسئلة</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {cardQuestions.map((q, qIdx) => {
                  const details = getQuestionTypeDetails(q.type);
                  const TypeIcon = details.icon;
                  
                  return (
                    <div 
                      key={q.id || qIdx}
                      id={`editor-question-card-${q.id || qIdx}`}
                      className={`rounded-2xl border transition-all duration-200 shadow-xs hover:shadow-md ${
                        q.cardColor 
                          ? q.cardColor 
                          : "bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800"
                      }`}
                    >
                      {/* Top Card Header Toolbar */}
                      <div className="p-3 sm:px-4 sm:py-3 bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 rounded-t-2xl flex flex-wrap items-center justify-between gap-2.5">
                        {/* Right side: Number, Type, Difficulty, Marks, Origin Badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Question Number Badge */}
                          <div className="flex items-center gap-1.5 bg-blue-600 text-white font-extrabold text-xs px-2.5 py-1 rounded-lg shadow-3xs">
                            <span className="font-mono">س {qIdx + 1}</span>
                          </div>

                          {/* Question Type Badge */}
                          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${details.color} border border-current/10`}>
                            <TypeIcon className="w-3.5 h-3.5" />
                            <span>{details.label}</span>
                          </div>

                          {/* Difficulty Badge */}
                          <span className={`text-[11px] px-2.5 py-0.5 rounded-lg font-bold border ${
                            q.difficulty === "hard" ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800" :
                            q.difficulty === "easy" ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800" :
                            "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                          }`}>
                            {q.difficulty === "hard" ? "صعب" : q.difficulty === "easy" ? "سهل" : "متوسط"}
                          </span>

                          {/* Source / Linkage Origin Badge */}
                          {(() => {
                            const srcInfo = getQuestionSourceType(q);
                            return (
                              <span className={`text-[11px] px-2.5 py-0.5 rounded-lg font-bold border ${srcInfo.color} flex items-center gap-1`}>
                                <span>{srcInfo.icon}</span>
                                <span>{srcInfo.label}</span>
                              </span>
                            );
                          })()}

                          {/* Status Badge */}
                          {q.status === "draft" && (
                            <span className="text-[11px] px-2 py-0.5 rounded-lg bg-gray-100 text-gray-600 font-semibold border border-gray-200">
                              مسودة
                            </span>
                          )}
                        </div>

                        {/* Left side: Controls Toolbar + Kebab Menu */}
                        <div className="flex items-center gap-1.5 flex-wrap mr-auto">
                          {/* 1. Visibility in Lesson Toggle */}
                          <button
                            type="button"
                            onClick={() => {
                              const isCurrentlyVisible = q.isVisible !== false && q.isVisible !== "false";
                              const newVisibility = !isCurrentlyVisible;
                              const updatedList = cardQuestions.map((item) =>
                                item.id === q.id ? { ...item, isVisible: newVisibility } : item
                              );
                              updateParagraph(p.id, "body", JSON.stringify(updatedList));
                              window.dispatchEvent(new CustomEvent("refresh-data-all"));
                            }}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                              q.isVisible !== false && q.isVisible !== "false"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                                : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                            }`}
                            title={q.isVisible !== false && q.isVisible !== "false" ? "السؤال معروض بالدرس - انقر للإخفاء" : "السؤال مخفي من الدرس - انقر للإظهار"}
                          >
                            {q.isVisible !== false && q.isVisible !== "false" ? <Eye className="w-3.5 h-3.5 text-emerald-600" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
                            <span className="hidden sm:inline">{q.isVisible !== false && q.isVisible !== "false" ? "معروض بالدرس" : "مخفي من الدرس"}</span>
                          </button>

                          {/* 2. Toggle Model Answer & Scoring Rubric Collapse / Expand */}
                          {(() => {
                            const qHasAnswer = hasAnswer(q);
                            return (
                              <button
                                type="button"
                                disabled={!qHasAnswer}
                                onClick={() => {
                                  if (!qHasAnswer) return;
                                  setExpandedAnswers((prev) => ({
                                    ...prev,
                                    [q.id]: !prev[q.id],
                                  }));
                                }}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                                  !qHasAnswer
                                    ? "bg-slate-100 text-slate-400 border-slate-200 opacity-60 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700"
                                    : expandedAnswers[q.id]
                                    ? "bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200 dark:bg-purple-900/50 dark:text-purple-200 dark:border-purple-700 cursor-pointer"
                                    : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 cursor-pointer"
                                }`}
                                title={
                                  !qHasAnswer
                                    ? "لا توجد إجابة متوفرة لطيها أو عرضها"
                                    : expandedAnswers[q.id]
                                    ? "طي الإجابة النموذجية وسلم التصحيح"
                                    : "عرض وتوسيع الإجابة النموذجية وسلم التصحيح"
                                }
                              >
                                {expandedAnswers[q.id] ? (
                                  <ChevronUp className="w-3.5 h-3.5 text-purple-700 dark:text-purple-300" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                )}
                                <span className="hidden sm:inline">
                                  {expandedAnswers[q.id] ? "طي الإجابة" : "عرض الإجابة وسلم التصحيح"}
                                </span>
                              </button>
                            );
                          })()}

                          {/* 3. Preview Button */}
                          <button
                            type="button"
                            onClick={() => setPreviewingQuestion(q)}
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg transition-all cursor-pointer border border-transparent hover:border-indigo-200"
                            title="معاينة السؤال"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* 4. Edit Button */}
                          <button
                            type="button"
                            onClick={() => handleEditQuestion(q)}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg transition-all cursor-pointer border border-transparent hover:border-blue-200"
                            title="تعديل بيانات وصياغة السؤال"
                          >
                            <Settings className="w-4 h-4" />
                          </button>

                          {/* 5. Move Up / Down Buttons */}
                          {qIdx > 0 && (
                            <button
                              type="button"
                              onClick={() => handleMoveQuestion(qIdx, "up")}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                              title="تحريك السؤال لأعلى"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>
                          )}
                          {qIdx < cardQuestions.length - 1 && (
                            <button
                              type="button"
                              onClick={() => handleMoveQuestion(qIdx, "down")}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                              title="تحريك السؤال لأسفل"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>
                          )}

                          {/* 6. Sync to Question Bank Button */}
                          {syncStatus[q.id] ? (
                            <span className="text-xs text-emerald-700 font-bold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 px-2 py-1 rounded-lg">
                              {syncStatus[q.id]}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSyncToBank(q)}
                              className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg transition-all cursor-pointer border border-transparent hover:border-emerald-200"
                              title="إرسال ومزامنة السؤال مع بنك الأسئلة"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}

                          {/* 7. Kebab «⋮» Menu Dropdown */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setOpenMenuQuestionId(openMenuQuestionId === q.id ? null : q.id)}
                              className={`p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg transition-all cursor-pointer border ${
                                openMenuQuestionId === q.id ? "bg-slate-200 dark:bg-slate-700 border-slate-300" : "border-transparent"
                              }`}
                              title="المزيد من الإجراءات"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {openMenuQuestionId === q.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-30"
                                  onClick={() => setOpenMenuQuestionId(null)}
                                />
                                <div className="absolute left-0 mt-1.5 w-52 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-40 text-right animate-in fade-in zoom-in-95 duration-150">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleCopyQuestion(q);
                                      setOpenMenuQuestionId(null);
                                    }}
                                    className="w-full px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/70 flex items-center gap-2 text-right transition cursor-pointer"
                                  >
                                    <Copy className="w-3.5 h-3.5 text-amber-600" />
                                    <span>نسخ وتكرار السؤال</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      localStorage.setItem("edutech_focus_question_id", q.id);
                                      window.dispatchEvent(new CustomEvent("navigate-tab", { detail: "questions" }));
                                      setTimeout(() => {
                                        window.dispatchEvent(new CustomEvent("focus-question-bank"));
                                      }, 150);
                                      setOpenMenuQuestionId(null);
                                    }}
                                    className="w-full px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/70 flex items-center gap-2 text-right transition cursor-pointer"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5 text-purple-600" />
                                    <span>فتح في بنك الأسئلة</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleSyncToBank(q);
                                      setOpenMenuQuestionId(null);
                                    }}
                                    className="w-full px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/70 flex items-center gap-2 text-right transition cursor-pointer"
                                  >
                                    <Send className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>مزامنة مع بنك الأسئلة</span>
                                  </button>

                                  <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuQuestionId(null);
                                      handleDeleteClick(q.id);
                                    }}
                                    className="w-full px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2 text-right transition cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                    <span>حذف السؤال من الدرس...</span>
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Main Question Card Content - 100% Full Width */}
                      <div className="p-5 sm:p-6 space-y-4 w-full text-right" dir="rtl">
                        {/* Question Text - Large, Prominent, Clear */}
                        <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-relaxed min-w-0">
                          {q.text ? (
                            <MathText text={q.text} />
                          ) : (
                            <span className="text-slate-400 italic font-normal">بلا نص...</span>
                          )}
                        </div>

                        {/* Attached Image if present */}
                        {q.imageUrl && (
                          <div className="my-3 flex justify-center">
                            <img
                              src={q.imageUrl}
                              alt="صورة السؤال"
                              className="max-h-64 max-w-full object-contain rounded-xl border border-slate-200 dark:border-slate-700 bg-white p-1 shadow-xs"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}

                        {/* Question Specific Content */}
                        {/* 1. MCQ Options */}
                        {(q.type === "mcq" || q.type === "multiple_choice") && (q.distractors || q.options) && (
                          <div className="w-full overflow-x-auto pt-2">
                            <table className="w-full table-fixed border-collapse border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden text-sm" dir="rtl">
                              <tbody>
                                <tr className="align-middle">
                                  {(q.distractors || q.options).map((d: any, dIdx: number) => {
                                    const text = typeof d === 'string' ? d : d.text || "";
                                    const arabicLetters = ["أ", "ب", "ج", "د", "هـ", "و"];
                                    const optionLabel = arabicLetters[dIdx] || `${dIdx + 1}`;
                                    const isCorrect = isOptionCorrect(q, d, dIdx);
                                    const isAnswerHidden = q.hideAnswer === true || q.hideAnswer === "true";
                                    const shouldHighlight = expandedAnswers[q.id] && isCorrect && !isAnswerHidden;
                                    const optionsList = q.distractors || q.options;
                                    const colWidth = `${100 / Math.max(1, optionsList.length)}%`;

                                    return (
                                      <td
                                        key={d.id || dIdx}
                                        className={`p-2 sm:p-2.5 border border-slate-200 dark:border-slate-700 text-right align-middle transition-colors ${
                                          shouldHighlight
                                            ? "bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200"
                                            : "bg-slate-50/60 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200"
                                        }`}
                                        style={{ width: colWidth, verticalAlign: "middle" }}
                                      >
                                        <div className="flex items-center justify-start gap-2 w-full min-w-0" dir="rtl">
                                          <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 select-none ${
                                            shouldHighlight
                                              ? "bg-emerald-600 text-white"
                                              : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                                          }`}>
                                            {optionLabel}
                                          </span>
                                          <div className="flex-1 min-w-0 break-words leading-snug text-right">
                                            <MathText text={text} />
                                          </div>
                                          {shouldHighlight && (
                                            <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 shrink-0 bg-emerald-100 dark:bg-emerald-900/60 px-1 py-0.5 rounded">
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

                        {/* 2. True / False */}
                        {(q.type === "true_false" || q.type === "tf") && (
                          <div className="flex items-center gap-4 pt-1 flex-wrap">
                            {(() => {
                              const isAnswerHidden = q.hideAnswer === true || q.hideAnswer === "true";
                              const isTrueCorrect = !isAnswerHidden && (
                                q.answer === "صح" || q.answer === "صواب" || q.answer === "صحيح" || q.answer === "true" || q.answer === "True"
                              );
                              const isFalseCorrect = !isAnswerHidden && (
                                q.answer === "خطأ" || q.answer === "خاطئ" || q.answer === "false" || q.answer === "False"
                              );

                              return (
                                <>
                                  <div className={`px-4 py-2.5 rounded-xl border flex items-center gap-2 font-bold text-sm ${
                                    isTrueCorrect
                                      ? "bg-emerald-50 border-emerald-400 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200 shadow-xs"
                                      : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                                  }`}>
                                    <span>( &nbsp;&nbsp;&nbsp;&nbsp; )</span>
                                    <span>صواب / صَحّ</span>
                                    {isTrueCorrect && (
                                      <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded-md font-extrabold mr-2">الإجابة الصحيحة</span>
                                    )}
                                  </div>
                                  <div className={`px-4 py-2.5 rounded-xl border flex items-center gap-2 font-bold text-sm ${
                                    isFalseCorrect
                                      ? "bg-rose-50 border-rose-400 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200 shadow-xs"
                                      : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                                  }`}>
                                    <span>( &nbsp;&nbsp;&nbsp;&nbsp; )</span>
                                    <span>خطأ / خَطَأ</span>
                                    {isFalseCorrect && (
                                      <span className="text-[10px] bg-rose-600 text-white px-1.5 py-0.5 rounded-md font-extrabold mr-2">الإجابة الصحيحة</span>
                                    )}
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        )}

                        {/* 3. Matching */}
                        {q.type === "matching" && q.matchingPairs && q.matchingPairs.length > 0 && (
                          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 pt-1">
                            <table className="w-full text-right text-sm">
                              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                  <th className="p-2.5 w-1/2 border-l border-slate-200 dark:border-slate-700">العمود الأول (أ)</th>
                                  <th className="p-2.5 w-1/2">العمود الثاني (ب)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {q.matchingPairs.map((pair: any, pIdx: number) => {
                                  const arabicLetters = ["أ", "ب", "ج", "د", "هـ", "و"];
                                  return (
                                    <tr key={pIdx} className="bg-white/60 dark:bg-slate-900/40">
                                      <td className="p-2.5 border-l border-slate-200 dark:border-slate-700 font-medium">
                                        <div className="flex items-baseline gap-2">
                                          <span className="font-bold text-slate-400">{pIdx + 1}.</span>
                                          <div className="flex-1"><MathText text={pair.left || ""} /></div>
                                        </div>
                                      </td>
                                      <td className="p-2.5 font-medium">
                                        <div className="flex items-baseline gap-2">
                                          <span className="font-bold text-slate-400">({arabicLetters[pIdx] || pIdx + 1})</span>
                                          <div className="flex-1"><MathText text={pair.right || ""} /></div>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* 4. Ordering */}
                        {q.type === "ordering" && q.sequenceItems && q.sequenceItems.length > 0 && (
                          <div className="space-y-2 pt-1">
                            {q.sequenceItems.map((item: string, sIdx: number) => (
                              <div key={sIdx} className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-baseline gap-2.5 font-medium text-sm">
                                <span className="w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold flex items-center justify-center text-xs shrink-0">
                                  {sIdx + 1}
                                </span>
                                <div className="flex-1"><MathText text={item} /></div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 5. Teacher Answer Key / Solution - Collapsible & Collapsed by default */}
                        {q.answer && !(q.hideAnswer === true || q.hideAnswer === "true") && (
                          <div className="border border-purple-200 dark:border-purple-800/80 rounded-xl overflow-hidden bg-gradient-to-l from-purple-50/60 to-indigo-50/60 dark:from-purple-950/20 dark:to-indigo-950/20 transition-all shadow-2xs">
                            <button
                              type="button"
                              onClick={() => {
                                setExpandedAnswers((prev) => ({
                                  ...prev,
                                  [q.id]: !prev[q.id],
                                }));
                              }}
                              className="w-full p-3 flex items-center justify-between text-xs font-black text-purple-900 dark:text-purple-200 hover:bg-purple-100/70 dark:hover:bg-purple-900/40 transition cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></span>
                                <span>الإجابة النموذجية وسلّم التصحيح</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold border border-purple-200/80 dark:border-purple-800">
                                  {expandedAnswers[q.id] ? "معروضة" : "مطوية تلقائياً"}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-purple-700 dark:text-purple-300 font-bold bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-800 shadow-3xs">
                                <span>{expandedAnswers[q.id] ? "طي الإجابة" : "عرض الإجابة النموذجية وسلم التصحيح"}</span>
                                {expandedAnswers[q.id] ? (
                                  <ChevronUp className="w-4 h-4 text-purple-600" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-purple-600" />
                                )}
                              </div>
                            </button>

                            {expandedAnswers[q.id] && (
                              <div className="p-4 pt-2 border-t border-purple-200/80 dark:border-purple-800/80 text-sm font-semibold text-purple-950 dark:text-purple-100 leading-relaxed animate-in fade-in duration-200">
                                <MathText text={q.answer} />
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Card Footer Metadata */}
                      <div className="px-4 py-2.5 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800/80 rounded-b-2xl flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-2 flex-wrap">
                          {q.tags && q.tags.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[11px] font-semibold text-slate-400">الوسوم:</span>
                              {q.tags.map((tag: string, tIdx: number) => (
                                <span key={tIdx} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md text-[10px] font-medium border border-slate-200 dark:border-slate-700">
                                  #{tag.trim()}
                                </span>
                              ))}
                            </div>
                          )}
                          
                          {/* Book Reference Metadata */}
                          {(() => {
                            const ref = typeof q.bookReference === "string"
                              ? { bookSource: q.bookReference }
                              : (q.bookReference || { bookSource: [subject?.name, unit?.title, lesson?.title].filter(Boolean).join(" - ") });
                            const hasAnyRef = Boolean(ref?.bookSource || ref?.pageNumber || ref?.exerciseNumber || ref?.questionTitle);
                            if (!hasAnyRef) return null;
                            return (
                              <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium flex-wrap mt-1">
                                <div className="flex items-center gap-2 bg-slate-100/80 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700">
                                  {ref.bookSource && (
                                    <span className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                                      <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                                      {ref.bookSource}
                                    </span>
                                  )}
                                  {ref.pageNumber && (
                                    <span className="flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400">
                                      <FileText className="w-3 h-3" />
                                      ص: {ref.pageNumber}
                                    </span>
                                  )}
                                  {ref.exerciseNumber && (
                                    <span className="flex items-center gap-1 font-semibold text-purple-600 dark:text-purple-400">
                                      <Hash className="w-3 h-3" />
                                      تمرين: {ref.exerciseNumber}
                                    </span>
                                  )}
                                  {ref.questionTitle && (
                                    <span className="flex items-center gap-1 font-semibold text-orange-600 dark:text-orange-400">
                                      <Tag className="w-3 h-3" />
                                      {ref.questionTitle}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })()}

                        </div>
                        <div className="flex items-center gap-3 text-[11px] font-medium text-slate-400 mr-auto">
                          {q.author && <span>الكاتب: {q.author}</span>}
                          {q.grade && <span>• الصف: {q.grade}</span>}
                          {q.term && <span>• الفصل: {q.term}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}





        {/* 2. Modal Overlay for Question Live Preview (Requirement 7) */}
        {previewingQuestion && (
          <div className="fixed inset-0 z-[2000] bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden text-right" dir="rtl">
              <div className="p-4 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <h4 className="font-bold text-slate-800 dark:text-slate-200">معاينة تفاصيل السؤال</h4>
                <button onClick={() => setPreviewingQuestion(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <QuestionRenderer
                  question={previewingQuestion}
                  questionNumber={1}
                  numberFormat="dash"
                  mode="preview-only"
                  showAnswerKey={true}
                />

                <div className="grid grid-cols-2 gap-2 text-center text-[10px] text-slate-500 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="block font-bold">مستوى الصعوبة</span>
                    <span className="font-black text-slate-800 dark:text-slate-200 text-xs uppercase">
                      {previewingQuestion.difficulty === "hard" ? "صعب" : previewingQuestion.difficulty === "easy" ? "سهل" : "متوسط"}
                    </span>
                  </div>
                  <div>
                    <span className="block font-bold">حالة التوثيق</span>
                    <span className="font-black text-slate-800 dark:text-slate-200 text-xs">
                      {previewingQuestion.status === "approved" ? "معتمد" : previewingQuestion.status === "draft" ? "مسودة" : "مؤرشف"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. Three-Way Deletion Confirmation Sync Wizard Modal (Requirement 5) */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[2000] bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden text-right" dir="rtl">
              
              {/* Header */}
              <div className="p-4 bg-red-50 dark:bg-red-950/30 border-b border-red-100 dark:border-red-950/50 flex justify-between items-center">
                <h4 className="font-black text-red-700 dark:text-red-400 flex items-center gap-2">
                  <Trash2 className="w-5 h-5" />
                  <span>تأكيد حذف السؤال وتنسيق بنك الأسئلة</span>
                </h4>
                <button onClick={() => setShowDeleteConfirm(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                {isUsed ? (
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl space-y-2 flex gap-3">
                    <span className="text-xl shrink-0">⚠️</span>
                    <div>
                      <strong className="block text-xs text-amber-800 dark:text-amber-400 font-bold">هذا السؤال مرتبط باختبارات</strong>
                      <span className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed block mt-0.5">
                        لا يمكن حذف هذا السؤال نهائياً لأنه مستخدم في اختبارات نشطة في النظام حالياً. لمنع تلف بيانات هذه الاختبارات، تم تعطيل خيار الحذف النهائي، وبدلاً من ذلك يمكنك **أرشفته** لإخفائه مؤقتاً أو **فك ارتباطه** بالدرس.
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    لقد طلبت إزالة هذا السؤال من الدرس الحالي. يرجى اختيار الإجراء المطلوب تنفيذه على بنك الأسئلة الرئيسي للحفاظ على التزامن:
                  </p>
                )}

                <div className="space-y-3">
                  {/* Option 1: Remove from bank too */}
                  <button
                    disabled={isUsed}
                    onClick={() => !isUsed && executeDelete("delete_bank")}
                    className={`w-full p-3 text-right flex items-start gap-3 transition-all rounded-xl border ${
                      isUsed
                        ? "bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 opacity-60 cursor-not-allowed"
                        : "bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 border-red-200 dark:border-red-900/50 cursor-pointer"
                    }`}
                  >
                    <span className={`p-1 rounded-lg shrink-0 ${isUsed ? "bg-slate-200 dark:bg-slate-700 text-slate-500" : "bg-red-100 dark:bg-red-900/40 text-red-700"}`}>
                      {isUsed ? "🔒" : "🗑️"}
                    </span>
                    <div>
                      <strong className={`block text-xs font-bold ${isUsed ? "text-slate-500 dark:text-slate-400" : "text-red-800 dark:text-red-400"}`}>
                        حذف السؤال نهائياً من بنك الأسئلة {isUsed && "(غير متاح)"}
                      </strong>
                      <span className={`text-[11px] leading-normal block mt-0.5 ${isUsed ? "text-slate-400 dark:text-slate-500" : "text-red-600/80"}`}>
                        {isUsed
                          ? "تم قفل هذا الخيار لأن السؤال مرتبط باختبارات نشطة في النظام حالياً."
                          : "سيتم مسح السؤال تماماً من الدرس الحالي ومن قاعدة بيانات بنك الأسئلة ولن يظهر في أي اختبارات أخرى."}
                      </span>
                    </div>
                  </button>

                  {/* Option 2: Keep in bank */}
                  <button
                    onClick={() => executeDelete("keep_bank")}
                    className="w-full p-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-xl text-right flex items-start gap-3 transition-all cursor-pointer"
                  >
                    <span className="p-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 rounded-lg shrink-0">📁</span>
                    <div>
                      <strong className="block text-xs text-blue-800 dark:text-blue-400 font-bold">الإبقاء على السؤال في بنك الأسئلة (إزالة من البطاقة فقط)</strong>
                      <span className="text-[11px] text-blue-600/80 leading-normal block mt-0.5">سيتم حذف ارتباط السؤال بهذه البطاقة فقط، مع الاحتفاظ التام ببيانات السؤال وتصنيفاته وربطه بالدرس الأصلي والوحدة والمادة في بنك الأسئلة.</span>
                    </div>
                  </button>

                  {/* Option 3: Archive in bank */}
                  <button
                    onClick={() => executeDelete("archive_bank")}
                    className="w-full p-3 bg-amber-50 hover:bg-amber-100 dark:bg-amber-50/10 dark:hover:bg-amber-50/20 border border-amber-200 dark:border-amber-900/50 rounded-xl text-right flex items-start gap-3 transition-all cursor-pointer"
                  >
                    <span className="p-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 rounded-lg shrink-0">📦</span>
                    <div>
                      <strong className="block text-xs text-amber-800 dark:text-amber-400 font-bold">أرشفة السؤال في بنك الأسئلة</strong>
                      <span className="text-[11px] text-amber-600/80 leading-normal block mt-0.5">سيتم إزالة السؤال من الدرس، مع تغيير حالته إلى "مؤرشف" في بنك الأسئلة لإخفائه مؤقتاً دون حذفه نهائياً.</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  إلغاء الإجراء
                </button>
              </div>

            </div>
          </div>
        )}

        <UnifiedQuestionHubModal
          isOpen={isPickerModalOpen}
          onClose={() => setIsPickerModalOpen(false)}
          initialTab="bank"
          currentLessonId={lesson?.id}
          onInsertQuestions={handleInsertFromBank}
        />
      </div>
    );
  };

  // Custom UI for Notes
  const renderNoteEditor = () => {
    let data = { type: "info", text: "", isVisible: true };
    try { if (p.body.startsWith("{")) data = JSON.parse(p.body); } catch(e) {}
    
    return (
      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-b-xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700 sticky top-[36px] z-10 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-sm pt-2 -mt-2">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">إعدادات الملاحظة</span>
          <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={data.isVisible !== false}
              onChange={(e) => updateParagraph(p.id, "body", JSON.stringify({...data, isVisible: e.target.checked}))}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
            />
            <span className={`text-xs font-bold flex items-center gap-1 ${data.isVisible !== false ? "text-emerald-700 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
              {data.isVisible !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{data.isVisible !== false ? "إظهار الملاحظة في الدرس" : "إخفاء الملاحظة من الدرس"}</span>
            </span>
          </label>
        </div>
        <div className="flex gap-4">
          <div className="w-1/3">
            <label className="block text-xs font-bold text-slate-500 mb-1">نوع الملاحظة</label>
            <select className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" value={data.type} onChange={e => updateParagraph(p.id, "body", JSON.stringify({...data, type: e.target.value}))}>
              <option value="info">معلومة إثرائية</option>
              <option value="warning">تنبيه / تحذير</option>
              <option value="tip">تلميح مهم</option>
              <option value="quote">اقتباس</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 mb-1">نص الملاحظة</label>
            <div className="min-h-[auto] border border-slate-200 dark:border-slate-700 rounded-xl">
              <RichTextEditor onOpenAI={() => setShowAISolver(true)}
                value={data.text}
                isActive={isActive}
                autoFocus={shouldAutoFocus}
                autoFocusPosition={autoFocusPosition}
                onAutoFocusComplete={() => onAutoFocusComplete?.(p.id)}
                onNavigatePrevious={() => onNavigateCard?.(p.id, "previous")}
                onNavigateNext={() => onNavigateCard?.(p.id, "next")}
                lineSpacing={p.lineSpacing}
                onLineSpacingChange={(val) => updateParagraph(p.id, "lineSpacing", val)}
                onChange={(val) => updateParagraph(p.id, "body", JSON.stringify({ ...data, text: val }))}
                placeholder="اكتب نص الملاحظة هنا..."
                readOnly={readOnly}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (p.type === "images") return renderImageEditor();
    if (p.type === "math") return renderMathEditor();
    if (p.type === "activities") return renderActivityEditor();
    if (p.type === "questions") return renderQuestionEditor();
    if (p.type === "notes") return renderNoteEditor();
    if (p.type === "page-break") {
      return (
        <div className="p-4 bg-rose-50/70 dark:bg-rose-950/30 rounded-b-xl border-t border-rose-200 dark:border-rose-900/50 flex items-center justify-between text-xs text-rose-800 dark:text-rose-200 font-bold select-none">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-100 dark:bg-rose-900/60 rounded-xl text-rose-600 dark:text-rose-400">
              <BetweenVerticalEnd className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="text-sm font-extrabold block">✂️ فاصل صفحة A4 إجباري</span>
              <span className="text-[11px] text-rose-600 dark:text-rose-400 font-normal block mt-0.5">
                سيتم إجبار انتقال جميع البطاقات التالية في المستند إلى صفحة جديدة تماماً في المعاينة والطباعة.
              </span>
            </div>
          </div>
          <span className="px-3 py-1 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 rounded-lg text-[11px] shadow-3xs font-mono">
            Page Break
          </span>
        </div>
      );
    }
    
    // Default RichText
    return (
      <div className="bg-white dark:bg-slate-900 rounded-b-xl overflow-hidden relative">
        <RichTextEditor onOpenAI={() => setShowAISolver(true)}
          value={p.body}
          isActive={isActive}
          autoFocus={shouldAutoFocus}
          autoFocusPosition={autoFocusPosition}
          onAutoFocusComplete={() => onAutoFocusComplete?.(p.id)}
          onNavigatePrevious={() => onNavigateCard?.(p.id, "previous")}
          onNavigateNext={() => onNavigateCard?.(p.id, "next")}
          lineSpacing={p.lineSpacing}
          onLineSpacingChange={(val) => updateParagraph(p.id, "lineSpacing", val)}
          onChange={(val) => updateParagraph(p.id, "body", val)}
          onFocus={(editor) => {
            setActiveParagraphId(p.id);
            if (setActiveEditor) setActiveEditor(editor);
          }}
          onBlur={() => {}}
          placeholder={`اكتب محتوى ${p.title} هنا...`}
          readOnly={readOnly}
        />
      </div>
    );
  };

  return (
    <CardShell
      p={p}
      index={index}
      totalCards={totalCards}
      cardInfo={cardInfo}
      cardTypesList={cardTypesList}
      isDragged={isDragged}
      isActive={isActive}
      isCollapsed={isCollapsed}
      setActiveParagraphId={setActiveParagraphId}
      onRequestEditorFocus={onRequestEditorFocus}
      handleDragStart={handleDragStart}
      handleDragOver={handleDragOver}
      handleDragEnd={handleDragEnd}
      updateParagraph={updateParagraph}
      toggleCollapse={toggleCollapse}
      duplicateParagraph={duplicateParagraph}
      moveParagraph={moveParagraph}
      deleteParagraph={deleteParagraph}
      setShowAISolver={setShowAISolver}
      readOnly={readOnly}
    >
      {isCollapsed ? (
        <div
          onClick={(e) => { e.stopPropagation(); toggleCollapse(p.id); }}
          className="px-4 py-2.5 bg-slate-50/90 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800/60 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-between cursor-pointer hover:bg-blue-50/60 dark:hover:bg-slate-800/90 transition-colors select-none group/collapsed"
          title="انقر لتوسيع هذه البطاقة"
        >
          <div className="flex items-center gap-2 overflow-hidden truncate max-w-2xl">
            <span className="truncate text-slate-700 dark:text-slate-200 font-medium">
              {(() => {
                if (p.type === "questions") {
                  let parsed: any[] = [];
                  try {
                    if (p.body) {
                      const json = JSON.parse(p.body);
                      if (Array.isArray(json)) parsed = json;
                      else if (json && typeof json === "object") parsed = [json];
                    }
                  } catch (e) {
                    if (p.body && p.body.trim()) {
                      const res = parseQuestionsFromContent(p.body);
                      if (res?.questions) parsed = res.questions;
                    }
                  }

                  if (parsed.length > 0) {
                    const mcq = parsed.filter((q: any) => q.type === "mcq" || q.type === "multiple_choice").length;
                    const tf = parsed.filter((q: any) => q.type === "true_false" || q.type === "tf").length;
                    const problems = parsed.filter((q: any) => q.type === "problem" || q.type === "computational" || q.type === "reason").length;
                    const essay = parsed.length - (mcq + tf + problems);

                    const parts: string[] = [`${parsed.length} أسئلة`];
                    if (mcq > 0) parts.push(`${mcq} اختيار من متعدد`);
                    if (problems > 0) parts.push(`${problems} مسائل`);
                    if (tf > 0) parts.push(`${tf} صح/خطأ`);
                    if (essay > 0) parts.push(`${essay} مقالي`);

                    return parts.join(" • ");
                  }
                  return "بنك أسئلة فارغ";
                }

                // Non-questions
                let bodyText = "";
                if (p.body) {
                  if (p.body.startsWith("{") || p.body.startsWith("[")) {
                    bodyText = "محتوى خاص منسّق";
                  } else {
                    bodyText = p.body
                      .replace(/<br\s*\/?\s*>/gi, " ")
                      .replace(/<\/(p|div|li|h[1-6])>/gi, " ")
                      .replace(/<[^>]*>/g, " ")
                      .replace(/&amp;nbsp;|&nbsp;|&#160;|&#xA0;/gi, " ")
                      .replace(/&amp;/gi, "&")
                      .replace(/&lt;/gi, "<")
                      .replace(/&gt;/gi, ">")
                      .replace(/\s+/g, " ")
                      .trim();
                  }
                }

                if (!bodyText) {
                  return "المحتوى فارغ";
                }

                const words = bodyText.split(/\s+/).filter(Boolean).length;
                const snippet = bodyText.slice(0, 60) + (bodyText.length > 60 ? "..." : "");
                return `${words} كلمة • ${snippet}`;
              })()}
            </span>
          </div>
          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-2.5 py-1 rounded-full border border-blue-200/60 dark:border-blue-800/60 group-hover/collapsed:bg-blue-100 dark:group-hover/collapsed:bg-blue-900/60 transition shrink-0">
            مطوية · انقر للتوسيع ⌄
          </span>
        </div>
      ) : (
        renderContent()
      )}
      {/* AI Solver Modal */}
      {showAISolver && (
        <AIQuestionSolverModal
          question={{
            id: "temp",
            subjectId: "temp",
            unitId: "temp",
            lessonId: "temp",
            type: "mcq",
            text: p.body,
            answer: "",
            difficulty: "medium",
            importance: 3
          } as any}
          onClose={() => setShowAISolver(false)}
          onInsert={(ans) => updateParagraph(p.id, "body", p.body + "\n" + ans)}
        />
      )}
    </CardShell>
  );
});
