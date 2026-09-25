import { EditorModalPortal } from "./EditorOverlay";
import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  X,
  Upload,
  Sparkles,
  RotateCcw,
  Check,
  Image as ImageIcon,
  AlertCircle,
  FileText,
  Sliders,
  BrainCircuit,
  Save,
  BookOpen,
} from "lucide-react";
import { storage } from "../../../services/storage";
import { aiService } from "../../ai/services/aiService";
import { getAISettingsList } from "../../ai/services/aiProviderAdapter";
import { RichTextEditor } from "./RichTextEditor";
import { cleanLeakedTokens, normalizeBidiHtml, normalizeBidiPlainText } from "../../../services/bidiContentPipeline";
import { AIExecutionCenterModal } from "../../ai/components/AIExecutionCenterModal";
import { systemLog } from "../../../services/diagnosticLogger";

interface OcrImportModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onApplyOcrResult?: (htmlContent: string) => void;
  onImport?: (htmlContent: string) => void;
}

export const OcrImportModal: React.FC<OcrImportModalProps> = ({
  isOpen = true,
  onClose,
  onApplyOcrResult,
  onImport,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [extractedHtml, setExtractedHtml] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSolving, setIsSolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
  const subjects = useMemo(() => storage.getSubjects(), [isOpen]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(() => {
    const list = storage.getSubjects();
    return list[0]?.id || "";
  });
  const [subjectName, setSubjectName] = useState<string>(() => {
    const list = storage.getSubjects();
    return list[0]?.name || "الرياضيات";
  });
  const [lastUsedModel, setLastUsedModel] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [showExecutionCenter, setShowExecutionCenter] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = () => {
              const base64 = reader.result as string;
              setSelectedImage(base64);
              setError(null);
              systemLog("تم التقاط صورة من الحافظة (Ctrl+V).", "info");
              // @ts-ignore
              handleRunOcr(base64);
            };
            reader.readAsDataURL(file);
          }
          break;
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [isOpen]);

  const handlePasteFromClipboard = async (e: React.MouseEvent) => {
    e.stopPropagation();
    systemLog("تم النقر على زر لصق الصورة.", "info");
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const clipboardItem of clipboardItems) {
        const imageTypes = clipboardItem.types.filter(type => type.startsWith('image/'));
        if (imageTypes.length > 0) {
          const blob = await clipboardItem.getType(imageTypes[0]);
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = reader.result as string;
            setSelectedImage(base64);
            setError(null);
            systemLog("تم سحب الصورة بنجاح من الحافظة عبر الزر.", "success");
            // @ts-ignore
            handleRunOcr(base64);
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
      systemLog("لم يتم العثور على صورة في الحافظة.", "warn");
      setError("لم يتم العثور على صورة في الحافظة.");
    } catch (err: any) {
      console.error("Clipboard read failed:", err);
      systemLog("لا يمكن الوصول إلى الحافظة تلقائياً. يرجى استخدام (Ctrl+V) للصق.", "error");
      setError("لا يمكن الوصول إلى الحافظة تلقائياً. يرجى استخدام (Ctrl+V) للصق.");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("يرجى اختيار ملف صورة صالح (PNG, JPG, JPEG, WEBP)");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setSelectedImage(base64);
      setError(null);
      // @ts-ignore
      handleRunOcr(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleRunOcr = async (imageOverride?: string | React.MouseEvent) => {
    const targetImage = typeof imageOverride === "string" ? imageOverride : selectedImage;
    if (!targetImage) {
      setError("يرجى تحديد أو تحميل صورة أولاً.");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccessInfo(null);
    setExtractedHtml('<p dir="rtl" style="color: #64748b; font-weight: bold; animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;">جاري تحليل الصورة واستخراج المعادلات...</p>');

    try {
      const settingsList = getAISettingsList();
      const ocrSettings = settingsList[0];

      if (!ocrSettings || !ocrSettings.baseUrl || !ocrSettings.modelName) {
        const result = await aiService.ocrExtract(targetImage);
        setExtractedHtml(result.html);
        if (result.meta) setSuccessInfo(result.meta.statusMessage);
        return;
      }

      let endpoint = ocrSettings.baseUrl;
      if (!endpoint.endsWith("/chat/completions")) {
        endpoint = endpoint.replace(/\/$/, "") + "/chat/completions";
      }

      const prompt = `أنت خبير في استخراج النصوص وتحويلها (OCR) بدقة فائقة من الصور.
قم بتحليل الصورة المرفقة واستخرج جميع النصوص والمعادلات الرياضية والكيميائية والخطوات الإجرائية والجداول بدقة تامة.

أعد الناتج بتنسيق HTML صالح ونظيف (HTML Tags) يمكن إدراجه مباشرة في محرر النصوص:
1. النصوص العادية والفقرات والأسئلة والشروحات يجب وضعها في فقرات <p dir="rtl"> (إذا كانت عربية) أو <p dir="ltr"> (إذا كانت إنجليزية).
2. تحذير صارم: لا تحوّل النصوص أو الفقرات العادية إلى قوائم نقطية أو رقمية تلقائياً. استخدم <ul> أو <ol> فقط إذا كانت الصورة تحتوي صراحة على قائمة نقطية أو مرقمة فعلية.
3. المعادلات والرموز الرياضية والكيميائية وخطوات الحل اكتبها بصيغة LaTeX محاطة بـ $...$ للمعادلات المضمنة أو $$...$$ للمعادلات المستقلة.
4. الجداول يجب كتابتها باستخدام <table>, <tr>, <td>, <th> مع وضع dir="rtl" للجداول العربية.
5. حافظ على اتجاه كل فقرة (dir="rtl" للعربي، dir="ltr" للإنجليزي).
6. أرجع كود HTML الصافي مباشرة بدون نصوص إضافية خارج وسوم HTML ولا تضف markdown block.`;

      let base64Data = targetImage;
      if (base64Data.includes(",")) {
        base64Data = base64Data.split(",")[1];
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (ocrSettings.apiKey && ocrSettings.apiKey !== "••••••••") {
        headers["Authorization"] = `Bearer ${ocrSettings.apiKey}`;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: ocrSettings.modelName,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Data}` } }
              ]
            }
          ],
          temperature: ocrSettings.temperature ?? 0.1,
          max_tokens: 4000
        })
      });

      if (!response.ok) {
        console.warn("Direct fetch failed, falling back to AIGateway:", response.statusText);
        const result = await aiService.ocrExtract(targetImage);
        setExtractedHtml(result.html);
        if (result.meta) setSuccessInfo(result.meta.statusMessage);
        return;
      }

      const data = await response.json();
      let extractedContent = data.choices?.[0]?.message?.content || "";
      extractedContent = extractedContent.replace(/```html/g, "").replace(/```/g, "").trim();
      
      setExtractedHtml(extractedContent);
      setSuccessInfo("تم استخراج النصوص بنجاح (اتصال مباشر).");
      systemLog(`تم استخراج النصوص بنجاح عبر نموذج [${ocrSettings.modelName}]`, "success");
    } catch (err: any) {
      console.warn("Direct fetch exception, falling back to AIGateway", err);
      systemLog("فشل الاتصال المباشر، جاري محاولة المسار البديل...", "warn");
      try {
        const result = await aiService.ocrExtract(targetImage);
        setExtractedHtml(result.html);
        if (result.meta) {
          setSuccessInfo(result.meta.statusMessage);
          systemLog(result.meta.statusMessage, "success");
        }
      } catch (fbErr: any) {
        if (fbErr.name === "AbortError") {
          setError("تم إلغاء العملية من قبل المستخدم.");
          systemLog("إلغاء عملية استخراج النصوص", "warn");
        } else {
          setError(err.message || fbErr.message || "حدث خطأ أثناء معالجة الصورة واستخراج النصوص.");
          systemLog(`فشل استخراج النصوص: ${err.message || fbErr.message}`, "error");
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = () => {
    if (!extractedHtml.trim()) return;
    if (onApplyOcrResult) {
      onApplyOcrResult(extractedHtml);
    } else if (onImport) {
      onImport(extractedHtml);
    }
    onClose();
  };

  const handleSaveToQuestionBank = () => {
    if (!extractedHtml.trim()) {
      setError("لا يوجد محتوى لحفظه.");
      return;
    }
    const payload = {
      content: extractedHtml,
      subject: subjectName,
      modelUsed: lastUsedModel || "غير محدد",
      timestamp: new Date().toISOString()
    };
    
    console.log("================================");
    console.log("Database Prep Payload (JSON):");
    console.log(JSON.stringify(payload, null, 2));
    console.log("================================");
    
    systemLog(`تم تجهيز مسار الحفظ لبنك الأسئلة (مادة: ${subjectName}). تحقق من الـ Console.`, "success");
    setSuccessInfo(`تم تجهيز البيانات للحفظ (مادة: ${subjectName}). راجع وحدة التحكم.`);
  };

  const handleSolve = async () => {
    if (!extractedHtml.trim()) return;

    setIsSolving(true);
    setError(null);
    setSuccessInfo(null);

    const originalContent = extractedHtml;
    setExtractedHtml(originalContent + '<hr/><p dir="rtl" style="color: #6366f1; font-weight: bold; animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;">جاري التفكير وصياغة خطوات الحل...</p>');

    try {
      const settingsList = getAISettingsList();
      const solverSettings = settingsList[1];

      if (!solverSettings || !solverSettings.baseUrl || !solverSettings.modelName) {
        throw new Error("إعدادات محرك التحليل غير مكتملة. يرجى إعدادها من نافذة إدارة النماذج.");
      }

      let endpoint = solverSettings.baseUrl;
      if (!endpoint.endsWith("/chat/completions")) {
        endpoint = endpoint.replace(/\/$/, "") + "/chat/completions";
      }

      const systemPrompt = "أنت مدرس خبير لمناهج المرحلة الثانوية في الرياضيات والفيزياء والكيمياء. قم بحل المسألة التالية بخطوات منهجية وعلمية دقيقة باللغة العربية. قدم الحل النهائي منسقاً وواضحاً باستخدام وسوم HTML الصالحة للاستخدام المباشر.";
      const plainQuestion = originalContent.replace(/<[^>]*>?/gm, '').trim();

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (solverSettings.apiKey && solverSettings.apiKey !== "••••••••") {
        headers["Authorization"] = `Bearer ${solverSettings.apiKey}`;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: solverSettings.modelName,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: plainQuestion }
          ],
          temperature: solverSettings.temperature ?? 0.7,
          max_tokens: 4000
        })
      });

      if (!response.ok) {
        throw new Error(`خطأ في الاتصال بالخادم: ${response.statusText}`);
      }

      const data = await response.json();
      let solution = data.choices?.[0]?.message?.content || "";
      solution = solution.replace(/```html/g, "").replace(/```/g, "").trim();
      
      const formattedHtml = `
<div dir="rtl" style="font-family: inherit; line-height: 1.6;">
  <strong style="color: #0f172a; font-size: 1.1em; margin-bottom: 0.5rem; display: block;">السؤال:</strong>
  <div style="margin-bottom: 1.5rem; padding: 1rem; background: #f8fafc; border-radius: 0.5rem; border: 1px solid #e2e8f0;">
    ${originalContent}
  </div>
  <strong style="color: #4f46e5; font-size: 1.1em; margin-bottom: 0.5rem; display: block;">الحل المنهجي وخطوات الحل:</strong>
  <div style="padding: 1rem; background: #f0fdf4; border-radius: 0.5rem; border: 1px solid #bbf7d0;">
    ${solution.replace(/\n/g, '<br/>')}
  </div>
</div>
`.trim();

      setExtractedHtml(formattedHtml);
      setLastUsedModel(solverSettings.modelName);
      setSuccessInfo("تم استخراج خطوات الحل وتنسيقها بنجاح.");
      systemLog(`تم تحليل وحل المسألة بنجاح عبر [${solverSettings.modelName}]`, "success");
    } catch (err: any) {
      console.error("Solver error:", err);
      setExtractedHtml(originalContent);
      setError(err.message || "حدث خطأ أثناء محاولة حل المسألة.");
      systemLog(`فشل تحليل المسألة: ${err.message}`, "error");
    } finally {
      setIsSolving(false);
    }
  };

  if (!isOpen) return null;
  return (
    <EditorModalPortal onClose={onClose}>
    <>
      <div className="fixed inset-0 z-[2200] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div
          className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]"
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  استخراج النصوص والمعادلات من الصور (Vision OCR)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  تحويل المستندات المصورة، المعادلات الرياضية، والجداول إلى نصوص قابلة للتحرير بدقة
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="ocr-execution-center-btn" onClick={() => setShowExecutionCenter(true)}
                className="px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center gap-1.5 hover:bg-blue-100 transition cursor-pointer"
                title="فتح مركز التنفيذ الموحد لاختيار النموذج أو استراتيجية Fallback"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>مركز التنفيذ (14B)</span>
              </button>
              <button
                id="ocr-close-btn" onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Image Uploader & Preview */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Upload className="w-3.5 h-3.5" />
                  <span>الصورة المصدر (ورقة، مسألة، أو لقطة شاشة):</span>
                </label>

                <input
                  id="ocr-file-upload-input" type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center min-h-[220px] max-h-[300px] overflow-hidden ${
                    selectedImage
                      ? "border-teal-400 bg-teal-50/10"
                      : "border-slate-300 hover:border-teal-500 bg-slate-50 dark:bg-slate-800/30"
                  }`}
                >
                  {selectedImage ? (
                    <div className="relative w-full h-full flex flex-col items-center justify-center">
                      <img
                        src={selectedImage}
                        alt="Uploaded Preview"
                        className="max-h-[240px] w-auto object-contain rounded-lg shadow-xs"
                      />
                      <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 mt-2">
                        انقر لتغيير الصورة
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-3 flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        انقر لرفع صورة أو اسحبها هنا
                      </div>
                      <div className="text-[10px] text-slate-400">
                        يدعم ملفات PNG, JPG, WEBP وغيرها
                      </div>
                      <button
                        type="button"
                        id="ocr-paste-btn" onClick={handlePasteFromClipboard}
                        className="mt-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                      >
                        لصق من الحافظة (Ctrl+V) 📋
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Extracted Content Editor */}
              <div className="space-y-2 flex flex-col">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    <span>المحتوى المستخرج (HTML / LaTeX):</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                    {subjects.length > 0 ? (
                      <select
                        id="ocr-subject-select"
                        value={selectedSubjectId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedSubjectId(val);
                          const s = subjects.find((x) => x.id === val);
                          if (s) setSubjectName(s.name);
                        }}
                        className="px-2 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 focus:ring-1 focus:ring-teal-500 font-bold text-slate-800 dark:text-slate-200 max-w-[160px]"
                      >
                        {subjects.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input 
                        type="text" 
                        value={subjectName}
                        id="ocr-subject-input" 
                        onChange={(e) => setSubjectName(e.target.value)}
                        placeholder="اسم المادة (مثال: رياضيات)"
                        className="px-2 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 focus:ring-1 focus:ring-teal-500 w-32"
                      />
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <RichTextEditor
                    value={extractedHtml}
                    onChange={setExtractedHtml}
                    placeholder="سيظهر المحتوى المستخرج هنا بعد بدء المعالجة..."
                  />
                </div>
                
                {extractedHtml.trim() !== "" && (
                  <div className="pt-2 flex justify-end">
                    <button
                      id="ocr-save-btn" onClick={handleSaveToQuestionBank}
                      className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:hover:bg-emerald-800/60 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800"
                    >
                      <Save className="w-4 h-4" />
                      <span>حفظ في بنك الأسئلة 💾</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Error and Success alerts */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            {successInfo && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 rounded-xl flex items-start gap-2">
                <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <span>{successInfo}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
            <button
              id="ocr-cancel-btn" onClick={onClose}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition"
            >
              إلغاء
            </button>

            <div className="flex items-center gap-2">
              <button
                id="ocr-run-btn" onClick={handleRunOcr}
                disabled={!selectedImage || isProcessing}
                className="px-4 py-2 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-900/50 text-teal-700 dark:text-teal-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 border border-teal-200 dark:border-teal-800"
              >
                {isProcessing ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    <span>جاري القراءة والاستخراج البصري...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{extractedHtml ? "إعادة التحليل" : "بدء استخراج المحتوى (OCR)"}</span>
                  </>
                )}
              </button>

              {extractedHtml.trim() !== "" && (
                <button
                  id="ocr-solve-btn" onClick={handleSolve}
                  disabled={isProcessing || isSolving}
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 border border-indigo-200 dark:border-indigo-800"
                >
                  {isSolving ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                      <span>جاري التفكير وصياغة الحل...</span>
                    </>
                  ) : (
                    <>
                      <BrainCircuit className="w-3.5 h-3.5" />
                      <span>تحليل وحل المسألة ⚙️</span>
                    </>
                  )}
                </button>
              )}

              <button
                id="ocr-apply-btn" onClick={handleApply}
                disabled={!extractedHtml.trim() || isProcessing || isSolving}
                className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>إدراج في المحرر</span>
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
          taskType="ocr_extract"
          taskPayload={{
            title: "استخراج النصوص والمعادلات من الصور (OCR)",
            imageBase64: selectedImage || undefined,
          }}
          onExecute={async (opts) => {
            if (!selectedImage) {
              throw new Error("يرجى اختيار صورة أولاً.");
            }
            const res = await aiService.ocrExtract(selectedImage, {
              mode: opts.mode,
              specificModelId: opts.specificModelId,
              abortSignal: opts.abortSignal,
              onProgress: opts.onProgress,
            });
            return res;
          }}
          onSuccessResult={(res, meta) => {
            if (res && res.html) {
              setExtractedHtml(res.html);
            }
            if (meta) {
              setSuccessInfo(meta.statusMessage);
            }
          }}
        />
      )}
    </>
    </EditorModalPortal>
  );
};
