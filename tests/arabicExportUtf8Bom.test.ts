// tests/arabicExportUtf8Bom.test.js
// Verification suite for Arabic text normalization, UTF-8 BOM Blob export, and Pre-download Preview

import {
  normalizeArabicText,
  sanitizeDataForExport,
  createExportBlobWithBom,
  inspectExportPayload,
} from "../src/utils/arabicExportUtils";

console.log("=== STARTING ARABIC EXPORT & UTF-8 BOM INTEGRITY SUITE ===");

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
  } else {
    console.error(`[FAIL] ${message}`);
    process.exit(1);
  }
}

// 1. Test BiDi override character stripping
const bidiText = "مادة: \u202Eالرياضيات\u202C - \u202Dالوحدة الأولى\u202C";
const cleanedBidi = normalizeArabicText(bidiText);
assert(!/[\u202A-\u202E\u2066-\u2069]/.test(cleanedBidi), "Stripped all rogue BiDi control characters");
assert(cleanedBidi.includes("الرياضيات"), "Contains clean word 'الرياضيات'");
assert(cleanedBidi.includes("الوحدة الأولى"), "Contains clean phrase 'الوحدة الأولى'");

// 2. Test Arabic Presentation Forms normalization to canonical Arabic range (0600-06FF)
// "ﺍﻟﺮﻳﺎﺿﻴﺎﺕ" with presentation forms FE8D FEDF FEAE FEF3 FE8E FEBF FEF4 FE8E FE95
const presentationText = "\uFE8D\uFEDF\uFEAE\uFEF3\uFE8E\uFEBF\uFEF4\uFE8E\uFE95";
const canonicalArabic = normalizeArabicText(presentationText);
assert(canonicalArabic === "الرياضيات", "Normalized Arabic presentation glyphs to canonical 'الرياضيات'");
assert(canonicalArabic.charCodeAt(0) === 0x0627, "Alef is standard Unicode 0x0627");

// 3. Test deep recursive sanitization
const payload = {
  subject: "\uFE8D\uFEDF\uFEAE\uFEF3\uFE8E\uFEBF\uFEF4\uFE8E\uFE95",
  units: [
    {
      title: "ةدحولا لوألا",
      lessons: [
        { name: "فوفصملا \u202Eتلايوحتلا\u202C" }
      ]
    }
  ]
};

const sanitized = sanitizeDataForExport(payload);
assert(sanitized.subject === "الرياضيات", "Deep sanitization normalized nested subject name");
assert(sanitized.units[0].title === "الوحدة الأول", "Deep sanitization repaired reversed unit title");
assert(!sanitized.units[0].lessons[0].name.includes("\u202E"), "Deep sanitization stripped BiDi overrides in lessons");

// 4. Test UTF-8 BOM Blob generation
const jsonString = JSON.stringify({ name: "الرياضيات والتحويلات السطرية" });
const blob = createExportBlobWithBom(jsonString);

assert(blob instanceof Blob, "Generated Blob instance");
assert(blob.type === "application/json;charset=utf-8;", "Blob type specifies application/json;charset=utf-8;");

// Read blob binary buffer to verify physical UTF-8 BOM (0xEF, 0xBB, 0xBF)
const arrayBuffer = await blob.arrayBuffer();
const bytes = new Uint8Array(arrayBuffer);
assert(bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf, "First 3 bytes of exported payload are physical UTF-8 BOM (0xEF, 0xBB, 0xBF)");

const blobText = await blob.text();
assert(blobText === jsonString, "Decoded text payload matches original JSON exactly");

// 5. Test inspection helper
const dummyDump = {
  formatVersion: 3,
  signature: "test-hash-1234",
  subjects: [{ name: "الرياضيات" }, { name: "الفيزياء" }],
  units: [{ name: "الوحدة الأولى: المصفوفات" }],
  questions: [{ text: "أوجد ناتج التحويل السطري البسيط التالي..." }],
  exams: [{ title: "اختبار تجريبي" }],
};
const inspection = inspectExportPayload(dummyDump, JSON.stringify(dummyDump));
assert(inspection.totalEntities.subjects === 2, "Inspection counts subjects accurately");
assert(inspection.totalEntities.units === 1, "Inspection counts units accurately");
assert(inspection.totalEntities.questions === 1, "Inspection counts questions accurately");
assert(inspection.totalEntities.exams === 1, "Inspection counts exams accurately");
assert(inspection.sampleArabicTexts.length >= 4, "Extracted Arabic text preview samples");
assert(inspection.status === "verified", "Arabic integrity status is verified");
assert(inspection.hasBom === true, "BOM flag is true");

console.log("=== ALL ARABIC EXPORT & UTF-8 BOM TESTS PASSED SUCCESSFULLY ===");
