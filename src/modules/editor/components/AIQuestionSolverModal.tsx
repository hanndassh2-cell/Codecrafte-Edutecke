import React, { useState } from "react";
import {
  X,
  Sparkles,
  Check,
  Copy,
  RotateCcw,
  BookOpen,
  HelpCircle,
  BrainCircuit,
  Sliders,
} from "lucide-react";
import { aiService } from "../../ai/services/aiService";
import { RichTextEditor } from "./RichTextEditor";
import { Question } from "../../../types";
import { AIExecutionCenterModal } from "../../ai/components/AIExecutionCenterModal";

interface AIQuestionSolverModalProps {
  isOpen?: boolean;
  onClose: () => void;
  question: Partial<Question>;
  onApplySolution?: (solutionHtml: string) => void;
  onInsert?: (solutionHtml: string) => void;
}

export const AIQuestionSolverModal: React.FC<AIQuestionSolverModalProps> = ({
  isOpen = true,
  onClose,
  question,
  onApplySolution,
  onInsert,
}) => {
  const [solution, setSolution] = useState("");
  const [isSolving, setIsSolving] = useState(false);
  const [shortSolution, setShortSolution] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMeta, setSuccessMeta] = useState<string | null>(null);
  const [showExecutionCenter, setShowExecutionCenter] = useState(false);

  if (!isOpen) return null;

  const handleSolve = async () => {
    setIsSolving(true);
    setErrorMessage(null);
    setSuccessMeta(null);
    try {
      const generatedSolution = await aiService.solveQuestion(
        question,
        shortSolution,
      );
      setSolution(generatedSolution);
      setSuccessMeta("تم توليد الحل بنجاح عبر بوابة الذكاء الاصطناعي");
    } catch (error: any) {
      if (error.name === "AbortError") {
        setErrorMessage("تم إلغاء المهمة من قبل المستخدم.");
      } else {
        setErrorMessage(
          error.message || "حدث خطأ أثناء الاتصال بالذكاء الاصطناعي لحل السؤال."
        );
      }
    } finally {
      setIsSolving(false);
    }
  };

  const handleCopy = () => {
    if (!solution) return;
    navigator.clipboard.writeText(solution);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = () => {
    if (!solution) return;
    if (onApplySolution) {
      onApplySolution(solution);
    } else if (onInsert) {
      onInsert(solution);
    }
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div
          className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  حل وتفسير السؤال بالذكاء الاصطناعي
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  توليد خطوات الحل النموذجية وتفسير الإجابة الصحيحة
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowExecutionCenter(true)}
                className="px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center gap-1.5 hover:bg-blue-100 transition cursor-pointer"
                title="فتح مركز التنفيذ الموحد لاختيار النموذج أو استراتيجية Fallback"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>مركز التنفيذ (14B)</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Question Details preview */}
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                <span>السؤال المراد حله:</span>
              </div>
              <div
                className="text-sm font-medium text-slate-800 dark:text-slate-200 prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{
                  __html: question.text || "لا يوجد نص للسؤال",
                }}
              />
              {question.distractors && question.distractors.length > 0 && (
                <div className="pt-2 border-t border-slate-200/40 dark:border-slate-700/40 grid grid-cols-2 gap-2 text-xs">
                  {question.distractors.map((d, i) => (
                    <div
                      key={i}
                      className="p-1.5 bg-white dark:bg-slate-800 rounded border border-slate-200/60 dark:border-slate-700/60"
                    >
                      <span className="font-bold text-slate-400 ml-1">
                        {i + 1}-
                      </span>
                      <span>{typeof d === "string" ? d : d.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Options */}
            <div className="flex items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-400">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={shortSolution}
                  onChange={(e) => setShortSolution(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500 dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                />
                <span>تقديم حل مباشر ومختصر فقط</span>
              </label>
            </div>

            {/* Status / Notifications */}
            {errorMessage && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 rounded-xl">
                {errorMessage}
              </div>
            )}
            {successMeta && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 rounded-xl">
                {successMeta}
              </div>
            )}

            {/* Solution Editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  الحل والخطوات الإجرائية (قابل للتعديل):
                </label>
                {solution && (
                  <button
                    onClick={handleCopy}
                    className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1 font-medium"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copied ? "تم النسخ" : "نسخ الحل"}</span>
                  </button>
                )}
              </div>
              <RichTextEditor
                value={solution}
                onChange={setSolution}
                placeholder="سيظهر الحل هنا بعد الضغط على 'حل السؤال بالذكاء الاصطناعي'..."
              />
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition"
            >
              إلغاء
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSolve}
                disabled={isSolving}
                className="px-4 py-2 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 border border-purple-200 dark:border-purple-800"
              >
                {isSolving ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    <span>جاري الحل بواسطة AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{solution ? "إعادة التوليد" : "حل السؤال بالذكاء الاصطناعي"}</span>
                  </>
                )}
              </button>

              <button
                onClick={handleApply}
                disabled={!solution.trim() || isSolving}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>تطبيق الحل النموذجي</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Global AI Execution Center Modal */}
      {showExecutionCenter && (
        <AIExecutionCenterModal
          isOpen={showExecutionCenter}
          onClose={() => setShowExecutionCenter(false)}
          taskType="solve_question"
          taskPayload={{
            title: "حل وتفسير السؤال بالذكاء الاصطناعي",
            questionText: question.text,
            answerText: question.answer,
          }}
          onExecute={async (opts) => {
            const res = await aiService.solveQuestion(question, shortSolution, {
              mode: opts.mode,
              specificModelId: opts.specificModelId,
              abortSignal: opts.abortSignal,
              onProgress: opts.onProgress,
            });
            return res;
          }}
          onSuccessResult={(res, meta) => {
            setSolution(res);
            if (meta) {
              setSuccessMeta(meta.statusMessage);
            }
          }}
        />
      )}
    </>
  );
};
