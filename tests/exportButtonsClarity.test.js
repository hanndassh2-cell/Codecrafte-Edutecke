// tests/exportButtonsClarity.test.js
// Verification suite: Protect clarity of export buttons, PDF modes, and single-page unhiding

import fs from "fs";
import path from "path";

console.log("=== STARTING EXPORT BUTTONS & PREVIEW RULES VERIFICATION SUITE ===");

function runTests() {
  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName) {
    totalTests++;
    if (condition) {
      console.log(`[PASS ${totalTests}] ${testName}`);
      passedTests++;
    } else {
      console.error(`[FAIL ${totalTests}] ${testName}`);
    }
  }

  // Test 1: UnifiedPreviewToolbar contains clear distinct buttons
  const toolbarPath = path.resolve(process.cwd(), "src/components/UnifiedPreviewToolbar.tsx");
  const toolbarContent = fs.readFileSync(toolbarPath, "utf-8");

  assert(
    toolbarContent.includes("PDF كصورة (المعتمد)") && toolbarContent.includes("PDF نص حي (تجريبي)"),
    "Export buttons have clear distinct labels for image PDF and live-text PDF"
  );

  assert(
    toolbarContent.includes("دليل فرق صيغ التصدير") &&
    toolbarContent.includes("الشكل الأفضل والمطابق للمعاينة") &&
    toolbarContent.includes("نصوص قابلة للنسخ والبحث"),
    "Export menu includes explanatory guide distinguishing output formats"
  );

  // Test 2: Verify preflight & pdfV2Exporter measuring sheets exclusion logic
  const gatePath = path.resolve(process.cwd(), "src/utils/exportPreflightGate.ts");
  const gateContent = fs.readFileSync(gatePath, "utf-8");
  const v2ExporterPath = path.resolve(process.cwd(), "src/utils/pdfV2Exporter.ts");
  const v2Content = fs.readFileSync(v2ExporterPath, "utf-8");

  assert(
    gateContent.includes("filter((s) => !s.closest('[data-measuring=\"true\"]')"),
    "Export Preflight Gate excludes temporary measuring sheets"
  );

  assert(
    v2Content.includes("formatBidiTextForVectorPdf") && v2Content.includes("ensureTrueTypeFonts"),
    "PDF V2 Exporter supports Arabic Bidi shaping and crisp TrueType fonts"
  );

  // Test 3: Print preview modal handles printable A4 sheet without toolbar or hidden buttons
  const modalPath = path.resolve(process.cwd(), "src/components/PrintPreviewModal.tsx");
  const modalContent = fs.readFileSync(modalPath, "utf-8");

  assert(
    modalContent.includes(".print-modal-toolbar") && modalContent.includes(".no-print"),
    "PrintPreviewModal hides toolbars and interactive elements during print"
  );

  console.log(`=== SUMMARY: ${passedTests}/${totalTests} TESTS PASSED ===`);
  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTests();
