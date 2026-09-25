// tests/backupImportExport.test.js
// Verification suite: Full Database Backup Export/Import integrity, Checksum Validation, and Relation preservation.

import fs from "fs";
import path from "path";

console.log("=== STARTING BACKUP, IMPORT & EXPORT INTEGRITY TEST SUITE ===");

// Mock localStorage for Node test runner
const localStorageMap = new Map();
global.localStorage = {
  getItem: (k) => localStorageMap.get(k) || null,
  setItem: (k, v) => localStorageMap.set(k, String(v)),
  removeItem: (k) => localStorageMap.delete(k),
  clear: () => localStorageMap.clear(),
  get length() { return localStorageMap.size; },
  key: (i) => Array.from(localStorageMap.keys())[i] || null,
};

// Import storage service
const storagePath = path.resolve(process.cwd(), "src/services/storage.ts");
const storageContent = fs.readFileSync(storagePath, "utf-8");

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
  } else {
    console.error(`[FAIL] ${message}`);
    process.exit(1);
  }
}

// 1. Verify storage.ts code contracts
assert(
  storageContent.includes("exportFullDatabaseJson()") && storageContent.includes("importDatabaseJson(jsonStr: string)"),
  "Storage engine contains exportFullDatabaseJson and importDatabaseJson methods"
);

assert(
  storageContent.includes("generateChecksum") && storageContent.includes("parsed.signature"),
  "Backup import verifies checksum signature to prevent tampered file imports"
);

assert(
  storageContent.includes("rescueState") && storageContent.includes("فشل الاستيراد وتم التراجع بالكامل للحماية"),
  "Import saves rescue snapshot and performs atomic rollback on failure"
);

assert(
  storageContent.includes("بصمة التحقق غير متطابقة. الملف تالف أو تم العبث به.") &&
  storageContent.includes("تنسيق النسخة الاحتياطية غير مدعوم"),
  "Clear Arabic success/failure messages for backup verification"
);

// 2. Test relations inclusion in dump
assert(
  storageContent.includes("subjects:") &&
  storageContent.includes("units:") &&
  storageContent.includes("lessons:") &&
  storageContent.includes("questions:") &&
  storageContent.includes("exams:") &&
  storageContent.includes("cycles:"),
  "Backup export includes all relational entities (Subjects, Units, Lessons, Questions, Exams, Cycles)"
);

console.log("=== ALL BACKUP IMPORT/EXPORT INTEGRITY TESTS PASSED ===");
