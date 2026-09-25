/**
 * Stage 7: Past Cycles Security & RBAC Test Suite
 * 
 * Verifies:
 * 1. Cycles visibility & connected exam subject isolation.
 * 2. Cycle creation, editing, deletion & restore permissions (RBAC).
 * 3. Prevention of linking exams from unauthorized subjects to a cycle.
 * 4. Prevention of opening/printing an exam from within a cycle if user lacks subject access or export permission.
 * 5. Preservation of existing cross-subject cycle links when edited by restricted teachers.
 */

import {
  canAccessSubject,
  canPerformAction,
  canAccessModule,
  filterAllowedSubjects,
  filterAllowedItemsBySubject,
} from "../services/rbacEngine";
import { User, Subject, Cycle, Exam } from "../types";

export interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  error?: string;
}

export function runPastCyclesSecurityTests(): {
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

  // Mock Users
  const adminUser: User = {
    id: "admin-1",
    name: "مدير النظام",
    email: "admin@test.com",
    role: "admin",
    status: "active",
    allowedSubjectIds: [],
  };

  const mathTeacher: User = {
    id: "math-teacher-1",
    name: "معلم الرياضيات",
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

  const scienceTeacherNoExport: User = {
    id: "sci-teacher-no-exp",
    name: "معلم العلوم بدون تصدير",
    email: "sci@test.com",
    role: "teacher",
    status: "active",
    allowedSubjectIds: ["sub-science"],
    permissions: {
      curriculum: false,
      lessons: true,
      questions: true,
      exams: true,
      exports: false, // Forbidden to export/print
      reports: false,
      users: false,
      settings: false,
    },
  };

  const viewerUser: User = {
    id: "viewer-1",
    name: "مشاهد فقط",
    email: "viewer@test.com",
    role: "viewer",
    status: "active",
    allowedSubjectIds: ["sub-math", "sub-science"],
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
    id: "disabled-1",
    name: "مستخدم معطل",
    email: "disabled@test.com",
    role: "teacher",
    status: "disabled",
    allowedSubjectIds: ["sub-math"],
  };

  // Mock Subjects
  const mockSubjects: Subject[] = [
    { id: "sub-math", name: "الرياضيات", code: "MATH101", color: "#3B82F6", icon: "Calculator", description: "مادة الرياضيات", status: "active", totalMarks: 100, progressPercentage: 100 },
    { id: "sub-science", name: "العلوم", code: "SCI101", color: "#10B981", icon: "Atom", description: "مادة العلوم", status: "active", totalMarks: 100, progressPercentage: 100 },
    { id: "sub-arabic", name: "اللغة العربية", code: "ARB101", color: "#F59E0B", icon: "Book", description: "مادة اللغة العربية", status: "active", totalMarks: 100, progressPercentage: 100 },
  ];

  // Mock Exams
  const mathExam: Exam = {
    id: "exam-math-1",
    title: "اختبار الرياضيات الفصلي",
    subjectId: "sub-math",
    unitIds: ["unit-1"],
    lessonIds: ["les-1"],
    totalQuestions: 5,
    totalMarks: 100,
    difficultyProfile: "balanced",
    generationType: "manual",
    versions: [
      {
        versionCode: "A",
        questions: [
          {
            id: "q-math-1",
            subjectId: "sub-math",
            type: "mcq",
            text: "ما ناتج 5 * 5؟",
            answer: "25",
            marks: 10,
            difficulty: "easy",
          } as any,
        ],
      },
    ],
    createdAt: "2026-01-01",
    createdBy: "math-teacher-1",
    status: "finalized",
  };

  const scienceExam: Exam = {
    id: "exam-sci-1",
    title: "اختبار الفيزياء والكيمياء الفصلي",
    subjectId: "sub-science",
    unitIds: ["unit-2"],
    lessonIds: ["les-2"],
    totalQuestions: 4,
    totalMarks: 80,
    difficultyProfile: "balanced",
    generationType: "manual",
    versions: [
      {
        versionCode: "A",
        questions: [
          {
            id: "q-sci-1",
            subjectId: "sub-science",
            type: "mcq",
            text: "ما هو رمز الماء؟",
            answer: "H2O",
            marks: 10,
            difficulty: "easy",
          } as any,
        ],
      },
    ],
    createdAt: "2026-01-02",
    createdBy: "sci-teacher-1",
    status: "finalized",
  };

  const allMockExams = [mathExam, scienceExam];

  // Mock Cycles
  const mathOnlyCycle: Cycle = {
    id: "cycle-math-only",
    name: "دورة الرياضيات 2025",
    academicYear: "2025/2026",
    startDate: "2025-09-01",
    endDate: "2026-01-15",
    status: "archived",
    examIds: ["exam-math-1"],
  };

  const scienceOnlyCycle: Cycle = {
    id: "cycle-sci-only",
    name: "دورة العلوم 2025",
    academicYear: "2025/2026",
    startDate: "2025-09-01",
    endDate: "2026-01-15",
    status: "archived",
    examIds: ["exam-sci-1"],
  };

  const multiSubjectCycle: Cycle = {
    id: "cycle-2025-2026",
    name: "دورة الفصل الأول الشاملة 2025/2026",
    academicYear: "2025/2026",
    startDate: "2025-09-01",
    endDate: "2026-01-15",
    status: "archived",
    examIds: ["exam-math-1", "exam-sci-1"],
  };

  const allMockCycles = [mathOnlyCycle, scienceOnlyCycle, multiSubjectCycle];

  // Helper for visible cycles filtering in UI
  function getVisibleCycles(user: User, cycles: Cycle[], exams: Exam[]): Cycle[] {
    if (!user || user.status === "disabled") return [];
    if (user.role === "admin") return cycles;
    const allowed = filterAllowedItemsBySubject(user, exams);
    return cycles.filter((c) => (c.examIds || []).some((id) => allowed.some((e) => e.id === id)));
  }

  // --- Suite 1: Cycle Visibility & Exam Filtering ---
  test("Cycle Visibility", "Admin sees all cycles across all subjects", () => {
    const visible = getVisibleCycles(adminUser, allMockCycles, allMockExams);
    assert(visible.length === 3, `Admin should see all 3 cycles, received: ${visible.length}`);
  });

  test("Cycle Visibility", "Math teacher only sees cycles containing Math exams and Science-only cycle is hidden", () => {
    const visible = getVisibleCycles(mathTeacher, allMockCycles, allMockExams);
    assert(visible.length === 2, `Math teacher should see 2 cycles (Math-only + Multi-subject), received: ${visible.length}`);
    assert(visible.some(c => c.id === "cycle-math-only"), "Math-only cycle must be visible");
    assert(visible.some(c => c.id === "cycle-2025-2026"), "Multi-subject cycle must be visible");
    assert(!visible.some(c => c.id === "cycle-sci-only"), "Science-only cycle must be strictly hidden");
  });

  test("Cycle Visibility", "Connected exam count calculates only allowed exams", () => {
    const allowedForMath = filterAllowedItemsBySubject(mathTeacher, allMockExams);
    
    // In multiSubjectCycle (contains Math + Sci exams)
    const mathCountInMulti = (allowedForMath || []).filter(e => multiSubjectCycle.examIds.includes(e.id)).length;
    assert(mathCountInMulti === 1, `Math teacher count in multi-subject cycle must be 1, received ${mathCountInMulti}`);

    const allowedForAdmin = filterAllowedItemsBySubject(adminUser, allMockExams);
    const adminCountInMulti = (allowedForAdmin || []).filter(e => multiSubjectCycle.examIds.includes(e.id)).length;
    assert(adminCountInMulti === 2, `Admin count in multi-subject cycle must be 2, received ${adminCountInMulti}`);
  });

  test("Cycle Visibility", "Exam list inside cycle hides any exam outside user permissions", () => {
    const allowedForMath = filterAllowedItemsBySubject(mathTeacher, allMockExams);
    const visibleExamsInCycle = allowedForMath.filter(e => multiSubjectCycle.examIds.includes(e.id));
    assert(visibleExamsInCycle.length === 1, "Only 1 exam should be in the list");
    assert(visibleExamsInCycle[0].id === "exam-math-1", "Only Math exam is visible");
    assert(!visibleExamsInCycle.some(e => e.id === "exam-sci-1"), "Science exam is hidden");
  });

  test("Cycle Visibility", "Disabled user cannot see any cycles or exams in cycles", () => {
    const visible = getVisibleCycles(disabledUser, allMockCycles, allMockExams);
    assert(visible.length === 0, "Disabled user must see 0 cycles");
  });

  // --- Suite 2: Cycle RBAC CRUD Operations ---
  test("Cycle RBAC", "Admin and authorized teachers can create, edit, delete cycles", () => {
    assert(canPerformAction(adminUser, "create", "exams") === true, "Admin can create cycle");
    assert(canPerformAction(adminUser, "edit", "exams") === true, "Admin can edit cycle");
    assert(canPerformAction(adminUser, "delete", "exams") === true, "Admin can delete cycle");

    assert(canPerformAction(mathTeacher, "create", "exams") === true, "Teacher can create cycle");
    assert(canPerformAction(mathTeacher, "edit", "exams") === true, "Teacher can edit cycle");
    assert(canPerformAction(mathTeacher, "delete", "exams") === true, "Teacher can delete cycle");
  });

  test("Cycle RBAC", "Viewer and disabled users are blocked from creating, editing, and deleting cycles", () => {
    assert(canPerformAction(viewerUser, "create", "exams") === false, "Viewer cannot create cycle");
    assert(canPerformAction(viewerUser, "edit", "exams") === false, "Viewer cannot edit cycle");
    assert(canPerformAction(viewerUser, "delete", "exams") === false, "Viewer cannot delete cycle");

    assert(canPerformAction(disabledUser, "create", "exams") === false, "Disabled user cannot create cycle");
    assert(canPerformAction(disabledUser, "edit", "exams") === false, "Disabled user cannot edit cycle");
    assert(canPerformAction(disabledUser, "delete", "exams") === false, "Disabled user cannot delete cycle");
  });

  // --- Suite 3: Cross-Subject Deletion Prevention Guard ---
  test("Cycle Deletion Guard", "Math teacher can delete a cycle containing only Math exams", () => {
    const allowedForMath = filterAllowedItemsBySubject(mathTeacher, allMockExams);
    const hasUnauthorizedExams = (mathOnlyCycle.examIds || []).some(
      (examId) => !allowedForMath.some((e) => e.id === examId)
    );
    const canDelete = canPerformAction(mathTeacher, "delete", "exams") && !hasUnauthorizedExams;
    assert(canDelete === true, "Math teacher should be allowed to delete a math-only cycle");
  });

  test("Cycle Deletion Guard", "Math teacher is strictly forbidden from deleting a multi-subject cycle containing Science exams", () => {
    const allowedForMath = filterAllowedItemsBySubject(mathTeacher, allMockExams);
    const hasUnauthorizedExams = (multiSubjectCycle.examIds || []).some(
      (examId) => !allowedForMath.some((e) => e.id === examId)
    );
    const canDelete = canPerformAction(mathTeacher, "delete", "exams") && (mathTeacher.role === "admin" || !hasUnauthorizedExams);
    assert(canDelete === false, "Math teacher must be blocked from deleting cycle containing unauthorized Science exams");
  });

  test("Cycle Deletion Guard", "Admin can delete any cycle even if it contains multiple subjects", () => {
    const allowedForAdmin = filterAllowedItemsBySubject(adminUser, allMockExams);
    const hasUnauthorizedExams = (multiSubjectCycle.examIds || []).some(
      (examId) => !allowedForAdmin.some((e) => e.id === examId)
    );
    const canDelete = canPerformAction(adminUser, "delete", "exams") && (adminUser.role === "admin" || !hasUnauthorizedExams);
    assert(canDelete === true, "Admin must be allowed to delete any cycle");
  });

  // --- Suite 3: Preventing Linking Unallowed Exams ---
  test("Cycle Linking Security", "Math teacher cannot link Science exam to a cycle", () => {
    const allowedExamsForMath = filterAllowedItemsBySubject(mathTeacher, allMockExams);
    
    // Simulating attempting to link both mathExam and scienceExam
    const attemptedSelectedIds = ["exam-math-1", "exam-sci-1"];
    const sanitizedIds = attemptedSelectedIds.filter(id => 
      allowedExamsForMath.some(e => e.id === id && canAccessSubject(mathTeacher, e.subjectId))
    );

    assert(sanitizedIds.length === 1, "Only 1 allowed exam should be linked");
    assert(sanitizedIds[0] === "exam-math-1", "Sanitized list must only contain Math exam");
    assert(!sanitizedIds.includes("exam-sci-1"), "Science exam must be blocked and excluded");
  });

  test("Cycle Linking Security", "When Math teacher edits an existing cycle, unallowed exams are preserved in DB without leaking", () => {
    const allowedExamsForMath = filterAllowedItemsBySubject(mathTeacher, allMockExams);
    const existingCycle = { ...multiSubjectCycle }; // has ["exam-math-1", "exam-sci-1"]

    // Teacher unchecks Math exam and selects nothing
    const teacherSelectedIds: string[] = [];
    const sanitizedTeacherIds = teacherSelectedIds.filter(id => 
      allowedExamsForMath.some(e => e.id === id && canAccessSubject(mathTeacher, e.subjectId))
    );

    // Keep existing unallowed exams untouched
    const unallowedExistingExamIds = (existingCycle.examIds || []).filter(
      id => !allowedExamsForMath.some(e => e.id === id)
    );

    const updatedExamIds = Array.from(new Set([...unallowedExistingExamIds, ...sanitizedTeacherIds]));

    assert(updatedExamIds.includes("exam-sci-1"), "Science exam remains safely preserved in background");
    assert(!updatedExamIds.includes("exam-math-1"), "Math exam was cleanly removed by teacher");
  });

  // --- Suite 4: Print & Preview Guard Inside Cycles ---
  test("Cycle Print Security", "Printing or previewing exam requires both subject permission and export permission", () => {
    // Math teacher with export=true printing Math exam -> Allowed
    const mathTeacherCanPrintMath = canPerformAction(mathTeacher, "export") && canAccessSubject(mathTeacher, mathExam.subjectId);
    assert(mathTeacherCanPrintMath === true, "Math teacher with export permission can print Math exam");

    // Math teacher printing Science exam -> Blocked by Subject Access
    const mathTeacherCanPrintScience = canPerformAction(mathTeacher, "export") && canAccessSubject(mathTeacher, scienceExam.subjectId);
    assert(mathTeacherCanPrintScience === false, "Math teacher cannot print Science exam");

    // Science teacher without export permission printing Science exam -> Blocked by export permission
    const sciTeacherCanPrintSci = canPerformAction(scienceTeacherNoExport, "export") && canAccessSubject(scienceTeacherNoExport, scienceExam.subjectId);
    assert(sciTeacherCanPrintSci === false, "Science teacher without export permission cannot print Science exam");

    // Viewer printing Math exam -> Blocked by export permission
    const viewerCanPrintMath = canPerformAction(viewerUser, "export") && canAccessSubject(viewerUser, mathExam.subjectId);
    assert(viewerCanPrintMath === false, "Viewer cannot print Math exam");
  });

  test("Cycle Print Security", "Exam preview items generator logic returns valid items for authorized user and empty for unauthorized user", () => {
    function generateSafePreview(user: User, exam: Exam) {
      if (!canAccessSubject(user, exam.subjectId)) return [];
      if (!canPerformAction(user, "export")) return [];
      return exam.versions[0].questions;
    }

    const authorizedItems = generateSafePreview(mathTeacher, mathExam);
    assert(authorizedItems.length > 0, "Authorized user should generate print items");

    const unauthorizedSubjectItems = generateSafePreview(mathTeacher, scienceExam);
    assert(unauthorizedSubjectItems.length === 0, "Unauthorized subject user should receive 0 print items");

    const unauthorizedExportItems = generateSafePreview(scienceTeacherNoExport, scienceExam);
    assert(unauthorizedExportItems.length === 0, "User without export permission should receive 0 print items");
  });

  return {
    total: results.length,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length,
    results,
  };
}

// Execute standalone if executed directly via tsx
const suiteResults = runPastCyclesSecurityTests();
console.log("==================================================");
console.log("🛡️ Running Stage 7: Past Cycles Security & RBAC Test Suite");
console.log("==================================================");
suiteResults.results.forEach((r) => {
  if (r.passed) {
    console.log(`✅ [${r.suite}] ${r.name}`);
  } else {
    console.error(`❌ FAIL [${r.suite}] ${r.name}: ${r.error}`);
  }
});
console.log("--------------------------------------------------");
console.log(`Total: ${suiteResults.total} | Passed: ${suiteResults.passed} | Failed: ${suiteResults.failed}`);
console.log("==================================================");

if (suiteResults.failed > 0) {
  process.exit(1);
}
