// tests/stage10.test.js
// Stage 10 Verification Suite: Protect Reset and Empty Database operations

const localStorageStore = {};
global.localStorage = {
  getItem: (key) => localStorageStore[key] || null,
  setItem: (key, val) => { localStorageStore[key] = String(val); },
  removeItem: (key) => { delete localStorageStore[key]; },
  clear: () => { 
    throw new Error("localStorage.clear() is forbidden!");
  },
  key: (index) => Object.keys(localStorageStore)[index],
  get length() { return Object.keys(localStorageStore).length; }
};

global.window = {
  dispatchEvent: () => {},
  CustomEvent: class CustomEvent {}
};
console.debug = () => {};

console.log("=== STARTING STAGE 10 VERIFICATION SUITE ===");

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

  const { storage, setStoredData, getStoredData, KEYS } = await import("../src/services/storage.ts");

  // Setup initial mock data
  storage.getCurrentUser = () => ({ id: "u1", role: "admin", name: "Admin" });
  setStoredData(KEYS.QUESTIONS, [{ id: "q1" }]);
  setStoredData(KEYS.EXAMS, [{ id: "e1" }]);

  // TEST 1: Requires correct confirmation phrase
  let rejectedWithoutPhrase = false;
  try {
    storage.emptyDatabase("wrong phrase");
  } catch(e) {
    rejectedWithoutPhrase = e.message.includes("عبارة التأكيد غير صحيحة");
  }
  assert(rejectedWithoutPhrase, "emptyDatabase requires literal confirmation phrase.");

  let rejectedWithoutPhrase2 = false;
  try {
    storage.resetAllData("wrong phrase");
  } catch(e) {
    rejectedWithoutPhrase2 = e.message.includes("عبارة التأكيد غير صحيحة");
  }
  assert(rejectedWithoutPhrase2, "resetAllData requires literal confirmation phrase.");

  // TEST 2: Requires admin role
  storage.getCurrentUser = () => ({ id: "u2", role: "teacher", name: "Teacher" });
  let rejectedNonAdmin = false;
  try {
    storage.emptyDatabase("تأكيد إفراغ البيانات");
  } catch(e) {
    rejectedNonAdmin = e.message.includes("للمدير فقط");
  }
  assert(rejectedNonAdmin, "emptyDatabase requires admin role.");

  storage.getCurrentUser = () => ({ id: "u1", role: "admin", name: "Admin" });

  // TEST 3: emptyDatabase succeeds with phrase and admin, clears data
  storage.emptyDatabase("تأكيد إفراغ البيانات");
  assert(getStoredData(KEYS.QUESTIONS, []).length === 0, "emptyDatabase successfully cleared questions.");
  assert(getStoredData(KEYS.EXAMS, []).length === 0, "emptyDatabase successfully cleared exams.");

  // TEST 4: Atomic failure in resetAllData triggers rollback
  setStoredData(KEYS.QUESTIONS, [{ id: "q_before_reset" }]);
  
  const originalRemoveItem = global.localStorage.removeItem;
  let hasFailedRemove = false;
  global.localStorage.removeItem = (key) => {
    if (key === KEYS.QUESTIONS && !hasFailedRemove) {
       hasFailedRemove = true;
       throw new Error("Simulated delete failure");
    }
    originalRemoveItem(key);
  };

  let threwRollbackError = false;
  try {
    storage.resetAllData("تأكيد استعادة الافتراضي");
  } catch(e) {
    threwRollbackError = e.message.includes("فشل استعادة الافتراضي وتم التراجع بالكامل للحماية");
  }
  assert(threwRollbackError, "resetAllData rollback triggered on failure.");

  // Restore remove item
  global.localStorage.removeItem = originalRemoveItem;

  // Verify rescue state was restored
  const questionsAfterRollback = getStoredData(KEYS.QUESTIONS, []);
  assert(questionsAfterRollback.length === 1 && questionsAfterRollback[0].id === "q_before_reset", "Rescue state successfully restored original data after failed resetAllData.");

  // TEST 5: Atomic failure in emptyDatabase triggers rollback
  setStoredData(KEYS.EXAMS, [{ id: "e_before_empty" }]); // ENSURE IT IS NOT EMPTY BEFORE TEST
  const originalSetItem = global.localStorage.setItem;
  let hasFailedSet = false;
  global.localStorage.setItem = (key, val) => {
    if (key === KEYS.EXAMS && !hasFailedSet) {
       hasFailedSet = true;
       throw new Error("Simulated set failure");
    }
    originalSetItem(key, val);
  };

  let threwRollbackEmpty = false;
  try {
    storage.emptyDatabase("تأكيد إفراغ البيانات");
  } catch(e) {
    threwRollbackEmpty = e.message.includes("فشل إفراغ القاعدة وتم التراجع بالكامل للحماية");
  }
  assert(threwRollbackEmpty, "emptyDatabase rollback triggered on failure.");
  
  global.localStorage.setItem = originalSetItem;
  
  const questionsAfterRollback2 = getStoredData(KEYS.QUESTIONS, []);
  assert(questionsAfterRollback2.length === 1 && questionsAfterRollback2[0].id === "q_before_reset", "Rescue state successfully restored original data after failed emptyDatabase.");

  console.log(`\n=== STAGE 10 VERIFICATION RESULTS: ${passedTests}/${totalTests} PASSED ===`);
}

runTests();
