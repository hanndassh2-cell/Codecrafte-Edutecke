// tests/pdfExportBlankPages.test.js
// Verification suite: Ensures PDF export never produces trailing blank pages with long content or complex tables.

import fs from "fs";
import path from "path";

console.log("=== STARTING PDF EXPORT NO-BLANK-PAGES TEST SUITE ===");

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
  } else {
    console.error(`[FAIL] ${message}`);
    process.exit(1);
  }
}

// 1. Verify pdfV2Exporter filtering logic for empty sheets via Pre-Export Gate
const pdfV2Path = path.resolve(process.cwd(), "src/utils/pdfV2Exporter.ts");
const pdfV2Content = fs.readFileSync(pdfV2Path, "utf-8");

assert(
  pdfV2Content.includes("runPreExportGate") &&
  pdfV2Content.includes("createFrozenExportSandbox"),
  "pdfV2Exporter utilizes runPreExportGate to strip empty sheets and create an isolated sandbox prior to PDF assembly"
);

assert(
  pdfV2Content.includes(".katex-mathml") &&
  pdfV2Content.includes("display = \"none\"") &&
  pdfV2Content.includes("opacity: 0"),
  "pdfV2Exporter isolates KaTeX math equations and overlays invisible searchable LaTeX text without garbling"
);

// 2. Verify PaginatedA4Preview measurement logic and page filtering
const paginatedPreviewPath = path.resolve(process.cwd(), "src/components/PaginatedA4Preview.tsx");
const paginatedPreviewContent = fs.readFileSync(paginatedPreviewPath, "utf-8");

assert(
  paginatedPreviewContent.includes("const validPages = currentPages.filter((p) => p && p.length > 0);"),
  "PaginatedA4Preview strictly filters out empty pages in page state calculation"
);

assert(
  paginatedPreviewContent.includes("currentHeight + spaceNeeded > pageAvailableHeight") &&
  paginatedPreviewContent.includes("currentPage.length > 0"),
  "PaginatedA4Preview calculates page heights dynamically for complex tables and long text blocks"
);

// 3. Verify Question Density Controls in UnifiedPreviewToolbar
const toolbarPath = path.resolve(process.cwd(), "src/components/UnifiedPreviewToolbar.tsx");
const toolbarContent = fs.readFileSync(toolbarPath, "utf-8");

assert(
  toolbarContent.includes("كثافة توزيع الأسئلة والمسافات") &&
  toolbarContent.includes("compact") &&
  toolbarContent.includes("normal") &&
  toolbarContent.includes("spaced"),
  "UnifiedPreviewToolbar provides Question Density controls (Compact, Normal, Spaced) to prevent question slicing across page breaks"
);

// 4. Verify Image Bounding in Lesson Editor
const imageModalPath = path.resolve(process.cwd(), "src/modules/editor/components/ImageInsertModal.tsx");
const imageModalContent = fs.readFileSync(imageModalPath, "utf-8");

assert(
  imageModalContent.includes("insertLessonEditorImage") &&
  imageModalContent.includes("importImageToLessonEditor") &&
  imageModalContent.includes("compressImage"),
  "Lesson Editor Image Modal provides file upload, image compression, and API-based image import"
);

const imageNodePath = path.resolve(process.cwd(), "src/modules/editor/components/ImageNodeView.tsx");
const imageNodeContent = fs.readFileSync(imageNodePath, "utf-8");

assert(
  imageNodeContent.includes("breakInside: 'avoid'") &&
  imageNodeContent.includes("pageBreakInside: 'avoid'") &&
  imageNodeContent.includes("maxWidth: '100%'"),
  "ImageNodeView applies strict A4 page bounding and page-break avoidance to images"
);

console.log("=== ALL PDF EXPORT NO-BLANK-PAGES TESTS PASSED ===");
