import { createPortal } from "react-dom";
import { LessonPreviewWorkspace, LessonPreviewInfo } from "./LessonPreviewWorkspace";
import React, { useState, useRef, useEffect, ReactElement } from "react";
import { Info } from "lucide-react";
import { 
  downloadPdfFromElement, 
  downloadWordFromElement, 
  downloadPngFromElement 
} from "../utils/pdfExporter";
import { downloadPdfV2FromElement } from "../utils/pdfV2Exporter";
import { UnifiedPreviewToolbar } from "./UnifiedPreviewToolbar";
import { GridColumnsOption, SubItemNumberingStyle, GroupingDensity } from "../services/groupingEngine";

interface PrintPreviewModalProps {
  lessonWorkspace?: LessonPreviewInfo;
  initialOrientation?: "portrait" | "landscape";
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  extraToolbarContent?: React.ReactNode;
  groupingEnabled?: boolean;
  onGroupingEnabledChange?: (enabled: boolean) => void;
  groupingColumns?: GridColumnsOption;
  onGroupingColumnsChange?: (cols: GridColumnsOption) => void;
  groupingNumberingStyle?: SubItemNumberingStyle;
  onGroupingNumberingStyleChange?: (style: SubItemNumberingStyle) => void;
  groupingDensity?: GroupingDensity;
  onGroupingDensityChange?: (density: GroupingDensity) => void;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  lessonWorkspace, initialOrientation = "portrait",
  isOpen,
  onClose,
  title,
  children,
  extraToolbarContent,
  groupingEnabled,
  onGroupingEnabledChange,
  groupingColumns,
  onGroupingColumnsChange,
  groupingNumberingStyle,
  onGroupingNumberingStyleChange,
  groupingDensity,
  onGroupingDensityChange,
}) => {
  const [zoom, setZoom] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState<'single' | 'continuous' | 'double'>('single');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(initialOrientation);
  const [isPrinting, setIsPrinting] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const printContentRef = useRef<HTMLDivElement>(null);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  // Keyboard navigation & Esc key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input,textarea,select,[contenteditable=true]")) return;
      if (e.key === "Escape" && !document.fullscreenElement) {
        onClose();
      } else if (e.key === "ArrowLeft" && viewMode === "single") {
        setCurrentPage((p) => Math.min(totalPages, p + 1));
      } else if (e.key === "ArrowRight" && viewMode === "single") {
        setCurrentPage((p) => Math.max(1, p - 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, totalPages, viewMode, onClose]);

  // Listen to afterprint event
  useEffect(() => {
    const handleAfterPrint = () => {
      setIsPrinting(false);
      setToastMsg(null);
    };
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, []);

  if (!isOpen) return null;

  const getFormattedFileName = (baseName?: string) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
    const timeStr = now.toLocaleTimeString('ar-EG', { hour12: false, hour: '2-digit', minute: '2-digit' }).replace(/:/g, '-');
    return `${baseName || "مستند_اختباري"} - ${dateStr} ${timeStr}`;
  };

  const showNotification = (msg: string, durationMs = 4000) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg(null);
    }, durationMs);
  };

  // Wait for the existing paginator; never export a still-measuring first page.
  const waitForLessonPages = async () => {
    if (!lessonWorkspace) return;
    await document.fonts?.ready;
    const deadline = Date.now() + 15000;
    while (printContentRef.current?.querySelector('[data-measuring="true"]')) {
      if (Date.now() > deadline) throw new Error('لم يكتمل تجهيز الصفحات. حاول مجددًا.');
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    if (!printContentRef.current?.querySelector('.a4-print-sheet')) throw new Error('لا توجد صفحات قابلة للإخراج.');
  };

  const handlePrint = async () => {
    const originalTitle = document.title;
    setIsPrinting(true);
    showNotification("جارٍ تجهيز نافذة الطباعة…", 3000);
    try {
      await new Promise(resolve => setTimeout(resolve, 350));
      await waitForLessonPages();
      document.title = getFormattedFileName(title);
      window.focus();
      window.print();
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'تعذر فتح الطباعة', 6000);
    } finally {
      document.title = originalTitle;
      setIsPrinting(false);
    }
  };

  const handleSavePdf = async () => {
    if (!printContentRef.current) return;

    const fileName = getFormattedFileName(title) + '.pdf';
    showNotification("جاري تدقيق المستند وتصدير PDF عالي الدقة من صفحات المعاينة...", 6000);

    setIsPrinting(true);
    await new Promise((resolve) => setTimeout(resolve, 300));

    try {
      await waitForLessonPages();
      const audit = await downloadPdfFromElement(printContentRef.current, fileName, {
        title,
        orientation,
        onProgress: (msg) => showNotification(msg, 3000),
      });
      showNotification(`✅ تم بنجاح! ${audit?.message || fileName}`, 6000);
    } catch (err: any) {
      const msg = err?.message || (typeof err === "string" ? err : "حدث خطأ أثناء إنشاء PDF");
      console.error("PDF export error:", msg);
      showNotification(`❌ تعذر التصدير: ${msg}`, 6000);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleSavePdfV2 = async () => {
    if (!printContentRef.current) return;

    const fileName = `${getFormattedFileName(title)}_نص_حي.pdf`;
    showNotification("جاري تدقيق المستند وتصدير PDF نص حي قابل للبحث والنسخ بدقة عالية...", 6000);

    setIsPrinting(true);
    await new Promise((resolve) => setTimeout(resolve, 300));

    try {
      await waitForLessonPages();
      const audit = await downloadPdfV2FromElement(printContentRef.current, fileName, {
        title,
        orientation,
        onProgress: (msg) => showNotification(msg, 3000),
      });
      showNotification(`✅ تم بنجاح (PDF نص حي)! ${audit?.message || fileName}`, 6000);
    } catch (err: any) {
      const msg = err?.message || (typeof err === "string" ? err : "حدث خطأ أثناء إنشاء PDF V2");
      console.error("[PDF-V2] Export error:", msg);
      showNotification(`❌ تعذر التصدير (PDF نص حي): ${msg}`, 6000);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleSaveWord = async () => {
    if (!printContentRef.current) return;
    const fileName = getFormattedFileName(title) + '.doc';
    showNotification("جاري تصدير المستند بتنسيق Word...", 3000);
    setIsPrinting(true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    try {
      await waitForLessonPages();
      downloadWordFromElement(printContentRef.current, fileName, { title });
      showNotification(`✅ تم تحميل المستند بتنسيق Word (${fileName}) بنجاح!`, 4000);
    } catch (err: any) {
      const msg = err?.message || (typeof err === "string" ? err : "حدث خطأ أثناء تصدير Word");
      showNotification(`❌ تعذر تصدير Word: ${msg}`, 6000);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleSavePngCurrentPage = async () => {
    if (!printContentRef.current) return;
    const fileName = getFormattedFileName(title);
    showNotification("جاري تصدير الصفحة الحالية كصورة PNG عالية الدقة...", 5000);

    setIsPrinting(true);
    await new Promise((resolve) => setTimeout(resolve, 300));

    try {
      await waitForLessonPages();
      const audit = await downloadPngFromElement(printContentRef.current, fileName, {
        pageIndex: currentPage - 1,
        exportAllPages: false,
        title,
        orientation,
        onProgress: (msg) => showNotification(msg, 3000),
      });
      showNotification(`✅ تم تحميل صورة الصفحة (${currentPage}) بنجاح! ${audit?.message || ""}`, 4500);
    } catch (err: any) {
      const msg = err?.message || (typeof err === "string" ? err : "حدث خطأ أثناء تصدير الصورة");
      console.error("PNG export error:", msg);
      showNotification(`❌ تعذر تصدير الصورة: ${msg}`, 6000);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleSavePngAllPages = async () => {
    if (!printContentRef.current) return;
    const fileName = getFormattedFileName(title);
    showNotification("جاري تصدير كافة الصفحات كصور PNG عالية الدقة...", 6000);

    setIsPrinting(true);
    await new Promise((resolve) => setTimeout(resolve, 300));

    try {
      await waitForLessonPages();
      const audit = await downloadPngFromElement(printContentRef.current, fileName, {
        exportAllPages: true,
        title,
        orientation,
        onProgress: (msg) => showNotification(msg, 3000),
      });
      showNotification(`✅ تم تحميل صور جميع الصفحات بنجاح! ${audit?.message || ""}`, 4500);
    } catch (err: any) {
      const msg = err?.message || (typeof err === "string" ? err : "حدث خطأ أثناء تصدير الصور");
      console.error("PNG export error:", msg);
      showNotification(`❌ تعذر تصدير الصور: ${msg}`, 6000);
    } finally {
      setIsPrinting(false);
    }
  };

  const content = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child as ReactElement<any>, {
        currentPageIndex: (viewMode === 'continuous' || isPrinting) ? undefined : (currentPage - 1),
        viewMode: isPrinting ? "single" : viewMode === "double" ? "double" : "single",
        overrideOrientation: orientation,
        onPagesChange: (count: number) => {
          setTotalPages((prev) => {
            if (prev !== count) return count;
            return prev;
          });
          setCurrentPage((prev) => {
            if (prev > count) return count || 1;
            return prev;
          });
        },
      });
    }
    return child;
  });

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col bg-slate-200 dark:bg-slate-900 print-preview-modal-root" dir="rtl">
      {/* Dynamic CSS for scoped printing */}
      <style>{`
        @media print {
          @page {
            size: ${orientation === 'landscape' ? 'landscape' : 'portrait'};
            margin: 0;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          /* Hide all standard page elements outside the modal */
          body > *:not(.print-preview-modal-root) {
            display: none !important;
          }
          /* Hide all toolbar controls, buttons, sidebars, measuring nodes and toasts */
          .print-modal-toolbar,
          .print-modal-toast,
          .print-preview-modal-root > header, .print-preview-modal-root > nav, .print-preview-modal-root > aside, button, [role="button"], .no-print, .no-pdf, [data-no-print="true"], .editor-only-hint, [data-measuring="true"] {
            display: none !important;
          }
          .a4-preview-container > div {
            display: block !important;
          }
          .print-preview-modal-root {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: auto !important;
            background: #ffffff !important;
            z-index: 99999 !important;
            display: block !important;
            overflow: visible !important;
            height: auto !important;
          }
          .print-preview-area {
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
          }
          .print-preview-transform {
            transform: none !important;
            width: 100% !important;
          }
          .a4-print-sheet {
            box-shadow: none !important;
            border: none !important;
            margin: 0 auto !important;
            page-break-after: always !important;
            break-after: page !important;
          }
          /* Ensure KaTeX elements preserve strict LTR direction and isolation in print */
          .katex, .katex *, .katex-display, .katex-display *, .katex-html, .katex-html * {
            direction: ltr !important;
            text-align: left !important;
          }
          .katex {
            direction: ltr !important;
            unicode-bidi: isolate !important;
            display: inline-block !important;
            white-space: nowrap !important;
            vertical-align: middle;
          }
          .katex-display {
            direction: ltr !important;
            unicode-bidi: isolate !important;
            display: block !important;
            text-align: center !important;
          }
          /* MCQ table formatting in print */
          .question-mcq-options {
            overflow: visible !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .question-mcq-options table {
            width: 100% !important;
            max-width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
          }
          .question-mcq-options tr,
          .question-mcq-options td {
            height: auto !important;
            overflow: visible !important;
            word-break: break-word !important;
            overflow-wrap: anywhere !important;
            white-space: normal !important;
          }
          .question-mcq-options .katex-display,
          .question-mcq-options .math-block-wrapper,
          .question-mcq-options .katex {
            max-width: 100% !important;
            overflow-x: visible !important;
            overflow-y: visible !important;
          }
        }
      `}</style>

      {lessonWorkspace ? <LessonPreviewWorkspace info={lessonWorkspace} title={title}
        contentRef={printContentRef} page={currentPage} pages={totalPages} zoom={zoom}
        mode={viewMode} landscape={orientation === 'landscape'} busy={isPrinting}
        onPage={setCurrentPage} onZoom={setZoom} onMode={setViewMode} onClose={onClose} onPrint={handlePrint}
        settings={<><label>اتجاه الورق <select value={orientation} onChange={e=>setOrientation(e.target.value as 'portrait'|'landscape')}><option value="portrait">عمودي</option><option value="landscape">أفقي</option></select></label>{extraToolbarContent}</>}
        exports={[
          {label:'PDF كصورة',action:handleSavePdf}, {label:'PDF نص حي (تجريبي)',action:handleSavePdfV2},
          {label:'Word',action:handleSaveWord}, {label:'الصفحة الحالية PNG',action:handleSavePngCurrentPage},
          {label:'جميع الصفحات PNG',action:handleSavePngAllPages}
        ]}>{content}</LessonPreviewWorkspace> : <>
      {/* Standardized Unified Preview Toolbar */}
      <UnifiedPreviewToolbar
        onPrint={handlePrint}
        onExportPdf={handleSavePdf}
        onExportPdfV2={handleSavePdfV2}
        onExportWord={handleSaveWord}
        onExportPngCurrentPage={handleSavePngCurrentPage}
        onExportPngAllPages={handleSavePngAllPages}
        zoom={zoom}
        onZoomChange={setZoom}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        orientation={orientation}
        onOrientationChange={setOrientation}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        groupingEnabled={groupingEnabled}
        onGroupingEnabledChange={onGroupingEnabledChange}
        groupingColumns={groupingColumns}
        onGroupingColumnsChange={onGroupingColumnsChange}
        groupingNumberingStyle={groupingNumberingStyle}
        onGroupingNumberingStyleChange={onGroupingNumberingStyleChange}
        groupingDensity={groupingDensity}
        onGroupingDensityChange={onGroupingDensityChange}
        extraToolbarContent={extraToolbarContent}
        onClose={onClose}
        title={title}
      />

      </>}
      {/* Floating Guidance Toast */}
      {toastMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md border border-slate-700 flex items-center gap-2.5 print-modal-toast">
          <Info className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {!lessonWorkspace && <>
      {/* Central Document Preview Canvas */}
      <div className="flex-1 overflow-auto flex justify-center print-preview-area custom-scrollbar py-8 px-4" dir="rtl">
        <div className="min-h-full flex items-start justify-center">
          <div
            ref={printContentRef}
            className="flex justify-center"
            style={{ zoom: zoom }}
          >
            {content}
          </div>
        </div>
      </div>
      </>}
    </div>, document.body
  );
};
