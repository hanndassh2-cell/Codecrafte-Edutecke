// tests/stage6.test.js
// Stage 6 Verification Suite: Ensure hard deletion is strictly forbidden for linked questions,
// and that archiving centrally preserves data and updates status.

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

console.log("=== STARTING STAGE 6 VERIFICATION SUITE ===");

const initialQuestions = [
  {
    id: "q_linked_1",
    text: "سؤال مرتبط بدرس",
    answer: "إجابة 1",
    lessonId: "lesson_1",
    status: "active",
    type: "mcq",
    createdAt: "2026-08-01T00:00:00Z",
    difficulty: "easy",
    importance: 3,
    futureProbability: 50,
    finalWeightScore: 50
  },
  {
    id: "q_unlinked_1",
    text: "سؤال غير مرتبط",
    answer: "إجابة 2",
    status: "active",
    type: "mcq",
    createdAt: "2026-08-02T00:00:00Z",
    difficulty: "medium",
    importance: 2,
    futureProbability: 40,
    finalWeightScore: 40
  }
];

const mockLessons = [
  {
    id: "lesson_1",
    title: "الدرس الأول",
    questionIds: ["q_linked_1"]
  }
];

localStorage.setItem("edutech_questions_v1", JSON.stringify(initialQuestions));
localStorage.setItem("edutech_lessons_v1", JSON.stringify(mockLessons));

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

  const { storage } = await import("../src/services/storage.ts");

  // TEST 1: Direct deletion attempt of a linked question MUST FAIL
  const delRes1 = storage.deleteQuestion("q_linked_1");
  assert(delRes1.success === false, "Delete linked question returns success: false");
  assert(delRes1.usage.inUse === true, "Usage reports question is in use");

  let qInDb = storage.getQuestions().find(q => q.id === "q_linked_1");
  assert(qInDb !== undefined, "Linked question remains in the database");

  // TEST 2: Central Archiving MUST update status, isArchived, archivedAt, and PRESERVE data
  const archRes = storage.archiveQuestion("q_linked_1");
  assert(archRes === true, "Archive question returned true");

  qInDb = storage.getQuestions().find(q => q.id === "q_linked_1");
  assert(qInDb.status === "archived", "Question status changed to archived");
  assert(qInDb.isArchived === true, "Question isArchived is true");
  assert(qInDb.archivedAt !== undefined, "Question archivedAt is populated");
  assert(qInDb.answer === "إجابة 1", "Question answer is preserved");
  assert(qInDb.lessonId === "lesson_1", "Question lessonId is preserved");

  // TEST 3: Unlinked question CAN be deleted
  const delRes2 = storage.deleteQuestion("q_unlinked_1");
  assert(delRes2.success === true, "Unlinked question deletion does not block");

  // Restore linked question
  storage.batchRestoreQuestions(["q_linked_1"]);
  qInDb = storage.getQuestions().find(q => q.id === "q_linked_1");
  assert(qInDb.status === "active", "Question restored successfully");
  assert(qInDb.isArchived === false, "isArchived set to false on restore");
  assert(qInDb.archivedAt === undefined, "archivedAt cleared on restore");

  console.log(`\n=== STAGE 6 VERIFICATION RESULTS: ${passedTests}/${totalTests} PASSED ===`);
}

runTests();
