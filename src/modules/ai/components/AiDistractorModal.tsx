import React, { useState } from "react";
import {
  X,
  Sparkles,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Settings2,
  Copy,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Layers,
  Sliders,
} from "lucide-react";
import { aiService } from "../services/aiService";
import { AiSettingsModal } from "./AiSettingsModal";
import { getAISettings, AiSettings } from "../services/aiProviderAdapter";
import { MathText } from "../../../components/MathText";
import { AIExecutionCenterModal } from "./AIExecutionCenterModal";

interface AiDistractorModalProps {
  isOpen?: boolean;
  onClose: () => void;
  questionText: string;
  answerText: string;
  questionType?: string;
  subjectName?: string;
  onApplyDistractors: (distractors: any[]) => void;
}

export const AiDistractorModal: React.FC<AiDistractorModalProps> = ({
  isOpen = true,
  onClose,
  questionText,
  answerText,
  questionType = "اختيار من متعدد",
  subjectName = "عام",
  onApplyDistractors,
}) => {
  const [loading, setLoading] = useState(false);
  const [distractors, setDistractors] = useState<string[]>([]);
  const [rationale, setRationale] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showRationale, setShowRationale] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showExecutionCenter, setShowExecutionCenter] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setSuccessInfo(null);

    try {
      const result = await aiService.generateDistractors(
        questionText,
        answerText,
        questionType,
        subjectName,
      );

      setDistractors(result.distractors);
      setRationale(result.rationale || "تم التوليد بنجاح بناءً على معايير تربوية.");
      if (result.meta) {
        setSuccessInfo(result.meta.statusMessage);
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        setError("تم إلغاء المهمة من قبل المستخدم.");
      } else {
        setError(err.message || "حدث خطأ غير متوقع أثناء الاتصال بالذكاء الاصطناعي.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDistractorChange = (index: number, val: string) => {
    const updated = [...distractors];
    updated[index] = val;
    setDistractors(updated);
  };

  const handleCopySingle = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleApply = () => {
    const valid = distractors.map((d) => d.trim()).filter(Boolean);
    if (valid.length === 0) {
      setError("يرجى التأكد من وجود مشتت واحد على الأقل قبل التطبيق.");
      return;
    }
    onApplyDistractors(valid);
    onClose();
  };

  const currentSettings: AiSettings = getAISettings();

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
        <div
          className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col my-auto max-h-[90vh]"
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  توليد المشتتات الذكية بالذكاء الاصطناعي
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  توليد 3 خيارات خاطئة مدروسة تربوياً تستهدف الأخطاء الشائعة
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowExecutionCenter(true)}
                className="px-2.5 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center gap-1.5 hover:bg-blue-100 transition cursor-pointer"
                title="فتح مركز التنفيذ الموحد لاختيار النموذج أو استراتيجية Fallback"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>مركز التنفيذ (14B)</span>
              </button>
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title="إعدادات موفر الذكاء الاصطناعي"
              >
                <Settings2 className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Question Details Preview */}
            <div className="bg-slate-50 dark:bg-slate-950/60 rounded-xl p-3.5 border border-slate-200/80 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-500 dark:text-slate-400">
                  السؤال المستهدف:
                </span>
                <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded border border-purple-100 dark:border-purple-900">
                  المادة: {subjectName}
                </span>
              </div>
              <div className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                <MathText text={questionText || "لم يتم إدخال نص السؤال"} />
              </div>
              <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800 flex items-start gap-2">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                  الإجابة الصحيحة:
                </span>
                <div className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                  <MathText text={answerText || "لم يتم تحديد إجابة صحيحة"} />
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{error}</div>
              </div>
            )}

            {/* Success Info Message */}
            {successInfo && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 rounded-xl flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <div>{successInfo}</div>
              </div>
            )}

            {/* Distractors List */}
            {distractors.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    المشتتات المولدة (يمكنك تعديل أي خيار مباشرة):
                  </label>
                  <span className="text-[11px] text-slate-400 font-semibold">
                    {distractors.length} خيارات بديلة
                  </span>
                </div>

                <div className="space-y-2">
                  {distractors.map((distractor, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs"
                    >
                      <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                        {String.fromCharCode(0x0623 + idx + 1)}
                      </span>
                      <input
                        type="text"
                        value={distractor}
                        onChange={(e) => handleDistractorChange(idx, e.target.value)}
                        className="flex-1 bg-transparent border-0 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden"
                        placeholder={`المشتت رقم ${idx + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() => handleCopySingle(distractor, idx)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                        title="نسخ الخيار"
                      >
                        {copiedIndex === idx ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Educational Rationale Collapsible */}
                {rationale && (
                  <div className="mt-3 bg-purple-50/50 dark:bg-purple-950/20 rounded-xl border border-purple-100 dark:border-purple-900/50 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowRationale(!showRationale)}
                      className="w-full p-2.5 text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center justify-between text-right"
                    >
                      <span>التعليل التربوي لتصميم هذه المشتتات:</span>
                      {showRationale ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                    {showRationale && (
                      <div className="p-3 pt-0 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-purple-100/50 dark:border-purple-900/30">
                        {rationale}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Initial Empty State */}
            {distractors.length === 0 && !loading && !error && (
              <div className="py-8 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 mx-auto flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                  جاهز لتوليد المشتتات
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  انقر على زر "توليد المشتتات الآن" ليقوم محرك الذكاء الاصطناعي
                  بصياغة خيارات تشتيت ملائمة لمستوى السؤال.
                </p>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold rounded-xl transition"
            >
              إلغاء
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading}
                className="px-4 py-2 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs font-bold rounded-xl border border-purple-200 dark:border-purple-800 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>جاري التوليد...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{distractors.length > 0 ? "إعادة التوليد" : "توليد المشتتات الآن"}</span>
                  </>
                )}
              </button>

              {distractors.length > 0 && (
                <button
                  type="button"
                  onClick={handleApply}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تطبيق الخيارات للسؤال</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI Settings Modal */}
      {showSettings && (
        <AiSettingsModal
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Global AI Execution Center Modal */}
      {showExecutionCenter && (
        <AIExecutionCenterModal
          isOpen={showExecutionCenter}
          onClose={() => setShowExecutionCenter(false)}
          taskType="generate_distractors"
          taskPayload={{
            title: "توليد المشتتات الذكية",
            questionText,
            answerText,
            subjectName,
          }}
          onExecute={async (opts) => {
            const res = await aiService.generateDistractors(
              questionText,
              answerText,
              questionType,
              subjectName,
              {
                mode: opts.mode,
                specificModelId: opts.specificModelId,
                abortSignal: opts.abortSignal,
                onProgress: opts.onProgress,
              }
            );
            return res;
          }}
          onSuccessResult={(res, meta) => {
            if (res && res.distractors) {
              setDistractors(res.distractors);
              setRationale(res.rationale || "تم التوليد بنجاح عبر بوابة الذكاء الاصطناعي.");
            }
            if (meta) {
              setSuccessInfo(meta.statusMessage);
            }
          }}
        />
      )}
    </>
  );
};
