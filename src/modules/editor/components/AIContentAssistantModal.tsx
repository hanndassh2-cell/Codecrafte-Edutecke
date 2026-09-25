import { MathText } from "../../../components/MathText";
import { RichTextEditor } from "./RichTextEditor";
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Sparkles,
  Check,
  AlertTriangle,
  HelpCircle,
  Layers,
  Edit3,
  Trash2,
  RefreshCw,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  BrainCircuit,
  Info,
  CheckCircle2,
  XCircle,
  Tag,
  BookOpen,
  Send,
  Database,
  Sliders,
} from "lucide-react";
import { SemanticElement } from "../../../services/contentAnalyzer";
import {
  AIContentAnalysisItem,
  AIContentType,
  AI_TYPE_ARABIC_LABELS,
  analyzeContentWithAI,
  recordUserCorrection,
  mapAiTypeToCard,
} from "../../../services/aiContentAssistant";
import { CARD_TYPES } from "./EditorPanel";
import { buildQuestionObject } from "../../../services/questionObjectBuilder";
import { AIExecutionCenterModal } from "../../ai/components/AIExecutionCenterModal";
import { systemLog } from "../../../services/diagnosticLogger";

interface AIContentAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  incomingElements?: SemanticElement[];
  onConfirmImportToCards?: (editorCards: { id: string; title: string; body: string; type: string }[]) => void;
  onSendQuestionsToObjectBuilder?: (questions: any[]) => void;
}

export const AIContentAssistantModal: React.FC<AIContentAssistantModalProps> = ({
  isOpen,
  onClose,
  incomingElements = [],
  onConfirmImportToCards,
  onSendQuestionsToObjectBuilder,
}) => {
  const [items, setItems] = useState<AIContentAnalysisItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [activeTab, setActiveTab] = useState<"all" | "ai" | "needsReview" | "questions">("all");
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editType, setEditType] = useState<AIContentType>("paragraph");
  const [showExecutionCenter, setShowExecutionCenter] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (isOpen && incomingElements.length > 0) {
      runAnalysis(incomingElements);
    }
  }, [isOpen, incomingElements]);

  const runAnalysis = async (elementsToAnalyze: SemanticElement[]) => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsAnalyzing(true);
    systemLog(`بدء تحليل ${elementsToAnalyze.length} عنصر عبر مساعد الذكاء الاصطناعي...`, "info");
    setProgressPercent(10);

    try {
      const result = await analyzeContentWithAI(elementsToAnalyze, {
        signal: controller.signal,
        onProgress: (p) => setProgressPercent(p),
      });

      setItems(result.items);
      systemLog(`تم تحليل وتصنيف جميع العناصر بنجاح.`, "success");
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("AI Analysis cancelled by user.");
      } else {
        console.error("AI Analysis failed:", err);
        systemLog(`فشل تحليل العناصر: ${err.message}`, "error");
      }
    } finally {
      setIsAnalyzing(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelAnalysis = () => {
    systemLog("تم النقر على إلغاء التحليل.", "warn");
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsAnalyzing(false);
  };

  if (!isOpen) return null;

  // Filtered items
  const filteredItems = items.filter((item) => {
    if (item.status === "ignored") return false;
    if (activeTab === "ai") return !item.needsManualReview && item.confidenceScore >= 60;
    if (activeTab === "needsReview") return item.needsManualReview || item.confidenceScore < 60;
    if (activeTab === "questions") return item.isQuestion;
    return true;
  });

  const counts = {
    all: items.filter((i) => i.status !== "ignored").length,
    ai: items.filter((i) => i.status !== "ignored" && !i.needsManualReview && i.confidenceScore >= 60).length,
    needsReview: items.filter((i) => i.status !== "ignored" && (i.needsManualReview || i.confidenceScore < 60)).length,
    questions: items.filter((i) => i.status !== "ignored" && i.isQuestion).length,
  };

  // Actions per item
  const handleAcceptItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: "accepted" } : item))
    );
  };

  const handleIgnoreItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: "ignored" } : item))
    );
  };

  const handleChangeCardType = (id: string, newCardType: string) => {
    const cardObj = CARD_TYPES.find((c) => c.type === newCardType);
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          // Record user correction for system learning
          recordUserCorrection(
            item.originalText,
            item.suggestedType,
            item.userCustomType || item.suggestedType,
            newCardType
          );

          return {
            ...item,
            userCustomCardType: newCardType,
            suggestedCardTitle: cardObj ? `${cardObj.label}` : item.suggestedCardTitle,
            status: "modified",
          };
        }
        return item;
      })
    );
  };

  const handleChangeItemType = (id: string, newType: AIContentType) => {
    const cardInfo = mapAiTypeToCard(newType);
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          recordUserCorrection(item.originalText, item.suggestedType, newType, cardInfo.cardType);

          return {
            ...item,
            userCustomType: newType,
            suggestedTypeLabelArabic: AI_TYPE_ARABIC_LABELS[newType] || "عنصر",
            suggestedCardType: cardInfo.cardType,
            suggestedCardTitle: cardInfo.cardTitle,
            needsManualReview: false,
            status: "modified",
          };
        }
        return item;
      })
    );
    setEditingItemId(null);
  };

  const handleAcceptAll = () => {
    setItems((prev) => prev.map((item) => ({ ...item, status: "accepted" })));
  };

  // Import to Editor Cards
  const handleImportToEditorCards = () => {
    const validItems = items.filter((i) => i.status !== "ignored");
    if (validItems.length === 0) return;

    // Group items by target card type
    const groupedCards: Record<string, { title: string; htmlParts: string[] }> = {};

    validItems.forEach((item) => {
      const targetCard = item.userCustomCardType || item.suggestedCardType;
      const title = item.suggestedCardTitle;

      if (!groupedCards[targetCard]) {
        groupedCards[targetCard] = { title, htmlParts: [] };
      }

      const content = item.originalHtml.startsWith("<")
        ? item.originalHtml
        : `<p>${item.originalText}</p>`;
      groupedCards[targetCard].htmlParts.push(content);
    });

    const finalEditorCards = Object.entries(groupedCards).map(([cardType, data]) => ({
      id: "card-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
      title: data.title,
      body: data.htmlParts.join("\n"),
      type: cardType,
    }));

    if (onConfirmImportToCards) {
      onConfirmImportToCards(finalEditorCards);
    }
    onClose();
  };

  // Convert Questions to Question Objects and trigger Builder
  const handleSendQuestionsToBuilder = () => {
    const questionItems = items.filter((i) => i.status !== "ignored" && i.isQuestion);
    if (questionItems.length === 0) return;

    const builtObjects = questionItems.map((q) => {
      const details = q.questionDetails;
      return buildQuestionObject({
        questionText: details?.questionText || q.originalText,
        questionType: details?.questionType || "essay",
        questionTypeLabelArabic: details?.questionTypeLabelArabic || "سؤال",
        choices: details?.options?.map((opt, i) => ({
          id: "opt_" + i,
          letter: opt.letter || String.fromCharCode(0x0623 + i),
          text: opt.text,
          isCorrect: !!opt.isCorrect,
        })) || [],
        correctAnswer: details?.correctAnswer || "",
        difficulty: details?.difficulty || "medium",
        difficultyLabelArabic: details?.difficultyLabelArabic || "متوسط",
        keywords: details?.keywords || [],
      });
    });

    if (onSendQuestionsToObjectBuilder) {
      onSendQuestionsToObjectBuilder(builtObjects);
    } else {
      window.dispatchEvent(
        new CustomEvent("open-question-builder", { detail: builtObjects })
      );
    }
    onClose();
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[2000] bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        dir="rtl"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ type: "spring", duration: 0.4 }}
          className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-5xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-purple-50/95 via-slate-50/95 to-indigo-50/95 dark:from-purple-950/90 dark:via-slate-900/95 dark:to-indigo-950/90 backdrop-blur-md flex items-center justify-between shrink-0 sticky top-0 z-20 shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/20">
                <BrainCircuit className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">
                    مساعد المحتوى الذكي (AI Content Assistant)
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    Fallback & Deep Classification
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  تصنيف ذكي للعناصر المعقدة أو غير المحددة واقتراح توزيعها بدقة مع الاحتفاظ بقرار المستخدم النهائي.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowExecutionCenter(true)}
                className="px-3 py-1.5 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center gap-1.5 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition cursor-pointer"
                title="فتح مركز التنفيذ الموحد لاختيار النموذج أو استراتيجية Fallback"
              >
                <Sliders className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>مركز التنفيذ (14B)</span>
              </button>
              {isAnalyzing && (
                <button
                  onClick={handleCancelAnalysis}
                  className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900 transition font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  إلغاء التحليل
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Progress Bar Header when Analyzing */}
          {isAnalyzing && (
            <div className="bg-purple-50 dark:bg-purple-950/30 p-3 border-b border-purple-100 dark:border-purple-900/40 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-800 dark:text-purple-300">
                <RefreshCw className="w-4 h-4 text-purple-600 animate-spin" />
                <span>جاري تحليل العناصر واستخراج الدلالات عبر الذكاء الاصطناعي...</span>
              </div>
              <div className="flex items-center gap-3 w-1/3">
                <div className="w-full bg-purple-200 dark:bg-purple-900 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-600 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
                <span className="text-xs font-black text-purple-700 dark:text-purple-300 font-mono">
                  {progressPercent}%
                </span>
              </div>
            </div>
          )}

          {/* Filter Navigation Tabs */}
          <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 px-6 py-2 gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "all"
                  ? "bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 shadow-sm border border-slate-200/80 dark:border-slate-700"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>الكل</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {counts.all}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("ai")}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "ai"
                  ? "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-sm border border-slate-200/80 dark:border-slate-700"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>مصنفة بالذكاء الاصطناعي</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                {counts.ai}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("needsReview")}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "needsReview"
                  ? "bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 shadow-sm border border-slate-200/80 dark:border-slate-700"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>يحتاج إلى مراجعة يدوية</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                {counts.needsReview}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("questions")}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "questions"
                  ? "bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-sm border border-slate-200/80 dark:border-slate-700"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <HelpCircle className="w-4 h-4 text-indigo-600" />
              <span>أسئلة مكتشفة</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                {counts.questions}
              </span>
            </button>
          </div>

          {/* Main List Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {filteredItems.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                  <Info className="w-6 h-6" />
                </div>
                <p className="text-sm font-extrabold text-slate-600 dark:text-slate-400">
                  لا توجد عناصر مطابقة للتصفية الحالية
                </p>
                <p className="text-xs text-slate-400">
                  يمكنك تغيير تبويب التصفية أو البدء بتحليل عناصر جديدة.
                </p>
              </div>
            ) : (
              filteredItems.map((item, idx) => {
                const currentType = item.userCustomType || item.suggestedType;
                const currentCardType = item.userCustomCardType || item.suggestedCardType;
                const isExpanded = expandedQuestionId === item.id;

                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-2xl border transition-all space-y-3 ${
                      item.needsManualReview
                        ? "bg-amber-50/30 dark:bg-amber-950/10 border-amber-200/70 dark:border-amber-900/40"
                        : item.status === "accepted"
                        ? "bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-200/70 dark:border-emerald-900/40"
                        : item.status === "modified"
                        ? "bg-purple-50/30 dark:bg-purple-950/10 border-purple-200/70 dark:border-purple-900/40"
                        : "bg-white dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-800"
                    }`}
                  >
                    {/* Item Row Top Header */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                          #{idx + 1}
                        </span>

                        {/* Suggested Type Tag */}
                        <span className="px-3 py-1 rounded-xl text-xs font-black bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5" />
                          {AI_TYPE_ARABIC_LABELS[currentType] || "عنصر"}
                        </span>

                        {/* Confidence Score Badge */}
                        <span
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-black border flex items-center gap-1 ${
                            item.confidenceScore >= 80
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                              : item.confidenceScore >= 60
                              ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                              : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                          }`}
                        >
                          <Sparkles className="w-3 h-3" />
                          درجة الثقة: {item.confidenceScore}%
                        </span>

                        {item.needsManualReview && (
                          <span className="px-2.5 py-1 rounded-xl text-[11px] font-extrabold bg-amber-500 text-white flex items-center gap-1 shadow-xs">
                            <AlertTriangle className="w-3 h-3" />
                            يحتاج مراجعة يدوية
                          </span>
                        )}

                        {item.status === "accepted" && (
                          <span className="px-2.5 py-1 rounded-xl text-[11px] font-extrabold bg-emerald-600 text-white flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            تم القبول
                          </span>
                        )}
                        {item.status === "modified" && (
                          <span className="px-2.5 py-1 rounded-xl text-[11px] font-extrabold bg-purple-600 text-white flex items-center gap-1">
                            <Edit3 className="w-3 h-3" />
                            معدّل من المستخدم
                          </span>
                        )}
                      </div>

                      {/* Right side controls: Target Card Dropdown & Actions */}
                      <div className="flex items-center gap-2">
                        {/* Card Selector Dropdown */}
                        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                          <span className="text-[10px] font-black text-slate-400">البطاقة:</span>
                          <select
                            value={currentCardType}
                            onChange={(e) => handleChangeCardType(item.id, e.target.value)}
                            className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                          >
                            {CARD_TYPES.map((card) => (
                              <option key={card.type} value={card.type} className="dark:bg-slate-900">
                                {card.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Quick Type Edit Button */}
                        <button
                          onClick={() => {
                            setEditingItemId(editingItemId === item.id ? null : item.id);
                            setEditType(currentType);
                          }}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-purple-600 transition cursor-pointer"
                          title="تعديل التصنيف"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {/* Accept Button */}
                        <button
                          onClick={() => handleAcceptItem(item.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1 cursor-pointer ${
                            item.status === "accepted"
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>قبول</span>
                        </button>

                        {/* Ignore Button */}
                        <button
                          onClick={() => handleIgnoreItem(item.id)}
                          className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-950/50 rounded-lg text-slate-400 hover:text-rose-600 transition cursor-pointer"
                          title="تجاهل العنصر"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Quick Inline Type Selector */}
                    {editingItemId === item.id && (
                      <div className="p-3 bg-purple-50/80 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800 flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs font-bold text-purple-900 dark:text-purple-200">
                          اختر التصنيف الجديد للعنصر:
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {(Object.keys(AI_TYPE_ARABIC_LABELS) as AIContentType[]).map((t) => (
                            <button
                              key={t}
                              onClick={() => handleChangeItemType(item.id, t)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-extrabold cursor-pointer transition ${
                                currentType === t
                                  ? "bg-purple-600 text-white"
                                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-purple-100"
                              }`}
                            >
                              {AI_TYPE_ARABIC_LABELS[t]}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Original Content Snippet */}
                    <div className="p-3 bg-slate-50/80 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800/80 text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                      <div className="line-clamp-3 overflow-hidden text-ellipsis"><RichTextEditor value={item.originalText || ""} readOnly /></div>
                    </div>

                    {/* Rationale / Reason */}
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                      <Info className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                      <div>
                        <strong>سبب الاقتراح:</strong> <MathText inline text={item.rationale || ""} />
                      </div>
                    </div>

                    {/* Question Details Panel if Question detected */}
                    {item.isQuestion && item.questionDetails && (
                      <div className="mt-2 p-3.5 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                            <HelpCircle className="w-4 h-4 text-indigo-600" />
                            تفاصيل السؤال المكتشف بالذكاء الاصطناعي:
                          </span>
                          <button
                            onClick={() =>
                              setExpandedQuestionId(isExpanded ? null : item.id)
                            }
                            className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>{isExpanded ? "طَي التفاصيل" : "عرض التفاصيل الكاملة"}</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          <span className="px-2.5 py-0.5 rounded-md font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200">
                            {item.questionDetails.questionTypeLabelArabic}
                          </span>
                          {item.questionDetails.difficultyLabelArabic && (
                            <span className="px-2.5 py-0.5 rounded-md font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200">
                              صعوبة: {item.questionDetails.difficultyLabelArabic}
                            </span>
                          )}
                          {item.questionDetails.educationalSkill && (
                            <span className="px-2.5 py-0.5 rounded-md font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200">
                              مهارة: {item.questionDetails.educationalSkill}
                            </span>
                          )}
                        </div>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/30 space-y-2 text-xs">
                            <div className="font-bold text-slate-800 dark:text-slate-200">
                              <span className="text-slate-500 ml-1">نص السؤال:</span> <MathText inline text={item.questionDetails.questionText} />
                            </div>
                            {item.questionDetails.options &&
                              item.questionDetails.options.length > 0 && (
                                <div className="space-y-1">
                                  <span className="text-[10px] font-black text-slate-400 block">
                                    الخيارات المكتشفة:
                                  </span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                    {(item.questionDetails.options || []).map((opt, oIdx) => (
                                      <div
                                        key={oIdx}
                                        className={`px-2.5 py-1.5 rounded-lg border flex items-center justify-between text-xs ${
                                          opt.isCorrect
                                            ? "bg-emerald-100/70 border-emerald-300 text-emerald-900 font-bold dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-200"
                                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                                        }`}
                                      >
                                        <div className="flex-1 overflow-hidden">
                                          <strong>{opt.letter})</strong> <MathText inline text={opt.text} />
                                        </div>
                                        {opt.isCorrect && (
                                          <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-black shrink-0 mr-2">
                                            إجابة صحيحة
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                            {item.questionDetails.correctAnswer && (
                              <div className="text-emerald-700 dark:text-emerald-300 font-bold flex gap-1">
                                <span>الإجابة النموذجية:</span> <MathText inline text={item.questionDetails.correctAnswer} />
                              </div>
                            )}

                            {item.questionDetails.keywords &&
                              item.questionDetails.keywords.length > 0 && (
                                <div className="flex items-center gap-1 flex-wrap pt-1">
                                  <span className="text-[10px] text-slate-400">
                                    الكلمات المفتاحية:
                                  </span>
                                  {item.questionDetails.keywords.map((kw, kIdx) => (
                                    <span
                                      key={kIdx}
                                      className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px] font-mono text-slate-700 dark:text-slate-300"
                                    >
                                      #{kw}
                                    </span>
                                  ))}
                                </div>
                              )}
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span>
                المقبولة:{" "}
                <strong className="text-emerald-600">
                  {items.filter((i) => i.status === "accepted").length}
                </strong>
              </span>
              <span>•</span>
              <span>
                المعدلة:{" "}
                <strong className="text-purple-600">
                  {items.filter((i) => i.status === "modified").length}
                </strong>
              </span>
              <span>•</span>
              <span>
                المتبقية:{" "}
                <strong className="text-amber-600">
                  {items.filter((i) => i.status === "pending").length}
                </strong>
              </span>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
              <button
                onClick={handleAcceptAll}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition font-extrabold text-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4 text-emerald-600" />
                <span>قبول الكل</span>
              </button>

              {counts.questions > 0 && (
                <button
                  onClick={handleSendQuestionsToBuilder}
                  className="px-4 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Send className="w-4 h-4 text-indigo-600" />
                  <span>تحويل الأسئلة إلى Bano (Question Object Builder)</span>
                </button>
              )}

              <button
                onClick={handleImportToEditorCards}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white font-black text-xs transition-all flex items-center gap-2 shadow-lg shadow-purple-600/20 cursor-pointer"
              >
                <Layers className="w-4 h-4" />
                <span>توزيع وتأكيد الإدراج في بطاقات المحرر</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Global AI Execution Center Modal */}
      {showExecutionCenter && (
        <AIExecutionCenterModal
          isOpen={showExecutionCenter}
          onClose={() => setShowExecutionCenter(false)}
          taskType="content_assistant"
          taskPayload={{
            title: "مساعد المحتوى الذكي (AI Content Assistant)",
            elementsCount: incomingElements.length,
            previewText: incomingElements
              .map((e) => e.textContent)
              .filter(Boolean)
              .slice(0, 3)
              .join(" | "),
          }}
          onExecute={async (opts) => {
            const res = await analyzeContentWithAI(incomingElements, {
              mode: opts.mode,
              specificModelId: opts.specificModelId,
              abortSignal: opts.abortSignal,
              onProgress: opts.onProgress,
            });
            return res;
          }}
          onSuccessResult={(res) => {
            if (res && Array.isArray(res.items)) {
              setItems(res.items);
            }
          }}
        />
      )}
    </AnimatePresence>
  );
};
