import { EditorModalPortal } from "./EditorOverlay";
import React, { useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  FileText,
  FileType2,
  Loader2,
  ScanText,
  Upload,
  X,
} from "lucide-react";
import { cleanAndConvertHtml, sanitizeHtmlForProseMirror } from "../../../services/smartPasteEngine";

type ImportMode = "insert" | "replace";

interface DocumentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (html: string, mode: ImportMode) => void;
  onOpenOcr: () => void;
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const textToParagraphs = (text: string) =>
  text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.replace(/\n/g, " ").trim())
    .filter(Boolean)
    .map((block) => `<p dir="${/[\u0600-\u06ff]/.test(block) ? "rtl" : "ltr"}">${escapeHtml(block)}</p>`)
    .join("");

async function readPdf(arrayBuffer: ArrayBuffer): Promise<{ html: string; pages: number }> {
  const [pdfjs, workerModule] = await Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;
  const document = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const lines = new Map<number, string[]>();

    content.items.forEach((item: any) => {
      const text = String(item?.str || "").trim();
      if (!text) return;
      const y = Math.round(Number(item?.transform?.[5] || 0) / 3) * 3;
      const line = lines.get(y) || [];
      line.push(text);
      lines.set(y, line);
    });

    const pageText = Array.from(lines.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([, words]) => words.join(" "))
      .join("\n");

    if (pageText.trim()) {
      pages.push(`<section data-imported-page="${pageNumber}">${textToParagraphs(pageText)}</section>`);
    }
  }

  return { html: pages.join(""), pages: document.numPages };
}

export const DocumentImportModal: React.FC<DocumentImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  onOpenOcr,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileKind, setFileKind] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScannedPdf, setIsScannedPdf] = useState(false);
  const [mode, setMode] = useState<ImportMode>("insert");

  if (!isOpen) return null;

  const reset = () => {
    setFileName("");
    setFileKind("");
    setPreviewHtml("");
    setMessage("");
    setError("");
    setIsScannedPdf(false);
    setMode("insert");
    if (inputRef.current) inputRef.current.value = "";
  };

  const close = () => {
    reset();
    onClose();
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setError("");
    setMessage("");
    setPreviewHtml("");
    setIsScannedPdf(false);
    setFileName(file.name);

    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "";
      const arrayBuffer = await file.arrayBuffer();
      let rawHtml = "";
      let plainText = "";

      if (extension === "docx") {
        setFileKind("Word");
        const mammoth = (await import("mammoth")).default;
        const result = await mammoth.convertToHtml(
          { arrayBuffer },
          {
            convertImage: mammoth.images.imgElement(async (image) => ({
              src: `data:${image.contentType};base64,${await image.read("base64")}`,
            })),
          },
        );
        rawHtml = result.value;
        setMessage(result.messages.length ? "تم الاستيراد مع معالجة بعض تنسيقات Word غير المدعومة." : "تمت قراءة ملف Word بنجاح.");
      } else if (extension === "pdf") {
        setFileKind("PDF");
        const result = await readPdf(arrayBuffer);
        rawHtml = result.html;
        if (!rawHtml.trim()) {
          setIsScannedPdf(true);
          setMessage(`الملف من ${result.pages} صفحة ويبدو مصورًا؛ استخدم OCR لاستخراج المحتوى.`);
          return;
        }
        setMessage(`تم استخراج النص من ${result.pages} صفحة. راجع ترتيب الفقرات قبل الإدراج.`);
      } else if (extension === "html" || extension === "htm") {
        setFileKind("HTML");
        rawHtml = new TextDecoder("utf-8").decode(arrayBuffer);
        setMessage("تمت قراءة صفحة HTML وتنظيفها.");
      } else if (extension === "txt") {
        setFileKind("نص");
        plainText = new TextDecoder("utf-8").decode(arrayBuffer);
        rawHtml = textToParagraphs(plainText);
        setMessage("تمت قراءة الملف النصي.");
      } else {
        throw new Error("اختر ملف Word بصيغة DOCX أو PDF أو HTML أو TXT.");
      }

      const cleaned = await cleanAndConvertHtml(rawHtml, plainText, null, {
        keepColors: true,
        keepFonts: false,
        convertEquations: true,
        cleanWordJunk: true,
      });
      setPreviewHtml(sanitizeHtmlForProseMirror(cleaned.html));
    } catch (processingError: any) {
      console.error("Document import failed", processingError);
      setError(processingError?.message || "تعذرت قراءة الملف. بقي محتوى البطاقة الحالي دون تغيير.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <EditorModalPortal onClose={onClose}>
    <div className="fixed inset-0 z-[2050] flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm" dir="rtl" role="dialog" aria-modal="true" aria-label="استيراد محتوى من ملف">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"><FileType2 className="h-5 w-5" /></span>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">استيراد محتوى إلى البطاقة</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">راجع المحتوى أولًا؛ لن يتغير شيء حتى تضغط إدراج.</p>
            </div>
          </div>
          <button type="button" onClick={close} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="إغلاق"><X className="h-5 w-5" /></button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-4 border-b border-slate-200 bg-slate-50/70 p-4 lg:border-b-0 lg:border-l dark:border-slate-800 dark:bg-slate-950/30">
            <input ref={inputRef} type="file" accept=".docx,.pdf,.html,.htm,.txt" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void processFile(file); }} />
            <button type="button" onClick={() => inputRef.current?.click()} disabled={isProcessing} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60">
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {isProcessing ? "جارٍ قراءة الملف…" : "اختيار ملف"}
            </button>
            <p className="text-xs leading-6 text-slate-500">يدعم DOCX وPDF وHTML وTXT. تُحفظ العناوين والقوائم والجداول والصور الممكنة ثم تُنظف التنسيقات الزائدة.</p>

            {fileName && (
              <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-start gap-2"><FileText className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" /><div className="min-w-0"><p className="truncate text-xs font-extrabold text-slate-800 dark:text-slate-100">{fileName}</p><p className="mt-1 text-[11px] text-slate-500">{fileKind}</p></div></div>
              </div>
            )}

            {previewHtml && (
              <fieldset className="space-y-2">
                <legend className="mb-2 text-xs font-extrabold text-slate-700 dark:text-slate-200">طريقة الإدراج</legend>
                <label className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 ${mode === "insert" ? "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30" : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"}`}><input type="radio" name="import-mode" checked={mode === "insert"} onChange={() => setMode("insert")} className="mt-0.5" /><span><b className="block text-xs">إضافة عند المؤشر</b><small className="text-[11px] text-slate-500">يبقى محتوى البطاقة الحالي.</small></span></label>
                <label className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 ${mode === "replace" ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30" : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"}`}><input type="radio" name="import-mode" checked={mode === "replace"} onChange={() => setMode("replace")} className="mt-0.5" /><span><b className="block text-xs">استبدال محتوى البطاقة</b><small className="text-[11px] text-slate-500">يتطلب تأكيدًا عند الإدراج.</small></span></label>
              </fieldset>
            )}
          </aside>

          <main className="min-h-[360px] overflow-y-auto p-4 sm:p-6">
            {error && <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
            {message && <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">{message}</div>}

            {isScannedPdf ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center text-center"><ScanText className="mb-3 h-10 w-10 text-purple-600" /><h4 className="font-extrabold text-slate-900 dark:text-white">هذا PDF مصوّر</h4><p className="mt-2 max-w-md text-sm leading-7 text-slate-500">لا يحتوي على طبقة نص يمكن نسخها. افتحه عبر OCR لاستخراج النص والمعادلات ثم مراجعته داخل المحرر.</p><button type="button" onClick={() => { close(); onOpenOcr(); }} className="mt-5 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-extrabold text-white hover:bg-purple-700">فتح OCR</button></div>
            ) : previewHtml ? (
              <div><div className="mb-3 flex items-center justify-between"><h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">معاينة قبل الإدراج</h4><span className="text-xs text-slate-500">يمكنك تعديل المحتوى بعد إدراجه</span></div><article className="prose prose-sm max-w-none rounded-2xl border border-slate-200 bg-white p-5 text-right leading-8 shadow-inner dark:prose-invert dark:border-slate-800 dark:bg-slate-950/30" dir="rtl" dangerouslySetInnerHTML={{ __html: previewHtml }} /></div>
            ) : !isProcessing && (
              <div className="flex min-h-[360px] flex-col items-center justify-center text-center"><Upload className="mb-3 h-10 w-10 text-slate-300" /><h4 className="font-extrabold text-slate-700 dark:text-slate-200">اختر الملف الذي أعددت فيه الدرس</h4><p className="mt-2 max-w-md text-sm leading-7 text-slate-500">سنقرأه وننظفه ونعرضه هنا قبل إدخاله إلى البطاقة.</p></div>
            )}
          </main>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-950/30">
          <span className="text-xs text-slate-500">محتوى البطاقة محفوظ ما لم تؤكد الاستبدال.</span>
          <div className="flex items-center gap-2"><button type="button" onClick={close} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">إلغاء</button><button type="button" disabled={!previewHtml || isProcessing} onClick={() => { if (mode === "replace" && !window.confirm("سيُستبدل محتوى البطاقة الحالي بالمحتوى المستورد. هل تريد المتابعة؟")) return; onImport(previewHtml, mode); close(); }} className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-extrabold text-white hover:bg-blue-700 disabled:opacity-40"><Check className="h-4 w-4" />{mode === "replace" ? "استبدال المحتوى" : "إدراج المحتوى"}</button></div>
        </footer>
      </div>
    </div>
    </EditorModalPortal>
  );
};
