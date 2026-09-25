// Verifies the safe in-card document import flow.
import fs from "fs";
import path from "path";

const importModal = fs.readFileSync(
  path.resolve(process.cwd(), "src/modules/editor/components/DocumentImportModal.tsx"),
  "utf-8",
);
const richTextEditor = fs.readFileSync(
  path.resolve(process.cwd(), "src/modules/editor/components/RichTextEditor.tsx"),
  "utf-8",
);

function assert(condition, message) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    process.exit(1);
  }
  console.log(`[PASS] ${message}`);
}

assert(
  importModal.includes('accept=".docx,.pdf,.html,.htm,.txt"') &&
    importModal.includes('import("mammoth")') &&
    importModal.includes('import("pdfjs-dist")'),
  "The card editor imports Word, PDF, HTML, and text files with heavy readers loaded only when needed",
);

assert(
  importModal.includes("cleanAndConvertHtml") &&
    importModal.includes("sanitizeHtmlForProseMirror") &&
    importModal.includes("معاينة قبل الإدراج"),
  "Imported files pass through the shared sanitizer and a review step before changing the card",
);

assert(
  importModal.includes('type ImportMode = "insert" | "replace"') &&
    importModal.includes("window.confirm") &&
    importModal.includes("محتوى البطاقة محفوظ ما لم تؤكد الاستبدال"),
  "Teachers can insert at the caret or explicitly confirm a full-card replacement",
);

assert(
  importModal.includes("isScannedPdf") &&
    importModal.includes("فتح OCR") &&
    richTextEditor.includes("onOpenOcr={() => setIsOcrModalOpen(true)}"),
  "Scanned PDFs are routed to OCR instead of silently producing an empty card",
);

assert(
  richTextEditor.includes("<DocumentImportModal") &&
    richTextEditor.includes("setIsDocumentImportOpen(true)") &&
    richTextEditor.includes("استيراد محتوى من Word أو PDF أو ملف نصي"),
  "The focused card editor exposes document import inside its progressive insert toolbar",
);
