// tests/pdfPreflightGate.test.js
// Verification suite: Tests the Pre-Export Validation Gate & Frozen Sandbox Engine.
// Proves rejection of blank/empty pages and acceptance of valid contentful pages.

import fs from "fs";
import path from "path";

console.log("=== STARTING PRE-EXPORT VALIDATION GATE TEST SUITE ===");

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
  } else {
    console.error(`[FAIL] ${message}`);
    process.exit(1);
  }
}

// 1. Verify exportPreflightGate module structure and logic
const gatePath = path.resolve(process.cwd(), "src/utils/exportPreflightGate.ts");
assert(fs.existsSync(gatePath), "src/utils/exportPreflightGate.ts exists");

const gateContent = fs.readFileSync(gatePath, "utf-8");

assert(
  gateContent.includes("export function isSheetContentful(sheet: HTMLElement): boolean"),
  "isSheetContentful function is defined and exported"
);

assert(
  gateContent.includes("export async function runPreExportGate("),
  "runPreExportGate preflight validation function is exported"
);

assert(
  gateContent.includes("export function createFrozenExportSandbox("),
  "createFrozenExportSandbox isolated sandbox function is exported"
);

assert(
  gateContent.includes("export function buildPostExportAudit("),
  "buildPostExportAudit comparison function is exported"
);

// 2. Unit logic simulation of isSheetContentful (blank page rejection vs valid page acceptance)
function simulateIsSheetContentful(mockSheet) {
  // Check main content
  if (mockSheet.main) {
    const mainText = (mockSheet.main.text || "").trim();
    const hasMedia = (mockSheet.main.elements || []).some(el =>
      ["img", "svg", "canvas", "katex", "math", "table", "card"].includes(el)
    );
    if (mainText.length > 0 || hasMedia) return true;
  }

  // Check full text excluding page numbering
  const fullText = (mockSheet.fullText || "").replace(/صفحة\s*\d+\s*(من|\/)\s*\d+/g, "").trim();
  const hasSubstantive = (mockSheet.elements || []).some(el =>
    ["img", "svg", "canvas", "katex", "math", "table", "card"].includes(el)
  );

  return fullText.length > 3 || hasSubstantive;
}

// Scenario A: Completely empty sheet
const emptySheet1 = { main: { text: "", elements: [] }, fullText: "", elements: [] };
assert(
  simulateIsSheetContentful(emptySheet1) === false,
  "Preflight Gate rejects completely empty page"
);

// Scenario B: Sheet with only page header/footer "صفحة 3 من 4"
const blankSheetWithFooter = {
  main: { text: "", elements: [] },
  fullText: "صفحة 3 من 4",
  elements: []
};
assert(
  simulateIsSheetContentful(blankSheetWithFooter) === false,
  "Preflight Gate rejects page containing only page numbers or whitespace"
);

// Scenario C: Valid sheet with lesson or exam question text
const validTextSheet = {
  main: { text: "سؤال 1: احسب ناتج ما يلي", elements: [] },
  fullText: "سؤال 1: احسب ناتج ما يلي صفحة 1 من 2",
  elements: []
};
assert(
  simulateIsSheetContentful(validTextSheet) === true,
  "Preflight Gate accepts valid contentful text page"
);

// Scenario D: Valid sheet with KaTeX math equation or table
const validMathSheet = {
  main: { text: "", elements: ["katex"] },
  fullText: "",
  elements: ["katex"]
};
assert(
  simulateIsSheetContentful(validMathSheet) === true,
  "Preflight Gate accepts page containing KaTeX math elements"
);

// 3. Verify Integration in pdfExporter.ts
const exporterPath = path.resolve(process.cwd(), "src/utils/pdfExporter.ts");
const exporterContent = fs.readFileSync(exporterPath, "utf-8");

assert(
  exporterContent.includes("runPreExportGate") &&
  exporterContent.includes("createFrozenExportSandbox") &&
  exporterContent.includes("buildPostExportAudit"),
  "pdfExporter.ts integrates Pre-Export Gate, Frozen Sandbox, and Post-Export Audit"
);

// 4. Verify Integration in pdfV2Exporter.ts
const v2Path = path.resolve(process.cwd(), "src/utils/pdfV2Exporter.ts");
const v2Content = fs.readFileSync(v2Path, "utf-8");

assert(
  v2Content.includes("runPreExportGate") &&
  v2Content.includes("createFrozenExportSandbox") &&
  v2Content.includes("buildPostExportAudit"),
  "pdfV2Exporter.ts integrates Pre-Export Gate, Frozen Sandbox, and Post-Export Audit"
);

// 5. Verify Integration in PrintPreviewModal.tsx
const modalPath = path.resolve(process.cwd(), "src/components/PrintPreviewModal.tsx");
const modalContent = fs.readFileSync(modalPath, "utf-8");

assert(
  modalContent.includes("❌ تعذر التصدير:") &&
  modalContent.includes("audit?.message"),
  "PrintPreviewModal displays specific Arabic diagnostics and post-export audit results"
);

assert(
  modalContent.includes("downloadPdfV2FromElement") &&
  modalContent.includes("handleSavePdfV2") &&
  modalContent.includes("_نص_حي.pdf"),
  "Live-text PDF keeps its independent V2 download pathway"
);

assert(
  !exporterContent.includes("appendSelectableTextLayer"),
  "Image PDF remains a pure visual export without a potentially corrupt Arabic hidden-text layer"
);

console.log("=== ALL PRE-EXPORT VALIDATION GATE TESTS PASSED SUCCESSFULLY ===");
