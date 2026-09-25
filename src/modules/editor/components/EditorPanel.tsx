import { LessonOutline, hasCardContent } from "./LessonOutline";
import "./focused-editor.css";
import { FocusedEditorWorkspace, WorkspaceToolbarHost, WorkspaceStatus, WorkspaceOutlineToggle } from "./FocusedEditorWorkspace";

import { PortalDropdown } from "../../../components/ui/PortalDropdown";
import { systemLog } from "../../../services/diagnosticLogger";
import { Popover } from "../../../components/ui/Popover";
import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Bold,
  Italic,
  Underline,
  Baseline,
  Type,
  Image as ImageIcon,
  Table as TableIcon,
  Sigma,
  Link as LinkIcon,
  Video,
  FileText,
  Undo,
  Redo,
  List,
  ListOrdered,
  BetweenVerticalEnd,
  GripVertical,
  Plus,
  ChevronDown,
  ChevronUp,
  Target,
  Lightbulb,
  BookOpen,
  CheckSquare,
  Activity,
  StickyNote,
  HelpCircle,
  Settings,
  Lock,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  ArrowLeft,
  Unlock,
  Copy,
  Trash2,
  X,
  Check,
  AlignRight,
  AlignCenter,
  AlignLeft,
  AlignJustify,
  Heading1,
  Heading2,
  Heading3,
  Wand2,
  Highlighter,
  Strikethrough,
  Palette,
  Rows,
  Columns,
  Minus,
  Combine,
  Split,
  PaintBucket,
  Heading,
  Home,
  PlusCircle,
  FlaskConical,
  Layers,
  Sparkles,
  Clipboard,
  Database,
  RefreshCw,
  Folder,
  Upload,
  FileDown,
  Printer,
  Eye,
  EyeOff,
  Save,
  Layout,
  ChevronLeft,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileCheck,
  PanelLeft,
  PanelRight,
  Sliders,
  RotateCcw,
  Ruler,
  Search,
  MoreHorizontal,
  LayoutTemplate, ClipboardPaste, FileText as FileWord } from "lucide-react";
import { Editor } from "@tiptap/react";
import { ImageInsertModal } from "./ImageInsertModal";
import { LinkInsertModal } from "./LinkInsertModal";
import { TableInsertModal } from "./TableInsertModal";
import { RichTextEditor, processSmartPaste } from "./RichTextEditor";
import { EditorRibbon } from "./EditorRibbon";
import { EditorCard } from "./EditorCard";
import { ContentPickerModal } from "./ContentPickerModal";
import { SmartBlockInserterMenu } from "./SmartBlockInserterMenu";
import { ContentDistributorModal } from "./ContentDistributorModal";
import { QuestionParserModal } from "./QuestionParserModal";
import { UnifiedQuestionHubModal } from "./UnifiedQuestionHubModal";
import { AIContentAssistantModal } from "./AIContentAssistantModal";
import { validateCurriculumContext } from "../../../utils/curriculumValidator";
import { analyzeContent, ContentAnalysisResult } from "../../../services/contentAnalyzer";
import { storage } from "../../../services/storage";
import {
  buildQuestionObject,
  QuestionObject
} from "../../../services/questionObjectBuilder";
import {
  executeQuestionBankSync
} from "../../../services/questionBankSyncEngine";

export const CARD_TYPES = [
  {
    type: "lesson_template",
    label: "✨ هيكل درس كامل",
    description: "إدراج هيكل درس نموذجي (عنوان، أهداف، شرح)",
    icon: LayoutTemplate,
    color: "bg-indigo-50 text-indigo-600 border-indigo-200",
  },
  {
    type: "ai_content",
    label: "🤖 تأليف بالذكاء الاصطناعي",
    description: "توليد محتوى جديد للدرس باستخدام مساعد الذكاء الاصطناعي",
    icon: Sparkles,
    color: "bg-violet-50 text-violet-600 border-violet-200",
  },
  {
    type: "smart_paste",
    label: "📋 اللصق الذكي",
    description: "لصق ومعالجة النصوص والمعادلات من ملفات أخرى",
    icon: ClipboardPaste,
    color: "bg-amber-50 text-amber-600 border-amber-200",
  },
  {
    type: "word_import",
    label: "📄 استيراد من ملف Word",
    description: "استيراد درس كامل من ملف Word (DOCX)",
    icon: FileWord,
    color: "bg-blue-50 text-blue-600 border-blue-200",
  },
  {
    type: "title",
    label: "📘 عنوان الدرس",
    description: "إضافة عنوان رئيسي ومقدمة للدرس",
    icon: Type,
    color: "bg-blue-50 text-blue-600 border-blue-200",
  },
  {
    type: "objectives",
    label: "🎯 أهداف الدرس",
    description: "تحديد الأهداف والمخرجات التعليمية المقررة",
    icon: Target,
    color: "bg-emerald-50 text-emerald-600 border-emerald-200",
  },
  {
    type: "concepts",
    label: "💡 المفاهيم",
    description: "شرح المصطلحات والمفاهيم الأساسية للدرس",
    icon: Lightbulb,
    color: "bg-purple-50 text-purple-600 border-purple-200",
  },
  {
    type: "explanation",
    label: "📖 الشرح",
    description: "المحتوى والشرح التفصيلي للفقرات والأفكار",
    icon: BookOpen,
    color: "bg-slate-50 text-slate-700 border-slate-200",
  },
  {
    type: "images",
    label: "📷 الصور",
    description: "إضافة صور ورسومات توضيحية ومخططات",
    icon: ImageIcon,
    color: "bg-cyan-50 text-cyan-600 border-cyan-200",
  },
  {
    type: "tables",
    label: "📊 الجداول",
    description: "إضافة جداول منظمة للمقارنات والبيانات",
    icon: TableIcon,
    color: "bg-teal-50 text-teal-600 border-teal-200",
  },
  {
    type: "math",
    label: "🧪 المعادلات",
    description: "إضافة معادلات كيميائية ورياضية وصيغ علمية",
    icon: Sigma,
    color: "bg-rose-50 text-rose-600 border-rose-200",
  },
  {
    type: "activities",
    label: "⚡ الأنشطة",
    description: "أنشطة تفاعلية وتجارب عملية للطلاب",
    icon: Activity,
    color: "bg-orange-50 text-orange-600 border-orange-200",
  },
  {
    type: "questions",
    label: "الأسئلة",
    description: "أسئلة للتقويم وتدريب الطلاب وحلولها النموذجية",
    icon: HelpCircle,
    color: "bg-red-50 text-red-600 border-red-200",
  },
  {
    type: "notes",
    label: "📝 الملاحظات",
    description: "إضافة ملاحظات هامة وإرشادات للطلاب",
    icon: StickyNote,
    color: "bg-yellow-50 text-yellow-600 border-yellow-200",
  },
  {
    type: "examples",
    label: "✅ الأمثلة",
    description: "أمثلة محلولة وخطوات عملية للتطبيق",
    icon: CheckSquare,
    color: "bg-indigo-50 text-indigo-600 border-indigo-200",
  },
  {
    type: "page-break",
    label: "✂️ فاصل صفحة يدوياً",
    description: "إجبار بدء صفحة A4 جديدة تماماً في مستند المعاينة بعد هذا الموضع",
    icon: BetweenVerticalEnd,
    color: "bg-rose-50 text-rose-700 border-rose-300 border-dashed",
  },
];

export function getDefaultBulletSymbolForCard(cardType: string): string {
  const t = (cardType || "").toLowerCase();
  if (t.includes("note")) return "📝";
  if (t.includes("alert") || t.includes("warning")) return "⚠️";
  if (t.includes("concept") || t.includes("def")) return "📖";
  if (t.includes("math") || t.includes("act") || t.includes("exp")) return "🧪";
  if (t.includes("idea") || t.includes("imp")) return "💡";
  if (t.includes("obj")) return "🎯";
  if (t.includes("examp")) return "✅";
  if (t.includes("quest")) return "";
  return "•";
}

export const BULLET_SYMBOL_LIBRARY = [
  {
    category: "رموز هندسية وأساسية",
    symbols: [
      { symbol: "●", label: "نقطة مصمتة" },
      { symbol: "•", label: "نقطة قياسية" },
      { symbol: "○", label: "دائرة مفرغة" },
      { symbol: "■", label: "مربع مصمت" },
      { symbol: "□", label: "مربع مفرغ" },
      { symbol: "◆", label: "معين مصمت" },
      { symbol: "◇", label: "معين مفرغ" },
      { symbol: "🔹", label: "معين أزرق" },
      { symbol: "🔸", label: "معين برتقالي" },
      { symbol: "✔", label: "صح ثقيل" },
      { symbol: "✓", label: "علامة صح" },
      { symbol: "➜", label: "سهم منحني" },
      { symbol: "➤", label: "سهم راسخ" },
      { symbol: "→", label: "سهم اتجاهي" },
      { symbol: "⭐", label: "نجمة" },
    ],
  },
  {
    category: "رموز البطاقات التعليمية",
    symbols: [
      { symbol: "📌", label: "دبوس" },
      { symbol: "💡", label: "لمبة (فكرة مهمة)" },
      { symbol: "✅", label: "علامة صح" },
      { symbol: "❌", label: "علامة خطأ" },
      { symbol: "⚠️", label: "تنبيه" },
      { symbol: "📝", label: "ملاحظة" },
      { symbol: "📖", label: "تعريف" },
      { symbol: "🧪", label: "تجربة" },
      { symbol: "🎯", label: "هدف" },
      { symbol: "💬", label: "فكرة" },
    ],
  },
];

const DEFAULT_CARD_INFO = {
  icon: FileText,
  color: "bg-slate-50 text-slate-600 border-slate-200",
  type: "text",
  title: "نص",
  label: "نص",
  desc: "",
  bg: "bg-slate-50",
  iconBg: "bg-slate-100",
  iconColor: "text-slate-600",
  theme: "slate"
};

// Navigation preference only; no lesson data or storage schema is changed.
const lastActiveCardByLesson = new Map<string, string>();

export const EditorPanel = React.memo(({
  paragraphs,
  setParagraphs,
  attachedQuestions,
  onAddQuestion,
  onRemoveQuestion,
  lesson,
  subject,
  unit,
  onSave,
  onPreview,
  onPrint,
  onExportPdf,
  onExportWord,
  onImportWord,
  isSaving,
  isDirty,
  lastSaved,
  onBack,
  onSavedBack,
  onToggleMediaLibrary,
  isMediaLibraryOpen,
  onToggleNav,
  isNavCollapsed,
  onTogglePreview,
  isPreviewCollapsed,
  cardsZoomLevel = 100,
  setCardsZoomLevel,
  previewZoomLevel = 100,
  setPreviewZoomLevel,
  zoomLevel = 100,
  setZoomLevel,
  activeMainTab,
  setActiveMainTab,
  pageSetupView,
  readOnly = false,
}: {
  paragraphs: any[];
  setParagraphs: React.Dispatch<React.SetStateAction<any[]>>;
  attachedQuestions: any[];
  onAddQuestion: () => void;
  onRemoveQuestion: (id: string) => void;
  lesson?: any;
  subject?: any;
  unit?: any;
  onSave?: () => void | Promise<boolean | void>;
  onPreview?: () => void;
  onPrint?: () => void;
  onExportPdf?: () => void;
  onExportWord?: () => void;
  onImportWord?: () => void;
  isSaving?: boolean;
  isDirty?: boolean;
  lastSaved?: string;
  onBack?: () => void;
  onSavedBack?: () => void;
  onToggleMediaLibrary?: () => void;
  isMediaLibraryOpen?: boolean;
  onToggleNav?: () => void;
  isNavCollapsed?: boolean;
  onTogglePreview?: () => void;
  isPreviewCollapsed?: boolean;
  cardsZoomLevel?: number;
  setCardsZoomLevel?: React.Dispatch<React.SetStateAction<number>>;
  previewZoomLevel?: number;
  setPreviewZoomLevel?: React.Dispatch<React.SetStateAction<number>>;
  zoomLevel?: number;
  setZoomLevel?: React.Dispatch<React.SetStateAction<number>>;
  activeMainTab?: "content" | "page_setup";
  setActiveMainTab?: (tab: "content" | "page_setup") => void;
  pageSetupView?: React.ReactNode;
  readOnly?: boolean;
}) => {
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [collapsedCards, setCollapsedCards] = useState<Set<string>>(() => new Set(paragraphs.map(p => p.id)));
  const [isOutlineCollapsed, setIsOutlineCollapsed] = useState(false);
  const [outlineQuery, setOutlineQuery] = useState("");
  const [outlineFilter, setOutlineFilter] = useState<"all" | "incomplete" | "hidden">("all");
  const [focusSingleCard, setFocusSingleCard] = useState(true);
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
  const [, setEditorTick] = useState(0);

  React.useEffect(() => {
    const collapseOutlineOnCompactScreen = () => {
      if (window.innerWidth < 1024) setIsOutlineCollapsed(true);
    };
    collapseOutlineOnCompactScreen();
    window.addEventListener("resize", collapseOutlineOnCompactScreen);
    return () => window.removeEventListener("resize", collapseOutlineOnCompactScreen);
  }, []);

  const validEditor = activeEditor && !activeEditor.isDestroyed ? activeEditor : null;

  const isBothCollapsed = !!(isNavCollapsed && isPreviewCollapsed);
  const effectiveCardsZoom = cardsZoomLevel || zoomLevel || 100;
  const numericZoom = typeof effectiveCardsZoom === "number" ? (effectiveCardsZoom <= 2 ? effectiveCardsZoom * 100 : effectiveCardsZoom) : 100;
  const autoZoomPercent = isBothCollapsed ? Math.max(numericZoom, 110) : numericZoom;
  const effectiveScale = autoZoomPercent / 100;

  const formatActiveEditor = (action: (ed: Editor) => void) => {
    if (!validEditor || validEditor.isDestroyed) return;

    try {
      validEditor.commands.focus();

      const { selection, doc } = validEditor.state;
      if (selection.empty) {
        const { $from } = selection;
        const parentText = $from.parent?.textContent || "";
        const offset = $from.parentOffset;

        if (parentText && parentText.length > 0) {
          let start = offset;
          while (start > 0 && /[\w\u0600-\u06FF]/.test(parentText[start - 1])) {
            start--;
          }
          let end = offset;
          while (end < parentText.length && /[\w\u0600-\u06FF]/.test(parentText[end])) {
            end++;
          }

          if (start < end) {
            const maxPos = doc.content.size;
            const parentStart = $from.start();
            const startPos = Math.max(0, Math.min(parentStart + start, maxPos));
            const endPos = Math.max(startPos, Math.min(parentStart + end, maxPos));
            if (startPos < endPos) {
              validEditor.commands.setTextSelection({ from: startPos, to: endPos });
            }
          }
        }
      }

      action(validEditor);
    } catch (err) {
      console.warn("formatActiveEditor safe fallback:", err);
      try {
        action(validEditor);
      } catch (e) {}
    }
  };

  const canUndo = () => {
    if (!validEditor) return false;
    try {
      return !!validEditor.can()?.undo();
    } catch {
      return false;
    }
  };

  const canRedo = () => {
    if (!validEditor) return false;
    try {
      return !!validEditor.can()?.redo();
    } catch {
      return false;
    }
  };

  const handleSetActiveEditor = React.useCallback((editor: Editor) => {
    setActiveEditor(editor);
    setEditorTick((t) => t + 1);
  }, []);

  const [activeParagraphId, setActiveParagraphId] = useState<string | null>(
    null,
  );
  const [documentZoom, setDocumentZoom] = useState(100);
  const [documentOutlineOpen, setDocumentOutlineOpen] = useState(false);
  const [focusedDocumentCardId, setFocusedDocumentCardId] = useState<string | null>(() => {
    const remembered = lastActiveCardByLesson.get(lesson?.id);
    return paragraphs.find(p=>p.id===remembered)?.id || paragraphs[0]?.id || null;
  });
  const [outlineExpanded, setOutlineExpanded] = useState(false);
  const [workspacePageSetup, setWorkspacePageSetup] = useState(false);
  const legacyOutlineRequested = React.useRef(false);
  React.useEffect(() => {
    if (focusedDocumentCardId && lesson?.id) lastActiveCardByLesson.set(lesson.id, focusedDocumentCardId);
  }, [focusedDocumentCardId,lesson?.id]);
  const [pendingFocusCard, setPendingFocusCard] = useState<{
    id: string;
    position: "start" | "end";
  } | null>(null);
  const [inlineAddIndex, setInlineAddIndex] = useState<number | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [deletedCardUndo, setDeletedCardUndo] = useState<{
    card: any;
    index: number;
  } | null>(null);
  const deletedCardTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const cardSupportsImmediateTyping = React.useCallback(
    (type: string) => !["images", "math", "questions", "page-break"].includes(type),
    [],
  );

  const activateCardForWriting = React.useCallback(
    (cardId: string, requestEditorFocus = true, position: "start" | "end" = "end") => {
      setCollapsedCards((previous) => {
        if (focusSingleCard) {
          return new Set(
            paragraphsRef.current
              .filter((paragraph) => paragraph.id !== cardId)
              .map((paragraph) => paragraph.id),
          );
        }
        if (!previous.has(cardId)) return previous;
        const next = new Set(previous);
        next.delete(cardId);
        return next;
      });
      setActiveParagraphId(cardId);
      setPendingFocusCard(requestEditorFocus ? { id: cardId, position } : null);
    },
    [focusSingleCard],
  );

  const handleAutoFocusComplete = React.useCallback((cardId: string) => {
    setPendingFocusCard((current) => (current?.id === cardId ? null : current));
  }, []);

  const paragraphsRef = React.useRef(paragraphs);
  paragraphsRef.current = paragraphs;

  const requestCardEditorFocus = React.useCallback(
    (cardId: string, position: "start" | "end" = "start") => {
      const card = paragraphsRef.current.find((paragraph) => paragraph.id === cardId);
      activateCardForWriting(cardId, !!card && cardSupportsImmediateTyping(card.type), position);
    },
    [activateCardForWriting, cardSupportsImmediateTyping],
  );

  const navigateBetweenCards = React.useCallback(
    (cardId: string, direction: "previous" | "next") => {
      const currentParagraphs = paragraphsRef.current;
      const currentIndex = currentParagraphs.findIndex((paragraph) => paragraph.id === cardId);
      const step = direction === "previous" ? -1 : 1;

      for (let index = currentIndex + step; index >= 0 && index < currentParagraphs.length; index += step) {
        const candidate = currentParagraphs[index];
        if (!cardSupportsImmediateTyping(candidate.type)) continue;
        activateCardForWriting(candidate.id, true, direction === "previous" ? "end" : "start");
        break;
      }
    },
    [activateCardForWriting, cardSupportsImmediateTyping],
  );

  const openFocusedDocument = React.useCallback((cardId: string) => {
    const card = paragraphsRef.current.find((paragraph) => paragraph.id === cardId);
    if (!card) return;
    activateCardForWriting(cardId, cardSupportsImmediateTyping(card.type), "start");
    legacyOutlineRequested.current = false;
    setFocusedDocumentCardId(cardId);
    setOutlineExpanded(false);
  }, [activateCardForWriting, cardSupportsImmediateTyping]);

  const [isDocumentTransitioning, setIsDocumentTransitioning] = useState(false);

  const saveFocusedDocumentIfNeeded = React.useCallback(async (): Promise<boolean> => {
    if (readOnly || !isDirty || !onSave) return true;
    const result = await onSave();
    return result !== false;
  }, [isDirty, onSave, readOnly]);

  const closeFocusedDocument = React.useCallback(async () => {
    if (isDocumentTransitioning) return;
    setIsDocumentTransitioning(true);
    try {
      if (!(await saveFocusedDocumentIfNeeded())) return;
      (onSavedBack || onBack)?.();
    } finally {
      setIsDocumentTransitioning(false);
    }
  }, [isDocumentTransitioning, saveFocusedDocumentIfNeeded, onBack, onSavedBack]);

  const moveFocusedDocument = React.useCallback(async (direction: "previous" | "next") => {
    if (isDocumentTransitioning) return;
    if (!focusedDocumentCardId) return;
    const currentParagraphs = paragraphsRef.current;
    const currentIndex = currentParagraphs.findIndex((paragraph) => paragraph.id === focusedDocumentCardId);
    const targetIndex = currentIndex + (direction === "previous" ? -1 : 1);
    const target = currentParagraphs[targetIndex];
    if (!target) return;
    setIsDocumentTransitioning(true);
    try {
      if (!(await saveFocusedDocumentIfNeeded())) return;
      activateCardForWriting(target.id, cardSupportsImmediateTyping(target.type), direction === "previous" ? "end" : "start");
      setFocusedDocumentCardId(target.id);
    } finally {
      setIsDocumentTransitioning(false);
    }
  }, [activateCardForWriting, cardSupportsImmediateTyping, focusedDocumentCardId, isDocumentTransitioning, saveFocusedDocumentIfNeeded]);

  React.useEffect(() => {
    if (legacyOutlineRequested.current) return;
    if (!paragraphs.some(paragraph => paragraph.id === focusedDocumentCardId)) {
      setFocusedDocumentCardId(paragraphs[0]?.id || null);
    }
  }, [focusedDocumentCardId, paragraphs]);

  React.useEffect(() => {
    if (!focusedDocumentCardId) return;
    const handleFocusedEditorKeys = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key === "Escape" && !(event.target instanceof Element && event.target.closest("[data-editor-overlay]"))) {
        event.preventDefault();
        void closeFocusedDocument();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void onSave?.();
      }
    };
    window.addEventListener("keydown", handleFocusedEditorKeys);
    return () => window.removeEventListener("keydown", handleFocusedEditorKeys);
  }, [closeFocusedDocument, focusedDocumentCardId, onSave]);

  React.useEffect(() => {
    if (!pendingFocusCard) return;

    const frame = requestAnimationFrame(() => {
      const cardElement = document.querySelector<HTMLElement>(
        `[data-lesson-card-id="${pendingFocusCard.id}"]`,
      );
      cardElement?.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    return () => cancelAnimationFrame(frame);
  }, [pendingFocusCard, paragraphs.length]);

  React.useEffect(() => {
    return () => {
      if (deletedCardTimerRef.current) clearTimeout(deletedCardTimerRef.current);
    };
  }, []);

  // Modal & Popover States
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);

  // Ruler States (Hidden by default as requested)
  const [showRuler, setShowRuler] = useState(false);
  const [isRulerModalOpen, setIsRulerModalOpen] = useState(false);
  const [rulerSettings, setRulerSettings] = useState({
    unit: "cm" as "cm" | "inch" | "px",
    rightMargin: 2.5,
    leftMargin: 2.5,
    topMargin: 2.0,
    bottomMargin: 2.0,
    step: 2,
  });

  const activePara = paragraphs.find((p) => p.id === activeParagraphId);
  let activeCardType = "explanation";
  if (activePara) {
    try {
      const data = typeof activePara.body === "string" ? JSON.parse(activePara.body) : activePara.body;
      activeCardType = data?.type || activePara.type || "explanation";
    } catch (e) {
      activeCardType = activePara.type || "explanation";
    }
  }

  // Content Distributor & Question Parser States
  const [isDistributorOpen, setIsDistributorOpen] = useState(false);
  const [distributorAnalysisResult, setDistributorAnalysisResult] = useState<ContentAnalysisResult | null>(null);
  const [isQuickPasteModalOpen, setIsQuickPasteModalOpen] = useState(false);
  const [quickPasteText, setQuickPasteText] = useState("");
  const [isDistributorProcessing, setIsDistributorProcessing] = useState(false);

  const [isQuestionParserOpen, setIsQuestionParserOpen] = useState(false);
  const [questionParserContent, setQuestionParserContent] = useState("");

  // Unified Question Hub State
  const [isQuestionHubOpen, setIsQuestionHubOpen] = useState(false);
  const [questionHubTab, setQuestionHubTab] = useState<"bank" | "builder" | "sync">("bank");
  const [hubIncomingQuestions, setHubIncomingQuestions] = useState<any[]>([]);
  const [hubParsedQuestions, setHubParsedQuestions] = useState<any[]>([]);
  const [silentSyncNotice, setSilentSyncNotice] = useState<string | null>(null);

  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [aiAssistantElements, setAiAssistantElements] = useState<any[]>([]);


  useEffect(() => {
    const handleOpenAi = (e: any) => {
      setIsAiAssistantOpen(true);
      // optionally set active editor if passed in e.detail.editor
      if (e.detail?.editor) {
        setActiveEditor(e.detail.editor);
      }
    };
    window.addEventListener('open-ai-assistant', handleOpenAi);
    return () => window.removeEventListener('open-ai-assistant', handleOpenAi);
  }, []);

  // Silent Background Sync Execution Engine
  const performSilentQuestionBankSync = (currentParagraphs: any[]) => {
    try {
      const questionCards = currentParagraphs.filter((p) => p.type === "questions");
      const allQuestionsFromLesson: QuestionObject[] = [];

      questionCards.forEach((card) => {
        if (!card.body) return;
        let parsed: any[] = [];
        try {
          parsed = typeof card.body === "string" ? JSON.parse(card.body) : card.body;
        } catch (e) {}

        if (Array.isArray(parsed)) {
          parsed.forEach((q, idx) => {
            if (q && (q.text || q.questionText)) {
              const built = buildQuestionObject(q, {
                subjectId: subject?.id || "subject_101",
                unitId: unit?.id || "unit_01",
                lessonId: lesson?.id || "lesson_01",
              });
              allQuestionsFromLesson.push(built);
            }
          });
        }
      });

      if (allQuestionsFromLesson.length > 0) {
        const syncResult = executeQuestionBankSync(allQuestionsFromLesson, "keep");
        const syncedCount = syncResult.diffReport.createdItems.length + syncResult.diffReport.updatedItems.length;
        if (syncedCount > 0) {
          setSilentSyncNotice(`تمت مزامنة ${syncedCount} سؤالاً تلقائياً مع بنك الأسئلة المركزي في الخلفية`);
          setTimeout(() => setSilentSyncNotice(null), 4000);
        }
      }
    } catch (err) {
      console.error("Silent Question Bank Sync failed:", err);
    }
  };

  useEffect(() => {
    const handleOpenDistributor = (e: any) => {
      if (e.detail) {
        setDistributorAnalysisResult(e.detail);
        setIsDistributorOpen(true);
      }
    };
    const handleOpenQuestionParser = (e: any) => {
      if (e.detail) {
        setQuestionParserContent(typeof e.detail === "string" ? e.detail : JSON.stringify(e.detail));
      } else {
        const allContent = paragraphs.map((p) => p.body).join("\n\n");
        setQuestionParserContent(allContent);
      }
      setIsQuestionParserOpen(true);
    };
    const handleOpenQuestionHub = (e: any) => {
      if (e.detail?.tab) setQuestionHubTab(e.detail.tab);
      else setQuestionHubTab("bank");
      if (e.detail?.questions) setHubIncomingQuestions(e.detail.questions);
      if (e.detail?.parsed) setHubParsedQuestions(e.detail.parsed);
      setIsQuestionHubOpen(true);
    };
    const handleOpenQuestionBuilder = (e: any) => {
      if (e.detail) {
        setHubParsedQuestions(Array.isArray(e.detail) ? e.detail : [e.detail]);
      }
      setQuestionHubTab("builder");
      setIsQuestionHubOpen(true);
    };
    const handleOpenBankSync = (e: any) => {
      if (e.detail) {
        setHubIncomingQuestions(Array.isArray(e.detail) ? e.detail : [e.detail]);
      }
      setQuestionHubTab("sync");
      setIsQuestionHubOpen(true);
    };
    const handleOpenAiAssistant = (e: any) => {
      if (e.detail) {
        const elems = Array.isArray(e.detail) ? e.detail : (e.detail.elements || []);
        setAiAssistantElements(elems);
      } else {
        const allContent = paragraphs.map((p) => p.body).join("\n");
        const semResult = analyzeContent(allContent);
        setAiAssistantElements(semResult.elements);
      }
      setIsAiAssistantOpen(true);
    };

    window.addEventListener("open-content-distributor", handleOpenDistributor);
    window.addEventListener("open-question-parser", handleOpenQuestionParser);
    window.addEventListener("open-question-hub", handleOpenQuestionHub);
    window.addEventListener("open-question-builder", handleOpenQuestionBuilder);
    window.addEventListener("open-question-bank-sync", handleOpenBankSync);
    window.addEventListener("open-ai-content-assistant", handleOpenAiAssistant);
    return () => {
      window.removeEventListener("open-content-distributor", handleOpenDistributor);
      window.removeEventListener("open-question-parser", handleOpenQuestionParser);
      window.removeEventListener("open-question-hub", handleOpenQuestionHub);
      window.removeEventListener("open-question-builder", handleOpenQuestionBuilder);
      window.removeEventListener("open-question-bank-sync", handleOpenBankSync);
      window.removeEventListener("open-ai-content-assistant", handleOpenAiAssistant);
    };
  }, [paragraphs]);

  const handleConfirmDistributeCards = (newCards: any[]) => {
    systemLog(`تم الموافقة على توزيع ${newCards.length} بطاقة من الموزع الذكي.`, "success");
    if (!newCards || newCards.length === 0) return;

    const existingQuestionsCardIdx = paragraphs.findIndex((p) => p.type === "questions");
    const newQuestionsCard = newCards.find((c) => c.type === "questions");

    if (existingQuestionsCardIdx !== -1 && newQuestionsCard) {
      let existingQuestions: any[] = [];
      try {
        existingQuestions = JSON.parse(paragraphs[existingQuestionsCardIdx].body || "[]");
      } catch (e) {}

      let incomingQuestions: any[] = [];
      try {
        incomingQuestions = JSON.parse(newQuestionsCard.body || "[]");
      } catch (e) {}

      const mergedMap = new Map<string, any>();
      existingQuestions.forEach((q) => q && q.id && mergedMap.set(q.id, q));
      incomingQuestions.forEach((q) => q && q.id && mergedMap.set(q.id, q));
      const mergedQuestions = Array.from(mergedMap.values());

      mergedQuestions.forEach((q) => {
        if (q && q.id) {
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
          } else {
            console.warn("[DATA-1] Skipping saveQuestion in EditorPanel due to invalid context:", fullyPopulated.id);
          }
        }
      });

      const updatedParagraphs = [...paragraphs];
      updatedParagraphs[existingQuestionsCardIdx] = {
        ...updatedParagraphs[existingQuestionsCardIdx],
        body: JSON.stringify(mergedQuestions.map((q: any) => storage.stripQuestionForSSOT(q))),
      };

      const otherNewCards = newCards.filter((c) => c.type !== "questions");
      setParagraphs([...updatedParagraphs, ...otherNewCards]);
      setActiveParagraphId(updatedParagraphs[existingQuestionsCardIdx].id);
    } else {
      setParagraphs([...paragraphs, ...newCards]);
    }

    window.dispatchEvent(new CustomEvent("refresh-data-all"));
  };

  const handleRunDistributorFromText = async () => {
    systemLog("بدء عملية تحليل النصوص وتوزيعها على بطاقات...", "info");
    if (!quickPasteText.trim()) return;
    setIsDistributorProcessing(true);
    try {
      const cleaned = await processSmartPaste(
        quickPasteText.includes("<") ? quickPasteText : "",
        quickPasteText,
        null
      );
      const semAnalysis = analyzeContent(cleaned || `<p>${quickPasteText}</p>`);
      setDistributorAnalysisResult(semAnalysis);
      setIsDistributorOpen(true);
      setIsQuickPasteModalOpen(false);
      setQuickPasteText("");
    } catch (err) {
      console.error("Error launching content distributor:", err);
    } finally {
      setIsDistributorProcessing(false);
    }
  };

  // Ribbon Tab State (Microsoft Word style: File, Home, Insert, Layout, Questions, Review, View)
  const [activeRibbonTab, setActiveRibbonTab] = useState<
    "file" | "layout" | "questions" | "review" | "view"
  >("file");

  // Focus Reading Mode State (وضع القراءة بدون تشتيت)
  const [isFocusReadingMode, setIsFocusReadingMode] = useState(false);

  // Popover States for Colors & Formulas
  const [customMathInput, setCustomMathInput] = useState("");
  const [customChemInput, setCustomChemInput] = useState("");

  const toggleCollapse = React.useCallback((id: string) => {
    setCollapsedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, [setCollapsedCards]);

  const collapseAllCards = React.useCallback(() => {
    setFocusSingleCard(true);
    setCollapsedCards(new Set(paragraphs.map((p) => p.id)));
  }, [paragraphs, setCollapsedCards]);

  const expandAllCards = React.useCallback(() => {
    setFocusSingleCard(false);
    setCollapsedCards(new Set());
  }, [setCollapsedCards]);

  const toggleSingleCardFocus = React.useCallback(() => {
    setFocusSingleCard((current) => {
      const next = !current;
      if (next && activeParagraphId) {
        setCollapsedCards(
          new Set(paragraphsRef.current.filter((p) => p.id !== activeParagraphId).map((p) => p.id)),
        );
      }
      return next;
    });
  }, [activeParagraphId]);

  const getCardSummary = React.useCallback((paragraph: any) => {
    let value = paragraph?.body ?? "";
    if (paragraph?.type === "questions") {
      try {
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        const first = Array.isArray(parsed) ? parsed[0] : parsed;
        value = first?.question || first?.text || first?.content || "";
      } catch {}
    }
    return String(value)
      .replace(/<br\s*\/?\s*>/gi, " ")
      .replace(/<\/(p|div|li|h[1-6])>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;nbsp;|&nbsp;|&#160;|&#xA0;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 90);
  }, []);

  const isCardComplete = React.useCallback((paragraph: any) => {
    return hasCardContent(paragraph);
  }, [getCardSummary]);

  const visibleOutlineCards = React.useMemo(() => {
    const query = outlineQuery.trim().toLocaleLowerCase("ar");
    return paragraphs.filter((paragraph) => {
      const matchesQuery = !query || `${paragraph.title || ""} ${getCardSummary(paragraph)}`.toLocaleLowerCase("ar").includes(query);
      const matchesStatus = outlineFilter === "all"
        || (outlineFilter === "incomplete" && !isCardComplete(paragraph))
        || (outlineFilter === "hidden" && (paragraph.isVisible === false || paragraph.hidden));
      return matchesQuery && matchesStatus;
    });
  }, [getCardSummary, isCardComplete, outlineFilter, outlineQuery, paragraphs]);

  const selectCardFromOutline = React.useCallback((card: any) => {
    openFocusedDocument(card.id);
    if (window.innerWidth < 1024) setIsOutlineCollapsed(true);
  }, [openFocusedDocument]);

  const previewCardFromOutline = React.useCallback((cardId: string) => {
    setActiveParagraphId(cardId);
    try {
      window.sessionStorage.setItem("edutech-preview-focus-card", cardId);
    } catch {}
    onPreview?.();
  }, [onPreview]);

  const selectActiveCard = React.useCallback((cardId: string) => {
    activateCardForWriting(cardId, false);
  }, [activateCardForWriting]);

  const draggedIdxRef = React.useRef<number | null>(null);

  const handleDragStart = React.useCallback((e: React.DragEvent, index: number) => {
    if (!(e.target instanceof Element) || !e.target.closest("[data-card-drag-handle]")) { e.preventDefault(); return; }
    setDraggedIdx(index);
    draggedIdxRef.current = index;
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = React.useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    const currentDraggedIdx = draggedIdxRef.current;
    if (currentDraggedIdx === null || currentDraggedIdx === index) return;
    setParagraphs((prev) => {
      const next = [...prev];
      const draggedItem = next[currentDraggedIdx];
      if (!draggedItem) return prev;
      next.splice(currentDraggedIdx, 1);
      next.splice(index, 0, draggedItem);
      return next;
    });
    setDraggedIdx(index);
    draggedIdxRef.current = index;
  }, [setParagraphs]);

  const handleDragEnd = React.useCallback(() => {
    setDraggedIdx(null);
    draggedIdxRef.current = null;
  }, []);

  const insertFullLessonStructure = () => {
    const templateCards = [
      {
        id: `para-title-${Date.now()}`,
        type: "title",
        title: "📘 عنوان الدرس والمقدمة",
        body: "<p>أكتب هنا المفهوم العام للدرس ومقدمة تمهيدية مشوقة تحفز التفكير لدى الطلاب...</p>",
      },
      {
        id: `para-obj-${Date.now() + 1}`,
        type: "objectives",
        title: "🎯 أهداف الدرس التعليمية",
        body: "<ul><li>أن يتعرف الطالب على المفهوم الأساسي والمصطلحات العلمية الرئيسية.</li><li>أن يستنتج العلاقات والقوانين الرياضية/العلمية للدرس.</li><li>أن يطبق المعارف المكتسبة في حل المشكلات والتمارين التقويمية.</li></ul>",
      },
      {
        id: `para-conc-${Date.now() + 2}`,
        type: "concepts",
        title: "💡 المفاهيم والتعاريف الأساسية",
        body: "<p><strong>المفهوم الأول:</strong> التعريف والمحتوى العلمي الأساسي...</p><p><strong>المفهوم الثاني:</strong> القواعد والخصائص المرتبطة بدرس اليوم...</p>",
      },
      {
        id: `para-exp-${Date.now() + 3}`,
        type: "explanation",
        title: "📖 الشرح والتفصيل",
        body: "<p>يتناول هذا الجزء الشرح المعتمد للأفكار الرئيسية مدعماً بالأدلة والخطوات العملية...</p>",
      },
      {
        id: `para-examp-${Date.now() + 4}`,
        type: "examples",
        title: "✅ مثال محلول وتطبيق نموذجي",
        body: "<p><strong>المسألة:</strong> مثال تطبيقي على المفهوم المدروس.</p><p><strong>الحل النموذجي:</strong> الخطوة 1: تحديد المعطيات... الخطوة 2: تطبيق القانون للوصول للنتيجة.</p>",
      },
      {
        id: `para-act-${Date.now() + 5}`,
        type: "activities",
        title: "⚡ نشاط تفاعلي / تجربة علمية",
        body: "<p><strong>هدف النشاط:</strong> ترسيخ الفكرة من خلال الملاحظة والتطبيق العملي.</p><p><strong>خطوات التنفيذ:</strong> 1. الأدوات... 2. التجربة... 3. الاستنتاج.</p>",
      },
      {
        id: `para-q-${Date.now() + 6}`,
        type: "questions",
        title: "التقويم والأسئلة التدريبية",
        body: JSON.stringify([
          {
            id: `q_tmpl_1`,
            type: "mcq",
            questionText: "سؤال تقويمي: اختار الإجابة الصحيحة بناءً على ما درسته في هذا الدرس:",
            choices: [
              { text: "الخيار الأول (الصحيح)", isCorrect: true },
              { text: "الخيار الثاني", isCorrect: false },
              { text: "الخيار الثالث", isCorrect: false },
              { text: "الخيار الرابع", isCorrect: false },
            ],
            answer: "الخيار الأول (الصحيح)",
            difficulty: "medium",
            importance: 3,
          },
        ]),
      },
      {
        id: `para-note-${Date.now() + 7}`,
        type: "notes",
        title: "📝 تلخيص وختام الدرس",
        body: "<p>ملخص النقاط الجوهرية التي يجب على الطالب التركيز عليها ومراجعتها.</p>",
      },
    ];

    if (paragraphs.length > 0) {
      if (window.confirm("هل ترغب في إضافة هيكل الدرس الكامل المكون من (تمهيد، أهداف، شرح، مثال، نشاط، أسئلة، وختام) إلى مستندك؟")) {
        setParagraphs([...paragraphs, ...templateCards]);
      }
    } else {
      setParagraphs(templateCards);
    }
  };

  const handleContainerDrop = async (e: React.DragEvent) => {
    systemLog("تم إفلات عنصر في مساحة العمل.", "info");
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files) as File[];
      for (const file of files) {
        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const imgUrl = event.target?.result as string;
            if (imgUrl) {
              const newCard = {
                id: `para-img-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                type: "images",
                title: `📷 صورة: ${file.name}`,
                body: `<div style="text-align:center;"><img src="${imgUrl}" alt="${file.name}" style="max-width:100%; height:auto; border-radius:12px; margin:0 auto;" /></div>`,
              };
              setParagraphs((prev) => [...prev, newCard]);
            }
          };
          reader.readAsDataURL(file);
        }
      }
      return;
    }

    const droppedText = e.dataTransfer.getData("text/plain");
    if (droppedText && droppedText.trim().length > 0) {
      try {
        const parsed = JSON.parse(droppedText);
        if (parsed && parsed.type === "images" && parsed.body) {
          const newCard = {
            id: `para-img-${Date.now()}`,
            type: "images",
            title: parsed.title || "📷 صورة مدرجة بالسحب",
            body: parsed.body,
          };
          setParagraphs((prev) => [...prev, newCard]);
          return;
        }
        if (parsed && (parsed.questionText || parsed.text || parsed.type === "questions" || parsed.type === "mcq")) {
          const newCard = {
            id: `para-q-${Date.now()}`,
            type: "questions",
            title: "بطاقة أسئلة مسبورة",
            body: JSON.stringify(Array.isArray(parsed) ? parsed : [parsed]),
          };
          setParagraphs((prev) => [...prev, newCard]);
          return;
        }
      } catch (_) {}

      const newCard = {
        id: `para-text-${Date.now()}`,
        type: "explanation",
        title: "📖 فقرة مضافة بالسحب والإفلات",
        body: `<p>${droppedText.replace(/\n/g, "<br/>")}</p>`,
      };
      setParagraphs((prev) => [...prev, newCard]);
    }
  };

  const addCard = (type: string) => {
    const cardInfo = CARD_TYPES.find((c) => c.type === type);
    if (!cardInfo) return;
    const newId = "p-" + Date.now();
    const newP = {
      id: newId,
      title: cardInfo.label,
      body: "",
      type: type,
    };
    setParagraphs((previous) => [...previous, newP]);
    activateCardForWriting(newId, cardSupportsImmediateTyping(type), "start");
    setFocusedDocumentCardId(newId);
  };

  const updateParagraph = React.useCallback((id: string, field: string, value: any) => {
    setParagraphs(prev => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  }, [setParagraphs]);

  const deleteParagraph = React.useCallback((id: string) => {
    const currentParagraphs = paragraphsRef.current;
    const targetIndex = currentParagraphs.findIndex((paragraph) => paragraph.id === id);
    const target = currentParagraphs[targetIndex];
    if (!target) return;

    if (target.type === "questions") {
      try {
        if (target.body && (target.body.startsWith("[") || target.body.startsWith("{"))) {
          const parsed = JSON.parse(target.body);
          const qList = Array.isArray(parsed) ? parsed : [parsed];
          const removedQIds = new Set(qList.map((q: any) => q && q.id).filter(Boolean));
          if (removedQIds.size > 0 && onRemoveQuestion) {
            removedQIds.forEach((qId) => onRemoveQuestion(qId));
          }
        }
      } catch (e) {}
      if (deletedCardTimerRef.current) clearTimeout(deletedCardTimerRef.current);
      setDeletedCardUndo(null);
    } else {
      setDeletedCardUndo({ card: target, index: targetIndex });
      if (deletedCardTimerRef.current) clearTimeout(deletedCardTimerRef.current);
      deletedCardTimerRef.current = setTimeout(() => setDeletedCardUndo(null), 10000);
    }

    const fallbackCard = currentParagraphs[targetIndex + 1] || currentParagraphs[targetIndex - 1];
    setParagraphs(prev => prev.filter((paragraph) => paragraph.id !== id));
    setActiveParagraphId(fallbackCard?.id || null);
    if (focusedDocumentCardId === id) setFocusedDocumentCardId(fallbackCard?.id || null);
    setPendingFocusCard(null);
  }, [setParagraphs, onRemoveQuestion, focusedDocumentCardId]);

  const undoDeleteParagraph = React.useCallback(() => {
    if (!deletedCardUndo) return;
    const { card, index } = deletedCardUndo;
    setParagraphs(previous => {
      const next = [...previous];
      next.splice(Math.min(index, next.length), 0, card);
      return next;
    });
    if (deletedCardTimerRef.current) clearTimeout(deletedCardTimerRef.current);
    setDeletedCardUndo(null);
    activateCardForWriting(card.id, cardSupportsImmediateTyping(card.type), "start");
    setFocusedDocumentCardId(card.id);
  }, [activateCardForWriting, cardSupportsImmediateTyping, deletedCardUndo, setParagraphs]);

  const duplicateParagraph = React.useCallback((id: string) => {
    const target = paragraphsRef.current.find((paragraph) => paragraph.id === id);
    if (!target || target.type === "questions") return;

    const newId = "p-" + Date.now();
    setParagraphs(prev => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx === -1) return prev;
      const currentTarget = prev[idx];
      const newCard = {
        ...currentTarget,
        id: newId,
        title: currentTarget.title + " (نسخة)",
      };
      const next = [...prev];
      next.splice(idx + 1, 0, newCard);
      return next;
    });
    activateCardForWriting(newId, cardSupportsImmediateTyping(target.type), "start");
    setFocusedDocumentCardId(newId);
  }, [activateCardForWriting, cardSupportsImmediateTyping, setParagraphs]);

  const moveParagraph = React.useCallback((id: string, direction: "up" | "down") => {
    setParagraphs(prev => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx === -1) return prev;
      if (direction === "up" && idx === 0) return prev;
      if (direction === "down" && idx === prev.length - 1) return prev;

      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      const next = [...prev];
      const [moved] = next.splice(idx, 1);
      next.splice(targetIdx, 0, moved);
      return next;
    });
  }, [setParagraphs]);

  const focusedDocumentCard = focusedDocumentCardId
    ? paragraphs.find((paragraph) => paragraph.id === focusedDocumentCardId)
    : null;
  const focusedDocumentIndex = focusedDocumentCard
    ? paragraphs.findIndex((paragraph) => paragraph.id === focusedDocumentCard.id)
    : -1;
  const focusedDocumentInfo = focusedDocumentCard
    ? CARD_TYPES.find((card) => card.type === focusedDocumentCard.type) || DEFAULT_CARD_INFO
    : DEFAULT_CARD_INFO;
  const FocusedDocumentIcon = focusedDocumentInfo.icon || FileText;
  const completedCardsCount = paragraphs.filter(isCardComplete).length;
  const hiddenCardsCount = paragraphs.filter((paragraph) => paragraph.isVisible === false).length;
  const incompleteCardsCount = Math.max(0, paragraphs.length - completedCardsCount);
  const outputCards = paragraphs.filter((paragraph) => paragraph.isVisible !== false);
  const completedOutputCardsCount = outputCards.filter(isCardComplete).length;
  const lessonReadinessPercent = outputCards.length > 0 ? Math.round((completedOutputCardsCount / outputCards.length) * 100) : 0;

  return (
    <div className="z-30 flex h-full min-h-0 min-w-0 flex-1 flex-col bg-slate-50 dark:bg-slate-950">
      {false && (
      <div className="relative flex min-h-0 min-w-0 flex-1">
      <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">
      {/* Global Microsoft Word Style Ribbon Toolbar */}
      {isFocusReadingMode ? (
        <div className="bg-slate-900 text-white px-4 py-2 border-b border-slate-800 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-2.5 text-xs font-bold">
            <BookOpen className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>وضع القراءة وتركيز المستند (Focus Reading Mode) — واجهة Microsoft Word الخالية من التشتيت</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Zoom Controls inside Focus Reading Mode */}
            <div className="flex items-center gap-2 bg-slate-800/90 px-3 py-1 rounded-lg border border-slate-700/80 text-xs font-bold">
              <span className="text-slate-400 text-[11px]">نسبة العرض:</span>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setZoomLevel && setZoomLevel((z) => Math.max(50, z - 10))}
                className="hover:text-amber-400 cursor-pointer px-1 text-base leading-none font-extrabold"
                title="تصغير المعاينة"
              >
                -
              </button>
              <span className="text-amber-300 font-mono text-xs">{zoomLevel}%</span>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setZoomLevel && setZoomLevel((z) => Math.min(200, z + 10))}
                className="hover:text-amber-400 cursor-pointer px-1 text-base leading-none font-extrabold"
                title="تكبير المعاينة"
              >
                +
              </button>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setZoomLevel && setZoomLevel(100)}
                className="mr-1 text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                title="إعادة للوضع الطبيعي 100%"
              >
                100%
              </button>
            </div>

            <button
              onClick={() => setIsFocusReadingMode(false)}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-lg transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5"
            >
              <span>الخروج إلى التحرير الكامل</span>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <EditorRibbon
          activeRibbonTab={activeRibbonTab as any}
          setActiveRibbonTab={setActiveRibbonTab}
          activeEditor={activeEditor}
          paragraphs={paragraphs}
          setParagraphs={setParagraphs}
          setActiveParagraphId={setActiveParagraphId}
          activeMainTab={activeMainTab}
          setActiveMainTab={setActiveMainTab}
          onSave={onSave}
          lastSaved={lastSaved}
          onPreview={onPreview}
          onExportWord={onExportWord}
          onExportPdf={onExportPdf}
          onPrint={onPrint}
          setIsImageModalOpen={setIsImageModalOpen}
          setIsTableModalOpen={setIsTableModalOpen}
          setIsLinkModalOpen={setIsLinkModalOpen}
          isDistributorProcessing={isDistributorProcessing}
          setIsDistributorProcessing={setIsDistributorProcessing}
          setIsDistributorOpen={setIsDistributorOpen}
          isFocusReadingMode={isFocusReadingMode}
          setIsFocusReadingMode={setIsFocusReadingMode}
          isNavCollapsed={isNavCollapsed}
          onToggleNav={onToggleNav}
          isPreviewCollapsed={isPreviewCollapsed}
          onTogglePreview={onTogglePreview}
          showRuler={showRuler}
          setShowRuler={setShowRuler}
          setIsRulerModalOpen={setIsRulerModalOpen}
          cardsZoomLevel={cardsZoomLevel}
          setCardsZoomLevel={setCardsZoomLevel}
          previewZoomLevel={previewZoomLevel}
          setPreviewZoomLevel={setPreviewZoomLevel}
          zoomLevel={zoomLevel}
          setZoomLevel={setZoomLevel}
          setIsAiAssistantOpen={setIsAiAssistantOpen}
          setIsQuickPasteModalOpen={setIsQuickPasteModalOpen}
          setIsQuestionParserOpen={setIsQuestionParserOpen}
          setIsQuestionHubOpen={setIsQuestionHubOpen}
          setQuestionHubTab={setQuestionHubTab}
          onOpenCardPicker={() => {
            setInlineAddIndex(null);
            setIsPickerOpen(true);
          }}
          onInsertAction={(type: string) => {
            if (type === "lesson_template") insertFullLessonStructure();
            else if (type === "page_setup" && setActiveMainTab) setActiveMainTab("page_setup");
          }}
          readOnly={readOnly}
        />
      )}      {/* Calm document workspace inspired by Google Docs */}
      <div className={`relative z-0 flex min-h-0 flex-1 select-none flex-col items-center overflow-y-auto bg-[#e9eef5] transition-all duration-300 dark:bg-slate-950 ${
        isBothCollapsed
          ? "p-2 sm:p-3 md:p-4"
          : (isNavCollapsed || isPreviewCollapsed)
          ? "p-3 sm:p-4 md:p-5"
          : "p-3 sm:p-5 lg:p-6"
      }`}>
        
        {activeMainTab === "page_setup" && pageSetupView && !focusedDocumentCardId ? (
          <div className="w-full max-w-5xl mx-auto my-2">
            {pageSetupView}
          </div>
        ) : (
          <>
        {/* Word Horizontal Ruler (المسطرة العلوية للمستند) */}
        {showRuler && (
          <div 
            onClick={() => setIsRulerModalOpen(true)}
            className="group relative mx-auto mb-3 flex w-full max-w-[920px] cursor-pointer select-none items-center justify-between rounded-lg border border-slate-300 bg-white px-4 py-1.5 font-mono text-[11px] text-slate-400 shadow-sm transition-all duration-200 hover:border-blue-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
            title="انقر هنا للتحكم بخواص المسطرة والهوامش"
          >
            {/* Tooltip Badge on Hover */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-purple-600 text-white text-[10px] font-sans font-bold px-2.5 py-0.5 rounded-full shadow-md pointer-events-none flex items-center gap-1 z-10">
              <Sliders className="w-3 h-3" />
              <span>انقر لتعديل خواص المسطرة والهوامش</span>
            </div>

            {/* Right Margin Indicator */}
            <div 
              className="bg-purple-50 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-800 h-3.5 rounded-xs flex items-center justify-center text-[9px] font-black text-purple-700 dark:text-purple-300 shadow-2xs transition-all"
              style={{ width: `${Math.max(36, rulerSettings.rightMargin * 18)}px` }}
              title={`الهامش الأيمن (${rulerSettings.rightMargin} ${rulerSettings.unit})`}
            >
              <span className="truncate px-0.5">{rulerSettings.rightMargin} {rulerSettings.unit}</span>
            </div>

            {/* Ruler Markings */}
            <div className="flex-1 flex justify-between items-center px-4">
              {Array.from({ length: 13 }, (_, i) => i * (rulerSettings.step || 2)).map((unitVal) => (
                <div key={unitVal} className="flex flex-col items-center">
                  <div className="w-px h-2 bg-slate-400 dark:bg-slate-500 mb-0.5"></div>
                  <span className="text-[10px] font-black text-slate-600 dark:text-slate-300">{unitVal}</span>
                </div>
              ))}
            </div>

            {/* Left Margin Indicator */}
            <div 
              className="bg-purple-50 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-800 h-3.5 rounded-xs flex items-center justify-center text-[9px] font-black text-purple-700 dark:text-purple-300 shadow-2xs transition-all"
              style={{ width: `${Math.max(36, rulerSettings.leftMargin * 18)}px` }}
              title={`الهامش الأيسر (${rulerSettings.leftMargin} ${rulerSettings.unit})`}
            >
              <span className="truncate px-0.5">{rulerSettings.leftMargin} {rulerSettings.unit}</span>
            </div>
          </div>
        )}

        {/* Document A4 Sheet Page */}
        <div 
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleContainerDrop}
          className="relative mx-auto my-2 flex min-h-[1120px] w-full max-w-[920px] select-text flex-col justify-between rounded-sm border border-slate-300 bg-white p-4 font-sans shadow-[0_2px_16px_rgba(15,23,42,0.14)] transition-all duration-300 sm:p-8 lg:p-12 dark:border-slate-800 dark:bg-slate-900"
          style={{
            zoom: effectiveScale !== 1 ? effectiveScale : undefined,
          }}
        >
          
          {/* L-Shaped Corner Margin Marks (علامات زوايا الهوامش لـ Microsoft Word) */}
          <div className="absolute top-3 right-3 w-3 h-3 border-t-2 border-r-2 border-slate-300 dark:border-slate-700 pointer-events-none opacity-60" title="علامة هامش اليمين العلوي" />
          <div className="absolute top-3 left-3 w-3 h-3 border-t-2 border-l-2 border-slate-300 dark:border-slate-700 pointer-events-none opacity-60" title="علامة هامش اليسار العلوي" />
          <div className="absolute bottom-3 right-3 w-3 h-3 border-b-2 border-r-2 border-slate-300 dark:border-slate-700 pointer-events-none opacity-60" title="علامة هامش اليمين السفلي" />
          <div className="absolute bottom-3 left-3 w-3 h-3 border-b-2 border-l-2 border-slate-300 dark:border-slate-700 pointer-events-none opacity-60" title="علامة هامش اليسار السفلي" />
          
          <div>
            {/* Word A4 Page Header Bar */}
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3 mb-6 flex items-center justify-between text-xs text-slate-400 select-none">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-600 dark:text-slate-300">{subject?.name || "المادة"}</span>
                <span>•</span>
                <span>{unit?.title || "الوحدة التعليمية"}</span>
              </div>
              <div className="flex items-center gap-2 font-extrabold text-blue-600 dark:text-blue-400">
                <span>{lesson?.title || "مستند الدرس"}</span>
              </div>
            </div>

            {/* Document Controls Strip */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-2 shadow-sm dark:border-slate-700/80 dark:bg-slate-800/60">
              <div className="flex items-center gap-2">
                <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 rounded-full text-xs font-black">
                  {paragraphs.length} {paragraphs.length === 1 ? "بطاقة" : "بطاقات"}
                </span>
                <span className="hidden text-xs font-medium text-slate-500 sm:inline dark:text-slate-400">اكتب مباشرة أو أضف عنصرًا جديدًا</span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {!readOnly && (
                  <button
                    onClick={insertFullLessonStructure}
                    className="px-3 py-1 text-xs font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer border border-indigo-200 dark:border-indigo-800 shadow-2xs"
                    title="إدراج هيكل درس متكامل (تمهيد، أهداف، شرح، مثال، نشاط، أسئلة، وختام) بضغطة واحدة"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>إدراج هيكل درس متكامل</span>
                  </button>
                )}

                <button
                  onClick={collapseAllCards}
                  disabled={paragraphs.length === 0}
                  className="px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white hover:bg-amber-50 hover:text-amber-700 dark:bg-slate-900 dark:hover:bg-amber-950/40 dark:hover:text-amber-300 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-40 cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs"
                  title="طي جميع فقرات المستند"
                >
                  <ChevronUp className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>طي الكل</span>
                </button>
                <button
                  onClick={expandAllCards}
                  disabled={paragraphs.length === 0}
                  className="px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white hover:bg-blue-50 hover:text-blue-700 dark:bg-slate-900 dark:hover:bg-blue-950/40 dark:hover:text-blue-300 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-40 cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs"
                  title="توسيع جميع فقرات المستند"
                >
                  <ChevronDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>توسيع الكل</span>
                </button>
                {!readOnly && (
                  <button
                    onClick={() => {
                      if (window.confirm("هل أنت متأكد من رغبتك في حذف جميع فقرات هذا المستند؟")) {
                        setParagraphs([]);
                      }
                    }}
                    disabled={paragraphs.length === 0}
                    className="px-2.5 py-1 text-xs font-bold text-rose-600 dark:text-rose-400 bg-white hover:bg-rose-50 hover:text-rose-700 dark:bg-slate-900 dark:hover:bg-rose-950/40 dark:hover:text-rose-300 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-40 cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs"
                    title="تصفير وحذف جميع الفقرات"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                    <span>تصفير</span>
                  </button>
                )}
              </div>
            </div>

            {/* Document Sections / Cards */}
            <AnimatePresence initial={false}>
            {paragraphs.map((p, index) => {
              if (focusedDocumentCardId === p.id) return null;
              const cardInfo = CARD_TYPES.find((c) => c.type === p.type) || DEFAULT_CARD_INFO;
              const isCollapsed = collapsedCards.has(p.id);

              return (
                <React.Fragment key={p.id}>
                  <motion.div
                    initial={{ opacity: 0, y: 15, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.15 } }}
                    transition={{ type: "spring", stiffness: 320, damping: 28 }}
                    className="group"
                  >
                    <EditorCard
                      p={p}
                      index={index}
                      totalCards={paragraphs.length}
                      cardInfo={cardInfo}
                      cardTypesList={CARD_TYPES}
                      isDragged={draggedIdx === index}
                      isActive={activeParagraphId === p.id}
                      isCollapsed={isCollapsed}
                      shouldAutoFocus={pendingFocusCard?.id === p.id}
                      autoFocusPosition={pendingFocusCard?.id === p.id ? pendingFocusCard.position : "end"}
                      onAutoFocusComplete={handleAutoFocusComplete}
                      onRequestEditorFocus={requestCardEditorFocus}
                      onNavigateCard={navigateBetweenCards}
                      setActiveParagraphId={selectActiveCard}
                      setActiveEditor={handleSetActiveEditor}
                      handleDragStart={handleDragStart}
                      handleDragOver={handleDragOver}
                      handleDragEnd={handleDragEnd}
                      updateParagraph={updateParagraph}
                      toggleCollapse={toggleCollapse}
                      deleteParagraph={deleteParagraph}
                      duplicateParagraph={p.type === "questions" ? undefined : duplicateParagraph}
                      moveParagraph={moveParagraph}
                      lesson={lesson}
                      subject={subject}
                      unit={unit}
                      readOnly={readOnly}
                    />
                    {/* Inline Add Button between sections */}
                    {!readOnly && (
                      <div className={`flex justify-center transition-opacity -my-1 relative z-20 ${activeParagraphId === p.id ? "opacity-100" : "opacity-30 group-hover:opacity-100 hover:opacity-100 focus-within:opacity-100"}`}>
                        <button 
                          onClick={() => { setInlineAddIndex(index); setIsPickerOpen(true); }}
                          className="bg-white text-blue-600 rounded-full p-1.5 shadow-sm border border-blue-300 hover:bg-blue-600 hover:text-white hover:scale-105 transition-all flex items-center justify-center cursor-pointer"
                          title={`إضافة بطاقة بعد ${p.title || "هذه البطاقة"}`}
                          aria-label={`إضافة بطاقة بعد ${p.title || "هذه البطاقة"}`}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </motion.div>
                </React.Fragment>
              );
            })}
            </AnimatePresence>

            {/* Add Content Button */}
            {!readOnly && (
              <div className="mt-8 rounded-xl p-6 bg-slate-50/80 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 text-center flex flex-col items-center justify-center">
                <button
                  onClick={() => {
                    setInlineAddIndex(null);
                    setIsPickerOpen(true);
                  }}
                  className="group flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl bg-white hover:bg-blue-50 dark:bg-slate-900 dark:hover:bg-blue-900/20 border border-slate-200 hover:border-blue-300 dark:border-slate-700 dark:hover:border-blue-800/50 transition-all cursor-pointer shadow-2xs"
                >
                  <div className="p-1.5 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg group-hover:scale-110 transition-transform">
                    <Plus className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    إضافة بطاقة جديدة
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Word A4 Page Footer Bar */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-3 mt-8 flex items-center justify-between text-[11px] text-slate-400 select-none">
            <span>إعداد الدرس والمحتوى التعليمي</span>
            <span className="font-bold">صفحة A4</span>
          </div>

        </div>
        </>
        )}
      </div>

      {/* Word-Style Status Bar (شريط الحالة لـ Microsoft Word) */}
      <div className="bg-blue-700 dark:bg-slate-900 text-white text-[11px] font-bold px-4 py-1 flex items-center justify-between border-t border-blue-800 dark:border-slate-800 select-none shrink-0">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="opacity-80">البطاقات:</span>
            <span>{paragraphs.length}</span>
          </span>
          <span className="w-px h-3 bg-blue-500/50 dark:bg-slate-700"></span>
          <span className="flex items-center gap-1">
            <span className="opacity-80">الحالة:</span>
            <span className="text-emerald-300 dark:text-emerald-400">جاهز (تم الحفظ)</span>
          </span>
          {lesson && (
            <>
              <span className="w-px h-3 bg-blue-500/50 dark:bg-slate-700 hidden sm:inline"></span>
              <span className="hidden sm:inline opacity-90 truncate max-w-[200px]">{lesson.title}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setIsFocusReadingMode(!isFocusReadingMode)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              isFocusReadingMode
                ? "bg-amber-400 text-slate-950 font-black shadow-2xs"
                : "bg-blue-800/90 hover:bg-blue-600 text-white dark:bg-slate-800 dark:hover:bg-slate-700"
            }`}
            title="وضع القراءة دون تشتيت (Word Focus Reading Mode)"
          >
            <BookOpen className="w-3 h-3" />
            <span>{isFocusReadingMode ? "خروج من وضع القراءة" : "وضع القراءة"}</span>
          </button>

          <span className="opacity-80 hidden md:inline">Microsoft Word / Office View</span>
          <div className="flex items-center gap-1.5 bg-blue-800/80 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px]">
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setZoomLevel && setZoomLevel((z) => Math.max(50, z - 10))}
              className="hover:text-blue-200 cursor-pointer px-1"
              title="تصغير"
            >
              -
            </button>
            <span>{zoomLevel}%</span>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setZoomLevel && setZoomLevel((z) => Math.min(200, z + 10))}
              className="hover:text-blue-200 cursor-pointer px-1"
              title="تكبير"
            >
              +
            </button>
          </div>
        </div>
      </div>

      </div>

      {isOutlineCollapsed ? (
        <button
          type="button"
          onClick={() => setIsOutlineCollapsed(false)}
          className="flex w-10 shrink-0 flex-col items-center justify-center gap-2 border-r border-slate-200 bg-white text-slate-500 transition hover:bg-blue-50 hover:text-blue-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-blue-950/30 dark:hover:text-blue-300"
          title="إظهار مخطط الدرس"
          aria-label="إظهار مخطط الدرس"
        >
          <List className="h-4 w-4" />
          <span className="text-[11px] font-bold [writing-mode:vertical-rl]">مخطط الدرس</span>
        </button>
      ) : (
        <>
        <button
          type="button"
          onClick={() => setIsOutlineCollapsed(true)}
          className="absolute inset-0 z-30 bg-slate-950/20 backdrop-blur-[1px] lg:hidden"
          aria-label="إغلاق مخطط الدرس"
        />
        <aside className="absolute inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col border-r border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 lg:static lg:z-auto lg:w-56 lg:shadow-none" aria-label="مخطط الدرس والبطاقات">
          <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2.5 dark:border-slate-800">
            <div className="flex min-w-0 items-center gap-2">
              <List className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
              <span className="truncate text-sm font-extrabold text-slate-800 dark:text-slate-100">مخطط الدرس</span>
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{paragraphs.length}</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOutlineCollapsed(true)}
              className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              title="طي مخطط الدرس"
              aria-label="طي مخطط الدرس"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2 border-b border-slate-200 p-2.5 dark:border-slate-800">
            <label className="relative block">
              <Search className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={outlineQuery}
                onChange={(event) => setOutlineQuery(event.target.value)}
                placeholder="بحث في البطاقات..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-2 pr-8 text-xs text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-900"
              />
            </label>
            <button
              type="button"
              onClick={toggleSingleCardFocus}
              className={`flex w-full items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${focusSingleCard ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"}`}
              aria-pressed={focusSingleCard}
              title="عند تفعيله تُفتح بطاقة واحدة وتُطوى البطاقات الأخرى"
            >
              <span>تركيز بطاقة واحدة</span>
              <span className={`h-2 w-2 rounded-full ${focusSingleCard ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-600"}`} />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
            {visibleOutlineCards.length === 0 ? (
              <div className="px-3 py-8 text-center text-xs text-slate-400">لا توجد بطاقة مطابقة</div>
            ) : visibleOutlineCards.map((card) => {
              const originalIndex = paragraphs.findIndex((paragraph) => paragraph.id === card.id);
              const cardInfo = CARD_TYPES.find((item) => item.type === card.type) || DEFAULT_CARD_INFO;
              const CardIcon = cardInfo.icon || FileText;
              const summary = getCardSummary(card);
              const isActiveCard = activeParagraphId === card.id;
              return (
                <div
                  key={card.id}
                  draggable={false}
                  onDragOver={(event) => !readOnly && handleDragOver(event, originalIndex)}
                  onDragEnd={!readOnly ? handleDragEnd : undefined}
                  onClick={() => selectCardFromOutline(card)}
                  className={`group/outline cursor-pointer rounded-lg border p-2 transition ${isActiveCard ? "border-blue-300 bg-blue-50 shadow-sm dark:border-blue-700 dark:bg-blue-950/30" : "border-transparent hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-700 dark:hover:bg-slate-800/70"}`}
                  aria-current={isActiveCard ? "true" : undefined}
                >
                  <div className="flex items-start gap-2">
                    {!readOnly && <button type="button" data-card-drag-handle draggable onClick={e=>e.stopPropagation()} onDragStart={e=>handleDragStart(e,originalIndex)} onDragEnd={handleDragEnd} aria-label="سحب البطاقة للترتيب"><GripVertical className="h-3.5 w-3.5" /></button>}
                    <div className={`mt-0.5 rounded-md p-1 ${isActiveCard ? "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>
                      <CardIcon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="shrink-0 text-[10px] font-bold text-slate-400">{originalIndex + 1}</span>
                        <span className={`truncate text-xs font-extrabold ${isActiveCard ? "text-blue-800 dark:text-blue-200" : "text-slate-700 dark:text-slate-200"}`}>{card.title || cardInfo.label}</span>
                        {card.isVisible === false && <EyeOff className="h-3 w-3 shrink-0 text-amber-500" />}
                      </div>
                      <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-500 dark:text-slate-400">{summary || cardInfo.label}</p>
                    </div>
                  </div>
                  {!readOnly && (
                    <div className="mt-1 flex justify-end gap-0.5 opacity-0 transition group-hover/outline:opacity-100 group-focus-within/outline:opacity-100">
                      <button
                        type="button"
                        disabled={originalIndex <= 0}
                        onClick={(event) => { event.stopPropagation(); moveParagraph(card.id, "up"); }}
                        className="rounded p-1 text-slate-500 hover:bg-white hover:text-blue-600 disabled:opacity-25 dark:hover:bg-slate-900"
                        title="نقل البطاقة إلى الأعلى"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        disabled={originalIndex >= paragraphs.length - 1}
                        onClick={(event) => { event.stopPropagation(); moveParagraph(card.id, "down"); }}
                        className="rounded p-1 text-slate-500 hover:bg-white hover:text-blue-600 disabled:opacity-25 dark:hover:bg-slate-900"
                        title="نقل البطاقة إلى الأسفل"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!readOnly && (
            <div className="border-t border-slate-200 p-2.5 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  const selectedIndex = activeParagraphId ? paragraphs.findIndex((p) => p.id === activeParagraphId) : -1;
                  setInlineAddIndex(selectedIndex >= 0 ? selectedIndex : null);
                  setIsPickerOpen(true);
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-extrabold text-white transition hover:bg-blue-700"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{activeParagraphId ? "إضافة بعد البطاقة المحددة" : "إضافة بطاقة"}</span>
              </button>
            </div>
          )}
        </aside>
        </>
      )}
      </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col bg-[#eef3f8] dark:bg-slate-950" dir="rtl">
        {activeMainTab === "page_setup" && pageSetupView && !focusedDocumentCardId ? (
          <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
            <div className="mx-auto mb-3 flex w-full max-w-5xl items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">إعداد صفحة الدرس</h2>
                <p className="text-xs text-slate-500">اضبط الورق والهوامش والترويسة قبل المعاينة والتصدير.</p>
              </div>
              <button type="button" onClick={() => setActiveMainTab?.("content")} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                العودة إلى مخطط الدرس
              </button>
            </div>
            <div className="mx-auto w-full max-w-5xl">{pageSetupView}</div>
          </div>
        ) : (
          <>
            <div className="shrink-0 border-b border-slate-200 bg-white/95 px-3 py-3 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 sm:px-5">
              <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"><List className="h-5 w-5" /></div>
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-black text-slate-900 dark:text-white">مخطط بناء الدرس</h2>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{lesson?.title || "درس جديد"} · رتّب البطاقات ثم افتح أي بطاقة لتحريرها.</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {setActiveMainTab && (
                    <button type="button" onClick={() => setActiveMainTab("page_setup")} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-extrabold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                      <Sliders className="h-4 w-4" /> إعداد الصفحة
                    </button>
                  )}
                  {onPreview && (
                    <button type="button" onClick={onPreview} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-extrabold text-blue-700 transition hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
                      <Eye className="h-4 w-4" /> معاينة الدرس
                    </button>
                  )}
                  {!readOnly && (
                    <button type="button" onClick={() => { setInlineAddIndex(null); setIsPickerOpen(true); }} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-extrabold text-white shadow-sm transition hover:bg-blue-700">
                      <Plus className="h-4 w-4" /> إضافة بطاقة
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
              <div className="mx-auto w-full max-w-6xl space-y-4">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="text-xs font-bold text-slate-500">إجمالي البطاقات</div><div className="mt-1 text-xl font-black text-slate-900 dark:text-white">{paragraphs.length}</div></div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 shadow-sm dark:border-emerald-900 dark:bg-emerald-950/20"><div className="text-xs font-bold text-emerald-700 dark:text-emerald-300">بها محتوى</div><div className="mt-1 text-xl font-black text-emerald-800 dark:text-emerald-200">{completedCardsCount}</div></div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 shadow-sm dark:border-amber-900 dark:bg-amber-950/20"><div className="text-xs font-bold text-amber-700 dark:text-amber-300">تحتاج تعبئة</div><div className="mt-1 text-xl font-black text-amber-800 dark:text-amber-200">{incompleteCardsCount}</div></div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="text-xs font-bold text-slate-500">مخفية من الإخراج</div><div className="mt-1 text-xl font-black text-slate-900 dark:text-white">{hiddenCardsCount}</div></div>
                </div>

                <div className="rounded-xl border border-blue-100 bg-white px-4 py-3 shadow-sm dark:border-blue-900/50 dark:bg-slate-900">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-extrabold text-slate-900 dark:text-white">وجود محتوى البطاقات</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">هذا المؤشر يصف وجود المحتوى فقط، ولا يقيم جودة الدرس أو جاهزية الطباعة.</div>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-black ${lessonReadinessPercent === 100 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"}`}>{lessonReadinessPercent}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" role="progressbar" aria-label="وجود محتوى البطاقات" aria-valuemin={0} aria-valuemax={100} aria-valuenow={lessonReadinessPercent}>
                    <div className={`h-full rounded-full transition-all ${lessonReadinessPercent === 100 ? "bg-emerald-500" : "bg-blue-600"}`} style={{ width: `${lessonReadinessPercent}%` }} />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
                    <label className="relative min-w-[220px] flex-1 sm:max-w-md">
                      <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input value={outlineQuery} onChange={(event) => setOutlineQuery(event.target.value)} placeholder="ابحث في عناوين البطاقات ومحتواها..." className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-3 pr-10 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
                    </label>
                    <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800" aria-label="تصفية بطاقات الدرس">
                      {([
                        ["all", `الكل ${paragraphs.length}`],
                        ["incomplete", `تحتاج تعبئة ${incompleteCardsCount}`],
                        ["hidden", `مخفية ${hiddenCardsCount}`],
                      ] as const).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setOutlineFilter(value)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-extrabold transition ${outlineFilter === value ? "bg-white text-blue-700 shadow-sm dark:bg-slate-900 dark:text-blue-300" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"}`}
                          aria-pressed={outlineFilter === value}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="text-xs font-bold text-slate-500">اسحب من المقبض أو استخدم الأسهم لتغيير ترتيب الدرس</div>
                  </div>

                  <div className="space-y-2 p-3">
                    {paragraphs.length === 0 && !readOnly ? (
                      <div className="rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/40 py-16 text-center dark:border-blue-900 dark:bg-blue-950/10">
                        <LayoutTemplate className="mx-auto h-10 w-10 text-blue-500" />
                        <h3 className="mt-3 text-base font-black text-slate-900 dark:text-white">ابدأ ببناء مخطط الدرس</h3>
                        <p className="mt-1 text-sm text-slate-500">أضف أول بطاقة، ثم اكتب محتواها في محرر المستند.</p>
                        <button type="button" onClick={() => { setInlineAddIndex(null); setIsPickerOpen(true); }} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-sm hover:bg-blue-700"><Plus className="h-4 w-4" />إضافة أول بطاقة</button>
                      </div>
                    ) : visibleOutlineCards.length === 0 ? (
                      <div className="py-14 text-center">
                        <Search className="mx-auto h-8 w-8 text-slate-300" />
                        <p className="mt-2 text-sm font-bold text-slate-500">لا توجد بطاقات مطابقة للبحث أو المرشح المحدد</p>
                        <button type="button" onClick={() => { setOutlineQuery(""); setOutlineFilter("all"); }} className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-extrabold text-blue-700 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:text-blue-300">عرض جميع البطاقات</button>
                      </div>
                    ) : visibleOutlineCards.map((card) => {
                      const originalIndex = paragraphs.findIndex((paragraph) => paragraph.id === card.id);
                      const cardInfo = CARD_TYPES.find((item) => item.type === card.type) || DEFAULT_CARD_INFO;
                      const CardIcon = cardInfo.icon || FileText;
                      const summary = getCardSummary(card);
                      const isComplete = isCardComplete(card);
                      return (
                        <div key={card.id} draggable={false} onDragOver={(event) => !readOnly && handleDragOver(event, originalIndex)} onDragEnd={!readOnly ? handleDragEnd : undefined} className={`group rounded-xl border bg-white p-3 transition dark:bg-slate-900 ${draggedIdx === originalIndex ? "border-blue-400 opacity-60 shadow-lg" : "border-slate-200 hover:border-blue-200 hover:shadow-sm dark:border-slate-800 dark:hover:border-blue-800"}`}>
                          <div className="flex items-start gap-3">
                            {!readOnly && <button type="button" data-card-drag-handle draggable onDragStart={e=>handleDragStart(e,originalIndex)} onDragEnd={handleDragEnd} aria-label="سحب البطاقة للترتيب"><GripVertical className="h-5 w-5"/></button>}
                            <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${cardInfo.color || "bg-slate-100 text-slate-600"}`}><CardIcon className="h-5 w-5" /></div>
                            <button type="button" onClick={() => openFocusedDocument(card.id)} className="min-w-0 flex-1 text-right">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-black text-slate-400">{originalIndex + 1}</span>
                                <span className="truncate text-sm font-extrabold text-slate-900 group-hover:text-blue-700 dark:text-white dark:group-hover:text-blue-300">{card.title || cardInfo.label}</span>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${isComplete ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"}`}>{isComplete ? "بها محتوى" : "تحتاج تعبئة"}</span>
                                {card.isVisible === false && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800">مخفية</span>}
                              </div>
                              <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{summary || "لا يوجد محتوى بعد — اضغط لبدء الكتابة"}</p>
                            </button>
                            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                              <button type="button" onClick={() => openFocusedDocument(card.id)} className="inline-flex h-8 items-center gap-1 rounded-lg bg-blue-600 px-2.5 text-[11px] font-extrabold text-white transition hover:bg-blue-700" title="تحرير البطاقة"><FileText className="h-3.5 w-3.5" /><span className="hidden sm:inline">تحرير</span></button>
                              {onPreview && <button type="button" onClick={() => previewCardFromOutline(card.id)} className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-extrabold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300" title="معاينة البطاقة في موضعها داخل الدرس"><Eye className="h-3.5 w-3.5" /><span className="hidden sm:inline">معاينة</span></button>}
                              {!readOnly && (
                                <details className="relative">
                                  <summary className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-white" title="المزيد من إجراءات البطاقة" aria-label="المزيد من إجراءات البطاقة">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </summary>
                                  <div className="absolute left-0 top-10 z-50 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 text-right shadow-xl dark:border-slate-700 dark:bg-slate-900">
                                    <button type="button" onClick={() => updateParagraph(card.id, "isVisible", card.isVisible === false)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">{card.isVisible === false ? <Eye className="h-4 w-4 text-emerald-600" /> : <EyeOff className="h-4 w-4" />}<span>{card.isVisible === false ? "إظهار في المعاينة والتصدير" : "إخفاء من المعاينة والتصدير"}</span></button>
                                    {card.type !== "questions" && <button type="button" onClick={() => duplicateParagraph(card.id)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"><Copy className="h-4 w-4" /><span>إنشاء نسخة من البطاقة</span></button>}
                                    <button type="button" disabled={originalIndex <= 0} onClick={() => moveParagraph(card.id, "up")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-35 dark:text-slate-200 dark:hover:bg-slate-800"><ArrowUp className="h-4 w-4" /><span>نقل إلى الأعلى</span></button>
                                    <button type="button" disabled={originalIndex >= paragraphs.length - 1} onClick={() => moveParagraph(card.id, "down")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-35 dark:text-slate-200 dark:hover:bg-slate-800"><ArrowDown className="h-4 w-4" /><span>نقل إلى الأسفل</span></button>
                                    <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                                    <button type="button" onClick={() => { const warning = card.type === "questions" ? "سيؤدي الحذف إلى إزالة أسئلة هذه البطاقة من الدرس. هل تريد المتابعة؟" : `هل تريد حذف «${card.title || cardInfo.label}»؟ يمكنك التراجع خلال عشر ثوانٍ.`; if (window.confirm(warning)) deleteParagraph(card.id); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-950/30"><Trash2 className="h-4 w-4" /><span>حذف البطاقة…</span></button>
                                  </div>
                                </details>
                              )}
                            </div>
                          </div>
                          {!readOnly && (
                            <div className="mt-2 flex justify-center border-t border-dashed border-slate-200 pt-2 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 dark:border-slate-800">
                              <button type="button" onClick={() => { setInlineAddIndex(originalIndex); setIsPickerOpen(true); }} className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1 text-[11px] font-extrabold text-blue-700 transition hover:bg-blue-50 dark:bg-slate-800 dark:text-blue-300"><Plus className="h-3.5 w-3.5" />إضافة بطاقة بعدها</button>
                            </div>
                          )}
                        </div>
                      );
                    })}

                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {!focusedDocumentCard && !paragraphs.length && !legacyOutlineRequested.current && (
        <div className="focused-editor-dialog fixed inset-0 z-[1700] flex flex-col bg-[#eef2f6] dark:bg-slate-950" dir="rtl" role="dialog" aria-label="إعداد درس فارغ">
          <header className="flex items-center justify-between border-b bg-white p-5 dark:bg-slate-900">
            <div><strong className="text-blue-700">EduTech</strong><h2 className="text-lg font-bold">{lesson?.title || 'إعداد الدرس'}</h2></div>
            <div className="flex gap-3"><button type="button" onClick={()=>setWorkspacePageSetup(v=>!v)}>إعداد الصفحة</button><button type="button" onClick={()=>void closeFocusedDocument()}>العودة</button></div>
          </header>
          {workspacePageSetup ? <div className="overflow-auto p-6">{pageSetupView}</div> : <main className="m-auto rounded-2xl border bg-white p-12 text-center dark:bg-slate-900"><h3 className="text-xl font-bold">ابدأ إعداد الدرس</h3><p className="my-4 text-slate-500">أضف بطاقة، ثم اكتب محتواها في مساحة العمل.</p>{!readOnly && <button type="button" className="rounded-lg bg-blue-600 px-5 py-3 font-bold text-white" onClick={()=>{setInlineAddIndex(null);setIsPickerOpen(true);}}>إضافة أول بطاقة</button>}</main>}
        </div>
      )}
      {focusedDocumentCard && (
        <FocusedEditorWorkspace key={focusedDocumentCard.id}>
        <div className="focused-editor-dialog fixed inset-0 z-[1700] flex min-h-0 flex-col bg-[#eef2f6] dark:bg-slate-950" dir="rtl" role="dialog" aria-modal="true" aria-label={`تحرير ${focusedDocumentCard.title || focusedDocumentInfo.label}`}>
          <header dir="rtl" className="focused-editor-topbar shrink-0 border-b border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div dir="rtl" className="flex min-h-[68px] items-center justify-between gap-3 px-4 py-2 lg:px-7">
              <div dir="rtl" className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                  <FocusedDocumentIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-base font-black text-slate-900 dark:text-white lg:text-lg">{focusedDocumentCard.title || focusedDocumentInfo.label}</h2>
                    <span className="hidden text-slate-400 sm:inline">✎</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">{subject?.name || "المادة"} ← {unit?.title || "الوحدة"} ← {lesson?.title || "الدرس"}</p>
                </div>
              </div>

              <div className={`hidden shrink-0 items-center gap-2 text-sm font-bold md:flex ${isSaving ? "text-blue-700" : isDirty ? "text-amber-700" : "text-emerald-700"}`} role="status" aria-live="polite">
                {isSaving ? <RefreshCw className="h-5 w-5 animate-spin" /> : isDirty ? <span className="h-4 w-4 rounded-full border border-amber-600" /> : <Check className="h-5 w-5 rounded-full bg-emerald-600 p-1 text-white" />}
                <span>{isSaving ? "جارٍ الحفظ…" : isDirty ? "تغييرات غير محفوظة" : "تم الحفظ"}</span>
              </div>

              <div dir="rtl" className="flex shrink-0 items-center gap-2">
                {onPreview && (
                  <button type="button" onClick={() => previewCardFromOutline(focusedDocumentCard.id)} className="hidden h-10 items-center gap-2 rounded-lg border border-blue-500 bg-white px-4 text-sm font-extrabold text-blue-700 transition hover:bg-blue-50 sm:inline-flex dark:border-blue-700 dark:bg-slate-900 dark:text-blue-300" title="معاينة البطاقة في موضعها داخل الدرس">
                    <Eye className="h-4 w-4" />
                    معاينة الدرس
                  </button>
                )}
                {onSave && !readOnly && (
                  <button type="button" onClick={() => void onSave()} disabled={isSaving || isDocumentTransitioning} className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-extrabold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60" title="حفظ المستند (Ctrl+S)">
                    <Save className="h-4 w-4" />
                    <span className="hidden sm:inline">{isSaving ? "يحفظ…" : "حفظ"}</span>
                  </button>
                )}
                <button type="button" onClick={() => void closeFocusedDocument()} disabled={isDocumentTransitioning} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-rose-950/30" title="حفظ التغييرات والعودة إلى المناهج" aria-label="حفظ وإغلاق محرر المستند">
                  <X className="h-4 w-4" />
                </button>
                <div className="mr-2 hidden items-center gap-2 border-r border-slate-200 pr-4 xl:flex dark:border-slate-700">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white"><BookOpen className="h-5 w-5" /></div>
                  <span className="text-xl font-black tracking-tight text-blue-700 dark:text-blue-300">EduTech</span>
                </div>
              </div>
            </div>
          </header>

          <WorkspaceToolbarHost />
          <div className="workspace-view-controls">
            <WorkspaceOutlineToggle expanded={outlineExpanded} onChange={setOutlineExpanded}/>
            <button type="button" onClick={()=>setWorkspacePageSetup(v=>!v)}>إعداد الصفحة</button>
            <details><summary>المزيد</summary><button type="button" onClick={async()=>{if(await saveFocusedDocumentIfNeeded()){legacyOutlineRequested.current=true;setFocusedDocumentCardId(null);}}}>المخطط السابق</button></details>
            {deletedCardUndo && <button type="button" onClick={undoDeleteParagraph}>تراجع عن حذف البطاقة</button>}
          </div>
          {workspacePageSetup && <div className="absolute inset-x-4 top-24 bottom-12 z-[1800] overflow-auto rounded-xl bg-white p-4 shadow-xl dark:bg-slate-900"><button type="button" onClick={()=>setWorkspacePageSetup(false)}>العودة إلى مساحة العمل</button>{pageSetupView}</div>}
          <button type="button" className="document-outline-toggle" onClick={() => setDocumentOutlineOpen(open => !open)} aria-expanded={documentOutlineOpen}><List size={18} />مخطط الدرس · البطاقة {focusedDocumentIndex + 1} من {paragraphs.length}<ChevronDown size={16} /></button>
          <div className={`focused-editor-body flex min-h-0 flex-1 ${outlineExpanded ? "outline-expanded" : ""}`}>
            <aside dir="rtl" className={`document-outline ${documentOutlineOpen ? "is-open" : ""}`} aria-label="التنقل بين بطاقات الدرس">
              <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                <div className="flex items-center gap-2 text-sm font-extrabold text-slate-800 dark:text-slate-100">
                  <List className="h-4 w-4 text-blue-600" />
                  مخطط الدرس
                </div>
                <p className="mt-1 text-xs text-slate-500">{completedCardsCount} من {paragraphs.length} بطاقات بها محتوى</p>
              </div>
              <LessonOutline cards={visibleOutlineCards} allCards={paragraphs} activeId={focusedDocumentCard.id}
                query={outlineQuery} onQuery={setOutlineQuery} filter={outlineFilter} onFilter={setOutlineFilter}
                expanded={outlineExpanded} readOnly={readOnly} busy={isDocumentTransitioning || !!isSaving}
                summary={getCardSummary}
                onSelect={async id=>{if(isDocumentTransitioning)return; if(id===focusedDocumentCard.id){setOutlineExpanded(false);return;} setIsDocumentTransitioning(true);try{if(await saveFocusedDocumentIfNeeded()){openFocusedDocument(id);setDocumentOutlineOpen(false);}}finally{setIsDocumentTransitioning(false);}}}
                onAdd={async index=>{if(await saveFocusedDocumentIfNeeded()){setInlineAddIndex(index);setIsPickerOpen(true);}}}
                onMove={moveParagraph} onHide={card=>updateParagraph(card.id,"isVisible",card.isVisible===false)}
                onDuplicate={duplicateParagraph} onDelete={card=>{if(window.confirm(card.type==="questions"?"إزالة أسئلة هذه البطاقة من الدرس؟ ستبقى في بنك الأسئلة.":"حذف البطاقة؟ يمكنك التراجع خلال عشر ثوانٍ."))deleteParagraph(card.id);}}
                onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}/>
              <div className="document-outline-actions">

                <div className="flex gap-2">
                <button type="button" onClick={() => void moveFocusedDocument("previous")} disabled={isDocumentTransitioning || focusedDocumentIndex <= 0} className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-35 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800" title="البطاقة السابقة">
                  <ArrowRight className="h-4 w-4" />
                  <span className="hidden sm:inline">السابق</span>
                </button>
                <button type="button" onClick={() => void moveFocusedDocument("next")} disabled={isDocumentTransitioning || focusedDocumentIndex >= paragraphs.length - 1} className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-35 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800" title="البطاقة التالية">
                  <span className="hidden sm:inline">التالي</span>
                  <ArrowLeft className="h-4 w-4" />
                </button>
                </div>
              </div>
            </aside>

            <main dir="rtl" className="document-writing-area" aria-label="مساحة كتابة البطاقة">
              <div className="document-paper" style={{ zoom: documentZoom / 100 }}>
                <div className="focused-document-card">
                  <EditorCard
                    p={focusedDocumentCard}
                    index={focusedDocumentIndex}
                    totalCards={paragraphs.length}
                    cardInfo={focusedDocumentInfo}
                    cardTypesList={CARD_TYPES}
                    isDragged={false}
                    isActive={true}
                    isCollapsed={false}
                    shouldAutoFocus={pendingFocusCard?.id === focusedDocumentCard.id}
                    autoFocusPosition={pendingFocusCard?.id === focusedDocumentCard.id ? pendingFocusCard.position : "end"}
                    onAutoFocusComplete={handleAutoFocusComplete}
                    onRequestEditorFocus={requestCardEditorFocus}
                    onNavigateCard={(_, direction) => moveFocusedDocument(direction)}
                    setActiveParagraphId={selectActiveCard}
                    setActiveEditor={handleSetActiveEditor}
                    handleDragStart={handleDragStart}
                    handleDragOver={handleDragOver}
                    handleDragEnd={handleDragEnd}
                    updateParagraph={updateParagraph}
                    toggleCollapse={() => {}}
                    deleteParagraph={deleteParagraph}
                    duplicateParagraph={focusedDocumentCard.type === "questions" ? undefined : duplicateParagraph}
                    moveParagraph={moveParagraph}
                    lesson={lesson}
                    subject={subject}
                    unit={unit}
                    readOnly={readOnly}
                  />
                </div>
              </div>
            </main>
          </div>
          <WorkspaceStatus isSaving={!!isSaving} isDirty={!!isDirty} index={focusedDocumentIndex} count={paragraphs.length} zoom={documentZoom} onZoom={setDocumentZoom} />
        </div>
        </FocusedEditorWorkspace>
      )}

      <ImageInsertModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        onInsert={(url) => {
          validEditor?.chain().focus().setImage({ src: url }).run();
        }}
      />

      <LinkInsertModal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        initialUrl={validEditor?.getAttributes("link").href || ""}
        onInsert={(url) => {
          validEditor?.chain().focus().setLink({ href: url }).run();
        }}
      />

      <TableInsertModal
        isOpen={isTableModalOpen}
        onClose={() => setIsTableModalOpen(false)}
        onInsert={(rows, cols, withHeader) => {
          validEditor
            ?.chain()
            .focus()
            .insertTable({ rows, cols, withHeaderRow: withHeader })
            .run();
        }}
      />
      <SmartBlockInserterMenu
        isOpen={isPickerOpen}
        onClose={() => {
          setIsPickerOpen(false);
          setInlineAddIndex(null);
        }}
        onOpenOcr={() => setIsQuickPasteModalOpen(true)}
        onOpenAI={() => setIsAiAssistantOpen(true)}
        atIndex={inlineAddIndex === null ? paragraphs.length : inlineAddIndex + 1}
        placementLabel={
          inlineAddIndex === null
            ? "سيتم الإدراج في نهاية الدرس"
            : `سيتم الإدراج بعد: ${paragraphs[inlineAddIndex]?.title || "البطاقة المحددة"}`
        }
        onSelectType={(type, initialData) => {
          if (type === "questions") {
            const existingIdx = paragraphs.findIndex((p) => p.type === "questions");
            if (existingIdx !== -1) {
              if (initialData) {
                try {
                  const currentBody = paragraphs[existingIdx].body || "[]";
                  let qArray = [];
                  try { qArray = JSON.parse(currentBody); } catch(e) { qArray = []; }
                  const newQs = JSON.parse(initialData);
                  if (Array.isArray(newQs)) {
                    qArray.push(...newQs);
                  }
                  updateParagraph(paragraphs[existingIdx].id, "body", JSON.stringify(qArray));
                } catch(e) {}
              }
              activateCardForWriting(paragraphs[existingIdx].id, false);
              setFocusedDocumentCardId(paragraphs[existingIdx].id);
              return;
            }
          }

          const cardInfo = CARD_TYPES.find((c) => c.type === type);
          const label = cardInfo ? cardInfo.label : (type === "questions" ? "بنك الأسئلة والتدريبات" : "بطاقة جديدة");
          const newId = "p-" + Date.now();
          
          let defaultBody = initialData || "";
          if (!defaultBody && type === "tables") {
            defaultBody = "<table border='1'><tr><th>العنوان 1</th><th>العنوان 2</th></tr><tr><td>بيانات 1</td><td>بيانات 2</td></tr></table>";
          }

          const newP = {
            id: newId,
            title: label,
            type: type,
            body: defaultBody,
          };

          setParagraphs(previous => {
            const next = [...previous];
            const insertIdx = inlineAddIndex !== null
              ? Math.min(inlineAddIndex + 1, next.length)
              : next.length;
            next.splice(insertIdx, 0, newP);
            return next;
          });
          activateCardForWriting(newId, cardSupportsImmediateTyping(type), "start");
          setFocusedDocumentCardId(newId);
        }}
      />

      {deletedCardUndo && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 z-[2500] flex -translate-x-1/2 items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-2xl dark:bg-slate-100 dark:text-slate-900"
        >
          <span className="max-w-[260px] truncate">حُذفت «{deletedCardUndo.card.title || "البطاقة"}»</span>
          <button
            type="button"
            onClick={undoDeleteParagraph}
            className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 font-extrabold text-blue-300 transition hover:bg-white/20 dark:bg-slate-900/10 dark:text-blue-700"
          >
            <Undo className="h-4 w-4" />
            تراجع
          </button>
        </div>
      )}

      {/* Content Distributor Modal */}
      <ContentDistributorModal
        isOpen={isDistributorOpen}
        onClose={() => setIsDistributorOpen(false)}
        analysisResult={distributorAnalysisResult}
        onConfirmDistribute={handleConfirmDistributeCards}
        lessonContext={{
          id: lesson?.id || "",
          title: lesson?.title || "",
          subjectId: subject?.id || "",
          subjectName: subject?.name || "",
          unitId: unit?.id || "",
          unitTitle: unit?.title || "",
        }}
      />

      {/* Quick Paste Modal for Content Distributor */}
      {isQuickPasteModalOpen && (
        <div className="fixed inset-0 z-[2000] bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center">
                  <Layers className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                    موزع المحتوى التلقائي (Content Distributor)
                  </h3>
                  <p className="text-xs text-slate-500">
                    قم بلصق أو كتابة المستند كاملاً ليقوم النظام بتحليله وتوزيعه تلقائياً على البطاقات المناسبة.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsQuickPasteModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                المحتوى المراد تحليله وتوزيعه:
              </label>
              <div className="min-h-[250px] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                <RichTextEditor
                  value={quickPasteText}
                  onChange={setQuickPasteText}
                  placeholder="الصق نص الدرس أو المستند من Word / Google Docs / كتب هنا..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsQuickPasteModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                disabled={!quickPasteText.trim() || isDistributorProcessing}
                onClick={handleRunDistributorFromText}
                className="px-6 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-600/20 disabled:opacity-50 transition flex items-center gap-2 cursor-pointer"
              >
                {isDistributorProcessing ? (
                  <span>جاري التحليل...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>تحليل وتوزيع على البطاقات</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Question Parser Modal */}
      <QuestionParserModal
        isOpen={isQuestionParserOpen}
        onClose={() => setIsQuestionParserOpen(false)}
        initialContent={questionParserContent}
        onSendToQuestionObjectBuilder={(parsedQuestions) => {
          setHubParsedQuestions(parsedQuestions);
          setQuestionHubTab("builder");
          setIsQuestionHubOpen(true);
        }}
      />
      {/* Unified Question Hub Modal (Merges Picker, Builder, and Bank Sync) */}
      <UnifiedQuestionHubModal
        isOpen={isQuestionHubOpen}
        onClose={() => setIsQuestionHubOpen(false)}
        initialTab={questionHubTab}
        currentLessonId={lesson?.id}
        incomingQuestionsForSync={hubIncomingQuestions}
        parsedQuestionsForBuilder={hubParsedQuestions}
        alreadyInsertedQuestionIds={paragraphs.filter(p => p.type === 'questions').flatMap(p => {
          try {
            return JSON.parse(p.body || "[]").map((q: any) => q.id);
          } catch(e) { return []; }
        })}
        onInsertQuestions={(selectedQuestions) => {
          const existingQuestionsCardIdx = paragraphs.findIndex((p) => p.type === "questions");
          if (existingQuestionsCardIdx !== -1) {
            let existing: any[] = [];
            try {
              existing = JSON.parse(paragraphs[existingQuestionsCardIdx].body || "[]");
            } catch (e) {}
            const updated = [...existing, ...selectedQuestions];
            const updatedParagraphs = [...paragraphs];
            updatedParagraphs[existingQuestionsCardIdx] = {
              ...updatedParagraphs[existingQuestionsCardIdx],
              body: JSON.stringify(updated),
            };
            setParagraphs(updatedParagraphs);
            performSilentQuestionBankSync(updatedParagraphs);
          } else {
            const newCard = {
              id: "p-" + Date.now(),
              title: "أسئلة وتطبيقات الدرس",
              body: JSON.stringify(selectedQuestions.map((q: any) => storage.stripQuestionForSSOT(q))),
              type: "questions",
            };
            const updatedParagraphs = [...paragraphs, newCard];
            setParagraphs(updatedParagraphs);
            performSilentQuestionBankSync(updatedParagraphs);
          }
        }}
        onConfirmSaveObjects={(objects) => {
          performSilentQuestionBankSync(paragraphs);
        }}
        onSyncCompleted={(finalBank) => {
          console.log("Unified hub sync completed. Total bank items:", finalBank.length);
        }}
      />
      {/* Silent Background Sync Floating Toast Notice */}
      {silentSyncNotice && (
        <div className="fixed bottom-6 left-6 z-[2100] bg-slate-900 text-emerald-400 border border-emerald-500/40 px-4 py-3 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2.5 animate-in slide-in-from-bottom-5">
          <Database className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>{silentSyncNotice}</span>
        </div>
      )}
      {/* AI Content Assistant Modal */}
      <AIContentAssistantModal
        isOpen={isAiAssistantOpen}
        onClose={() => setIsAiAssistantOpen(false)}
        incomingElements={aiAssistantElements}
        onConfirmImportToCards={(newCards) => {
          setParagraphs([...paragraphs, ...newCards]);
        }}
        onSendQuestionsToObjectBuilder={(questions) => {
          setHubParsedQuestions(questions);
          setQuestionHubTab("builder");
          setIsQuestionHubOpen(true);
        }}
      />

      {/* Ruler Properties Modal (نافذة التحكم بخواص المسطرة والهوامش) */}
      {isRulerModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[2000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden"
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-xl">
                  <Ruler className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">نافذة التحكم بخواص المسطرة والهوامش</h3>
                  <p className="text-xs text-purple-100 mt-0.5">تعديل وحدة القياس، الهوامش، ودقة التدرج لصفحات الدروس</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRulerModalOpen(false)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              
              {/* Status & Display Toggle */}
              <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Ruler className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <div>
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-100 block">حالة عرض المسطرة</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {showRuler ? "المسطرة ظاهرة أعلى المستند" : "المسطرة مخفية حالياً"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRuler(!showRuler)}
                  className={`px-3.5 py-2 rounded-xl font-extrabold text-xs cursor-pointer transition shadow-2xs flex items-center gap-1.5 ${
                    showRuler
                      ? "bg-purple-600 text-white hover:bg-purple-700"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300"
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  <span>{showRuler ? "إخفاء المسطرة" : "إظهار المسطرة"}</span>
                </button>
              </div>

              {/* Unit Selection */}
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                  وحدة قياس المسطرة
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: "cm", label: "سنتيمتر (cm)", desc: "الافتراضي للطباعة" },
                    { id: "inch", label: "بوصة (inch)", desc: "المعيار الأمريكي" },
                    { id: "px", label: "بكسل (px)", desc: "للتصاميم الرقمية" },
                  ].map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setRulerSettings((s) => ({ ...s, unit: u.id as any }))}
                      className={`p-3 rounded-xl border text-right cursor-pointer transition ${
                        rulerSettings.unit === u.id
                          ? "bg-purple-50 dark:bg-purple-900/40 border-purple-600 text-purple-900 dark:text-purple-100 font-extrabold shadow-2xs"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                      }`}
                    >
                      <span className="block text-xs font-bold">{u.label}</span>
                      <span className="block text-[10px] opacity-75 mt-0.5">{u.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Preset Margins */}
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                  نماذج هوامش جاهزة
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setRulerSettings((s) => ({
                        ...s,
                        rightMargin: 2.5,
                        leftMargin: 2.5,
                        topMargin: 2.0,
                        bottomMargin: 2.0,
                      }))
                    }
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:bg-purple-50 hover:border-purple-300 text-xs font-bold text-slate-700 dark:text-slate-300 transition text-center cursor-pointer"
                  >
                    قياسي (2.5 سم)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setRulerSettings((s) => ({
                        ...s,
                        rightMargin: 1.25,
                        leftMargin: 1.25,
                        topMargin: 1.25,
                        bottomMargin: 1.25,
                      }))
                    }
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:bg-purple-50 hover:border-purple-300 text-xs font-bold text-slate-700 dark:text-slate-300 transition text-center cursor-pointer"
                  >
                    ضيق (1.25 سم)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setRulerSettings((s) => ({
                        ...s,
                        rightMargin: 3.5,
                        leftMargin: 3.5,
                        topMargin: 3.0,
                        bottomMargin: 3.0,
                      }))
                    }
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:bg-purple-50 hover:border-purple-300 text-xs font-bold text-slate-700 dark:text-slate-300 transition text-center cursor-pointer"
                  >
                    عريض (3.5 سم)
                  </button>
                </div>
              </div>

              {/* Margin Inputs Grid */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الهامش الأيمن ({rulerSettings.unit})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={rulerSettings.rightMargin}
                    onChange={(e) =>
                      setRulerSettings((s) => ({
                        ...s,
                        rightMargin: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الهامش الأيسر ({rulerSettings.unit})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={rulerSettings.leftMargin}
                    onChange={(e) =>
                      setRulerSettings((s) => ({
                        ...s,
                        leftMargin: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الهامش العلوي ({rulerSettings.unit})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={rulerSettings.topMargin}
                    onChange={(e) =>
                      setRulerSettings((s) => ({
                        ...s,
                        topMargin: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الهامش السفلي ({rulerSettings.unit})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={rulerSettings.bottomMargin}
                    onChange={(e) =>
                      setRulerSettings((s) => ({
                        ...s,
                        bottomMargin: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              {/* Subdivision Step */}
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                  دقة تدرج الأرقام على المسطرة
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { step: 1, label: "تدرج كل 1 وحدة" },
                    { step: 2, label: "تدرج كل 2 وحدة" },
                    { step: 5, label: "تدرج كل 5 وحدات" },
                  ].map((item) => (
                    <button
                      key={item.step}
                      type="button"
                      onClick={() => setRulerSettings((s) => ({ ...s, step: item.step }))}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        rulerSettings.step === item.step
                          ? "bg-purple-600 text-white border-purple-700"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setShowRuler(true);
                  setIsRulerModalOpen(false);
                }}
                className="px-4 py-2 bg-purple-100 dark:bg-purple-900/50 hover:bg-purple-200 text-purple-700 dark:text-purple-300 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <Eye className="w-4 h-4" />
                <span>إظهار المسطرة وتطبيق</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsRulerModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => setIsRulerModalOpen(false)}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-extrabold text-xs shadow-md shadow-purple-600/20 transition cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>تطبيق الخواص</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
});
