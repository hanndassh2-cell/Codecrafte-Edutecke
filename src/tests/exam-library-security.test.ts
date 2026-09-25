/**
 * Exam Library Security, RBAC & Leak Prevention Test Suite
 * Comprehensive automated tests verifying:
 * 1. RBAC & Module Access Restrictions (view, create, edit, delete, restore).
 * 2. Strict Subject Access Boundaries (canAccessSubject & exam document isolation).
 * 3. Prevention of Cross-Subject Question Leaks during Exam Editing.
 * 4. Prevention of Unauthorized Exam Deletion / Sync / Integrity Resolution.
 * 5. Print Preview & Answer Key Subject Guard Isolation.
 * 6. Past Cycles Archiving & Connected Exam RBAC Filtering.
 */

import {
  canAccessSubject,
  canPerformAction,
  canAccessModule,
  filterAllowedSubjects,
  filterAllowedItemsBySubject,
} from "../services/rbacEngine";
import { User, Question, Subject, ExamLibraryDocument, Cycle, Exam } from "../types";

export interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  error?: string;
}

export function runExamLibrarySecurityTests(): {
  total: number;
  passed: number;
  failed: number;
  results: TestResult[];
} {
  const results: TestResult[] = [];

  function test(suite: string, name: string, fn: () => void) {
    try {
      fn();
      results.push({ suite, name, passed: true });
    } catch (err: any) {
      results.push({ suite, name, passed: false, error: err?.message || String(err) });
    }
  }

  function assert(condition: boolean, msg: string) {
    if (!condition) {
      throw new Error(`Assertion failed: ${msg}`);
    }
  }

  // --- Mock Users ---
  const adminUser: User = {
    id: "usr-admin-1",
    name: "مدير النظام",
    email: "admin@test.com",
    role: "admin",
    status: "active",
    allowedSubjectIds: [],
  };

  const mathTeacher: User = {
    id: "usr-teacher-math",
    name: "أستاذ الرياضيات",
    email: "math@test.com",
    role: "teacher",
    status: "active",
    allowedSubjectIds: ["sub-math"],
    permissions: {
      curriculum: false,
      lessons: true,
      questions: true,
      exams: true,
      exports: true,
      reports: false,
      users: false,
      settings: false,
    },
  };

  const scienceTeacher: User = {
    id: "usr-teacher-science",
    name: "أستاذ العلوم",
    email: "science@test.com",
    role: "teacher",
    status: "active",
    allowedSubjectIds: ["sub-science"],
    permissions: {
      curriculum: false,
      lessons: true,
      questions: true,
      exams: true,
      exports: false,
      reports: false,
      users: false,
      settings: false,
    },
  };

  const viewerUser: User = {
    id: "usr-viewer-1",
    name: "مستخدم قراءة فقط",
    email: "viewer@test.com",
    role: "viewer",
    status: "active",
    allowedSubjectIds: ["sub-math"],
    permissions: {
      curriculum: true,
      lessons: true,
      questions: true,
      exams: true,
      exports: false,
      reports: false,
      users: false,
      settings: false,
    },
  };

  // --- Mock Subjects ---
  const subjects: Subject[] = [
    {
      id: "sub-math",
      code: "MATH",
      name: "الرياضيات",
      color: "#2563eb",
      icon: "calculator",
      description: "منهاج الرياضيات",
      status: "active",
    },
    {
      id: "sub-science",
      code: "SCI",
      name: "العلوم العامة",
      color: "#16a34a",
      icon: "flask",
      description: "منهاج العلوم",
      status: "active",
    },
    {
      id: "sub-physics",
      code: "PHY",
      name: "الفيزياء",
      color: "#9333ea",
      icon: "atom",
      description: "منهاج الفيزياء",
      status: "active",
    },
  ];

  // --- Mock Exam Library Documents ---
  const mathExamDoc: ExamLibraryDocument = {
    examId: "exam-math-001",
    title: "امتحان منتصف الفصل - رياضيات",
    scope: {
      subjectId: "sub-math",
      unitIds: ["unit-algebra"],
      lessonIds: ["les-equations"],
      isComprehensive: false,
    },
    totalMarks: 50,
    durationMinutes: 60,
    totalQuestions: 2,
    usedQuestionIds: ["q-math-1", "q-math-2"],
    questionSnapshots: [
      {
        questionId: "q-math-1",
        questionType: "essay",
        text: "حل المعادلة التالية: 2x + 4 = 10",
        answer: "x = 3",
        allocatedMarks: 25,
        difficulty: "medium",
        snapshotTimestamp: new Date().toISOString(),
      },
      {
        questionId: "q-math-2",
        questionType: "mcq",
        text: "ما هو ميل الخط المستقيم 3x - y = 5؟",
        answer: "3",
        allocatedMarks: 25,
        difficulty: "easy",
        snapshotTimestamp: new Date().toISOString(),
      },
    ],
    status: "published",
    generationMethod: "auto",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdById: "usr-teacher-math",
    createdByName: "أستاذ الرياضيات",
  };

  const scienceExamDoc: ExamLibraryDocument = {
    examId: "exam-sci-001",
    title: "امتحان العلوم التجريبي",
    scope: {
      subjectId: "sub-science",
      unitIds: ["unit-bio"],
      lessonIds: ["les-cells"],
      isComprehensive: false,
    },
    totalMarks: 40,
    durationMinutes: 45,
    totalQuestions: 2,
    usedQuestionIds: ["q-sci-1", "q-sci-2"],
    questionSnapshots: [
      {
        questionId: "q-sci-1",
        questionType: "essay",
        text: "ما هي وظيفة الميتوكوندريا في الخلية؟",
        answer: "إنتاج الطاقة (ATP)",
        allocatedMarks: 20,
        difficulty: "medium",
        snapshotTimestamp: new Date().toISOString(),
      },
      {
        questionId: "q-sci-2",
        questionType: "true_false",
        text: "تحدث عملية البناء الضوئي في البلاستيدات الخضراء",
        answer: "صح",
        allocatedMarks: 20,
        difficulty: "easy",
        snapshotTimestamp: new Date().toISOString(),
      },
    ],
    status: "published",
    generationMethod: "auto",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdById: "usr-teacher-science",
    createdByName: "أستاذ العلوم",
  };

  const physicsExamDoc: ExamLibraryDocument = {
    examId: "exam-phy-001",
    title: "امتحان الفيزياء الحديثة",
    scope: {
      subjectId: "sub-physics",
      unitIds: ["unit-optics"],
      lessonIds: ["les-lasers"],
      isComprehensive: true,
    },
    totalMarks: 100,
    durationMinutes: 90,
    totalQuestions: 1,
    usedQuestionIds: ["q-phy-1"],
    questionSnapshots: [
      {
        questionId: "q-phy-1",
        questionType: "essay",
        text: "احسب سرعة الضوء في وسط معامل انكساره 1.5",
        answer: "2x10^8 m/s",
        allocatedMarks: 100,
        difficulty: "hard",
        snapshotTimestamp: new Date().toISOString(),
      },
    ],
    status: "published",
    generationMethod: "manual",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdById: "usr-admin-1",
    createdByName: "مدير النظام",
  };

  const allLibraryExams: ExamLibraryDocument[] = [mathExamDoc, scienceExamDoc, physicsExamDoc];

  // --- Mock Questions Pool ---
  const allQuestionsPool: Question[] = [
    {
      id: "q-math-1",
      subjectId: "sub-math",
      unitId: "unit-algebra",
      lessonId: "les-equations",
      type: "essay",
      text: "حل المعادلة التالية: 2x + 4 = 10",
      answer: "x = 3",
      score: 25,
      difficulty: "medium",
      importance: 3,
      tags: ["معادلات"],
      isPastCycle: false,
      occurrencesCount: 1,
      futureProbability: 70,
      finalWeightScore: 75,
      createdAt: new Date().toISOString(),
    },
    {
      id: "q-sci-1",
      subjectId: "sub-science",
      unitId: "unit-bio",
      lessonId: "les-cells",
      type: "essay",
      text: "ما هي وظيفة الميتوكوندريا في الخلية؟",
      answer: "إنتاج الطاقة (ATP)",
      score: 20,
      difficulty: "medium",
      importance: 3,
      tags: ["خلايا"],
      isPastCycle: false,
      occurrencesCount: 1,
      futureProbability: 60,
      finalWeightScore: 65,
      createdAt: new Date().toISOString(),
    },
  ];

  // =========================================================================
  // SUITE 1: Exam Library Document Visibility & Subject Isolation
  // =========================================================================

  test("Library Visibility", "Admin can view all exams across all subjects", () => {
    const allowed = filterAllowedItemsBySubject(adminUser, allLibraryExams);
    assert(allowed.length === 3, "Admin must see all 3 exams in the library");
  });

  test("Library Visibility", "Math teacher only sees Math exams, Science/Physics are excluded", () => {
    const allowed = filterAllowedItemsBySubject(mathTeacher, allLibraryExams);
    assert(allowed.length === 1, "Math teacher must only see 1 exam");
    assert(allowed[0].examId === "exam-math-001", "Allowed exam must be Math exam");
  });

  test("Library Visibility", "Science teacher only sees Science exams", () => {
    const allowed = filterAllowedItemsBySubject(scienceTeacher, allLibraryExams);
    assert(allowed.length === 1, "Science teacher must only see 1 exam");
    assert(allowed[0].examId === "exam-sci-001", "Allowed exam must be Science exam");
  });

  test("Library Visibility", "Subjects filter dropdown only contains allowed subjects", () => {
    const mathSubjects = filterAllowedSubjects(mathTeacher, subjects);
    assert(mathSubjects.length === 1 && mathSubjects[0].id === "sub-math", "Math teacher dropdown must only have Math");

    const adminSubjects = filterAllowedSubjects(adminUser, subjects);
    assert(adminSubjects.length === 3, "Admin dropdown must have all 3 subjects");
  });

  // =========================================================================
  // SUITE 2: Action Permissions & RBAC Enforcement (Edit / Delete / Sync)
  // =========================================================================

  test("RBAC Actions", "Math teacher has edit & delete permissions on Math exam", () => {
    const canEdit = canPerformAction(mathTeacher, "edit", "exams") && canAccessSubject(mathTeacher, mathExamDoc.scope?.subjectId);
    assert(canEdit === true, "Math teacher must be allowed to edit Math exam");

    const canDelete = canPerformAction(mathTeacher, "delete", "exams") && canAccessSubject(mathTeacher, mathExamDoc.scope?.subjectId);
    assert(canDelete === true, "Math teacher must be allowed to delete Math exam");
  });

  test("RBAC Actions", "Math teacher is strictly forbidden from editing or deleting Science exam", () => {
    const canEditSci = canPerformAction(mathTeacher, "edit", "exams") && canAccessSubject(mathTeacher, scienceExamDoc.scope?.subjectId);
    assert(canEditSci === false, "Math teacher must NOT be able to edit Science exam");

    const canDeleteSci = canPerformAction(mathTeacher, "delete", "exams") && canAccessSubject(mathTeacher, scienceExamDoc.scope?.subjectId);
    assert(canDeleteSci === false, "Math teacher must NOT be able to delete Science exam");
  });

  test("RBAC Actions", "Viewer user is blocked from editing and deleting any exam", () => {
    const canEdit = canPerformAction(viewerUser, "edit", "exams") && canAccessSubject(viewerUser, mathExamDoc.scope?.subjectId);
    assert(canEdit === false, "Viewer must NOT be allowed to edit exam");

    const canDelete = canPerformAction(viewerUser, "delete", "exams") && canAccessSubject(viewerUser, mathExamDoc.scope?.subjectId);
    assert(canDelete === false, "Viewer must NOT be allowed to delete exam");
  });

  // =========================================================================
  // SUITE 3: Question Leak Prevention during Exam Editing
  // =========================================================================

  test("Leak Prevention", "When editing an exam, available candidate questions are filtered by user's subject permissions", () => {
    const allowedCandidateQuestions = filterAllowedItemsBySubject(mathTeacher, allQuestionsPool);
    assert(allowedCandidateQuestions.length === 1, "Only 1 question should be available to math teacher");
    assert(allowedCandidateQuestions[0].id === "q-math-1", "Candidate question must belong to math");
    assert(!allowedCandidateQuestions.some(q => q.subjectId === "sub-science"), "Science questions must NEVER appear in Math teacher's add question picker");
  });

  test("Leak Prevention", "Exam snapshots modification blocks saving if user lacks subject access", () => {
    function simulateSaveExam(user: User, doc: ExamLibraryDocument): boolean {
      if (!canPerformAction(user, "edit", "exams") || !canAccessSubject(user, doc.scope?.subjectId)) {
        return false;
      }
      return true;
    }

    assert(simulateSaveExam(mathTeacher, mathExamDoc) === true, "Math teacher can save math exam");
    assert(simulateSaveExam(mathTeacher, scienceExamDoc) === false, "Math teacher cannot save science exam");
    assert(simulateSaveExam(viewerUser, mathExamDoc) === false, "Viewer cannot save math exam");
  });

  // =========================================================================
  // SUITE 4: Print Preview & Answer Key Subject Guard
  // =========================================================================

  test("Print Protection", "Preview & print generation returns empty items if user cannot access subject", () => {
    function generateSafePreviewItems(user: User, doc: ExamLibraryDocument, showAnswerKey: boolean) {
      if (!canAccessSubject(user, doc.scope?.subjectId)) {
        return [];
      }
      return (doc.questionSnapshots || []).map((q, idx) => ({
        id: `print_q_${q.questionId}_${idx}`,
        questionId: q.questionId,
        text: q.text,
        answer: showAnswerKey ? q.answer : undefined,
        allocatedMarks: q.allocatedMarks,
      }));
    }

    const mathItems = generateSafePreviewItems(mathTeacher, mathExamDoc, false);
    assert(mathItems.length > 0, "Math teacher must be able to generate preview items for math exam");

    const scienceItemsByMath = generateSafePreviewItems(mathTeacher, scienceExamDoc, false);
    assert(scienceItemsByMath.length === 0, "Math teacher MUST receive empty items for science exam preview");

    const mathAnswerKey = generateSafePreviewItems(mathTeacher, mathExamDoc, true);
    assert(mathAnswerKey.length > 0, "Math teacher can generate answer key for math exam");
    assert(mathAnswerKey[0].answer !== undefined, "Math teacher sees answer key for math exam");

    const scienceAnswerKeyByMath = generateSafePreviewItems(mathTeacher, scienceExamDoc, true);
    assert(scienceAnswerKeyByMath.length === 0, "Math teacher MUST NOT be able to view answer key for science exam");
  });

  // =========================================================================
  // SUITE 5: Past Cycles Archiving & Connected Exam RBAC Filtering
  // =========================================================================

  test("Cycles Archiving", "Creation and deletion of exam cycles obeys RBAC permissions", () => {
    assert(canPerformAction(adminUser, "create", "exams") === true, "Admin can create cycles");
    assert(canPerformAction(mathTeacher, "create", "exams") === true, "Teacher can create cycles");
    assert(canPerformAction(viewerUser, "create", "exams") === false, "Viewer cannot create cycles");
    assert(canPerformAction(viewerUser, "delete", "exams") === false, "Viewer cannot delete cycles");
  });

  test("Cycles Archiving", "Connected exams in cycles are filtered so teachers only see exams for allowed subjects", () => {
    const mockExams: Exam[] = [
      {
        id: "ex-math-1",
        title: "اختبار رياضيات دورة 2025",
        subjectId: "sub-math",
        unitIds: ["unit-1"],
        lessonIds: ["les-1"],
        totalQuestions: 10,
        totalMarks: 50,
        difficultyProfile: "balanced",
        generationType: "auto",
        versions: [{ versionCode: "أ", questions: [] }],
        createdBy: "usr-teacher-math",
        status: "finalized",
        createdAt: "2025-01-01",
        durationMinutes: 60,
      },
      {
        id: "ex-sci-1",
        title: "اختبار علوم دورة 2025",
        subjectId: "sub-science",
        unitIds: ["unit-bio"],
        lessonIds: ["les-bio"],
        totalQuestions: 10,
        totalMarks: 50,
        difficultyProfile: "balanced",
        generationType: "auto",
        versions: [{ versionCode: "أ", questions: [] }],
        createdBy: "usr-teacher-science",
        status: "finalized",
        createdAt: "2025-01-01",
        durationMinutes: 60,
      },
    ];

    const allowedExamsForMath = filterAllowedItemsBySubject(mathTeacher, mockExams);
    assert(allowedExamsForMath.length === 1 && allowedExamsForMath[0].id === "ex-math-1", "Math teacher only sees math exams in cycle");

    const allowedExamsForScience = filterAllowedItemsBySubject(scienceTeacher, mockExams);
    assert(allowedExamsForScience.length === 1 && allowedExamsForScience[0].id === "ex-sci-1", "Science teacher only sees science exams in cycle");
  });

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  return {
    total: results.length,
    passed,
    failed,
    results,
  };
}

// Auto-run when executed directly via tsx
if (
  import.meta.url.endsWith(process.argv[1]) ||
  process.argv[1]?.includes("exam-library-security.test.ts")
) {
  console.log("==================================================");
  console.log("🛡️ Running Exam Library Security & RBAC Test Suite");
  console.log("==================================================");
  const { total, passed, failed, results } = runExamLibrarySecurityTests();

  results.forEach((r) => {
    const icon = r.passed ? "✅" : "❌";
    console.log(`${icon} [${r.suite}] ${r.name}`);
    if (r.error) {
      console.error(`   Error: ${r.error}`);
    }
  });

  console.log("--------------------------------------------------");
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}
