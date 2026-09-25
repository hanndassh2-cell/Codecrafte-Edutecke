import React, { useState, useRef, useEffect } from "react";
import { storage } from "../../../services/storage";
import {
  X,
  Sparkles,
  Play,
  RotateCcw,
  ShieldCheck,
  Zap,
  Layers,
  CheckCircle2,
  AlertCircle,
  Clock,
  Key,
  HelpCircle,
  ChevronRight,
  Sliders,
  Image as ImageIcon,
  Check,
  Timer,
  FileQuestion,
  BookOpen,
  Copy,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import {
  AiSettings,
  getAISettingsList,
  getMaskedKey,
  AIExecutionProgress,
  AIExecutionSuccessResult,
  ProviderType,
} from "../services/aiProviderAdapter";
import { MathText } from "../../../components/MathText";

export type AITaskType =
  | "solve_question"
  | "generate_distractors"
  | "smart_import"
  | "generate_exam"
  | "content_assistant"
  | "ocr_extract";

export interface AITaskPayload {
  title?: string;
  description?: string;
  previewText?: string;
  questionText?: string;
  answerText?: string;
  imageBase64?: string;
  subjectName?: string;
  unitName?: string;
  elementsCount?: number;
  metadata?: Record<string, any>;
}

export interface AIExecutionCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskType: AITaskType;
  taskPayload: AITaskPayload;
  onExecute: (options: {
    mode: "auto" | "specific";
    specificModelId?: string;
    abortSignal: AbortSignal;
    onProgress: (progress: AIExecutionProgress) => void;
  }) => Promise<any>;
  onSuccessResult: (result: any, meta?: AIExecutionSuccessResult<any>) => void;
}

const TASK_TITLES: Record<AITaskType, { title: string; subtitle: string; iconColor: string }> = {
  solve_question: {
    title: "حل السؤال الإجرائي بالذكاء الاصطناعي",
    subtitle: "توليد خطوات الحل النموذجية وتفسير الإجابة الصحيحة",
    iconColor: "text-blue-600 bg-blue-100 dark:bg-blue-900/30",
  },
  generate_distractors: {
    title: "مولّد المشتتات الذكية",
    subtitle: "توليد 3 خيارات خاطئة ومنطقية تستهدف الأخطاء المفاهيمية الشائعة",
    iconColor: "text-purple-600 bg-purple-100 dark:bg-purple-900/30",
  },
  smart_import: {
    title: "استيراد وتحليل الأسئلة الذكي",
    subtitle: "استخراج وتصنيف الأسئلة والمراجع تلقائياً من النصوص الخام",
    iconColor: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30",
  },
  generate_exam: {
    title: "مساعد هيكلة وتوليد الاختبار (Copilot)",
    subtitle: "توزيع الأسئلة والأوزان النسبية والمستويات المعرفية بذكاء",
    iconColor: "text-amber-600 bg-amber-100 dark:bg-amber-900/30",
  },
  content_assistant: {
    title: "المساعد التعليمي لتوزيع المحتوى",
    subtitle: "تصنيف وتحليل عناصر الدرس وتوليد الأنشطة والمفاهيم",
    iconColor: "text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30",
  },
  ocr_extract: {
    title: "استخراج النصوص والمعادلات من الصور (OCR)",
    subtitle: "تحليل بصري متعدد الوسائط واستخراج دقيق لمعادلات LaTeX والجداول",
    iconColor: "text-teal-600 bg-teal-100 dark:teal-900/30",
  },
};

const PROVIDER_NAMES: Record<ProviderType, string> = {
  google: "Google Gemini",
  openai: "OpenAI",
  anthropic: "Anthropic Claude",
  deepseek: "DeepSeek",
  groq: "Groq LPU",
  openrouter: "OpenRouter",
  mistral: "Mistral AI",
  together: "Together AI",
  ollama: "Ollama (محلي)",
  custom: "مخصص OpenAI-Compatible",
};

export interface ModelComparisonState {
  modelId: string;
  modelName: string;
  provider: ProviderType;
  maskedKey: string;
  status: "idle" | "running" | "success" | "error" | "timeout" | "aborted";
  durationMs: number;
  resultData: any | null;
  resultMeta: AIExecutionSuccessResult<any> | null;
  errorMessage: string | null;
  progressMessage: string | null;
}

// Result Renderer for Task Outputs
const TaskResultPreview: React.FC<{ taskType: AITaskType; data: any }> = ({ taskType, data }) => {
  if (!data) return <span className="text-slate-400 italic text-xs">لا توجد بيانات</span>;

  // 1. Solve Question
  if (taskType === "solve_question") {
    const solutionText = typeof data === "string" ? data : data.solution || JSON.stringify(data);
    return (
      <div className="text-xs text-slate-800 dark:text-slate-200 space-y-2 max-h-60 overflow-y-auto custom-scrollbar p-1">
        <MathText text={solutionText} />
      </div>
    );
  }

  // 2. Generate Distractors
  if (taskType === "generate_distractors") {
    const distractorsList = Array.isArray(data.distractors)
      ? data.distractors
      : Array.isArray(data)
      ? data
      : [];
    const rationale = data.rationale || "";
    return (
      <div className="space-y-2 text-xs max-h-60 overflow-y-auto custom-scrollbar p-1">
        <div className="space-y-1.5">
          <span className="font-bold text-slate-700 dark:text-slate-300 block text-[11px]">
            المشتتات المقترحة:
          </span>
          {distractorsList.map((d: any, idx: number) => {
            const textStr = typeof d === "string" ? d : d.text || JSON.stringify(d);
            const letters = ["أ", "ب", "ج", "د"];
            return (
              <div
                key={idx}
                className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/50 flex items-start gap-2"
              >
                <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                  {letters[idx] || idx + 1}
                </span>
                <div className="flex-1 text-slate-800 dark:text-slate-200">
                  <MathText text={textStr} />
                </div>
              </div>
            );
          })}
        </div>

        {rationale && (
          <div className="p-2 rounded-lg bg-purple-50/60 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 text-[11px] text-purple-900 dark:text-purple-200">
            <span className="font-bold block mb-0.5">التعليل التربوي:</span>
            <MathText text={rationale} />
          </div>
        )}
      </div>
    );
  }

  // 3. Smart Import
  if (taskType === "smart_import") {
    const questions = Array.isArray(data.parsedQuestions) ? data.parsedQuestions : [];
    return (
      <div className="space-y-2 text-xs max-h-60 overflow-y-auto custom-scrollbar p-1">
        <div className="flex items-center justify-between text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-lg">
          <span>تم استخراج {questions.length} أسئلة بنجاح</span>
        </div>
        <div className="space-y-1.5">
          {questions.slice(0, 3).map((q: any, idx: number) => (
            <div
              key={idx}
              className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] space-y-1"
            >
              <div className="font-bold text-slate-800 dark:text-white line-clamp-2">
                <MathText text={q.text || q.questionText || `سؤال ${idx + 1}`} />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>النوع: {q.type || "عام"}</span>
                {q.answer && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold truncate max-w-[120px]">
                    الإجابة: {q.answer}
                  </span>
                )}
              </div>
            </div>
          ))}
          {questions.length > 3 && (
            <div className="text-[10px] text-slate-400 text-center font-mono">
              + {questions.length - 3} أسئلة أخرى
            </div>
          )}
        </div>
      </div>
    );
  }

  // 4. Generate Exam Copilot
  if (taskType === "generate_exam") {
    const rationale = data.pedagogicalRationale || (typeof data === "string" ? data : "");
    return (
      <div className="space-y-2 text-xs max-h-60 overflow-y-auto custom-scrollbar p-1">
        {rationale && (
          <div className="p-2 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 text-xs">
            <span className="font-bold block mb-1">الرؤية التربوية والتوزيع المقترح:</span>
            <MathText text={rationale} />
          </div>
        )}
      </div>
    );
  }

  // 5. Content Assistant
  if (taskType === "content_assistant") {
    const items = Array.isArray(data.items) ? data.items : [];
    return (
      <div className="space-y-2 text-xs max-h-60 overflow-y-auto custom-scrollbar p-1">
        <div className="flex items-center justify-between text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-1 rounded-lg">
          <span>تم تصنيف {items.length} عناصر للدرس</span>
        </div>
        <div className="space-y-1">
          {items.slice(0, 4).map((it: any, idx: number) => (
            <div
              key={idx}
              className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] flex items-center justify-between"
            >
              <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[140px]">
                {it.suggestedCardTitle || it.suggestedTypeLabelArabic || it.suggestedType}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-mono">
                {it.confidenceScore}% ثقة
              </span>
            </div>
          ))}
          {items.length > 4 && (
            <div className="text-[10px] text-slate-400 text-center font-mono">
              + {items.length - 4} عناصر أخرى
            </div>
          )}
        </div>
      </div>
    );
  }

  // 6. OCR Extract
  if (taskType === "ocr_extract") {
    const htmlText = data.html || data.text || (typeof data === "string" ? data : "");
    return (
      <div className="text-xs text-slate-800 dark:text-slate-200 space-y-2 max-h-60 overflow-y-auto custom-scrollbar p-1">
        <div className="font-mono text-[11px] bg-slate-50 dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800 break-words whitespace-pre-wrap">
          {htmlText.slice(0, 300)}
          {htmlText.length > 300 && "..."}
        </div>
      </div>
    );
  }

  // Generic fallback
  const fallbackStr = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return (
    <div className="text-xs text-slate-800 dark:text-slate-200 font-mono max-h-48 overflow-y-auto p-1">
      <MathText text={fallbackStr} />
    </div>
  );
};

export const AIExecutionCenterModal: React.FC<AIExecutionCenterModalProps> = ({
  isOpen,
  onClose,
  taskType,
  taskPayload,
  onExecute,
  onSuccessResult,
}) => {
  const aiSavedUi = React.useMemo(() => storage.getUiState("ai_execution_center_ui", {
    mode: "compare" as const,
    selectedModelId: "",
    selectedCompareModelIds: [] as string[],
    comparisonTimeout: 30 as 15 | 30 | 60,
  }), []);

  const [mode, setMode] = useState<"auto" | "specific" | "compare">(aiSavedUi.mode || "compare");
  const [selectedModelId, setSelectedModelId] = useState<string>(aiSavedUi.selectedModelId || "");
  const [models, setModels] = useState<AiSettings[]>([]);

  // Stage 14C: Comparison settings
  const [selectedCompareModelIds, setSelectedCompareModelIds] = useState<string[]>(aiSavedUi.selectedCompareModelIds || []);
  const [comparisonTimeout, setComparisonTimeout] = useState<15 | 30 | 60>(aiSavedUi.comparisonTimeout || 30);
  const [comparisonStates, setComparisonStates] = useState<Record<string, ModelComparisonState>>({});

  useEffect(() => {
    storage.saveUiState("ai_execution_center_ui", {
      mode,
      selectedModelId,
      selectedCompareModelIds,
      comparisonTimeout,
    });
  }, [mode, selectedModelId, selectedCompareModelIds, comparisonTimeout]);

  // Single Execution status states
  const [isExecuting, setIsExecuting] = useState(false);
  const [progressLog, setProgressLog] = useState<AIExecutionProgress | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [completedMeta, setCompletedMeta] = useState<AIExecutionSuccessResult<any> | null>(null);
  const [completedData, setCompletedData] = useState<any>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const subControllersRef = useRef<AbortController[]>([]);

  useEffect(() => {
    if (isOpen) {
      const list = getAISettingsList();
      setModels(list);
      const active = list.filter((m) => m.enabled !== false).sort((a, b) => (a.priority || 0) - (b.priority || 0));
      if (active.length > 0) {
        setSelectedModelId(active[0].id || "default-1");
        // Preselect up to 3 active models for comparison
        const initialCompareIds = active.slice(0, 3).map((m) => m.id || "");
        setSelectedCompareModelIds(initialCompareIds.filter(Boolean));
      }
      setIsExecuting(false);
      setProgressLog(null);
      setExecutionError(null);
      setCompletedMeta(null);
      setCompletedData(null);
      setComparisonStates({});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const activeChain = models
    .filter((m) => m.enabled !== false)
    .sort((a, b) => (a.priority || 0) - (b.priority || 0));

  // Toggle selection for comparison (between 2 and 3 models)
  const toggleCompareModel = (modelId: string) => {
    if (selectedCompareModelIds.includes(modelId)) {
      if (selectedCompareModelIds.length <= 2) {
        // Keep minimum 2
        return;
      }
      setSelectedCompareModelIds(selectedCompareModelIds.filter((id) => id !== modelId));
    } else {
      if (selectedCompareModelIds.length >= 3) {
        // Replace the last one to stay at max 3
        setSelectedCompareModelIds([selectedCompareModelIds[0], selectedCompareModelIds[1], modelId]);
      } else {
        setSelectedCompareModelIds([...selectedCompareModelIds, modelId]);
      }
    }
  };

  // Execution Handler for Single Mode
  const handleStartSingleExecution = async () => {
    setIsExecuting(true);
    setExecutionError(null);
    setProgressLog(null);
    setCompletedMeta(null);
    setCompletedData(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const result = await onExecute({
        mode: mode === "compare" ? "auto" : mode,
        specificModelId: mode === "specific" ? selectedModelId : undefined,
        abortSignal: controller.signal,
        onProgress: (prog) => {
          setProgressLog(prog);
        },
      });

      if (controller.signal.aborted) {
        return;
      }

      setCompletedData(result);
      if (result && typeof result === "object" && result.meta) {
        setCompletedMeta(result.meta);
      }
    } catch (err: any) {
      if (err.name === "AbortError" || controller.signal.aborted) {
        setExecutionError("تم إلغاء المهمة بشكل ذري فوراً.");
      } else {
        setExecutionError(err.message || "حدث خطأ غير متوقع أثناء معالجة المهمة.");
      }
    } finally {
      setIsExecuting(false);
      abortControllerRef.current = null;
    }
  };

  // Execution Handler for Stage 14C: Parallel Multi-Model Comparison
  const handleStartComparisonExecution = async () => {
    if (selectedCompareModelIds.length < 2) {
      setExecutionError("يرجى اختيار محركين أو ثلاثة نماذج على الأقل للمقارنة بالتوازي.");
      return;
    }

    setIsExecuting(true);
    setExecutionError(null);
    subControllersRef.current = [];

    const mainController = new AbortController();
    abortControllerRef.current = mainController;

    // Initialize state map for all selected models
    const initialMap: Record<string, ModelComparisonState> = {};
    selectedCompareModelIds.forEach((mId) => {
      const mObj = models.find((m) => m.id === mId);
      initialMap[mId] = {
        modelId: mId,
        modelName: mObj?.modelName || "نموذج",
        provider: mObj?.provider || "google",
        maskedKey: getMaskedKey(mObj?.apiKey),
        status: "running",
        durationMs: 0,
        resultData: null,
        resultMeta: null,
        errorMessage: null,
        progressMessage: "جاري الإرسال والمعالجة بالتوازي...",
      };
    });
    setComparisonStates(initialMap);

    // Launch real concurrent executions with individual timeout & abort controllers
    const executionPromises = selectedCompareModelIds.map(async (modelId) => {
      const modelObj = models.find((m) => m.id === modelId);
      if (!modelObj) return;

      const subController = new AbortController();
      subControllersRef.current.push(subController);

      let isTimeout = false;
      const modelStartTime = Date.now();

      // Independent timeout timer per model
      const timeoutHandle = setTimeout(() => {
        isTimeout = true;
        subController.abort();
      }, comparisonTimeout * 1000);

      // Listen to main controller abort
      const onMainAbort = () => {
        subController.abort();
      };
      mainController.signal.addEventListener("abort", onMainAbort);

      try {
        const res = await onExecute({
          mode: "specific",
          specificModelId: modelId,
          abortSignal: subController.signal,
          onProgress: (prog) => {
            setComparisonStates((prev) => {
              if (!prev[modelId]) return prev;
              return {
                ...prev,
                [modelId]: {
                  ...prev[modelId],
                  progressMessage: prog.message || "جاري المعالجة...",
                },
              };
            });
          },
        });

        clearTimeout(timeoutHandle);
        const duration = Date.now() - modelStartTime;

        setComparisonStates((prev) => {
          if (!prev[modelId]) return prev;
          return {
            ...prev,
            [modelId]: {
              ...prev[modelId],
              status: "success",
              durationMs: duration,
              resultData: res,
              resultMeta: res?.meta || null,
              progressMessage: null,
            },
          };
        });
      } catch (err: any) {
        clearTimeout(timeoutHandle);
        const duration = Date.now() - modelStartTime;

        setComparisonStates((prev) => {
          if (!prev[modelId]) return prev;

          if (isTimeout) {
            return {
              ...prev,
              [modelId]: {
                ...prev[modelId],
                status: "timeout",
                durationMs: duration,
                errorMessage: `انتهت المهلة الزمنية المحددة (${comparisonTimeout} ثانية).`,
                progressMessage: null,
              },
            };
          }

          if (err.name === "AbortError" || subController.signal.aborted || mainController.signal.aborted) {
            return {
              ...prev,
              [modelId]: {
                ...prev[modelId],
                status: "aborted",
                durationMs: duration,
                errorMessage: "تم الإلغاء الذري للطلب.",
                progressMessage: null,
              },
            };
          }

          return {
            ...prev,
            [modelId]: {
              ...prev[modelId],
              status: "error",
              durationMs: duration,
              errorMessage: err.message || "فشلت المعالجة.",
              progressMessage: null,
            },
          };
        });
      } finally {
        mainController.signal.removeEventListener("abort", onMainAbort);
      }
    });

    try {
      await Promise.allSettled(executionPromises);
    } finally {
      setIsExecuting(false);
      abortControllerRef.current = null;
      subControllersRef.current = [];
    }
  };

  // Atomic Cancel
  const handleAtomicCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    subControllersRef.current.forEach((c) => {
      try {
        c.abort();
      } catch (e) {}
    });
    subControllersRef.current = [];

    setIsExecuting(false);
    setProgressLog(null);
    setCompletedData(null);
    setCompletedMeta(null);
    setExecutionError("تم الإلغاء الذري الفعلي بنجاح دون ترك أي اتصالات معلقة.");
  };

  // Adopt Result Action (Stage 14C explicit non-auto-save rule)
  const handleAdoptResult = (resultData: any, resultMeta?: AIExecutionSuccessResult<any>) => {
    if (resultData) {
      onSuccessResult(resultData, resultMeta);
      onClose();
    }
  };

  const taskInfo = TASK_TITLES[taskType] || {
    title: "مركز تنفيذ الذكاء الاصطناعي",
    subtitle: "المعالجة عبر خوادم AI Gateway الموحدة",
    iconColor: "text-blue-600 bg-blue-100 dark:bg-blue-900/30",
  };

  const isComparisonMode = mode === "compare";
  const hasAnyComparisonResults = Object.values(comparisonStates).some(
    (s) => s.status === "success" || s.status === "error" || s.status === "timeout"
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 md:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div
        className={`bg-white dark:bg-slate-900 rounded-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col my-auto max-h-[92vh] transition-all duration-300 ${
          isComparisonMode ? "max-w-5xl" : "max-w-2xl"
        }`}
        dir="rtl"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${taskInfo.iconColor}`}>
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  {taskInfo.title}
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 rounded-full border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-purple-600" />
                  المرحلة 14C: مقارنة النماذج
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {taskInfo.subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (isExecuting) handleAtomicCancel();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
          {/* 1. Payload Preview Box */}
          <div className="bg-slate-50 dark:bg-slate-950/50 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-500" />
                معاينة مدخلات المهمة:
              </span>
              {taskPayload.subjectName && (
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
                  المادة: {taskPayload.subjectName}
                </span>
              )}
            </div>

            {/* Question / Main Text */}
            {taskPayload.questionText && (
              <div className="text-xs bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  نص السؤال:
                </span>
                <MathText text={taskPayload.questionText} />
              </div>
            )}

            {/* Answer Text */}
            {taskPayload.answerText && (
              <div className="text-xs bg-emerald-50/70 dark:bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900/50">
                <span className="font-bold text-emerald-800 dark:text-emerald-300 block mb-1">
                  الإجابة النموذجية الحالية:
                </span>
                <MathText text={taskPayload.answerText} />
              </div>
            )}

            {/* Preview Raw Text */}
            {taskPayload.previewText && (
              <div className="text-xs bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 max-h-24 overflow-y-auto font-mono text-slate-700 dark:text-slate-300">
                {taskPayload.previewText.slice(0, 300)}
                {taskPayload.previewText.length > 300 && "..."}
              </div>
            )}

            {/* Multimodal Image Preview */}
            {taskPayload.imageBase64 && (
              <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-300 dark:border-slate-700">
                  <img
                    src={taskPayload.imageBase64}
                    alt="Task Thumbnail"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-xs">
                  <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5 text-teal-600" />
                    صورة مرفقة للتحليل البصري المتعدد (Multimodal OCR)
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    سيتم إرسال الصورة مباشرة للمحركات لاستخراج النصوص والمعادلات
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 2. Mode Selector: Auto vs Specific vs Compare (14C) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                استراتيجية تشغيل محرك الذكاء الاصطناعي:
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {/* Option 1: Compare Answers (14C) */}
              <button
                type="button"
                onClick={() => setMode("compare")}
                disabled={isExecuting}
                className={`p-3 rounded-xl border text-right transition flex flex-col justify-between ${
                  mode === "compare"
                    ? "border-purple-600 bg-purple-50/70 dark:bg-purple-950/30 text-purple-900 dark:text-purple-100 ring-2 ring-purple-500/20 shadow-sm"
                    : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-xs font-extrabold flex items-center gap-1.5 text-purple-700 dark:text-purple-300">
                    <Layers className="w-3.5 h-3.5 text-purple-600" />
                    مقارنة الإجابات (14C)
                  </span>
                  {mode === "compare" && (
                    <span className="w-2 h-2 rounded-full bg-purple-600" />
                  )}
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  تشغيل متزامن لـ 2 أو 3 نماذج بالتوازي وعرض النتائج جنباً لجنب
                </span>
              </button>

              {/* Option 2: Auto Fallback */}
              <button
                type="button"
                onClick={() => setMode("auto")}
                disabled={isExecuting}
                className={`p-3 rounded-xl border text-right transition flex flex-col justify-between ${
                  mode === "auto"
                    ? "border-blue-600 bg-blue-50/60 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 ring-2 ring-blue-500/20"
                    : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-xs font-extrabold flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    الوضع التلقائي (Auto Fallback)
                  </span>
                  {mode === "auto" && (
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                  )}
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  إعادة المحاولة تلقائياً والتبديل للنموذج التالي عند الخطأ
                </span>
              </button>

              {/* Option 3: Manual Specific Model */}
              <button
                type="button"
                onClick={() => setMode("specific")}
                disabled={isExecuting}
                className={`p-3 rounded-xl border text-right transition flex flex-col justify-between ${
                  mode === "specific"
                    ? "border-blue-600 bg-blue-50/60 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 ring-2 ring-blue-500/20"
                    : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-xs font-extrabold flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-blue-500" />
                    نموذج مخصص (Manual)
                  </span>
                  {mode === "specific" && (
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                  )}
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  اختيار نموذج محدد بالاسم والمزود
                </span>
              </button>
            </div>
          </div>

          {/* 3. Details / Settings Panels based on Mode */}
          {mode === "compare" && (
            <div className="bg-purple-50/40 dark:bg-purple-950/20 p-4 rounded-xl border border-purple-200 dark:border-purple-900/50 space-y-3.5">
              {/* Timeout Configuration & Model count */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-100 dark:border-purple-900/40 pb-3">
                <div>
                  <span className="text-xs font-bold text-purple-950 dark:text-purple-200 block">
                    اختر النماذج المراد مقارنتها بالتوازي (2 إلى 3 نماذج):
                  </span>
                  <span className="text-[11px] text-purple-700 dark:text-purple-400">
                    تم تحديد {selectedCompareModelIds.length} من 3 نماذج كحد أقصى
                  </span>
                </div>

                {/* Independent Timeout Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                    <Timer className="w-3.5 h-3.5 text-purple-600" />
                    المهلة لكل نموذج:
                  </span>
                  <div className="flex items-center bg-white dark:bg-slate-900 rounded-lg p-0.5 border border-purple-200 dark:border-purple-800">
                    {([15, 30, 60] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setComparisonTimeout(t)}
                        disabled={isExecuting}
                        className={`px-2.5 py-1 text-xs font-bold rounded-md transition ${
                          comparisonTimeout === t
                            ? "bg-purple-600 text-white shadow-sm"
                            : "text-slate-600 dark:text-slate-400 hover:text-purple-600"
                        }`}
                      >
                        {t} ثانية
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Models selection checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {models.map((m, idx) => {
                  const mId = m.id || `model-${idx}`;
                  const isSelected = selectedCompareModelIds.includes(mId);
                  return (
                    <div
                      key={mId}
                      onClick={() => !isExecuting && toggleCompareModel(mId)}
                      className={`p-2.5 rounded-xl border cursor-pointer transition flex items-start justify-between ${
                        isSelected
                          ? "bg-white dark:bg-slate-900 border-purple-500 dark:border-purple-600 shadow-sm ring-1 ring-purple-500/30"
                          : "bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-purple-300"
                      } ${isExecuting ? "opacity-60 pointer-events-none" : ""}`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            {m.modelName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                          <span className="font-semibold text-purple-700 dark:text-purple-300">
                            {PROVIDER_NAMES[m.provider] || m.provider}
                          </span>
                          <span>•</span>
                          <span className="font-mono">{getMaskedKey(m.apiKey)}</span>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-lg flex items-center justify-center border transition ${
                          isSelected
                            ? "bg-purple-600 border-purple-600 text-white"
                            : "border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="text-[11px] text-purple-800 dark:text-purple-300 flex items-center gap-1.5 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                <span>
                  تنفيذ بالتوازي الحقيقي مع مهلة مستقلة وإلغاء ذري. في حال فشل أحد النماذج، يستمر الآخرون بنجاح ولا يتم الحفظ إلا بعد اعتمادك.
                </span>
              </div>
            </div>
          )}

          {mode === "auto" && (
            <div className="bg-slate-50 dark:bg-slate-950/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  سلسلة النماذج المفعلة بالأولوية (Fallback Chain):
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900">
                  {activeChain.length} نماذج نشطة
                </span>
              </div>

              <div className="space-y-1.5 pt-1">
                {activeChain.map((m, idx) => (
                  <div
                    key={m.id || idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-white">
                        {m.modelName}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        ({PROVIDER_NAMES[m.provider] || m.provider})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Key className="w-3 h-3 text-slate-400" />
                        {getMaskedKey(m.apiKey)}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-semibold text-slate-600 dark:text-slate-300">
                        أولوية {m.priority || idx + 1}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {mode === "specific" && (
            <div className="bg-slate-50 dark:bg-slate-950/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                اختر النموذج المطلوب:
              </label>

              <select
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                disabled={isExecuting}
                className="w-full p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.modelName} — ({PROVIDER_NAMES[m.provider] || m.provider}) {m.enabled === false ? "[معطل]" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 4. Comparison Results Side-by-Side View (Stage 14C) */}
          {mode === "compare" && Object.keys(comparisonStates).length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-600" />
                  مقارنة النتائج جنباً إلى جنب (اختر إجابة للاعتماد):
                </span>
                <span className="text-[11px] text-slate-500">
                  {isExecuting ? "جاري استقبال الاستجابات بالتوازي..." : "اختر النتيجة الأنسب لاعتمادها"}
                </span>
              </div>

              <div
                className={`grid gap-3 ${
                  selectedCompareModelIds.length === 2
                    ? "grid-cols-1 md:grid-cols-2"
                    : "grid-cols-1 md:grid-cols-3"
                }`}
              >
                {selectedCompareModelIds.map((mId) => {
                  const state = comparisonStates[mId];
                  if (!state) return null;

                  const isSuccess = state.status === "success";
                  const isRunning = state.status === "running";
                  const isError = state.status === "error";
                  const isTimeout = state.status === "timeout";
                  const isAborted = state.status === "aborted";

                  return (
                    <div
                      key={mId}
                      className={`rounded-2xl border flex flex-col justify-between overflow-hidden transition-all bg-white dark:bg-slate-900 ${
                        isSuccess
                          ? "border-emerald-300 dark:border-emerald-800 shadow-sm ring-1 ring-emerald-500/20"
                          : isRunning
                          ? "border-purple-300 dark:border-purple-800 animate-pulse"
                          : isError || isTimeout
                          ? "border-red-200 dark:border-red-900/50 bg-red-50/10"
                          : "border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      {/* Card Header */}
                      <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                            {state.modelName}
                          </span>

                          {/* Status Badge */}
                          {isRunning && (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 rounded-full flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-purple-600 animate-ping" />
                              جاري المعالجة...
                            </span>
                          )}

                          {isSuccess && (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-full flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              ناجح ({(state.durationMs / 1000).toFixed(1)} ث)
                            </span>
                          )}

                          {isTimeout && (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded-full flex items-center gap-1">
                              <Timer className="w-3 h-3 text-amber-600" />
                              انتهاء المهلة
                            </span>
                          )}

                          {isError && (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 rounded-full flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 text-red-600" />
                              فشل
                            </span>
                          )}

                          {isAborted && (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400 rounded-full">
                              تم الإلغاء
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                          <span className="font-semibold text-purple-700 dark:text-purple-300">
                            {PROVIDER_NAMES[state.provider] || state.provider}
                          </span>
                          <span className="font-mono">{state.maskedKey}</span>
                        </div>
                      </div>

                      {/* Card Content Area */}
                      <div className="p-3.5 flex-1 space-y-2">
                        {isRunning && (
                          <div className="py-8 flex flex-col items-center justify-center text-center space-y-2 text-slate-500">
                            <div className="w-7 h-7 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              {state.progressMessage || "جاري الاتصال بالنموذج..."}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              المهلة القصوى: {comparisonTimeout} ثانية
                            </span>
                          </div>
                        )}

                        {isSuccess && state.resultData && (
                          <div className="space-y-2">
                            <TaskResultPreview taskType={taskType} data={state.resultData} />
                          </div>
                        )}

                        {(isError || isTimeout) && (
                          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-800 dark:text-red-300 text-xs space-y-1">
                            <div className="flex items-center gap-1.5 font-bold">
                              <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                              <span>{isTimeout ? "تجاوز المهلة الزمنية:" : "تنبيه الفشل:"}</span>
                            </div>
                            <p className="text-[11px] leading-relaxed break-words whitespace-pre-line">
                              {state.errorMessage || "تعذر إكمال الاستجابة من هذا المحرك."}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Card Footer: Adopt Answer Action */}
                      <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
                        <button
                          type="button"
                          onClick={() => handleAdoptResult(state.resultData, state.resultMeta || undefined)}
                          disabled={!isSuccess || isExecuting}
                          className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                            isSuccess
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm cursor-pointer"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>اعتماد هذه الإجابة</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 5. Single Mode Live Progress or Error or Success Banner */}
          {!isComparisonMode && progressLog && isExecuting && (
            <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 animate-in fade-in space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  {progressLog.message || "جاري التنفيذ..."}
                </span>
                <span className="text-[11px] font-mono text-blue-700 dark:text-blue-300">
                  محاولة {progressLog.attempt} من {progressLog.maxAttempts}
                </span>
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-900 h-1.5 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full w-2/3 animate-pulse rounded-full" />
              </div>
            </div>
          )}

          {executionError && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-0.5">تنبيه المعالجة:</span>
                <p className="leading-relaxed whitespace-pre-line">{executionError}</p>
              </div>
            </div>
          )}

          {!isComparisonMode && completedData && !isExecuting && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  تمت المعالجة بنجاح!
                </span>
                {completedMeta && (
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono">
                    {(completedMeta.durationMs / 1000).toFixed(1)} ثانية ({completedMeta.totalAttempts} محاولات)
                  </span>
                )}
              </div>
              {completedMeta && (
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                  النموذج الناجح: <strong>{completedMeta.modelName}</strong> ({PROVIDER_NAMES[completedMeta.provider] || completedMeta.provider})
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex items-center justify-between">
          <div>
            {isExecuting ? (
              <button
                type="button"
                onClick={handleAtomicCancel}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-1.5"
              >
                <X className="w-4 h-4" />
                <span>إلغاء فوري ذري</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold rounded-xl transition"
              >
                إغلاق
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isComparisonMode ? (
              <button
                type="button"
                onClick={handleStartComparisonExecution}
                disabled={isExecuting || selectedCompareModelIds.length < 2}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-2 disabled:opacity-50"
              >
                {isExecuting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>جاري تشغيل المقارنة بالتوازي ({selectedCompareModelIds.length} نماذج)...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>بدء تشغيل المقارنة بالتوازي ({selectedCompareModelIds.length} نماذج)</span>
                  </>
                )}
              </button>
            ) : !completedData ? (
              <button
                type="button"
                onClick={handleStartSingleExecution}
                disabled={isExecuting}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-2 disabled:opacity-50"
              >
                {isExecuting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>جاري المعالجة بالذكاء الاصطناعي...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>بدء المعالجة بالذكاء الاصطناعي</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleAdoptResult(completedData, completedMeta || undefined)}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>اعتماد وإدراج النتيجة</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
