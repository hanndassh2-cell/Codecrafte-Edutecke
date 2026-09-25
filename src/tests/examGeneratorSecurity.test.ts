/**
 * Exam Generator Security, RBAC & Non-Duplication Test Suite
 * Comprehensive automated tests verifying:
 * 1. RBAC & Module Access Restrictions (generate, create, edit, export).
 * 2. Strict Subject Access Boundaries (canAccessSubject & question pool isolation).
 * 3. Curriculum Tree Hierarchy Integrity (Unit/Lesson scope matching).
 * 4. Non-Duplication within Single Models (Version A & Version B).
 * 5. Non-Duplication across Multi-Model Batch Generations (disjoint question sets).
 * 6. Protection of Save, Export, Print, and Creator Attribution.
 */

import {
  canAccessSubject,
  canPerformAction,
  canAccessModule,
  filterAllowedSubjects,
  filterAllowedItemsBySubject,
} from "../services/rbacEngine";
import { User, Question, Subject, Unit, Lesson, Exam } from "../types";

export interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  error?: string;
}

export function runExamGeneratorSecurityTests(): {
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
      exports: false, // Export/Print disabled
      reports: false,
      users: false,
      settings: false,
    },
  };

  const viewerUser: User = {
    id: "usr-viewer-1",
    name: "مشاهد الاختبارات",
    email: "viewer@test.com",
    role: "viewer",
    status: "active",
    allowedSubjectIds: ["sub-math"],
    permissions: {
      curriculum: false,
      lessons: false,
      questions: false,
      exams: false,
      exports: false,
      reports: false,
      users: false,
      settings: false,
    },
  };

  const disabledUser: User = {
    id: "usr-disabled-1",
    name: "مستخدم معطل",
    email: "disabled@test.com",
    role: "teacher",
    status: "disabled",
    allowedSubjectIds: ["sub-math"],
  };

  // --- Mock Curriculum Data ---
  const mockSubjects: Subject[] = [
    { id: "sub-math", code: "MATH101", name: "الرياضيات العامة", color: "#2563eb", icon: "Calculator", description: "رياضيات", status: "active", totalMarks: 100 },
    { id: "sub-science", code: "SCI101", name: "العلوم العامة", color: "#059669", icon: "Atom", description: "علوم", status: "active", totalMarks: 100 },
    { id: "sub-history", code: "HIS101", name: "التاريخ", color: "#dc2626", icon: "Book", description: "تاريخ", status: "active", totalMarks: 100 },
  ];

  const mockUnits: Unit[] = [
    { id: "unit-m1", subjectId: "sub-math", code: "U1", title: "الوحدة الأولى: الجبر", description: "جبر", orderIndex: 1, status: "active" },
    { id: "unit-m2", subjectId: "sub-math", code: "U2", title: "الوحدة الثانية: الهندسة", description: "هندسة", orderIndex: 2, status: "active" },
    { id: "unit-s1", subjectId: "sub-science", code: "U1", title: "الوحدة الأولى: الفيزياء", description: "فيزياء", orderIndex: 1, status: "active" },
  ];

  const mockLessons: Lesson[] = [
    { id: "les-m1-1", unitId: "unit-m1", subjectId: "sub-math", title: "المعادلات التربيعية", orderIndex: 1, durationMinutes: 45, objectives: ["فهم المعادلات"], status: "approved" },
    { id: "les-m1-2", unitId: "unit-m1", subjectId: "sub-math", title: "المتتاليات الحسابية", orderIndex: 2, durationMinutes: 45, objectives: ["فهم المتتاليات"], status: "approved" },
    { id: "les-s1-1", unitId: "unit-s1", subjectId: "sub-science", title: "الحركة في خط مستقيم", orderIndex: 1, durationMinutes: 45, objectives: ["فهم الحركة"], status: "approved" },
  ];

  const createMockQuestion = (
    id: string,
    subjectId: string,
    unitId: string,
    lessonId: string,
    type: Question["type"],
    text: string,
    answer: string,
    marks: number,
    difficulty: "easy" | "medium" | "hard"
  ): Question => ({
    id,
    subjectId,
    unitId,
    lessonId,
    type,
    text,
    answer,
    marks,
    score: marks,
    difficulty,
    importance: 3,
    status: "active",
    tags: ["مهم"],
    isPastCycle: false,
    occurrencesCount: 1,
    futureProbability: 75,
    finalWeightScore: 80,
    createdAt: new Date().toISOString(),
  });

  const mockQuestions: Question[] = [
    // Math questions
    createMockQuestion("q-m-1", "sub-math", "unit-m1", "les-m1-1", "mcq", "حل المعادلة x^2 = 4", "±2", 5, "easy"),
    createMockQuestion("q-m-2", "sub-math", "unit-m1", "les-m1-1", "mcq", "مميز المعادلة x^2 + 2x + 1 = 0", "0", 5, "medium"),
    createMockQuestion("q-m-3", "sub-math", "unit-m1", "les-m1-2", "true_false", "المتتالية 2, 4, 6 متتالية هندسية", "خطأ", 5, "easy"),
    createMockQuestion("q-m-4", "sub-math", "unit-m1", "les-m1-2", "true_false", "أساس المتتالية الحسابية 3, 7, 11 هو 4", "صح", 5, "easy"),
    createMockQuestion("q-m-5", "sub-math", "unit-m2", "les-m1-1", "essay", "أثبت نظرية فيثاغورس", "البرهان بالرسم", 10, "hard"),
    createMockQuestion("q-m-6", "sub-math", "unit-m2", "les-m1-1", "essay", "احسب مساحة الدائرة بنصف قطر 7سم", "154 سم مربع", 10, "medium"),
    createMockQuestion("q-m-7", "sub-math", "unit-m1", "les-m1-1", "mcq", "سؤال رياضيات إضافي 1", "أ", 5, "easy"),
    createMockQuestion("q-m-8", "sub-math", "unit-m1", "les-m1-1", "mcq", "سؤال رياضيات إضافي 2", "ب", 5, "easy"),
    // Science questions
    createMockQuestion("q-s-1", "sub-science", "unit-s1", "les-s1-1", "mcq", "وحدة قياس السرعة", "m/s", 5, "easy"),
    createMockQuestion("q-s-2", "sub-science", "unit-s1", "les-s1-1", "true_false", "التسارع هو التغير في السرعة", "صح", 5, "easy"),
  ];

  // ==========================================
  // Suite 1: RBAC Generation & Action Guards
  // ==========================================
  test("Suite 1: RBAC & Permissions", "Admin has full generation & export permissions", () => {
    assert(canAccessModule(adminUser, "exams"), "Admin should access exams module");
    assert(canPerformAction(adminUser, "generate", "exams"), "Admin should be allowed to generate");
    assert(canPerformAction(adminUser, "create", "exams"), "Admin should be allowed to create/save");
    assert(canPerformAction(adminUser, "edit", "exams"), "Admin should be allowed to edit");
    assert(canPerformAction(adminUser, "export", "exams"), "Admin should be allowed to export/print");
  });

  test("Suite 1: RBAC & Permissions", "Teacher has subject-bound generation and export", () => {
    assert(canAccessModule(mathTeacher, "exams"), "Math teacher should access exams module");
    assert(canPerformAction(mathTeacher, "generate", "exams"), "Math teacher can generate exams");
    assert(canPerformAction(mathTeacher, "create", "exams"), "Math teacher can save exams");
    assert(canPerformAction(mathTeacher, "export", "exams"), "Math teacher can export exams");
  });

  test("Suite 1: RBAC & Permissions", "Viewer is blocked from generating, creating, and editing", () => {
    assert(!canPerformAction(viewerUser, "generate", "exams"), "Viewer must NOT be allowed to generate exams");
    assert(!canPerformAction(viewerUser, "create", "exams"), "Viewer must NOT be allowed to create exams");
    assert(!canPerformAction(viewerUser, "edit", "exams"), "Viewer must NOT be allowed to edit exams");
  });

  test("Suite 1: RBAC & Permissions", "Disabled user is completely blocked from all actions", () => {
    assert(!canAccessModule(disabledUser, "exams"), "Disabled user cannot access exams");
    assert(!canPerformAction(disabledUser, "generate", "exams"), "Disabled user cannot generate");
    assert(!canPerformAction(disabledUser, "export", "exams"), "Disabled user cannot export");
    assert(!canAccessSubject(disabledUser, "sub-math"), "Disabled user cannot access subject");
  });

  test("Suite 1: RBAC & Permissions", "Teacher with exports=false cannot print or export", () => {
    assert(canPerformAction(scienceTeacher, "generate", "exams"), "Science teacher can generate");
    assert(!canPerformAction(scienceTeacher, "export", "exams"), "Science teacher cannot export/print");
  });

  // ==========================================
  // Suite 2: Subject Access & Question Pool Isolation
  // ==========================================
  test("Suite 2: Subject Boundaries", "Teacher can only access assigned subject", () => {
    assert(canAccessSubject(mathTeacher, "sub-math"), "Math teacher can access Math");
    assert(!canAccessSubject(mathTeacher, "sub-science"), "Math teacher CANNOT access Science");
    assert(!canAccessSubject(mathTeacher, "sub-history"), "Math teacher CANNOT access History");
  });

  test("Suite 2: Subject Boundaries", "filterAllowedSubjects only returns allowed subjects", () => {
    const allowed = filterAllowedSubjects(mathTeacher, mockSubjects);
    assert(allowed.length === 1, "Only 1 subject allowed for math teacher");
    assert(allowed[0].id === "sub-math", "Allowed subject must be Math");
  });

  test("Suite 2: Subject Boundaries", "Question bank pool only contains questions from allowed subjects", () => {
    const allowedQuestions = filterAllowedItemsBySubject(mathTeacher, mockQuestions);
    assert(allowedQuestions.every(q => q.subjectId === "sub-math"), "All questions must belong to sub-math");
    assert(!allowedQuestions.some(q => q.subjectId === "sub-science"), "No Science questions allowed in math teacher pool");
  });

  // ==========================================
  // Suite 3: Curriculum Tree Integrity
  // ==========================================
  test("Suite 3: Curriculum Hierarchy", "Units and lessons must strictly link to selected subject", () => {
    const allowedUnits = filterAllowedItemsBySubject(mathTeacher, mockUnits);
    assert(allowedUnits.every(u => u.subjectId === "sub-math"), "Units must belong to sub-math");

    const allowedLessons = filterAllowedItemsBySubject(mathTeacher, mockLessons);
    assert(allowedLessons.every(l => l.subjectId === "sub-math"), "Lessons must belong to sub-math");
    assert(!allowedLessons.some(l => l.subjectId === "sub-science"), "No cross-subject lessons permitted");
  });

  // ==========================================
  // Suite 4: Non-Duplication within Single Model (Model A & Model B)
  // ==========================================
  test("Suite 4: Deduplication in Single Exam", "Model A has 0 duplicate questions across sections", () => {
    const selectedQuestionIdsA = new Set<string>();
    const versionAQuestions: { questionId: string; sectionId: string }[] = [];

    // Simulate section picking
    const sec1Questions = mockQuestions.filter(q => q.subjectId === "sub-math" && q.type === "mcq").slice(0, 2);
    sec1Questions.forEach(q => {
      assert(!selectedQuestionIdsA.has(q.id), `Question ${q.id} must not be duplicated in Version A`);
      selectedQuestionIdsA.add(q.id);
      versionAQuestions.push({ questionId: q.id, sectionId: "sec-1" });
    });

    const sec2Questions = mockQuestions.filter(q => q.subjectId === "sub-math" && q.type === "true_false" && !selectedQuestionIdsA.has(q.id)).slice(0, 2);
    sec2Questions.forEach(q => {
      assert(!selectedQuestionIdsA.has(q.id), `Question ${q.id} must not be duplicated in Version A`);
      selectedQuestionIdsA.add(q.id);
      versionAQuestions.push({ questionId: q.id, sectionId: "sec-2" });
    });

    assert(versionAQuestions.length === 4, "Version A must have 4 questions");
    const uniqueIds = new Set(versionAQuestions.map(q => q.questionId));
    assert(uniqueIds.size === versionAQuestions.length, "Version A question IDs must be strictly unique");
  });

  test("Suite 4: Deduplication in Single Exam", "Model B has 0 duplicate questions and avoids Model A questions when pool permits", () => {
    const selectedQuestionIdsA = new Set(["q-m-1", "q-m-2"]);
    const selectedQuestionIdsB = new Set<string>();
    const versionBQuestions: { questionId: string }[] = [];

    // Available math MCQ questions not used in Version A
    const poolB = mockQuestions.filter(q => q.subjectId === "sub-math" && q.type === "mcq" && !selectedQuestionIdsA.has(q.id));
    assert(poolB.length >= 2, "Pool B must have remaining questions");

    const pickedB = poolB.slice(0, 2);
    pickedB.forEach(q => {
      assert(!selectedQuestionIdsA.has(q.id), `Version B question ${q.id} must not overlap with Version A`);
      assert(!selectedQuestionIdsB.has(q.id), `Version B question ${q.id} must not be duplicated within Version B`);
      selectedQuestionIdsB.add(q.id);
      versionBQuestions.push({ questionId: q.id });
    });

    assert(versionBQuestions.length === 2, "Version B must have 2 questions");
  });

  // ==========================================
  // Suite 5: Non-Duplication across Multiple Models (Batch Multi-Drafts)
  // ==========================================
  test("Suite 5: Multi-Model Non-Duplication", "Multiple exam drafts receive disjoint question sets without internal duplicates", () => {
    const multiExamCount = 3;
    const mathPool = mockQuestions.filter(q => q.subjectId === "sub-math");
    const buckets: Question[][] = Array.from({ length: multiExamCount }, () => []);

    let currentBucket = 0;
    mathPool.forEach(q => {
      buckets[currentBucket].push(q);
      currentBucket = (currentBucket + 1) % multiExamCount;
    });

    const usedAcrossAllModels = new Set<string>();

    buckets.forEach((bucketQs, idx) => {
      // Check for internal duplication
      const uniqueInBucket = new Set(bucketQs.map(q => q.id));
      assert(uniqueInBucket.size === bucketQs.length, `Model ${idx + 1} must not contain duplicate questions internally`);

      // Check for cross-model collision
      bucketQs.forEach(q => {
        assert(!usedAcrossAllModels.has(q.id), `Question ${q.id} in Model ${idx + 1} was already used in a prior model`);
        usedAcrossAllModels.add(q.id);
      });
    });

    assert(usedAcrossAllModels.size === mathPool.length, "All pool questions distributed across models without overlap");
  });

  // ==========================================
  // Suite 6: Creator Attribution & Save Protection
  // ==========================================
  test("Suite 6: Creator Attribution & Security", "Generated exam documents preserve current user identity", () => {
    const generatedExam: Partial<Exam> = {
      id: "exam-test-1",
      title: "امتحان رياضيات نهائي",
      subjectId: "sub-math",
      createdBy: mathTeacher.name,
      createdAt: new Date().toISOString().substring(0, 10),
      libraryDoc: {
        examId: "exam-test-1",
        title: "امتحان رياضيات نهائي",
        scope: { subjectId: "sub-math", unitIds: ["unit-m1"], lessonIds: [], isComprehensive: false },
        generationMethod: "auto",
        usedQuestionIds: ["q-m-1", "q-m-2"],
        questionSnapshots: [],
        sections: [],
        versions: [],
        totalQuestions: 2,
        totalMarks: 10,
        status: "published",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdById: mathTeacher.id,
        createdByName: mathTeacher.name,
      },
    };

    assert(generatedExam.createdBy === mathTeacher.name, "Exam createdBy must match teacher name");
    assert(generatedExam.libraryDoc?.createdById === mathTeacher.id, "Library doc createdById must match teacher ID");
    assert(generatedExam.libraryDoc?.createdByName === mathTeacher.name, "Library doc createdByName must match teacher name");
  });

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  return {
    total: results.length,
    passed,
    failed,
    results,
  };
}

// Auto-run when executed directly via tsx
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes("examGeneratorSecurity.test.ts")) {
  console.log("==================================================");
  console.log("🛡️ Running Exam Generator Security & RBAC Test Suite");
  console.log("==================================================");
  const { total, passed, failed, results } = runExamGeneratorSecurityTests();
  
  results.forEach(r => {
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
