import React, { useState, useMemo } from "react";
import {
  FileJson,
  Download,
  X,
  CheckCircle2,
  Copy,
  Check,
  Search,
  BookOpen,
  HelpCircle,
  FileSpreadsheet,
  AlertTriangle,
  Code2,
  Eye,
} from "lucide-react";
import { ArabicExportInspection } from "../utils/arabicExportUtils";

interface BackupExportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDownload: () => void;
  jsonString: string;
  inspection: ArabicExportInspection;
}

export const BackupExportPreviewModal: React.FC<BackupExportPreviewModalProps> = ({
  isOpen,
  onClose,
  onConfirmDownload,
  jsonString,
  inspection,
}) => {
  const [activeTab, setActiveTab] = useState<"samples" | "json">("samples");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  // Filtered JSON or samples based on search query
  const filteredSamples = useMemo(() => {
    if (!searchQuery.trim()) return inspection.sampleArabicTexts;
    const q = searchQuery.toLowerCase();
    return inspection.sampleArabicTexts.filter(
      (s) =>
        s.label.toLowerCase().includes(q) ||
        s.text.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
    );
  }, [inspection.sampleArabicTexts, searchQuery]);

  const jsonSnippet = useMemo(() => {
    if (!searchQuery.trim()) {
      return jsonString.length > 8000
        ? jsonString.slice(0, 8000) + "\n\n... [باقي المحتوى متوفر في الملف الكامل]"
        : jsonString;
    }
    // If searching in JSON, find matching lines
    const lines = jsonString.split("\n");
    const matched = lines.filter((l) => l.includes(searchQuery));
    if (matched.length === 0) {
      return `لا توجد نتائج مطابقة لعبارة البحث: "${searchQuery}" داخل ملف JSON.`;
    }
    return matched.slice(0, 150).join("\n") + (matched.length > 150 ? "\n... والمزيد من الأسطر" : "");
  }, [jsonString, searchQuery]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch (err) {
      console.error("Failed to copy JSON:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="backup-export-preview-modal"
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-5 animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
              <FileJson className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  معاينة النسخة الاحتياطية (JSON) قبل التنزيل
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  UTF-8 + BOM
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                فحص وتأكيد سلامة ترميز وتسلسل الأحرف العربية لضمان عدم الانعكاس قبل إتمام عملية التصدير
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {/* Integrity Banner */}
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-slate-900 border border-emerald-200/80 dark:border-emerald-800/60 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-600 text-white shrink-0 mt-0.5 shadow-xs">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                  تم تدقيق تسلسل النصوص العربية وترميز الملف بنجاح
                </h3>
                <p className="text-[11px] text-emerald-800/90 dark:text-emerald-300/90 leading-relaxed">
                  تمت معالجة السلاسل النصية وضبط التسلسل الطبيعي للأحرف (Logical Flow) وإضافة بصمة{" "}
                  <strong className="font-bold">UTF-8 BOM</strong> لفتح الملف بسلاسة في Excel والمحررات دون أي تشويه.
                </p>
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 sm:border-r border-emerald-200/60 dark:border-emerald-800/60 pt-2 sm:pt-0 sm:pr-4 shrink-0 text-right">
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400">حجم الملف التقديري:</span>
              <span className="text-sm font-extrabold text-emerald-900 dark:text-emerald-100">
                {inspection.fileSizeFormatted}
              </span>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 rounded-lg">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">المناهج والوحدات</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {inspection.totalEntities.subjects} مواد / {inspection.totalEntities.units} وحدات
                </span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 rounded-lg">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">بنك الأسئلة</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {inspection.totalEntities.questions} سؤال
                </span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 rounded-lg">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">نماذج الاختبارات</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {inspection.totalEntities.exams} اختبار
                </span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 rounded-lg">
                <Code2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">الترميز والتوافق</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  UTF-8 + BOM
                </span>
              </div>
            </div>
          </div>

          {/* Search & Tabs Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            {/* Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0 self-start">
              <button
                type="button"
                onClick={() => setActiveTab("samples")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "samples"
                    ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>فحص عينات النصوص العربية</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-full font-bold">
                  {inspection.sampleArabicTexts.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("json")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "json"
                    ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>شفرة JSON الكاملة</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن كلمة عربية للتأكد من تسلسلها..."
                className="w-full pr-9 pl-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Tab 1: Arabic Samples Inspection Cards */}
          {activeTab === "samples" && (
            <div className="space-y-3">
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>تأكد من أن الكلمات تظهر بترتيبها وقراءتها الصحيحة من اليمين لليسار:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  حروف متصلة وتسلسل طبيعي
                </span>
              </div>

              {filteredSamples.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  لم يتم العثور على عينات مطابقة لبحثك.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredSamples.map((sample, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors flex flex-col justify-between gap-2"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800 pb-2">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700">
                          {sample.category}
                        </span>
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          تسلسل سليم
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-100 font-cairo">
                          {sample.label}
                        </div>
                        {sample.text && sample.text !== sample.label && (
                          <div className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed font-cairo">
                            {sample.text}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Raw JSON View */}
          {activeTab === "json" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>عرض محتوى JSON المنسق (تظهر النصوص العربية فيه بوضوح):</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600 font-bold">تم النسخ!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>نسخ كامل JSON</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950 p-4 max-h-[380px] overflow-auto custom-scrollbar text-left font-mono text-xs leading-relaxed text-slate-200" dir="ltr">
                <pre className="whitespace-pre-wrap break-words">{jsonSnippet}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
            سيتم تضمين ترميز <strong className="font-bold text-slate-700 dark:text-slate-200">UTF-8 BOM</strong> تلقائياً لضمان الفتح النظيف.
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition cursor-pointer"
            >
              إلغاء
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? "تم النسخ" : "نسخ JSON"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onConfirmDownload();
                onClose();
              }}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-sm shadow-emerald-600/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>تأكيد وتنزيل النسخة الاحتياطية (.json)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
