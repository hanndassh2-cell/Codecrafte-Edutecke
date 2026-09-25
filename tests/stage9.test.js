// tests/stage9.test.js
// Stage 9 Verification Suite: Export/Import, Signature Validation, and Safe Restore

const localStorageStore = {};
global.localStorage = {
  getItem: (key) => localStorageStore[key] || null,
  setItem: (key, val) => { localStorageStore[key] = String(val); },
  removeItem: (key) => { delete localStorageStore[key]; },
  clear: () => { Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]); },
  key: (index) => Object.keys(localStorageStore)[index],
  get length() { return Object.keys(localStorageStore).length; }
};

global.window = {
  dispatchEvent: () => {},
  CustomEvent: class CustomEvent {}
};
console.debug = () => {};

console.log("=== STARTING STAGE 9 VERIFICATION SUITE ===");

async function runTests() {
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

  const { storage, setStoredData, getStoredData } = await import("../src/services/storage.ts");

  // TEST 1: Export produces JSON with checksum, count and V3 format
  setStoredData("edutech_questions_v1", [{ id: "q1", text: "Question 1" }]);
  setStoredData("edutech_exams_v1", [{ id: "e1" }, { id: "e2" }]);
  setStoredData("session_token", "secret-token");
  setStoredData("open_ai_api_key", "sk-12345");

  const exportedStr = storage.exportFullDatabaseJson();
  const exported = JSON.parse(exportedStr);

  assert(exported.formatVersion === 3, "Export format is v3.");
  assert(exported.counts.questions === 1, "Export correctly counts questions.");
  assert(exported.counts.exams === 2, "Export correctly counts exams.");
  assert(typeof exported.signature === "string", "Export includes a valid signature.");
  
  const exportedData = exported.data;
  assert(exportedData.session_token === undefined, "Session keys are successfully excluded from export.");
  assert(exportedData.open_ai_api_key === undefined, "API keys are successfully excluded from export.");

  // TEST 2: Import verifies valid backup and correctly restores
  global.localStorage.clear(); // Empty DB
  const importResult = storage.importDatabaseJson(exportedStr);
  assert(importResult === true, "Import successful for valid backup.");
  assert(getStoredData("edutech_questions_v1", []).length === 1, "Questions successfully restored.");
  assert(getStoredData("edutech_exams_v1", []).length === 2, "Exams successfully restored.");

  // TEST 3: Corrupted JSON throws error
  const tamperedExport = { ...exported };
  tamperedExport.data["edutech_questions_v1"] = [{ id: "q_hacked" }];
  
  let threwError = false;
  try {
    storage.importDatabaseJson(JSON.stringify(tamperedExport));
  } catch(e) {
    threwError = true;
    assert(e.message.includes("بصمة التحقق"), "Tampered file throws a signature mismatch error.");
  }
  assert(threwError, "Corrupted import was rejected.");

  // TEST 4: Import ensures atomicity and fallback on partial failure
  const originalSetItem = global.localStorage.setItem;
  
  let failedOnce = false;
  global.localStorage.setItem = (key, val) => {
    if (key === "edutech_exams_v1" && !failedOnce) {
       failedOnce = true;
       throw new Error("Simulated storage write error.");
    }
    originalSetItem(key, val);
  };

  let threwAtomicError = false;
  try {
    storage.importDatabaseJson(exportedStr);
  } catch(e) {
    threwAtomicError = true;
    assert(e.message.includes("فشل الاستيراد وتم التراجع بالكامل"), "Throws comprehensive rollback error.");
  }
  assert(threwAtomicError, "Import failed on purpose when writing exams.");
  
  // Verify that it actually fell back to previous state (Rescue state)
  // Let's modify DB before running this failing import to prove it reverts to the BEFORE state.
  global.localStorage.setItem = originalSetItem;
  
  // Setup Rescue State tests
  global.localStorage.clear();
  setStoredData("edutech_questions_v1", [{ id: "rescue_q" }]); // State before import
  
  failedOnce = false;
  global.localStorage.setItem = (key, val) => {
    if (key === "edutech_exams_v1" && !failedOnce) {
       failedOnce = true;
       throw new Error("Simulated write failure");
    }
    originalSetItem(key, val);
  };
  
  try {
     storage.importDatabaseJson(exportedStr);
  } catch(e) {}
  
  global.localStorage.setItem = originalSetItem; // Restore

  const questionsAfterRollback = getStoredData("edutech_questions_v1", []);
  assert(questionsAfterRollback.length === 1 && questionsAfterRollback[0].id === "rescue_q", "DB atomic rollback completely reverted to rescue point without any partial writes.");

  console.log(`\n=== STAGE 9 VERIFICATION RESULTS: ${passedTests}/${totalTests} PASSED ===`);
}

runTests();
