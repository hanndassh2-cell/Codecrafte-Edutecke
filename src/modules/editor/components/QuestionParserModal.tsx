import { writeToClipboard } from "../../../utils/clipboard";
import { RichTextEditor } from "./RichTextEditor";
import React, { useState, useEffect } from "react";
import {
  X,
  HelpCircle,
  Sparkles,
  CheckCircle2,
  FileText,
  Copy,
  Check,
  Code,
  Eye,
  Tag,
  Award,
  BarChart2,
  Layers,
  Send,
  Image as ImageIcon,
  Table as TableIcon,
  Sigma,
} from "lucide-react";
import {
  parseQuestionsFromContent,
  QuestionParserResult,
  ParsedQuestion,
  QUESTION_TYPE_LABELS,
} from "../../../services/questionParser";
import { MathText } from "../../../components/MathText";

interface QuestionParserModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialContent?: string;
  onSendToQuestionObjectBuilder?: (questions: ParsedQuestion[]) => void;
}

export const QuestionParserModal: React.FC<QuestionParserModalProps> = ({
  isOpen,
  onClose,
  initialContent = "",
  onSendToQuestionObjectBuilder,
}) => {
  const [inputText, setInputText] = useState(initialContent);
  const [parserResult, setParserResult] = useState<QuestionParserResult | null>(null);
  const [activeTab, setActiveTab] = useState<"questions" | "json">("questions");
  const [copiedJson, setCopiedJson] = useState(false);

  useEffect(() => {
    if (initialContent) {
      setInputText(initialContent);
      handleParse(initialContent);
    }
  }, [initialContent]);

  if (!isOpen) return null;

  const handleParse = (textToParse: string) => {
    if (!textToParse.trim()) {
      setParserResult(null);
      return;
    }
    const result = parseQuestionsFromContent(textToParse);
    setParserResult(result);
  };

  const handleCopyJson = async () => {
    if (!parserResult) return;
    try {
      await writeToClipboard("", JSON.stringify(parserResult.questions, null, 2));
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    } catch (err: any) {
      alert(err.message || "حدث خطأ أثناء النسخ");
    }
  };

  const handleForwardToBuilder = () => {
    if (parserResult && onSendToQuestionObjectBuilder) {
      onSendToQuestionObjectBuilder(parserResult.questions);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-sm flex items-center justify-between shrink-0 sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 dark:text-slate-100 text-lg flex items-center gap-2">
                محلل الأسئلة (Question Parser)
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                  تحليل بدون حفظ
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                استخراج الأسئلة المكتوبة باللغة العربية وتحديد أنواعها (اختيار متعدد، علل، عرف، أكمل، رتب، إلخ) وإجاباتها ودرجاتها.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Split */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-0">
          
          {/* Left / Input Pane (5 cols) */}
          <div className="lg:col-span-5 border-l border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-3 bg-slate-50/40 dark:bg-slate-950/40 min-h-0">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-500" />
                المحتوى المُراد تحليله:
              </label>
              <button
                onClick={() => {
                  const demo = `س1: ما هو المفهوم الفيزيائي للسرعة المتجهة؟ [درجتان] [سهل]
ج: هي التغير في الموقع مقسوماً على زمن التغير.

س2: اختر الإجابة الصحيحة: وحدة قياس التسارع في النظام الدولي هي:
أ) m/s
ب) m/s² *
ج) N
د) J

س3: علل: تطفو السفن المصنوعة من الحديد فوق سطح الماء. [3 درجات]

س4: ضع علامة صح أو خطأ: المادة النقية تتكون من نوع واحد من الذرات. (  )

س5: أكمل الفراغ: يتكون جزيء الماء من ذرتين .... وذرة أكسجين.`;
                  setInputText(demo);
                  handleParse(demo);
                }}
                className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
              >
                تعبئة نموذج أسئلة للتجربة
              </button>
            </div>

            <div className="flex-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden min-h-[300px] flex flex-col">
              <RichTextEditor
                value={inputText}
                onChange={(newVal) => {
                  setInputText(newVal);
                  handleParse(newVal);
                }}
                placeholder="الصق الأسئلة أو نص الاختبار هنا..."
              />
            </div>

            <button
              onClick={() => {
                if (!inputText.trim()) {
                  const demo = `س1: ما هو المفهوم الفيزيائي للسرعة المتجهة؟ [درجتان] [سهل]
ج: هي التغير في الموقع مقسوماً على زمن التغير.

س2: اختر الإجابة الصحيحة: وحدة قياس التسارع في النظام الدولي هي:
أ) m/s
ب) m/s² *
ج) N
د) J

س3: علل: تطفو السفن المصنوعة من الحديد فوق سطح الماء. [3 درجات]

س4: ضع علامة صح أو خطأ: المادة النقية تتكون من نوع واحد من الذرات. (  )

س5: أكمل الفراغ: يتكون جزيء الماء من ذرتين .... وذرة أكسجين.`;
                  setInputText(demo);
                  handleParse(demo);
                } else {
                  handleParse(inputText);
                }
              }}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs transition shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              تشغيل محلل الأسئلة (Analyze Questions)
            </button>
          </div>

          {/* Right / Results Pane (7 cols) */}
          <div className="lg:col-span-7 p-4 flex flex-col min-h-0 bg-white dark:bg-slate-900 space-y-3">
            
            {/* Summary Bar & Tabs */}
            <div className="flex items-center justify-between bg-amber-50/50 dark:bg-amber-950/20 p-2.5 rounded-2xl border border-amber-100 dark:border-amber-900/40 text-xs shrink-0">
              <div className="flex items-center gap-3 font-bold text-slate-800 dark:text-slate-200">
                <span className="flex items-center gap-1">
                  الأسئلة المستخرجة: <strong className="text-amber-600 dark:text-amber-400 text-sm">{parserResult?.summary.totalQuestions || 0}</strong>
                </span>
                {parserResult && (
                  <span className="text-[10px] text-slate-500">
                    ({parserResult.summary.withOptionsCount} خيارات | {parserResult.summary.withAnswersCount} إجابات نموذجية)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActiveTab("questions")}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeTab === "questions"
                      ? "bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Eye className="w-3.5 h-3.5 inline ml-1" />
                  قائمة الأسئلة
                </button>
                <button
                  onClick={() => setActiveTab("json")}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeTab === "json"
                      ? "bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Code className="w-3.5 h-3.5 inline ml-1" />
                  JSON Objects
                </button>
              </div>
            </div>

            {/* Content Display */}
            <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
              {activeTab === "questions" ? (
                parserResult?.questions && parserResult.questions.length > 0 ? (
                  parserResult.questions.map((q, idx) => (
                    <div
                      key={q.id || idx}
                      className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/30 space-y-2.5 text-xs"
                    >
                      {/* Question Top Badges */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            {q.typeLabelArabic} ({q.type})
                          </span>

                          {q.marksLabel && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 flex items-center gap-1">
                              <Award className="w-3 h-3" />
                              {q.marksLabel}
                            </span>
                          )}

                          {q.difficultyLabelArabic && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                              صعوبة: {q.difficultyLabelArabic}
                            </span>
                          )}
                        </div>

                        {/* Media indicators */}
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          {q.hasImage && <span className="flex items-center gap-0.5 bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded"><ImageIcon className="w-3 h-3" /> صورة</span>}
                          {q.hasTable && <span className="flex items-center gap-0.5 bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded"><TableIcon className="w-3 h-3" /> جدول</span>}
                          {q.hasEquation && <span className="flex items-center gap-0.5 bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded"><Sigma className="w-3 h-3" /> معادلة</span>}
                        </div>
                      </div>

                      {/* Question Text */}
                      <div className="font-extrabold text-slate-800 dark:text-slate-100 leading-relaxed text-sm">
                        {idx + 1}. <RichTextEditor value={q.questionText || ""} readOnly />
                      </div>

                      {/* Options List */}
                      {q.options && q.options.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                          {q.options.map((opt) => (
                            <div
                              key={opt.id}
                              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                                opt.isCorrect
                                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                              }`}
                            >
                              <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono font-bold flex items-center justify-center text-[10px]">
                                {opt.letter}
                              </span>
                              <span className="flex-1"><RichTextEditor value={opt.text || ""} readOnly /></span>
                              {opt.isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Model Answer */}
                      {q.modelAnswer && (
                        <div className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
                          <span className="font-black text-amber-600 dark:text-amber-400 shrink-0">الإجابة النموذجية:</span>
                          <span className="font-medium"><RichTextEditor value={q.modelAnswer || ""} readOnly /></span>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs py-12 space-y-2">
                    <HelpCircle className="w-8 h-8 stroke-1 text-slate-300 dark:text-slate-700" />
                    <p>قم بكتابة أو إدراج الأسئلة للبدء بالتحليل البرمجي</p>
                  </div>
                )
              ) : (
                <div className="relative h-full">
                  <button
                    onClick={handleCopyJson}
                    className="absolute top-2 left-2 px-3 py-1.5 bg-slate-800 text-slate-200 rounded-lg text-[10px] font-bold flex items-center gap-1.5 hover:bg-slate-700 transition cursor-pointer"
                  >
                    {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedJson ? "تم النسخ" : "نسخ JSON"}
                  </button>
                  <pre className="text-[10px] font-mono p-4 bg-slate-950 text-emerald-400 rounded-2xl overflow-auto h-full" dir="ltr">
                    {JSON.stringify(parserResult?.questions || [], null, 2)}
                  </pre>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            إغلاق
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyJson}
              disabled={!parserResult || parserResult.questions.length === 0}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
            >
              <Copy className="w-4 h-4" />
              نسخ الكائنات (JSON Objects)
            </button>

            {onSendToQuestionObjectBuilder && (
              <button
                onClick={handleForwardToBuilder}
                disabled={!parserResult || parserResult.questions.length === 0}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-40 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                إرسال النتيجة إلى Question Object Builder
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
