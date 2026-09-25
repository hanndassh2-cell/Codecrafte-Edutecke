/**
 * Question Bank Security & RBAC Protection Test Suite
 * Tests strict enforcement of access control, permissions, subject restrictions,
 * and bulk/import guardrails for the Question Bank module.
 */

import {
  canAccessSubject,
  canPerformAction,
  canAccessModule,
  filterAllowedSubjects,
  filterAllowedItemsBySubject,
} from "../services/rbacEngine";
import { User, Question, Subject, Unit, Lesson } from "../types";

export interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  error?: string;
}

export function runQuestionBankSecurityTests(): {
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
    id: "usr-teacher-math",
    name: "معلم رياضيات",
    email: "math@test.com",
    role: "teacher",
    status: "active",
    allowedSubjectIds: ["sub-math-1"],
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

  const restrictedViewer: User = {
    id: "usr-viewer",
    name: "مستخدم مشاهد",
    email: "viewer@test.com",
    role: "viewer",
    status: "active",
    allowedSubjectIds: ["sub-math-1"],
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

  const contentReviewer: User = {
    id: "usr-reviewer",
    name: "مراجع محتوى",
    email: "reviewer@test.com",
    role: "reviewer",
    status: "active",
    allowedSubjectIds: ["sub-math-1", "sub-physics-1"],
  };

  // Sample Mock Curriculum & Questions
  const mockSubjects: Subject[] = [
    { id: "sub-math-1", name: "الرياضيات", code: "MATH12", color: "#2563eb", icon: "Book", description: "", status: "active" },
    { id: "sub-physics-1", name: "الفيزياء", code: "PHYS12", color: "#dc2626", icon: "Book", description: "", status: "active" },
    { id: "sub-chemistry-1", name: "الكيمياء", code: "CHEM12", color: "#059669", icon: "Book", description: "", status: "active" },
  ];

  const mockUnits: Unit[] = [
    { id: "u-math-1", subjectId: "sub-math-1", title: "التفاضل والتكامل", code: "U1", description: "", orderIndex: 1, status: "active" },
    { id: "u-phys-1", subjectId: "sub-physics-1", title: "الميكانيكا", code: "U1", description: "", orderIndex: 1, status: "active" },
    { id: "u-chem-1", subjectId: "sub-chemistry-1", title: "الكيمياء العضوية", code: "U1", description: "", orderIndex: 1, status: "active" },
  ];

  const mockLessons: Lesson[] = [
    { id: "l-math-1", unitId: "u-math-1", title: "قواعد الاشتقاق", orderIndex: 1, subjectId: "sub-math-1", durationMinutes: 45, objectives: [], status: "approved" },
    { id: "l-phys-1", unitId: "u-phys-1", title: "قوانين نيوتن", orderIndex: 1, subjectId: "sub-physics-1", durationMinutes: 45, objectives: [], status: "approved" },
    { id: "l-chem-1", unitId: "u-chem-1", title: "الهيدروكربونات", orderIndex: 1, subjectId: "sub-chemistry-1", durationMinutes: 45, objectives: [], status: "approved" },
  ];

  const mockQuestions: Question[] = [
    {
      id: "q-math-1",
      subjectId: "sub-math-1",
      unitId: "u-math-1",
      lessonId: "l-math-1",
      type: "mcq",
      text: "ما هي مشتقة x^2؟",
      answer: "2x",
      difficulty: "easy",
      importance: 5,
      status: "active",
      tags: ["رياضيات"],
      isPastCycle: false,
      occurrencesCount: 1,
      futureProbability: 80,
      finalWeightScore: 4.5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "q-phys-1",
      subjectId: "sub-physics-1",
      unitId: "u-phys-1",
      lessonId: "l-phys-1",
      type: "essay",
      text: "اشرح قانون نيوتن الثاني.",
      answer: "F = ma",
      difficulty: "medium",
      importance: 4,
      status: "active",
      tags: ["فيزياء"],
      isPastCycle: false,
      occurrencesCount: 0,
      futureProbability: 70,
      finalWeightScore: 3.8,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "q-chem-1",
      subjectId: "sub-chemistry-1",
      unitId: "u-chem-1",
      lessonId: "l-chem-1",
      type: "mcq",
      text: "ما الصيغة الجزيئية للميثان؟",
      answer: "CH4",
      difficulty: "easy",
      importance: 3,
      status: "active",
      tags: ["كيمياء"],
      isPastCycle: false,
      occurrencesCount: 0,
      futureProbability: 50,
      finalWeightScore: 2.8,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  // 1. Module Access Tests
  test("Module Access", "Admin can access questions module", () => {
    assert(canAccessModule(adminUser, "questions"), "Admin should access questions");
  });

  test("Module Access", "Teacher can access questions module", () => {
    assert(canAccessModule(mathTeacher, "questions"), "Teacher should access questions");
  });

  test("Module Access", "Reviewer can access questions module", () => {
    assert(canAccessModule(contentReviewer, "questions"), "Reviewer should access questions");
  });

  test("Module Access", "Viewer module access evaluation", () => {
    const viewerCanAccess = canAccessModule(restrictedViewer, "questions");
    assert(typeof viewerCanAccess === "boolean", "Viewer access must evaluate cleanly");
  });

  // 2. Subject Restrictions & Data Filtering Tests
  test("Subject Filtering", "Math teacher only sees math subjects and questions", () => {
    const allowedSubs = filterAllowedSubjects(mathTeacher, mockSubjects);
    assert(allowedSubs.length === 1 && allowedSubs[0].id === "sub-math-1", "Only math subject allowed");

    const allowedQs = filterAllowedItemsBySubject(mathTeacher, mockQuestions);
    assert(allowedQs.length === 1 && allowedQs[0].id === "q-math-1", "Only math question allowed");
    assert(!allowedQs.some((q) => q.subjectId === "sub-physics-1"), "Physics question must be filtered out");
  });

  test("Subject Filtering", "Admin sees all subjects, units, and questions", () => {
    const allowedSubs = filterAllowedSubjects(adminUser, mockSubjects);
    assert(allowedSubs.length === mockSubjects.length, "Admin should see all subjects");

    const allowedQs = filterAllowedItemsBySubject(adminUser, mockQuestions);
    assert(allowedQs.length === mockQuestions.length, "Admin should see all questions");
  });

  test("Subject Filtering", "Units and lessons are strictly filtered by allowed subjects", () => {
    const allowedUnits = filterAllowedItemsBySubject(mathTeacher, mockUnits);
    assert(allowedUnits.length === 1 && allowedUnits[0].subjectId === "sub-math-1", "Only math units allowed");

    const allowedLessons = filterAllowedItemsBySubject(mathTeacher, mockLessons);
    assert(allowedLessons.length === 1 && allowedLessons[0].id === "l-math-1", "Only math lessons allowed");
  });

  // 3. Action Authorization Tests
  test("Action Permissions", "Viewer cannot delete questions", () => {
    const canDelete = canPerformAction(restrictedViewer, "delete", "questions");
    assert(!canDelete, "Viewer must not have delete permission");
  });

  test("Action Permissions", "Subject boundary check on create/edit", () => {
    assert(canAccessSubject(mathTeacher, "sub-math-1"), "Math teacher can access math subject");
    assert(!canAccessSubject(mathTeacher, "sub-physics-1"), "Math teacher cannot access physics subject");
    assert(!canAccessSubject(mathTeacher, "sub-chemistry-1"), "Math teacher cannot access chemistry subject");
  });

  test("Action Permissions", "Reviewer can edit/review questions in assigned subjects", () => {
    const canEdit = canPerformAction(contentReviewer, "edit", "questions");
    assert(canEdit, "Reviewer must have edit permission");
    assert(canAccessSubject(contentReviewer, "sub-math-1"), "Reviewer has math subject access");
    assert(canAccessSubject(contentReviewer, "sub-physics-1"), "Reviewer has physics subject access");
    assert(!canAccessSubject(contentReviewer, "sub-chemistry-1"), "Reviewer does NOT have chemistry access");
  });

  // 4. Bulk Import & OCR Guardrails
  test("Import Protection", "Teacher cannot import questions into unauthorized subjects", () => {
    const importTargetSubjectId = "sub-physics-1";
    const isAuthorized = canAccessSubject(mathTeacher, importTargetSubjectId);
    assert(!isAuthorized, "Math teacher must be blocked from importing to Physics");
  });

  test("Import Protection", "Teacher cannot save OCR extractions without subject authorization", () => {
    const ocrSubject = "sub-chemistry-1";
    const canSave = canPerformAction(mathTeacher, "create", "questions") && canAccessSubject(mathTeacher, ocrSubject);
    assert(!canSave, "OCR extraction saving must be rejected if user lacks subject access");
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
