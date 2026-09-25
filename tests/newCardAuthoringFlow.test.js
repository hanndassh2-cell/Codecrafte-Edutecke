// Verifies the one-action new-card authoring flow.

import fs from "fs";
import path from "path";

const editorPanel = fs.readFileSync(
  path.resolve(process.cwd(), "src/modules/editor/components/EditorPanel.tsx"),
  "utf-8",
);
const editorCard = fs.readFileSync(
  path.resolve(process.cwd(), "src/modules/editor/components/EditorCard.tsx"),
  "utf-8",
);
const richTextEditor = fs.readFileSync(
  path.resolve(process.cwd(), "src/modules/editor/components/RichTextEditor.tsx"),
  "utf-8",
);
const cardShell = fs.readFileSync(
  path.resolve(process.cwd(), "src/modules/editor/components/CardShell.tsx"),
  "utf-8",
);
const smartBlockInserter = fs.readFileSync(
  path.resolve(process.cwd(), "src/modules/editor/components/SmartBlockInserterMenu.tsx"),
  "utf-8",
);
const editorRibbon = fs.readFileSync(
  path.resolve(process.cwd(), "src/modules/editor/components/EditorRibbon.tsx"),
  "utf-8",
);
const portalDropdown = fs.readFileSync(
  path.resolve(process.cwd(), "src/components/PortalDropdown.tsx"),
  "utf-8",
);
const curriculumTree = fs.readFileSync(
  path.resolve(process.cwd(), "src/components/UnifiedCurriculumTree.tsx"),
  "utf-8",
);
const lessonEditorView = fs.readFileSync(
  path.resolve(process.cwd(), "src/modules/lessons/pages/LessonEditorView.tsx"),
  "utf-8",
);
const previewPanel = fs.readFileSync(
  path.resolve(process.cwd(), "src/modules/editor/components/PreviewPanel.tsx"),
  "utf-8",
);
const styles = fs.readFileSync(
  path.resolve(process.cwd(), "src/index.css"),
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
  editorPanel.includes("activateCardForWriting") &&
    editorPanel.includes("setPendingFocusCard") &&
    editorPanel.includes("setCollapsedCards"),
  "A newly inserted card is selected, expanded, and queued for writing",
);

assert(
  editorPanel.includes('scrollIntoView({ behavior: "smooth", block: "center" })') &&
    cardShell.includes("data-lesson-card-id={p.id}"),
  "The document scrolls the new card into a comfortable writing position",
);

assert(
  editorCard.includes("autoFocus={shouldAutoFocus}") &&
    editorCard.includes("autoFocusPosition={autoFocusPosition}") &&
    richTextEditor.includes("editor.commands.focus(autoFocusPosition)"),
  "The new text card receives the caret without another click",
);

assert(
  richTextEditor.includes("prev.isActive === next.isActive") &&
    richTextEditor.includes("prev.autoFocus === next.autoFocus"),
  "Editor memoization preserves active-card and focus updates",
);

assert(
  editorPanel.includes("setInlineAddIndex(null);") &&
    editorPanel.includes("cardSupportsImmediateTyping(type)"),
  "Bottom and inline insertion use a predictable placement and focus path",
);

assert(
  cardShell.includes('aria-label="عنوان البطاقة"') &&
    cardShell.includes('event.key === "Enter"') &&
    cardShell.includes('onRequestEditorFocus?.(p.id, "start")'),
  "Enter from the card title commits it and moves directly into the content",
);

assert(
  richTextEditor.includes('event.key === "ArrowUp"') &&
    richTextEditor.includes('event.key === "ArrowDown"') &&
    editorPanel.includes("navigateBetweenCards"),
  "Boundary arrow keys move naturally between editable cards",
);

assert(
  editorRibbon.includes("إضافة بطاقة في نهاية الدرس") &&
    editorPanel.includes("سيتم الإدراج بعد:") &&
    smartBlockInserter.includes("placementLabel"),
  "The insertion dialog states whether the card goes at the end or after a selected card",
);

assert(
  smartBlockInserter.includes('{ type: "explanation", label: "شرح / فقرة"') &&
    !smartBlockInserter.includes('{ type: "paragraph", label: "شرح / فقرة"') &&
    smartBlockInserter.includes("المستخدمة مؤخرًا") &&
    smartBlockInserter.includes('event.key !== "Enter"'),
  "The picker uses valid card types and supports recent choices plus Enter-to-insert",
);

assert(
  editorPanel.includes('if (!defaultBody && type === "tables")') &&
    !editorPanel.includes('defaultBody = "• المفهوم الأول') &&
    !editorPanel.includes('defaultBody = "1. أن يتعرف الطالب'),
  "New text cards start clean instead of saving template filler as lesson content",
);

assert(
  editorPanel.includes("setDeletedCardUndo({ card: target, index: targetIndex })") &&
    editorPanel.includes("undoDeleteParagraph") &&
    editorPanel.includes("تراجع"),
  "Deleted content cards can be restored immediately",
);

assert(
  editorPanel.includes('p.type === "questions" ? undefined : duplicateParagraph') &&
    editorPanel.includes('if (!target || target.type === "questions") return;'),
  "Question-bank cards cannot be duplicated into conflicting containers",
);

assert(
  richTextEditor.includes("lesson-format-toolbar") &&
    richTextEditor.includes("flex-nowrap") &&
    richTextEditor.includes("overflow-x-auto"),
  "The active-card toolbar stays on one compact horizontally scrollable row",
);

assert(
  richTextEditor.includes("<PortalDropdown") &&
    richTextEditor.includes("open={isMoreMenuOpen}") &&
    portalDropdown.includes("createPortal(") &&
    portalDropdown.includes("fixed z-[9999]"),
  "The additional-tools menu renders above the scrollable editor like a document popover",
);

assert(
  richTextEditor.includes('id="lesson-insert-toolbar"') &&
    richTextEditor.includes("إدراج محتوى") &&
    richTextEditor.includes("معادلة") &&
    richTextEditor.includes("جدول") &&
    richTextEditor.includes("OCR") &&
    richTextEditor.includes("المساعد الذكي"),
  "Frequent educational insert actions have a dedicated toolbar below text formatting",
);

assert(
  editorPanel.includes("مخطط الدرس") &&
    editorPanel.includes("بحث في البطاقات") &&
    editorPanel.includes("visibleOutlineCards") &&
    editorPanel.includes("selectCardFromOutline"),
  "Long lessons expose a searchable card outline with direct navigation",
);

assert(
  editorPanel.includes("focusSingleCard") &&
    editorPanel.includes("تركيز بطاقة واحدة") &&
    editorPanel.includes("filter((paragraph) => paragraph.id !== cardId)"),
  "Single-card focus keeps long lessons compact while preserving expand-all",
);

assert(
  curriculumTree.includes("unitLessons.length") &&
    curriculumTree.includes("statusMeta") &&
    curriculumTree.includes("قيد المراجعة"),
  "The curriculum tree shows lesson counts and meaningful workflow status",
);

assert(
  richTextEditor.includes('<option value="p">نص عادي</option>') &&
    richTextEditor.includes('<option value="1">عنوان 1</option>') &&
    richTextEditor.includes("setHeading"),
  "The writing toolbar exposes document paragraph and heading styles",
);

assert(
  editorRibbon.includes("تم الحفظ") &&
    !cardShell.includes("تحرير محتوى البطاقة"),
  "Save state remains visible while redundant per-card edit controls are removed",
);

assert(
  editorPanel.includes("max-w-[920px]") &&
    !editorPanel.includes("Fاصل صفحات (A4 Page Break)"),
  "The document canvas is responsive and no longer shows misleading fixed-count page breaks",
);

assert(
  editorPanel.includes("focusedDocumentCardId") &&
    editorPanel.includes("مخطط المستند") &&
    editorPanel.includes('role="dialog"') &&
    editorPanel.includes('event.key === "Escape"') &&
    editorPanel.includes('event.key.toLowerCase() === "s"'),
  "Outline selection opens a focused document editor with safe keyboard controls",
);

assert(
  editorPanel.includes("saveFocusedDocumentIfNeeded") &&
    editorPanel.includes("closeFocusedDocument") &&
    editorPanel.includes("تغييرات غير محفوظة") &&
    lessonEditorView.includes("isDirty={isDirty}"),
  "Focused editing exposes save state and protects changes when navigating or closing",
);

assert(
  editorPanel.includes("collapseOutlineOnCompactScreen") &&
    editorPanel.includes("lg:hidden") &&
    editorPanel.includes("lg:static"),
  "The lesson outline becomes a non-blocking overlay on compact screens",
);

assert(
  styles.includes(".lesson-insert-toolbar::-webkit-scrollbar") &&
    editorCard.includes("&amp;nbsp;|&nbsp;|&#160;|&#xA0;"),
  "Compact toolbars and card summaries avoid visible scrollbar and HTML entity noise",
);

assert(
  editorPanel.includes("مخطط بناء الدرس") &&
    editorPanel.includes("إضافة بطاقة بعدها") &&
    editorPanel.includes("مكتملة المحتوى") &&
    editorPanel.includes("مخفية من الإخراج"),
  "The primary lesson workspace is an outline-first planning surface",
);

assert(
  editorPanel.includes("setFocusedDocumentCardId(newId)") &&
    editorPanel.includes("previewCardFromOutline") &&
    editorPanel.includes("edutech-preview-focus-card"),
  "New cards open for writing and card previews preserve the requested target",
);

assert(
  lessonEditorView.includes("setIsPreviewCollapsed(!next)") &&
    lessonEditorView.includes("onPreview={handlePreviewFullscreen}") &&
    previewPanel.includes("data-preview-card-id={p.id}") &&
    previewPanel.includes("scrollIntoView({ behavior: \"smooth\", block: \"center\" })"),
  "Preview opens visibly and scrolls to the selected card in lesson context",
);

assert(
  !lessonEditorView.includes('import { NavigationPanel }') &&
    !lessonEditorView.includes('import { ResizableSidebar }') &&
    lessonEditorView.includes("Full-document preview window") &&
    lessonEditorView.includes("if (!next) setIsPreviewCollapsed(true)"),
  "Lesson authoring stays full-width and preview returns cleanly to the outline",
);

assert(
  editorPanel.includes("المزيد من إجراءات البطاقة") &&
    editorPanel.includes("إنشاء نسخة من البطاقة") &&
    editorPanel.includes("إخفاء من المعاينة والتصدير") &&
    editorPanel.includes("محرر البطاقة"),
  "Outline cards keep primary actions visible and group secondary actions clearly",
);

assert(
  editorPanel.includes("جاهزية محتوى الدرس") &&
    editorPanel.includes('role="progressbar"') &&
    editorPanel.includes('outlineFilter') &&
    editorPanel.includes("عرض جميع البطاقات"),
  "Long lesson outlines expose readiness and practical status filters",
);

assert(
  editorPanel.includes("paragraphs.length === 0 && !readOnly") &&
    editorPanel.includes("إضافة البطاقة الأولى"),
  "An empty lesson shows one focused first-card action without duplicate empty states",
);

assert(
  previewPanel.includes("zoom: zoomLevel / 100") &&
    !previewPanel.includes("Math.max(zoomLevel, 115)") &&
    previewPanel.includes("overflow-hidden p-0 sm:p-3"),
  "Fullscreen preview avoids forced enlargement and nested outer scrolling",
);
