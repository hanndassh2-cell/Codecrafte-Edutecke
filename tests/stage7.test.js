// tests/stage7.test.js
// Stage 7 Verification Suite: Ensure safe healing creates no dummy data, 
// deletes no questions, and effectively removes only broken references.

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

console.log("=== STARTING STAGE 7 VERIFICATION SUITE ===");

const initialQuestions = [
  { id: "q_real_1", text: "Real Question 1" },
  { id: "q_real_2", text: "Real Question 2" }
];

const mockLessons = [
  {
    id: "lesson_1",
    title: "Lesson with broken reference",
    questionIds: ["q_real_1", "q_fake_1", "q_real_2"]
  }
];

const mockExams = [
  {
    id: "exam_1",
    versions: [
      {
        questions: [{ questionId: "q_real_1" }, { questionId: "q_fake_2" }]
      }
    ]
  }
];

localStorage.setItem("edutech_questions_v1", JSON.stringify(initialQuestions));
localStorage.setItem("edutech_lessons_v1", JSON.stringify(mockLessons));
localStorage.setItem("edutech_exams_v1", JSON.stringify(mockExams));

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
  const { storage } = await import("../src/services/storage.ts");

  // TEST 1: Initial state has broken references
  const reportBefore = centralGovernance.validateReferentialIntegrity();
  assert(reportBefore.brokenReferencesCount === 2, "Report correctly identifies 2 broken references initially.");
  assert(reportBefore.totalCanonicalQuestions === 2, "Report confirms exactly 2 original questions exist.");

  // TEST 2: Safe heal cleans references
  centralGovernance.safeHealDatabase();
  const reportAfter = centralGovernance.validateReferentialIntegrity();
  
  assert(reportAfter.brokenReferencesCount === 0, "Safe Heal successfully cleared all broken references (0 left).");
  
  // TEST 3: Safe heal DID NOT modify, create, or delete questions
  const qAfter = storage.getQuestions();
  assert(qAfter.length === 2, "Question Bank length remains strictly 2 (No fake questions generated).");
  assert(qAfter[0].id === "q_real_1" && qAfter[1].id === "q_real_2", "Original questions IDs are perfectly preserved.");
  
  // TEST 4: Safe heal created a snapshot
  const { getStoredData } = await import("../src/services/storage.ts");
  const snapshots = getStoredData("edutech_governance_snapshots_v1", []);
  assert(snapshots.length > 0 && snapshots[0].actionName.includes("الإصلاح الآمن"), "A snapshot was created before healing.");

  console.log(`\n=== STAGE 7 VERIFICATION RESULTS: ${passedTests}/${totalTests} PASSED ===`);
}

runTests();
