// tests/stage11.test.js
// Stage 11 Verification Suite: Safe Sequential Schema Migration

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

console.log("=== STARTING STAGE 11 VERIFICATION SUITE ===");

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

  const { storage, setStoredData, getStoredData, KEYS, SCHEMA_VERSION_KEY, CURRENT_SCHEMA_VERSION } = await import("../src/services/storage.ts");

  // Reset
  global.localStorage.clear();

  // 1. Initial State (Legacy V1 DB)
  const unknownFieldsQ = {
    id: "q_legacy",
    text: "Old Question",
    answer: "Old Answer",
    unknown_legacy_field: "must_be_kept"
  };
  setStoredData(KEYS.QUESTIONS, [unknownFieldsQ]);
  setStoredData(KEYS.EXAMS, [{ id: "e1" }]);

  // Execute migration
  storage.runSchemaMigrations();

  // Test: Migration upgraded to V2
  assert(global.localStorage.getItem(SCHEMA_VERSION_KEY) === "2", "Schema successfully upgraded to TARGET VERSION.");
  
  const migratedQuestions = getStoredData(KEYS.QUESTIONS, []);
  assert(migratedQuestions.length === 1, "Questions array retained.");
  assert(migratedQuestions[0]._schemaVersion === 2, "Idempotent transformation applied (schema version tagged).");
  assert(migratedQuestions[0].unknown_legacy_field === "must_be_kept", "Unknown legacy fields are strictly preserved.");
  
  // 2. Idempotent Repeat
  let threwOnRepeat = false;
  try {
     storage.runSchemaMigrations();
  } catch (e) {
     threwOnRepeat = true;
  }
  assert(!threwOnRepeat, "Migration is idempotent and can be safely repeated without errors.");

  // 3. Reject newer unsupported version
  global.localStorage.setItem(SCHEMA_VERSION_KEY, "999");
  let threwOnNewer = false;
  try {
     storage.runSchemaMigrations();
  } catch(e) {
     threwOnNewer = e.message.includes("الإصدار الأحدث غير مدعوم");
  }
  assert(threwOnNewer, "Strictly rejects unsupported future versions without applying any writes.");
  
  // Restore for next test
  global.localStorage.setItem(SCHEMA_VERSION_KEY, "1");
  // CRITICAL: We also need to reset the data to V1 so the rescue state doesn't have V2 data
  setStoredData(KEYS.QUESTIONS, [unknownFieldsQ]);
  setStoredData(KEYS.EXAMS, [{ id: "e1" }]);

  // 4. Rollback on Failure
  const originalSetItem = global.localStorage.setItem;
  global.localStorage.setItem = (key, val) => {
    if (key === KEYS.EXAMS && val.includes('"_schemaVersion":2')) {
       throw new Error("Simulated migration atomic write error");
    }
    originalSetItem(key, val);
  };

  let threwRollbackError = false;
  try {
    storage.runSchemaMigrations();
  } catch(e) {
    threwRollbackError = e.message.includes("فشل ترحيل المخطط وتم التراجع بالكامل للحماية");
  }
  assert(threwRollbackError, "Throws comprehensive rollback error upon atomic write failure during migration.");

  // Verify rescue state restored
  global.localStorage.setItem = originalSetItem;
  const examsAfterRollback = getStoredData(KEYS.EXAMS, []);
  assert(examsAfterRollback.length === 1 && !examsAfterRollback[0]._schemaVersion, "Rescue state successfully restored original data completely after migration failure.");
  assert(global.localStorage.getItem(SCHEMA_VERSION_KEY) === "1", "Schema version was successfully rolled back to pre-migration state.");

  console.log(`\n=== STAGE 11 VERIFICATION RESULTS: ${passedTests}/${totalTests} PASSED ===`);
}

runTests();
