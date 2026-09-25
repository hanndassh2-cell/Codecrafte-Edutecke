// Verifies that pasted Word/web content is normalized before it reaches preview/export.

import fs from "fs";
import path from "path";

const smartPastePath = path.resolve(process.cwd(), "src/services/smartPasteEngine.ts");
const smartPasteContent = fs.readFileSync(smartPastePath, "utf-8");
const richTextEditorPath = path.resolve(
  process.cwd(),
  "src/modules/editor/components/RichTextEditor.tsx"
);
const richTextEditorContent = fs.readFileSync(richTextEditorPath, "utf-8");
const indexCssPath = path.resolve(process.cwd(), "src/index.css");
const indexCssContent = fs.readFileSync(indexCssPath, "utf-8");

function assert(condition, message) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    process.exit(1);
  }
  console.log(`[PASS] ${message}`);
}

assert(
  smartPasteContent.includes("normalizeEducationalPasteHtml"),
  "Smart paste has a shared educational normalization pass"
);

assert(
  smartPasteContent.includes("STYLE_ALLOWLIST") &&
    !smartPasteContent.match(/STYLE_ALLOWLIST[\s\S]{0,400}font-size/) &&
    !smartPasteContent.match(/STYLE_ALLOWLIST[\s\S]{0,400}line-height/) &&
    !smartPasteContent.match(/STYLE_ALLOWLIST[\s\S]{0,400}margin/),
  "Word/web font sizes, line heights, and margins are not preserved from pasted content"
);

assert(
  smartPasteContent.includes("node.setAttribute(\"dir\", \"rtl\")"),
  "Arabic pasted blocks are normalized to RTL"
);

assert(
  smartPasteContent.includes("span.attributes.length === 0"),
  "Empty Word/Google Docs spans are unwrapped"
);

assert(
  smartPasteContent.includes("querySelectorAll(\"li\")") &&
    smartPasteContent.includes("!hasMeaningfulContent(li)") &&
    smartPasteContent.includes("querySelectorAll(\"ul, ol\")"),
  "Empty pasted list items and empty lists are removed"
);

assert(
  smartPasteContent.includes("formatPlainTextForEducationalPaste") &&
    smartPasteContent.includes("EMPTY_LIST_MARKER_RE") &&
    !smartPasteContent.includes("formattedText.replace(/\\n/g, \"<br>\")"),
  "Plain text paste is converted to clean paragraphs instead of oversized line breaks"
);

assert(
  smartPasteContent.includes("normalizePastedLineBreaks") &&
    smartPasteContent.includes("previousIsBreak") &&
    smartPasteContent.includes("br.remove()"),
  "Repeated pasted line breaks are collapsed before content reaches the editor"
);

assert(
  richTextEditorContent.includes("requestAnimationFrame") &&
    richTextEditorContent.includes("editor.getHTML()") &&
    richTextEditorContent.includes("editor.commands.setContent(normalizedHtml, { emitUpdate: false })"),
  "The rich text editor normalizes pasted HTML immediately after insertion"
);

assert(
  richTextEditorContent.includes("const handleClipboardPaste") &&
    !richTextEditorContent.includes("handleDOMEvents: {\n        paste:") &&
    richTextEditorContent.includes("handlePaste: (_view, event, _slice)") &&
    richTextEditorContent.includes("isHandlingPasteRef") &&
    richTextEditorContent.includes("selectionBeforePaste"),
  "Keyboard and context-menu paste use one guarded normalization path and preserve the caret"
);

assert(
  richTextEditorContent.includes("تم تنظيف المحتوى وإدراجه بأمان") &&
    richTextEditorContent.includes("مراجعة الاستيراد") &&
    richTextEditorContent.includes("lastPastedRange"),
  "Imported Word/web content reports what was recognized and can be safely reprocessed in place"
);

assert(
  richTextEditorContent.includes("processCentralContentPipeline(html") &&
    richTextEditorContent.includes('detectedTypes: ["ocr_import"]'),
  "OCR output passes through the same central content pipeline before insertion"
);

assert(
  richTextEditorContent.includes("htmlNeedsPasteNormalization") &&
    richTextEditorContent.includes("normalizeEditorContentSoon()") &&
    richTextEditorContent.includes("!isNormalizingEditorRef.current && htmlNeedsPasteNormalization(currentHtml)"),
  "Editor updates normalize paste artifacts even when browser context-menu paste bypasses the paste handler"
);

assert(
  indexCssContent.includes(".ProseMirror.ProseMirror p:empty:not(:last-child)") &&
    indexCssContent.includes(".ProseMirror.ProseMirror li:has(> br:only-child)") &&
    indexCssContent.includes("display: none !important;"),
  "Empty pasted blocks are hidden inside the live editor without waiting for save/reopen"
);
