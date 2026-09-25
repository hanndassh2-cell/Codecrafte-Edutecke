// Verifies that lesson saving reports the real lifecycle instead of a fabricated current time.

import fs from "fs";
import path from "path";

const lessonEditor = fs.readFileSync(
  path.resolve(process.cwd(), "src/modules/lessons/pages/LessonEditorView.tsx"),
  "utf-8",
);
const topBar = fs.readFileSync(
  path.resolve(process.cwd(), "src/modules/editor/components/TopBar.tsx"),
  "utf-8",
);
const server = fs.readFileSync(
  path.resolve(process.cwd(), "server.ts"),
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
  lessonEditor.includes("const [lastSavedAt, setLastSavedAt]") &&
    lessonEditor.includes("setLastSavedAt(savedAt)"),
  "The displayed save time comes from a completed save",
);

assert(
  lessonEditor.includes("try {") &&
    lessonEditor.includes("setSaveError(\"تعذر حفظ تغييرات الدرس\")") &&
    lessonEditor.includes("finally {") &&
    lessonEditor.includes("setIsSaving(false)"),
  "Save failures are caught and surfaced without claiming success",
);

assert(
  topBar.includes("تغييرات غير محفوظة") &&
    topBar.includes("جارٍ الحفظ...") &&
    topBar.includes("تم الحفظ •") &&
    topBar.includes('role="status"'),
  "The header exposes the complete accessible save lifecycle",
);

assert(
  !lessonEditor.includes('lastSaved={new Date().toLocaleTimeString("ar-EG")}'),
  "The UI no longer fabricates a fresh save time on every render",
);

assert(
  server.includes('readCliOption("--port")') &&
    server.includes('readCliOption("--host")') &&
    server.includes("app.listen(PORT, HOST"),
  "The development server honors supervised preview host and port options",
);
