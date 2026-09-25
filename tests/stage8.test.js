// tests/stage8.test.js
// Stage 8 Verification Suite: Atomic Safe Restore, Backup Signature and Rescue Points

const localStorageStore = {};
global.localStorage = {
  getItem: (key) => localStorageStore[key] || null,
  setItem: (key, val) => { localStorageStore[key] = String(val); },
  removeItem: (key) => { delete localStorageStore[key]; },
  clear: () => { Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]); }
};

global.window = {
  dispatchEvent: () => {},
  CustomEvent: class CustomEvent {}
};
console.debug = () => {};

console.log("=== STARTING STAGE 8 VERIFICATION SUITE ===");

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

  const { centralGovernance } = await import("../src/services/centralGovernanceEngine.ts");
  const { storage, setStoredData, getStoredData } = await import("../src/services/storage.ts");

  // TEST 1: Backup creation includes signature and schema version
  const snapId1 = centralGovernance.createRollbackSnapshot("Test 1");
  const snapshots = centralGovernance.getSnapshots();
  const snap1 = snapshots.find(s => s.id === snapId1);
  assert(snap1 !== undefined, "Snapshot was created successfully.");
  assert(snap1.schemaVersion === 2, "Snapshot has schema version 2.");
  assert(typeof snap1.signature === "string", "Snapshot has a valid signature.");

  // TEST 2: Rollback works and verifies the signature
  const qBefore = getStoredData("edutech_questions_v1", []);
  setStoredData("edutech_questions_v1", [{ id: "q_tampered", text: "Fake" }]);
  const rollbackResult = centralGovernance.rollbackToSnapshot(snapId1);
  assert(rollbackResult === true, "Rollback to snapshot was successful.");
  const qAfterRollback = getStoredData("edutech_questions_v1", []);
  assert(qAfterRollback.length === qBefore.length, "Data was restored properly from snapshot.");

  // TEST 3: Tampered signature rejects rollback
  snap1.dataBackupJson = snap1.dataBackupJson.replace("}", ',"tampered":true}');
  setStoredData("edutech_governance_snapshots_v1", snapshots);
  
  let threwError = false;
  try {
    centralGovernance.rollbackToSnapshot(snapId1);
  } catch (e) {
    threwError = true;
    assert(e.message.includes("بصمة التحقق"), "Tampered snapshot throws a signature mismatch error.");
  }
  assert(threwError, "Rollback was correctly blocked due to invalid signature.");

  // TEST 4: executeTransaction blocks operation if createRollbackSnapshot fails
  // Force a failure in snapshot creation by mocking localStorage.setItem to throw only for snapshots
  const originalSetItem = global.localStorage.setItem;
  global.localStorage.setItem = (key, val) => {
    if (key === "edutech_governance_snapshots_v1") {
       throw new Error("Storage full limit reached");
    }
    originalSetItem(key, val);
  };

  let operationExecuted = false;
  const transactionRes = centralGovernance.executeTransaction("Failing Transaction", () => {
    operationExecuted = true;
    return true;
  });

  assert(transactionRes.success === false, "Transaction was aborted because snapshot creation failed.");
  assert(transactionRes.error.includes("لم يتم حفظ اللقطة"), "Returns the snapshot creation error.");
  assert(operationExecuted === false, "The dangerous operation was never executed.");

  // Restore setItem
  global.localStorage.setItem = originalSetItem;

  // TEST 5: Rescue Point is created before restore
  // Let's create a new clean snapshot
  const snapId2 = centralGovernance.createRollbackSnapshot("Test 2");
  centralGovernance.rollbackToSnapshot(snapId2);
  const updatedSnapshots = centralGovernance.getSnapshots();
  const rescueSnap = updatedSnapshots.find(s => s.actionName.includes("Rescue Point Before Restore"));
  assert(rescueSnap !== undefined, "Rescue point was automatically generated before restore.");

  console.log(`\n=== STAGE 8 VERIFICATION RESULTS: ${passedTests}/${totalTests} PASSED ===`);
}

runTests();
