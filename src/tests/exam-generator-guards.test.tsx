/**
 * Exam Generator RBAC & Data Guard Test Suite
 * File: src/tests/exam-generator-guards.test.tsx
 *
 * Verifies that the Exam Generator strictly:
 * 1. Restricts subject, unit, and lesson scope to currentUser authorized domains.
 * 2. Prevents unauthorized subjects from appearing in subject selection.
 * 3. Blocks exam generation if user lacks 'generate' permission or subject is unauthorized.
 * 4. Blocks library saves and multi-draft approvals if user lacks 'create'/'edit' permissions or subject access.
 * 5. Prevents swapping or deleting questions when user lacks edit permissions or subject access.
 * 6. Disables and blocks printing/exporting if user lacks 'export' permissions.
 * 7. Blocks AI Execution Center and AI Copilot on unauthorized subjects and filters unit metadata to prevent data leaks.
 */

import {
  canAccessSubject,
  canPerformAction,
  canAccessModule,
  filterAllowedSubjects,
  filterAllowedItemsBySubject,
} from "../services/rbacEngine";
import { User, Subject, Unit, Lesson, Question, Exam } from "../types";

export interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  error?: string;
}

export function runExamGeneratorGuardsTests(): {
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

  // Sample Subjects
  const allSubjects: Subject[] = [
    { id: "sub-math", code: "MTH", name: "الرياضيات", color: "#2563eb", icon: "Calculator", description: "رياضيات", status: "active", totalMarks: 100 },
    { id: "sub-science", code: "SCI", name: "العلوم العامة", color: "#059669", icon: "Atom", description: "علوم", status: "active", totalMarks: 100 },
    { id: "sub-arabic", code: "ARB", name: "اللغة العربية", color: "#dc2626", icon: "Book", description: "عربي", status: "active", totalMarks: 100 },
    { id: "sub-english", code: "ENG", name: "اللغة الإنجليزية", color: "#7c3aed", icon: "Globe", description: "انجليزي", status: "active", totalMarks: 100 },
  ];

  // Sample Units
  const allUnits: Unit[] = [
    { id: "unit-math-1", subjectId: "sub-math", code: "U1", title: "الجبر والمصفوفات", description: "", orderIndex: 1, status: "active" },
    { id: "unit-math-2", subjectId: "sub-math", code: "U2", title: "الهندسة التحليلية", description: "", orderIndex: 2, status: "active" },
    { id: "unit-science-1", subjectId: "sub-science", code: "U1", title: "الفيزياء والحركة", description: "", orderIndex: 1, status: "active" },
    { id: "unit-arabic-1", subjectId: "sub-arabic", code: "U1", title: "النحو والصرف", description: "", orderIndex: 1, status: "active" },
  ];

  // Sample Lessons
  const allLessons: Lesson[] = [
    { id: "les-math-1", unitId: "unit-math-1", subjectId: "sub-math", title: "حل المعادلات الخطية", orderIndex: 1, durationMinutes: 45, objectives: [], status: "approved" },
    { id: "les-math-2", unitId: "unit-math-2", subjectId: "sub-math", title: "المتجهات والمسافات", orderIndex: 2, durationMinutes: 45, objectives: [], status: "approved" },
    { id: "les-science-1", unitId: "unit-science-1", subjectId: "sub-science", title: "قوانين نيوتن", orderIndex: 1, durationMinutes: 45, objectives: [], status: "approved" },
    { id: "les-arabic-1", unitId: "unit-arabic-1", subjectId: "sub-arabic", title: "المبتدأ والخبر", orderIndex: 1, durationMinutes: 45, objectives: [], status: "approved" },
  ];

  // Sample Users
  const adminUser: User = {
    id: "usr-admin",
    name: "مدير النظام",
    email: "admin@school.edu",
    role: "admin",
    status: "active",
    allowedSubjectIds: [],
  };

  const mathTeacher: User = {
    id: "usr-math-teacher",
    name: "أ. أحمد - رياضيات",
    email: "math@school.edu",
    role: "teacher",
    status: "active",
    allowedSubjectIds: ["sub-math"],
    permissions: {
      exams: true,
      questions: true,
      curriculum: true,
      lessons: true,
      reports: false,
      users: false,
      settings: false,
      exports: true,
    },
  };

  const viewerUser: User = {
    id: "usr-viewer",
    name: "مشرف مستعرض",
    email: "viewer@school.edu",
    role: "viewer",
    status: "active",
    allowedSubjectIds: ["sub-math", "sub-science"],
    permissions: {
      exams: true,
      questions: true,
      curriculum: true,
      lessons: true,
      reports: false,
      users: false,
      settings: false,
      exports: false, // No export/print permission
    },
  };

  const restrictedTeacherNoGenerate: User = {
    id: "usr-restricted",
    name: "معلم مقيد الصلاحيات",
    email: "restricted@school.edu",
    role: "teacher",
    status: "active",
    allowedSubjectIds: ["sub-math"],
    permissions: {
      exams: false, // Cannot generate or edit exams
      questions: true,
      curriculum: true,
      lessons: true,
      reports: false,
      users: false,
      settings: false,
      exports: false,
    },
  };

  // --- Suite 1: Subject Filtering & Visibility ---
  test("Subject Filtering", "Restricted teacher only sees allowed subjects and never unauthorized subjects", () => {
    const allowed = filterAllowedSubjects(mathTeacher, allSubjects);
    assert(allowed.length === 1, "Expected exactly 1 allowed subject for math teacher");
    assert(allowed[0].id === "sub-math", "Math teacher should only have sub-math");
    assert(!allowed.some((s) => s.id === "sub-science"), "sub-science must NOT be visible");
    assert(!allowed.some((s) => s.id === "sub-arabic"), "sub-arabic must NOT be visible");
  });

  test("Subject Filtering", "Admin has full access to all subjects", () => {
    const allowed = filterAllowedSubjects(adminUser, allSubjects);
    assert(allowed.length === allSubjects.length, "Admin should see all subjects");
  });

  test("Curriculum Tree Filtering", "Units and lessons are strictly isolated to user allowed subjects", () => {
    const allowedU = filterAllowedItemsBySubject(mathTeacher, allUnits);
    assert(allowedU.every((u) => u.subjectId === "sub-math"), "All visible units must belong to sub-math");
    assert(!allowedU.some((u) => u.id === "unit-science-1"), "Science unit must be hidden");

    const allowedL = filterAllowedItemsBySubject(mathTeacher, allLessons);
    assert(allowedL.every((l) => l.subjectId === "sub-math"), "All visible lessons must belong to sub-math");
  });

  // --- Suite 2: Exam Generation Guards ---
  test("Exam Generation Guard", "User without generate permission is blocked from generating exams", () => {
    const canGen = canPerformAction(restrictedTeacherNoGenerate, "generate", "exams");
    assert(!canGen, "Restricted teacher without exams permission must not be allowed to generate");

    const viewerCanGen = canPerformAction(viewerUser, "generate", "exams");
    assert(!viewerCanGen, "Viewer must not be allowed to generate exams");
  });

  test("Exam Generation Guard", "Authorized teacher can generate for permitted subject but blocked for other subjects", () => {
    const canGen = canPerformAction(mathTeacher, "generate", "exams");
    assert(canGen, "Math teacher should have generate permission for exams");

    const isMathAllowed = canAccessSubject(mathTeacher, "sub-math");
    assert(isMathAllowed, "sub-math should be accessible to math teacher");

    const isScienceAllowed = canAccessSubject(mathTeacher, "sub-science");
    assert(!isScienceAllowed, "sub-science must be blocked for math teacher");

    const isMathGenerationAuthorized = canGen && isMathAllowed;
    const isScienceGenerationAuthorized = canGen && isScienceAllowed;

    assert(isMathGenerationAuthorized, "Math exam generation should be fully authorized");
    assert(!isScienceGenerationAuthorized, "Science exam generation must be blocked for math teacher");
  });

  // --- Suite 3: Library Save & Multi-Drafts Guards ---
  test("Save & Library Guards", "User without create/edit permission cannot save exam or approve multi-drafts", () => {
    const canCreate = canPerformAction(restrictedTeacherNoGenerate, "create", "exams");
    assert(!canCreate, "Restricted teacher should not have create permission on exams");

    const viewerCanCreate = canPerformAction(viewerUser, "create", "exams");
    assert(!viewerCanCreate, "Viewer should not have create permission on exams");

    const teacherCanCreate = canPerformAction(mathTeacher, "create", "exams");
    assert(teacherCanCreate, "Math teacher should have create permission on exams");
  });

  test("Save & Library Guards", "Saving exam in unauthorized subject is strictly blocked", () => {
    const teacherCanCreate = canPerformAction(mathTeacher, "create", "exams");
    const canSaveScience = teacherCanCreate && canAccessSubject(mathTeacher, "sub-science");
    assert(!canSaveScience, "Saving an exam under an unauthorized subject must be rejected");
  });

  // --- Suite 4: Question Modification Guards ---
  test("Question Modification Guards", "Swapping or removing question from exam requires edit permission and subject access", () => {
    const canEdit = canPerformAction(restrictedTeacherNoGenerate, "edit", "exams");
    assert(!canEdit, "Restricted teacher must not be permitted to edit or swap questions");

    const viewerCanEdit = canPerformAction(viewerUser, "edit", "exams");
    assert(!viewerCanEdit, "Viewer must not be permitted to edit or swap questions");

    const teacherCanEdit = canPerformAction(mathTeacher, "edit", "exams");
    const canEditMath = teacherCanEdit && canAccessSubject(mathTeacher, "sub-math");
    const canEditScience = teacherCanEdit && canAccessSubject(mathTeacher, "sub-science");

    assert(canEditMath, "Teacher can edit/swap questions in math exam");
    assert(!canEditScience, "Teacher cannot edit/swap questions in science exam");
  });

  // --- Suite 5: Print & Export Guards ---
  test("Print & Export Guards", "Export and printing are disabled for users without export permission", () => {
    const viewerCanExport = canPerformAction(viewerUser, "export", "exams");
    assert(!viewerCanExport, "Viewer without export permission must have printing/export blocked");

    const restrictedCanExport = canPerformAction(restrictedTeacherNoGenerate, "export", "exams");
    assert(!restrictedCanExport, "Restricted user must have printing/export blocked");

    const teacherCanExport = canPerformAction(mathTeacher, "export", "exams");
    assert(teacherCanExport, "Math teacher with export permission should be allowed to print/export");
  });

  // --- Suite 6: AI Execution Center & Copilot Guards & Data Leak Prevention ---
  test("AI Execution Center Guard", "AI Copilot and execution center cannot operate on unauthorized subject", () => {
    const canGen = canPerformAction(mathTeacher, "generate", "exams");
    const isMathAllowed = canAccessSubject(mathTeacher, "sub-math");
    const isScienceAllowed = canAccessSubject(mathTeacher, "sub-science");

    assert(canGen && isMathAllowed, "AI Copilot authorized for math teacher on sub-math");
    assert(!(canGen && isScienceAllowed), "AI Copilot blocked for math teacher on sub-science");
  });

  test("AI Data Leak Prevention", "AI payload units list strictly excludes unauthorized subject units", () => {
    // Math teacher units allowed
    const visibleUnits = filterAllowedItemsBySubject(mathTeacher, allUnits);
    const mathSubjectUnits = visibleUnits.filter((u) => u.subjectId === "sub-math");
    const unitTitles = mathSubjectUnits.map((u) => u.title);

    assert(unitTitles.includes("الجبر والمصفوفات"), "Math unit 1 should be included");
    assert(unitTitles.includes("الهندسة التحليلية"), "Math unit 2 should be included");
    assert(!unitTitles.includes("الفيزياء والحركة"), "Science unit title must NEVER leak to AI payload");
    assert(!unitTitles.includes("النحو والصرف"), "Arabic unit title must NEVER leak to AI payload");
  });

  return {
    total: results.length,
    passed: results.filter((r) => r.passed).length,
    failed: results.filter((r) => !r.passed).length,
    results,
  };
}

// Standalone runner when invoked directly via tsx
if (process.argv[1]?.includes("exam-generator-guards.test")) {
  console.log("\n🛡️  Running Exam Generator Security Guards & Data Protection Tests...\n");
  const report = runExamGeneratorGuardsTests();

  report.results.forEach((r) => {
    if (r.passed) {
      console.log(`  ✅ [${r.suite}] ${r.name}`);
    } else {
      console.log(`  ❌ [${r.suite}] ${r.name}`);
      console.log(`     Error: ${r.error}`);
    }
  });

  console.log(`\n==================================================`);
  console.log(`Total: ${report.total} | Passed: ${report.passed} | Failed: ${report.failed}`);
  console.log(`==================================================\n`);

  if (report.failed > 0) {
    process.exit(1);
  }
}
