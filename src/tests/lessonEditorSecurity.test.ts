/**
 * Lesson Editor Security & RBAC Protection Test Suite
 * Tests strict enforcement of access control, permissions, and subject restrictions for the Lesson Editor.
 */

import {
  canAccessSubject,
  canPerformAction,
  canAccessModule,
  filterAllowedSubjects,
  filterAllowedItemsBySubject,
} from "../services/rbacEngine";
import { User, Lesson, Subject } from "../types";

export interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  error?: string;
}

export function runLessonEditorSecurityTests(): {
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

  // Sample Mock Users
  const adminUser: User = {
    id: "usr-admin",
    name: "مدير النظام",
    email: "admin@test.com",
    role: "admin",
    status: "active",
    allowedSubjectIds: [],
  };

  const mathTeacher: User = {
    id: "usr-teacher-1",
    name: "معلم رياضيات",
    email: "math@test.com",
    role: "teacher",
    status: "active",
    allowedSubjectIds: ["sub-math"],
    permissions: {
      lessons: true,
      curriculum: true,
      questions: true,
      exams: true,
      reports: false,
      users: false,
      settings: false,
      exports: true,
    },
  };

  const viewerUser: User = {
    id: "usr-viewer",
    name: "مستعرض فقط",
    email: "viewer@test.com",
    role: "viewer",
    status: "active",
    allowedSubjectIds: ["sub-math", "sub-science"],
    permissions: {
      lessons: true,
      curriculum: true,
      questions: true,
      exams: true,
      reports: false,
      users: false,
      settings: false,
      exports: true,
    },
  };

  const restrictedTeacher: User = {
    id: "usr-teacher-no-lessons",
    name: "معلم بدون صلاحية دروس",
    email: "nolessons@test.com",
    role: "teacher",
    status: "active",
    allowedSubjectIds: ["sub-math"],
    permissions: {
      lessons: false,
      curriculum: true,
      questions: true,
      exams: true,
      reports: false,
      users: false,
      settings: false,
      exports: true,
    },
  };

  const disabledUser: User = {
    id: "usr-disabled",
    name: "حساب معطل",
    email: "disabled@test.com",
    role: "admin",
    status: "disabled",
    allowedSubjectIds: [],
  };

  // Sample Mock Data
  const subjects: Subject[] = [
    { id: "sub-math", code: "MTH10", name: "الرياضيات", description: "رياضيات", icon: "Calculator", color: "#3B82F6", status: "active" },
    { id: "sub-science", code: "SCI10", name: "العلوم", description: "علوم", icon: "Atom", color: "#10B981", status: "active" },
    { id: "sub-arabic", code: "ARB10", name: "اللغة العربية", description: "عربي", icon: "Book", color: "#F59E0B", status: "active" },
  ];

  const mathLesson: Lesson = {
    id: "les-math-1",
    unitId: "unit-math-1",
    subjectId: "sub-math",
    title: "درس الجبر",
    contentParagraphs: [],
    status: "draft",
    orderIndex: 1,
    durationMinutes: 45,
    objectives: ["فهم الجبر"],
  };

  const arabicLesson: Lesson = {
    id: "les-arabic-1",
    unitId: "unit-arabic-1",
    subjectId: "sub-arabic",
    title: "درس النحو",
    contentParagraphs: [],
    status: "draft",
    orderIndex: 1,
    durationMinutes: 45,
    objectives: ["فهم النحو"],
  };

  // Suite 1: Subject Access Control
  test("Subject Access Control", "Admin user can access any subject", () => {
    assert(canAccessSubject(adminUser, "sub-math"), "Admin should access math");
    assert(canAccessSubject(adminUser, "sub-science"), "Admin should access science");
    assert(canAccessSubject(adminUser, "sub-arabic"), "Admin should access arabic");
  });

  test("Subject Access Control", "Teacher with allowedSubjectIds is restricted to assigned subjects", () => {
    assert(canAccessSubject(mathTeacher, "sub-math"), "Math teacher should access math");
    assert(!canAccessSubject(mathTeacher, "sub-science"), "Math teacher should NOT access science");
    assert(!canAccessSubject(mathTeacher, "sub-arabic"), "Math teacher should NOT access arabic");
  });

  test("Subject Access Control", "Disabled user is blocked from all subjects", () => {
    assert(!canAccessSubject(disabledUser, "sub-math"), "Disabled user should NOT access math");
  });

  test("Subject Access Control", "filterAllowedSubjects filters out unassigned subjects", () => {
    const allowed = filterAllowedSubjects(mathTeacher, subjects);
    assert(allowed.length === 1, "Should only have 1 allowed subject");
    assert(allowed[0].id === "sub-math", "Allowed subject must be math");
  });

  test("Subject Access Control", "filterAllowedItemsBySubject filters lessons by subject permissions", () => {
    const items = [mathLesson, arabicLesson];
    const allowed = filterAllowedItemsBySubject(mathTeacher, items);
    assert(allowed.length === 1, "Should filter out arabic lesson");
    assert(allowed[0].id === "les-math-1", "Only math lesson should remain");
  });

  // Suite 2: Lesson Editor Action Permissions (RBAC)
  test("Lesson Editor Permissions", "Admin has full permissions (create, edit, delete) on lessons", () => {
    assert(canPerformAction(adminUser, "create", "lessons"), "Admin can create lessons");
    assert(canPerformAction(adminUser, "edit", "lessons"), "Admin can edit lessons");
    assert(canPerformAction(adminUser, "delete", "lessons"), "Admin can delete lessons");
  });

  test("Lesson Editor Permissions", "Viewer role cannot create, edit, or delete lessons", () => {
    assert(!canPerformAction(viewerUser, "create", "lessons"), "Viewer cannot create lessons");
    assert(!canPerformAction(viewerUser, "edit", "lessons"), "Viewer cannot edit lessons");
    assert(!canPerformAction(viewerUser, "delete", "lessons"), "Viewer cannot delete lessons");
  });

  test("Lesson Editor Permissions", "User with permissions.lessons=false is blocked from all lesson actions", () => {
    assert(!canAccessModule(restrictedTeacher, "lessons"), "Restricted user cannot access lessons module");
    assert(!canPerformAction(restrictedTeacher, "edit", "lessons"), "Restricted user cannot edit lessons");
    assert(!canPerformAction(restrictedTeacher, "create", "lessons"), "Restricted user cannot create lessons");
  });

  // Suite 3: Editor Protection State Logic
  test("Editor Protection Logic", "Calculates readOnly=true for viewer role", () => {
    const isSubjectAllowed = canAccessSubject(viewerUser, mathLesson.subjectId);
    const canEdit = canPerformAction(viewerUser, "edit", "lessons") && isSubjectAllowed;
    const readOnly = !canEdit;
    assert(readOnly === true, "Viewer must be in readOnly mode");
  });

  test("Editor Protection Logic", "Calculates readOnly=true when teacher tries to open lesson in unauthorized subject", () => {
    const isSubjectAllowed = canAccessSubject(mathTeacher, arabicLesson.subjectId);
    const canEdit = canPerformAction(mathTeacher, "edit", "lessons") && isSubjectAllowed;
    const readOnly = !canEdit;
    assert(readOnly === true, "Teacher in unauthorized subject must be readOnly / access denied");
    assert(isSubjectAllowed === false, "Subject access should be false");
  });

  test("Editor Protection Logic", "Calculates readOnly=false for authorized teacher on assigned subject", () => {
    const isSubjectAllowed = canAccessSubject(mathTeacher, mathLesson.subjectId);
    const canEdit = canPerformAction(mathTeacher, "edit", "lessons") && isSubjectAllowed;
    const readOnly = !canEdit;
    assert(readOnly === false, "Teacher on math lesson should have readOnly=false");
  });

  test("Editor Protection Logic", "Ctrl+S save handler logic blocks save for unauthorized users", () => {
    function simulateSave(user: User, lesson: Lesson): { success: boolean; reason?: string } {
      const isAllowed = canAccessSubject(user, lesson.subjectId);
      const canEdit = canPerformAction(user, "edit", "lessons") && isAllowed;
      if (!canEdit) {
        return { success: false, reason: "لا تملك صلاحية تحرير هذا الدرس" };
      }
      return { success: true };
    }

    const res1 = simulateSave(viewerUser, mathLesson);
    assert(!res1.success, "Save should fail for viewer");

    const res2 = simulateSave(mathTeacher, arabicLesson);
    assert(!res2.success, "Save should fail for unassigned subject");

    const res3 = simulateSave(mathTeacher, mathLesson);
    assert(res3.success, "Save should succeed for authorized teacher");
  });

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  return {
    total: results.length,
    passed: passedCount,
    failed: failedCount,
    results,
  };
}

// Standalone runner when executed via tsx
if (process.argv[1] && process.argv[1].includes("lessonEditorSecurity.test")) {
  console.log("=================================================");
  console.log(" Running Lesson Editor Security & RBAC Test Suite ");
  console.log("=================================================\n");
  const report = runLessonEditorSecurityTests();
  report.results.forEach((r) => {
    const mark = r.passed ? "✔ PASS" : "✖ FAIL";
    console.log(`${mark} [${r.suite}] ${r.name}`);
    if (!r.passed && r.error) {
      console.log(`       Error: ${r.error}`);
    }
  });
  console.log(`\nResults: ${report.passed}/${report.total} tests passed.`);
  if (report.failed > 0) {
    process.exit(1);
  }
}
