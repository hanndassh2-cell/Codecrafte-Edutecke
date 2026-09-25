import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, Check, Clipboard, FileText, Settings, Sparkles, 
  HelpCircle, Eye, Code, Layers, Trash2, ArrowLeft, RefreshCw, 
  Table as TableIcon, List as ListIcon, Image as ImageIcon, Sigma, Link2, Info 
} from "lucide-react";
import { SmartPasteAnalysis, cleanAndConvertHtml } from "../../../services/smartPasteEngine";
import { analyzeContent, ContentAnalysisResult } from "../../../services/contentAnalyzer";
import { systemLog } from "../../../services/diagnosticLogger";
import { MathText } from "../../../components/MathText";
import { RichTextEditor } from "./RichTextEditor";

interface SmartPasteAnalyzerModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: SmartPasteAnalysis | null;
  rawHtml: string;
  rawPlainText: string;
  onConfirm: (finalHtml: string) => void;
  onDistributeToCards?: (semanticResult: ContentAnalysisResult) => void;
}

export const SmartPasteAnalyzerModal: React.FC<SmartPasteAnalyzerModalProps> = ({
  isOpen,
  onClose,
  analysis,
  rawHtml,
  rawPlainText,
  onConfirm,
  onDistributeToCards,
}) => {
  const [activeTab, setActiveTab] = useState<"preview" | "code" | "semanticObjects">("preview");
  const [keepColors, setKeepColors] = useState(true);
  const [keepFonts, setKeepFonts] = useState(false);
  const [convertEquations, setConvertEquations] = useState(true);
  const [cleanWordJunk, setCleanWordJunk] = useState(true);
  const [previewHtml, setPreviewHtml] = useState("");
  const [semanticResult, setSemanticResult] = useState<ContentAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && analysis) {
      updateProcessedResult();
    }
  }, [isOpen, analysis, keepColors, keepFonts, convertEquations, cleanWordJunk]);

  const updateProcessedResult = async () => {
    setIsLoading(true);
    try {
      const result = await cleanAndConvertHtml(rawHtml, rawPlainText, null, {
        keepColors,
        keepFonts,
        convertEquations,
        cleanWordJunk,
      });
      setPreviewHtml(result.html);
      
      // Run Content Analyzer on cleaned HTML
      const semAnalysis = analyzeContent(result.html);
      setSemanticResult(semAnalysis);
    } catch (e) {
      console.error("Error processing preview HTML:", e);
    } finally {
      setIsLoading(false);
    }
  };


  if (!isOpen || !analysis) return null;

  const handleSmartInsert = () => {
    systemLog("تم النقر على الإدراج الذكي للنص المنسق.", "success");
    onConfirm(previewHtml);
    onClose();
  };

  const handlePlainInsert = () => {
    systemLog("تم النقر على إدراج كنص عادي (بدون تنسيق).", "info");
    const formattedPlain = rawPlainText ? `<p>${rawPlainText.replace(/\n/g, "<br>")}</p>` : "";
    onConfirm(formattedPlain);
    onClose();
  };

  // Get source app styling/badge
  const getAppBadgeDetails = () => {
    switch (analysis.sourceApp) {
      case "Microsoft Word":
        return {
          bg: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900",
          name: "Microsoft Word / Office",
          iconColor: "text-blue-600"
        };
      case "Google Docs":
        return {
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900",
          name: "Google Docs",
          iconColor: "text-emerald-600"
        };
      case "LibreOffice":
        return {
          bg: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900",
          name: "LibreOffice Writer",
          iconColor: "text-orange-600"
        };
      case "WPS Office":
        return {
          bg: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900",
          name: "WPS Office Writer",
          iconColor: "text-red-600"
        };
      case "Web Browser / HTML":
        return {
          bg: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900",
          name: "موقع ويب / كود مدمج",
          iconColor: "text-purple-600"
        };
      default:
        return {
          bg: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-800",
          name: "نص عادي منسق",
          iconColor: "text-slate-600"
        };
    }
  };

  const appDetails = getAppBadgeDetails();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[2000] bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", duration: 0.4 }}
          className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                  محلل المحتوى واللصق الذكي (Smart Paste Engine)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  كشف وتحليل الأنماط والرموز والجداول والمعادلات الرياضية لتوافق تام.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Body */}
          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Analytics & Settings */}
            <div className="lg:col-span-5 space-y-5">
              
              {/* Source App Identification */}
              <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 space-y-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">مصدر المحتوى المكتشف:</span>
                <div className={`px-3 py-2 rounded-xl border text-sm font-bold flex items-center gap-2 ${appDetails.bg}`}>
                  <FileText className={`w-4 h-4 ${appDetails.iconColor}`} />
                  {appDetails.name}
                </div>
              </div>

              {/* Detected Elements Grid */}
              <div className="space-y-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">العناصر التي تم التعرف عليها:</span>
                <div className="grid grid-cols-2 gap-2">
                  <div className={`p-3 rounded-xl border transition flex items-center gap-2.5 ${analysis.paragraphCount > 0 ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800' : 'opacity-50 border-dashed border-slate-200 dark:border-slate-800'}`}>
                    <Layers className="w-4 h-4 text-slate-500" />
                    <div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 block">الفقرات</span>
                      <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100">{analysis.paragraphCount}</span>
                    </div>
                  </div>

                  <div className={`p-3 rounded-xl border transition flex items-center gap-2.5 ${analysis.listCount > 0 ? 'bg-amber-50/50 border-amber-100 dark:bg-amber-950/10 dark:border-amber-900/30' : 'opacity-50 border-dashed border-slate-200 dark:border-slate-800'}`}>
                    <ListIcon className="w-4 h-4 text-amber-600" />
                    <div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 block">قوائم تعداد</span>
                      <span className="text-sm font-extrabold text-amber-700 dark:text-amber-400">{analysis.listCount || "لا يوجد"}</span>
                    </div>
                  </div>

                  <div className={`p-3 rounded-xl border transition flex items-center gap-2.5 ${analysis.tableCount > 0 ? 'bg-blue-50/50 border-blue-100 dark:bg-blue-950/10 dark:border-blue-900/30' : 'opacity-50 border-dashed border-slate-200 dark:border-slate-800'}`}>
                    <TableIcon className="w-4 h-4 text-blue-600" />
                    <div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 block">جداول منسقة</span>
                      <span className="text-sm font-extrabold text-blue-700 dark:text-blue-400">{analysis.tableCount || "لا يوجد"}</span>
                    </div>
                  </div>

                  <div className={`p-3 rounded-xl border transition flex items-center gap-2.5 ${analysis.equationCount > 0 ? 'bg-purple-50/50 border-purple-100 dark:bg-purple-950/10 dark:border-purple-900/30' : 'opacity-50 border-dashed border-slate-200 dark:border-slate-800'}`}>
                    <Sigma className="w-4 h-4 text-purple-600" />
                    <div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 block">معادلات ورموز</span>
                      <span className="text-sm font-extrabold text-purple-700 dark:text-purple-400">{analysis.equationCount || "لا يوجد"}</span>
                    </div>
                  </div>

                  <div className={`p-3 rounded-xl border transition flex items-center gap-2.5 ${analysis.imageCount > 0 ? 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/10 dark:border-emerald-900/30' : 'opacity-50 border-dashed border-slate-200 dark:border-slate-800'}`}>
                    <ImageIcon className="w-4 h-4 text-emerald-600" />
                    <div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 block">صور مضمنة</span>
                      <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400">{analysis.imageCount || "لا يوجد"}</span>
                    </div>
                  </div>

                  <div className={`p-3 rounded-xl border transition flex items-center gap-2.5 ${analysis.linkCount > 0 ? 'bg-sky-50/50 border-sky-100 dark:bg-sky-950/10 dark:border-sky-900/30' : 'opacity-50 border-dashed border-slate-200 dark:border-slate-800'}`}>
                    <Link2 className="w-4 h-4 text-sky-600" />
                    <div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 block">روابط تشعبية</span>
                      <span className="text-sm font-extrabold text-sky-700 dark:text-sky-400">{analysis.linkCount || "لا يوجد"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Engine Configurations */}
              <div className="space-y-3 bg-slate-50/40 dark:bg-slate-950/10 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                  <Settings className="w-3 h-3" /> إعدادات معالجة اللصق الذكي:
                </span>
                
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer hover:opacity-85">
                    <input 
                      type="checkbox" 
                      checked={cleanWordJunk} 
                      onChange={e => setCleanWordJunk(e.target.checked)}
                      className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
                    />
                    <span>تنظيف أكواد ميكروسوفت وورد الزائدة تلقائياً</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer hover:opacity-85">
                    <input 
                      type="checkbox" 
                      checked={convertEquations} 
                      onChange={e => setConvertEquations(e.target.checked)}
                      className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
                    />
                    <span>تحويل المعادلات وMathML والرموز تلقائياً إلى LaTeX</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer hover:opacity-85">
                    <input 
                      type="checkbox" 
                      checked={keepColors} 
                      onChange={e => setKeepColors(e.target.checked)}
                      className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
                    />
                    <span>الحفاظ على ألوان النصوص والخلفيات المنسقة</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer hover:opacity-85">
                    <input 
                      type="checkbox" 
                      checked={keepFonts} 
                      onChange={e => setKeepFonts(e.target.checked)}
                      className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
                    />
                    <span>الحفاظ على نوع الخط الأصلي (Font Family)</span>
                  </label>
                </div>
              </div>

              {/* Performance Indicator */}
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/10 rounded-xl border border-emerald-100 dark:border-emerald-950/20 flex items-start gap-2 text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
                <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p>
                  <strong>محسن الأداء الذكي نشط:</strong> تمت تنقية الشيفرة المصدرية وحذف التنسيقات غير المتوافقة دون إبطاء المتصفح.
                </p>
              </div>

            </div>

            {/* Right Column: Live Output Preview */}
            <div className="lg:col-span-7 flex flex-col min-h-[300px] border border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950 overflow-hidden">
              
              {/* Tabs */}
              <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-1.5 shrink-0 gap-1 overflow-x-auto">
                <button
                  onClick={() => setActiveTab("preview")}
                  className={`flex-1 min-w-[120px] py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activeTab === "preview" ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  معاينة المخرجات المنسقة
                </button>
                <button
                  onClick={() => setActiveTab("semanticObjects")}
                  className={`flex-1 min-w-[140px] py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activeTab === "semanticObjects" ? "bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  تحليل العناصر (Content Analyzer Objects)
                </button>
                <button
                  onClick={() => setActiveTab("code")}
                  className={`flex-1 min-w-[110px] py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activeTab === "code" ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}
                >
                  <Code className="w-3.5 h-3.5" />
                  الشيفرة النظيفة (HTML)
                </button>
              </div>

              {/* View Content */}
              <div className="flex-1 overflow-y-auto p-4 relative min-h-[260px]">
                {isLoading ? (
                  <div className="absolute inset-0 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xs flex items-center justify-center gap-2">
                    <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">جاري معالجة المحتوى...</span>
                  </div>
                ) : activeTab === "preview" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-right" dir="rtl">
                    <RichTextEditor value={previewHtml || "<p className='text-slate-400 text-center py-8'>لا يوجد محتوى للمعاينة</p>"} readOnly />
                  </div>
                ) : activeTab === "semanticObjects" ? (
                  <div className="space-y-3" dir="rtl">
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        إجمالي العناصر المحللة: <strong className="text-purple-600">{semanticResult?.summary.totalElements || 0}</strong>
                      </span>
                      <span className="text-[10px] text-slate-400">كائنات منظمة جاهزة للمعالجة البرمجية</span>
                    </div>

                    {semanticResult?.elements && semanticResult.elements.length > 0 ? (
                      <div className="space-y-2">
                        {semanticResult.elements.map((elem, idx) => (
                          <div key={elem.id || idx} className="p-3 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                {elem.typeLabelArabic} ({elem.type})
                              </span>
                              <span className="font-mono text-[9px] text-slate-400">{elem.id}</span>
                            </div>
                            <p className="text-slate-700 dark:text-slate-300 font-medium line-clamp-2">
                              {elem.textContent || "(عنصر بصري / بدون نص)"}
                            </p>
                            {elem.metadata && Object.keys(elem.metadata).length > 0 && (
                              <pre className="text-[9px] font-mono p-1.5 bg-slate-900 text-slate-300 rounded overflow-x-auto" dir="ltr">
                                {JSON.stringify(elem.metadata)}
                              </pre>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 text-center py-8 text-xs">لم يتم رصد عناصر هيكلية في هذا المحتوى</p>
                    )}
                  </div>
                ) : (
                  <pre className="text-[10px] font-mono p-3 bg-slate-900 text-slate-200 rounded-lg overflow-x-auto h-full select-all max-h-[360px]" dir="ltr">
                    {previewHtml || "<!-- لا يوجد كود -->"}
                  </pre>
                )}
              </div>


            </div>

          </div>

          {/* Footer Actions */}
          <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-right">
              حجم المحتوى: <strong>{(analysis.characterCount || 0).toLocaleString()}</strong> حرف | <strong>{analysis.paragraphCount}</strong> فقرة
            </span>
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              {semanticResult && (
                <button
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent("open-ai-content-assistant", {
                        detail: semanticResult.elements,
                      })
                    );
                    onClose();
                  }}
                  className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-md shadow-purple-600/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  title="تحليل العناصر المعقدة عبر مساعد المحتوى الذكي"
                >
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  مساعد المحتوى الذكي (AI Fallback)
                </button>
              )}
              {onDistributeToCards && semanticResult && (
                <button
                  onClick={() => {
                    onDistributeToCards(semanticResult);
                    onClose();
                  }}
                  className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Layers className="w-4 h-4" />
                  توزيع تلقائي على بطاقات الدرس (Content Distributor)
                </button>
              )}
              <button
                onClick={handlePlainInsert}
                className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                إدراج كنص عادي فقط
              </button>
              <button
                onClick={handleSmartInsert}
                className="flex-1 sm:flex-none px-6 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/10 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                إدراج بالتنسيق الذكي المكتشف
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
