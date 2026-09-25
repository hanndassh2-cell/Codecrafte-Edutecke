/**
 * Regression guards for the teacher's complete document lifecycle.
 * These assertions protect data routing and keep both PDF engines independent.
 */
import fs from "node:fs";
import path from "node:path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

const lessonEditor = read("src/modules/lessons/pages/LessonEditorView.tsx");
const editorPanel = read("src/modules/editor/components/EditorPanel.tsx");
const printModal = read("src/components/PrintPreviewModal.tsx");

const checks: Array<[string, boolean]> = [
  [
    "لا يفتح المحرر أول درس كبديل عند فقدان معرّف الدرس",
    !lessonEditor.includes("lessons.find((l) => l && l.id === lessonId) || lessons[0]"),
  ],
  [
    "الحفظ يعيد نتيجة نجاح/فشل قابلة للانتظار",
    lessonEditor.includes("Promise<boolean>") && lessonEditor.includes("saveInFlightRef"),
  ],
  [
    "المعاينة والتصدير يمرّان عبر تجهيز موحّد لآخر محتوى",
    lessonEditor.includes("prepareDocumentOutput") &&
      lessonEditor.includes("setDebouncedParagraphs(latestDataRef.current.paragraphs)"),
  ],
  [
    "إغلاق محرر البطاقة ينتظر نجاح الحفظ",
    editorPanel.includes("await saveFocusedDocumentIfNeeded()") &&
      editorPanel.includes("isDocumentTransitioning"),
  ],
  [
    "مسار PDF النص الحي مستقل عن مسار PDF الصورة",
    printModal.includes("downloadPdfFromElement") &&
      printModal.includes("downloadPdfV2FromElement") &&
      printModal.includes("handleSavePdfV2"),
  ],
];

let failed = 0;
for (const [name, passed] of checks) {
  if (passed) console.log(`✅ ${name}`);
  else {
    failed += 1;
    console.error(`❌ ${name}`);
  }
}

console.log(`Lifecycle audit: ${checks.length - failed}/${checks.length} passed`);
if (failed) process.exit(1);
