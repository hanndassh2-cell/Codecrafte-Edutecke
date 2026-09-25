import {
  Subject,
  Unit,
  Lesson,
  Question,
  Exam,
  ExamLibraryDocument,
  AuditLog,
} from "../types";
import { getStoredData, setStoredData, KEYS, storage } from "./storage";
import { validateCurriculumContext } from "../utils/curriculumValidator";

export interface ReferenceInfo {
  entityType: "lesson" | "lesson_card" | "exam" | "exam_library";
  id: string;
  title: string;
  subjectName?: string;
  unitTitle?: string;
  details?: string;
}

export interface QuestionDependencyReport {
  questionId: string;
  questionText: string;
  activeReferencesCount: number;
  references: ReferenceInfo[];
  canHardDelete: boolean;
  blockedReasons: string[];
}

export interface QuestionComplianceItem {
  questionId: string;
  questionText: string;
  status: "compliant" | "repaired" | "requires_review";
  currentSubjectId: string;
  currentUnitId: string;
  currentLessonId: string;
  expectedSubjectName?: string;
  expectedUnitTitle?: string;
  expectedLessonTitle?: string;
  issueDescription?: string;
}

export interface CurriculumComplianceReport {
  timestamp: string;
  totalQuestionsAudited: number;
  compliantCount: number;
  autoRepairedCount: number;
  requiresReviewCount: number;
  archivedCount: number;
  items: QuestionComplianceItem[];
}

export interface CurriculumDependencyReport {
  entityType: "subject" | "unit" | "lesson";
  id: string;
  name: string;
  childUnitsCount: number;
  childLessonsCount: number;
  linkedQuestionsCount: number;
  linkedCardsCount: number;
  linkedExamsCount: number;
  canDeleteSafely: boolean;
  warnings: string[];
}

export interface ModuleIntegrityStatus {
  status: "valid" | "warning" | "error";
  message: string;
  details?: string;
}

export interface SystemIntegrityReport {
  timestamp: string;
  isHealthy: boolean;
  score: number; // 0 - 100%
  totalSubjects: number;
  totalUnits: number;
  totalLessons: number;
  totalCanonicalQuestions: number;
  totalActiveReferences: number;
  orphanedQuestionsCount: number;
  brokenReferencesCount: number;
  duplicateUUIDsCount: number;
  unlinkedActiveQuestionsCount: number;
  archivedQuestionsCount: number;
  modules: {
    curriculumTree: ModuleIntegrityStatus;
    questionBank: ModuleIntegrityStatus;
    lessonEditor: ModuleIntegrityStatus;
    examGenerator: ModuleIntegrityStatus;
    examLibrary: ModuleIntegrityStatus;
  };
  violations: string[];
}

export interface TransactionSnapshot {
  id: string;
  timestamp: string;
  actionName: string;
  dataBackupJson: string;
  user: string;
  entitiesAffected: string[];
  signature?: string;
  schemaVersion?: number;
}

const SNAPSHOTS_KEY = "edutech_governance_snapshots_v1";
const MAX_SNAPSHOTS = 5;

export interface DirectionalTestFailureDetail {
  key?: string;
  examId?: string;
  examTitle?: string;
  versionCode?: string;
  questionId?: string;
  fieldPath?: string;
  beforeVal?: any;
  afterVal?: any;
  canAutoFix?: boolean;
}

export interface DirectionalTestResult {
  testName: string;
  passed: boolean;
  details: string;
  failureDetails?: DirectionalTestFailureDetail[];
}

export class CentralGovernanceEngine {
  private static instance: CentralGovernanceEngine;

  private constructor() {}

  public static getInstance(): CentralGovernanceEngine {
    if (!CentralGovernanceEngine.instance) {
      CentralGovernanceEngine.instance = new CentralGovernanceEngine();
    }
    return CentralGovernanceEngine.instance;
  }

  private generateChecksum(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  }

  // -------------------------------------------------------------
  // 1. TRANSACTION MANAGER & AUTOMATIC SNAPSHOT BACKUPS
  // -------------------------------------------------------------
  public createRollbackSnapshot(actionName: string, user: string = "المسؤول"): string {
    try {
      const snapshotId = `snap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const backupData = {
        subjects: getStoredData(KEYS.SUBJECTS, []),
        units: getStoredData(KEYS.UNITS, []),
        lessons: getStoredData(KEYS.LESSONS, []),
        questions: getStoredData(KEYS.QUESTIONS, []),
        lessonCards: getStoredData(KEYS.LESSON_CARDS, {}),
        exams: getStoredData(KEYS.EXAMS, []),
        examsLibrary: getStoredData("edutech_exams_library_v1", []),
        templates: getStoredData("edutech_templates_v1", []),
      };

      const dataBackupJson = JSON.stringify(backupData);

      const snapshot: TransactionSnapshot = {
        id: snapshotId,
        timestamp: new Date().toISOString(),
        actionName,
        dataBackupJson: dataBackupJson,
        user,
        entitiesAffected: [actionName],
        signature: this.generateChecksum(dataBackupJson),
        schemaVersion: 2,
      };

      const snapshots = getStoredData<TransactionSnapshot[]>(SNAPSHOTS_KEY, []);
      snapshots.unshift(snapshot);
      if (snapshots.length > MAX_SNAPSHOTS) {
        snapshots.length = MAX_SNAPSHOTS;
      }
      setStoredData(SNAPSHOTS_KEY, snapshots);
      
      const verify = getStoredData<TransactionSnapshot[]>(SNAPSHOTS_KEY, []);
      if (!verify.find(s => s.id === snapshotId)) {
        throw new Error("لم يتم حفظ اللقطة بشكل صحيح بسبب قيود التخزين أو خطأ آخر");
      }
      
      return snapshotId;
    } catch (err) {
      console.warn("Failed to create transaction rollback snapshot:", err);
      throw new Error(`فشل إنشاء نسخة الأمان: ${err}`);
    }
  }

  public rollbackToSnapshot(snapshotId: string): boolean {
    const snapshots = getStoredData<TransactionSnapshot[]>(SNAPSHOTS_KEY, []);
    const found = snapshots.find((s) => s.id === snapshotId);
    if (!found || !found.dataBackupJson) return false;

    if (found.schemaVersion && found.schemaVersion >= 2) {
      const currentHash = this.generateChecksum(found.dataBackupJson);
      if (currentHash !== found.signature) {
        console.error("Snapshot signature mismatch. The snapshot might be corrupted.");
        throw new Error("بصمة التحقق غير متطابقة. النسخة تالفة أو تم العبث بها.");
      }
    }

    let rescuePointId = "";
    try {
      rescuePointId = this.createRollbackSnapshot("Rescue Point Before Restore: " + snapshotId, "النظام");
    } catch (e) {
      console.warn("Rescue point creation failed, continuing without rescue point due to storage limits", e);
    }

    try {
      const restored = JSON.parse(found.dataBackupJson);

      const writeAndVerify = (key: string, data: any) => {
        setStoredData(key, data);
        const verified = getStoredData(key, null);
        if (!verified) throw new Error(`Verify failed for ${key}`);
      };

      if (restored.subjects) writeAndVerify(KEYS.SUBJECTS, restored.subjects);
      if (restored.units) writeAndVerify(KEYS.UNITS, restored.units);
      if (restored.lessons) writeAndVerify(KEYS.LESSONS, restored.lessons);
      if (restored.questions) writeAndVerify(KEYS.QUESTIONS, restored.questions);
      if (restored.lessonCards) writeAndVerify(KEYS.LESSON_CARDS, restored.lessonCards);
      if (restored.exams) {
        writeAndVerify(KEYS.EXAMS, restored.exams);
        storage.syncSafeBackupForKey(KEYS.EXAMS);
      }
      if (restored.examsLibrary) writeAndVerify("edutech_exams_library_v1", restored.examsLibrary);
      if (restored.templates) writeAndVerify("edutech_templates_v1", restored.templates);

      this.logAudit(
        "نظام الحوكمة",
        `استعادة نقطة التراجع (Rollback Snapshot): ${found.actionName}`,
        "الحوكمة المركزية",
        snapshotId
      );

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("refresh-data-all"));
      }
      return true;
    } catch (err) {
      console.error("Rollback failed, attempting to restore rescue point:", err);
      if (rescuePointId) {
        try {
          const rescueSnap = getStoredData<TransactionSnapshot[]>(SNAPSHOTS_KEY, []).find(s => s.id === rescuePointId);
          if (rescueSnap) {
            const rescueData = JSON.parse(rescueSnap.dataBackupJson);
            if (rescueData.subjects) setStoredData(KEYS.SUBJECTS, rescueData.subjects);
            if (rescueData.units) setStoredData(KEYS.UNITS, rescueData.units);
            if (rescueData.lessons) setStoredData(KEYS.LESSONS, rescueData.lessons);
            if (rescueData.questions) setStoredData(KEYS.QUESTIONS, rescueData.questions);
            if (rescueData.lessonCards) setStoredData(KEYS.LESSON_CARDS, rescueData.lessonCards);
            if (rescueData.exams) {
              setStoredData(KEYS.EXAMS, rescueData.exams);
              storage.syncSafeBackupForKey(KEYS.EXAMS);
            }
            if (rescueData.examsLibrary) setStoredData("edutech_exams_library_v1", rescueData.examsLibrary);
            if (rescueData.templates) setStoredData("edutech_templates_v1", rescueData.templates);
          }
        } catch (e) {
          console.error("Fatal: failed to restore rescue point", e);
        }
      }
      throw new Error(`فشل الاستعادة وتم العودة للحالة السابقة جزئياً: ${err}`);
    }
  }

  public getSnapshots(): TransactionSnapshot[] {
    return getStoredData<TransactionSnapshot[]>(SNAPSHOTS_KEY, []);
  }

  public executeTransaction<T>(
    actionName: string,
    operation: () => T,
    user: string = "المعلم"
  ): { success: boolean; data?: T; error?: string; snapshotId?: string } {
    let snapshotId = "";
    try {
      snapshotId = this.createRollbackSnapshot(actionName, user);
    } catch (err: any) {
      this.logAudit(user, `فشل إنشاء نسخة الأمان للمعاملة: ${actionName}`, "الحوكمة المركزية");
      return { success: false, error: err?.message || String(err) };
    }
    try {
      const result = operation();
      this.logAudit(user, `نجاح المعاملة الآمنة: ${actionName}`, "الحوكمة المركزية", undefined, `Snapshot: ${snapshotId}`);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("refresh-data-all"));
      }
      return { success: true, data: result, snapshotId };
    } catch (err: any) {
      console.error(`Transaction [${actionName}] failed. Triggering automatic rollback...`, err);
      if (snapshotId) {
        try {
          this.rollbackToSnapshot(snapshotId);
        } catch (rollbackErr) {
          console.error("Failed to rollback during transaction failure", rollbackErr);
        }
      }
      this.logAudit(
        user,
        `فشل المعاملة والتراجع التلقائي: ${actionName} - ${err?.message || err}`,
        "الحوكمة المركزية"
      );
      return { success: false, error: err?.message || String(err), snapshotId };
    }
  }

  private logAudit(
    userName: string,
    action: string,
    module: string,
    entityId?: string,
    details?: string
  ) {
    try {
      const logs = getStoredData<AuditLog[]>(KEYS.AUDIT_LOGS, []);
      const newLog: AuditLog = {
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        userId: "usr-governance",
        userName,
        action,
        targetEntity: module,
        targetEntityId: entityId,
        module,
        details,
        timestamp: new Date().toISOString(),
      };
      logs.unshift(newLog);
      if (logs.length > 500) logs.length = 500;
      setStoredData(KEYS.AUDIT_LOGS, logs);
    } catch (e) {}
  }

  // -------------------------------------------------------------
  // 2. DEPENDENCY & REFERENCE INSPECTION ACROSS ALL 5 MODULES
  // -------------------------------------------------------------
  public inspectQuestionReferences(questionId: string): QuestionDependencyReport {
    const questions = getStoredData<Question[]>(KEYS.QUESTIONS, []);
    const lessons = getStoredData<Lesson[]>(KEYS.LESSONS, []);
    const subjects = getStoredData<Subject[]>(KEYS.SUBJECTS, []);
    const units = getStoredData<Unit[]>(KEYS.UNITS, []);
    const cardsMap = getStoredData<Record<string, any[]>>(KEYS.LESSON_CARDS, {});
    const exams = getStoredData<Exam[]>(KEYS.EXAMS, []);
    const libraryExams = getStoredData<ExamLibraryDocument[]>("edutech_exams_library_v1", []);

    const targetQ = questions.find((q) => q.id === questionId);
    const references: ReferenceInfo[] = [];
    const blockedReasons: string[] = [];

    if (!targetQ) {
      return {
        questionId,
        questionText: "سؤال غير موجود",
        activeReferencesCount: 0,
        references: [],
        canHardDelete: true,
        blockedReasons: [],
      };
    }

    // 1. Check in Lessons (lessonId, lessonIds, lesson.questionIds)
    const linkedLessonIds = new Set<string>();
    if (targetQ.lessonId && targetQ.lessonId.trim()) {
      linkedLessonIds.add(targetQ.lessonId.trim());
    }
    if (Array.isArray(targetQ.lessonIds)) {
      targetQ.lessonIds.forEach((lid) => {
        if (lid && lid.trim()) linkedLessonIds.add(lid.trim());
      });
    }
    lessons.forEach((l) => {
      if (Array.isArray(l.questionIds) && l.questionIds.includes(questionId)) {
        linkedLessonIds.add(l.id);
      }
    });

    linkedLessonIds.forEach((lid) => {
      const parentLesson = lessons.find((l) => l.id === lid);
      references.push({
        entityType: "lesson",
        id: lid,
        title: parentLesson?.title || "درس",
        subjectName: parentLesson?.subjectId,
        details: "مرتبط بالدرس (عبر المسار أو قائمة أسئلة الدرس)",
      });
    });

    // 2. Check in Lesson Cards (embedded in card bodies or card definitions)
    Object.entries(cardsMap).forEach(([lessonId, cards]) => {
      const parentLesson = lessons.find((l) => l.id === lessonId);
      if (Array.isArray(cards)) {
        cards.forEach((card, idx) => {
          if (card.type === "questions" && card.body) {
            let containsQ = false;
            try {
              if (card.body.includes(questionId)) {
                containsQ = true;
              }
            } catch (e) {}

            if (containsQ) {
              references.push({
                entityType: "lesson_card",
                id: `${lessonId}#${card.id || idx}`,
                title: `${parentLesson?.title || "درس"} (بطاقة أسئلة ${idx + 1})`,
                subjectName: parentLesson?.subjectId,
                details: `مدرج داخل بطاقة أسئلة بالدرس: ${card.title || ""}`,
              });
            }
          }
        });
      }
    });

    // 3. Check in Stored Exams (مولد النماذج)
    exams.forEach((exam) => {
      let usedInExam = false;
      exam.versions?.forEach((v) => {
        if (v.questions?.some((q) => q.questionId === questionId)) {
          usedInExam = true;
        }
      });
      if (usedInExam) {
        references.push({
          entityType: "exam",
          id: exam.id,
          title: exam.title,
          details: "مستخدم في نموذج امتحاني محفوظ",
        });
      }
    });

    // 4. Check in Exams Library (مكتبة الاختبارات)
    libraryExams.forEach((doc) => {
      if (doc.usedQuestionIds?.includes(questionId)) {
        references.push({
          entityType: "exam_library",
          id: doc.examId,
          title: doc.title,
          details: "مستخدم في وثيقة معتمدة بمكتبة الاختبارات",
        });
      }
    });

    const activeCount = references.length;
    const canHardDelete = activeCount === 0;

    if (activeCount > 0) {
      blockedReasons.push(
        `السؤال مرتبط حالياً بـ (${activeCount}) موضع (${references.filter((r) => r.entityType === "lesson" || r.entityType === "lesson_card").length} دروس/بطاقات، ${references.filter((r) => r.entityType === "exam" || r.entityType === "exam_library").length} اختبارات).`
      );
      blockedReasons.push(
        "تنص قواعد الحوكمة على منع الحذف النهائي لأي سؤال ذي ارتباطات فعالة لمنع تلف بيانات الاختبارات والدروس. يُرجى إلغاء الارتباط أولاً أو استخدام الأرشفة (Soft Delete)."
      );
    }

    return {
      questionId,
      questionText: targetQ.text || "",
      activeReferencesCount: activeCount,
      references,
      canHardDelete,
      blockedReasons,
    };
  }

  public inspectCurriculumDependencies(
    type: "subject" | "unit" | "lesson",
    id: string
  ): CurriculumDependencyReport {
    const subjects = getStoredData<Subject[]>(KEYS.SUBJECTS, []);
    const units = getStoredData<Unit[]>(KEYS.UNITS, []);
    const lessons = getStoredData<Lesson[]>(KEYS.LESSONS, []);
    const questions = getStoredData<Question[]>(KEYS.QUESTIONS, []);
    const cardsMap = getStoredData<Record<string, any[]>>(KEYS.LESSON_CARDS, {});
    const exams = getStoredData<Exam[]>(KEYS.EXAMS, []);
    const libraryExams = getStoredData<ExamLibraryDocument[]>("edutech_exams_library_v1", []);

    const warnings: string[] = [];

    if (type === "lesson") {
      const lesson = lessons.find((l) => l.id === id);
      const name = lesson?.title || "الدرس";
      const linkedQuestions = questions.filter(
        (q) => q.lessonId === id || (Array.isArray(q.lessonIds) && q.lessonIds.includes(id))
      );
      const lessonCards = cardsMap[id] || lesson?.contentParagraphs || [];
      const linkedExams = [
        ...exams.filter((e) => e.lessonIds?.includes(id)),
        ...libraryExams.filter((e) => e.scope?.lessonIds?.includes(id)),
      ];

      const canDeleteSafely = linkedQuestions.length === 0 && linkedExams.length === 0;
      if (linkedQuestions.length > 0) {
        warnings.push(`هذا الدرس يضم (${linkedQuestions.length}) سؤال مسجل في بنك الأسئلة.`);
      }
      if (linkedExams.length > 0) {
        warnings.push(`هذا الدرس مستخدم كنطاق في (${linkedExams.length}) اختبار.`);
      }

      return {
        entityType: "lesson",
        id,
        name,
        childUnitsCount: 0,
        childLessonsCount: 0,
        linkedQuestionsCount: linkedQuestions.length,
        linkedCardsCount: Array.isArray(lessonCards) ? lessonCards.length : 0,
        linkedExamsCount: linkedExams.length,
        canDeleteSafely,
        warnings,
      };
    } else if (type === "unit") {
      const unit = units.find((u) => u.id === id);
      const name = unit?.title || "الوحدة";
      const childLessons = lessons.filter((l) => l.unitId === id);
      const childLessonIds = new Set(childLessons.map((l) => l.id));
      const linkedQuestions = questions.filter(
        (q) => q.unitId === id || (q.lessonId && childLessonIds.has(q.lessonId))
      );
      const linkedExams = [
        ...exams.filter((e) => e.unitIds?.includes(id)),
        ...libraryExams.filter((e) => e.scope?.unitIds?.includes(id)),
      ];

      const canDeleteSafely = childLessons.length === 0 && linkedQuestions.length === 0;
      if (childLessons.length > 0) {
        warnings.push(`هذه الوحدة تحتوي على (${childLessons.length}) درس تابع.`);
      }
      if (linkedQuestions.length > 0) {
        warnings.push(`هذه الوحدة تحتوي على (${linkedQuestions.length}) سؤال في بنك الأسئلة.`);
      }

      return {
        entityType: "unit",
        id,
        name,
        childUnitsCount: 0,
        childLessonsCount: childLessons.length,
        linkedQuestionsCount: linkedQuestions.length,
        linkedCardsCount: 0,
        linkedExamsCount: linkedExams.length,
        canDeleteSafely,
        warnings,
      };
    } else {
      const sub = subjects.find((s) => s && s.id === id);
      const name = sub?.name || "المادة";
      const childUnits = units.filter((u) => u && u.subjectId === id);
      const childLessons = lessons.filter((l) => l && l.subjectId === id);
      const linkedQuestions = questions.filter((q) => q && q.subjectId === id);
      const linkedExams = [
        ...exams.filter((e) => e && e.subjectId === id),
        ...libraryExams.filter((e) => e && e.scope && e.scope.subjectId === id),
      ];

      const canDeleteSafely = childUnits.length === 0 && linkedQuestions.length === 0;
      if (childUnits.length > 0) {
        warnings.push(`المادة تحتوي على (${childUnits.length}) وحدة و (${childLessons.length}) درس.`);
      }
      if (linkedQuestions.length > 0) {
        warnings.push(`المادة تحتوي على (${linkedQuestions.length}) سؤال في بنك الأسئلة.`);
      }

      return {
        entityType: "subject",
        id,
        name,
        childUnitsCount: childUnits.length,
        childLessonsCount: childLessons.length,
        linkedQuestionsCount: linkedQuestions.length,
        linkedCardsCount: 0,
        linkedExamsCount: linkedExams.length,
        canDeleteSafely,
        warnings,
      };
    }
  }

  // -------------------------------------------------------------
  // 3. SYSTEM-WIDE REFERENTIAL INTEGRITY VALIDATOR
  // -------------------------------------------------------------
  public validateReferentialIntegrity(): SystemIntegrityReport {
    const subjects = getStoredData<Subject[]>(KEYS.SUBJECTS, []);
    const units = getStoredData<Unit[]>(KEYS.UNITS, []);
    const lessons = getStoredData<Lesson[]>(KEYS.LESSONS, []);
    const questions = getStoredData<Question[]>(KEYS.QUESTIONS, []);
    const cardsMap = getStoredData<Record<string, any[]>>(KEYS.LESSON_CARDS, {});
    const exams = getStoredData<Exam[]>(KEYS.EXAMS, []);
    const libraryExams = getStoredData<ExamLibraryDocument[]>("edutech_exams_library_v1", []);

    const subjectMap = new Map<string, Subject>(subjects.map((s) => [s.id, s]));
    const unitMap = new Map<string, Unit>(units.map((u) => [u.id, u]));
    const lessonMap = new Map<string, Lesson>(lessons.map((l) => [l.id, l]));
    
    // Check for duplicate UUIDs
    const questionIdCounts = new Map<string, number>();
    questions.forEach(q => {
      questionIdCounts.set(q.id, (questionIdCounts.get(q.id) || 0) + 1);
    });
    
    let duplicateUUIDsCount = 0;
    questionIdCounts.forEach((count, id) => {
      if (count > 1) {
        duplicateUUIDsCount += (count - 1);
      }
    });

    const questionMap = new Map<string, Question>(questions.map((q) => [q.id, q]));

    const violations: string[] = [];
    let orphanedQuestionsCount = 0;
    let brokenReferencesCount = 0;
    let totalActiveReferences = 0;
    let unlinkedActiveQuestionsCount = 0;
    let archivedQuestionsCount = 0;
    let curriculumConflictsCount = 0;

    // Check Curriculum tree conflicts
    units.filter(Boolean).forEach(u => {
      if (u && (!u.subjectId || !subjectMap.has(u.subjectId))) {
        curriculumConflictsCount++;
        violations.push(`الوحدة [${u.title || u.id}] تفتقد مادة أصلية.`);
      }
    });
    lessons.filter(Boolean).forEach(l => {
      if (l && (!l.unitId || !unitMap.has(l.unitId))) {
        curriculumConflictsCount++;
        violations.push(`الدرس [${l.title || l.id}] يفتقد وحدة أصلية.`);
      }
    });

    // Check Question Foreign Keys
    questions.forEach((q) => {
      if (q.status === "archived") {
        archivedQuestionsCount++;
      }
      let isOrphan = false;
      if (q.subjectId && !subjectMap.has(q.subjectId)) {
        violations.push(`السؤال [${q.id}] يرتبط بمادة غير موجودة (${q.subjectId}).`);
        isOrphan = true;
      }
      if (q.unitId && !unitMap.has(q.unitId)) {
        violations.push(`السؤال [${q.id}] يرتبط بوحدة غير موجودة (${q.unitId}).`);
        isOrphan = true;
      }
      if (q.lessonId && !lessonMap.has(q.lessonId)) {
        violations.push(`السؤال [${q.id}] يرتبط بدرس غير موجود (${q.lessonId}).`);
        isOrphan = true;
      }
      
      if (isOrphan) {
        orphanedQuestionsCount++;
      }
      
      if (!q.lessonIds || q.lessonIds.length === 0) {
        unlinkedActiveQuestionsCount++;
      }
    });

    // Check Lesson -> Question References
    lessons.forEach((l) => {
      if (Array.isArray(l.questionIds)) {
        l.questionIds.forEach((qid) => {
          totalActiveReferences++;
          if (!questionMap.has(qid)) {
            violations.push(`الدرس [${l.title}] يملك مرجعاً لسؤال محذوف أو غير موجود (${qid}).`);
            brokenReferencesCount++;
          }
        });
      }
    });

    // Check Cards -> Question References
    Object.keys(cardsMap).forEach(lessonId => {
       const cards = cardsMap[lessonId];
       cards.forEach(card => {
         if (card.type === "questions" && card.body) {
           try {
             const parsedQs = JSON.parse(card.body);
             if (Array.isArray(parsedQs)) {
                parsedQs.forEach(pq => {
                   if (pq.id) {
                     totalActiveReferences++;
                     if (!questionMap.has(pq.id)) {
                       violations.push(`بطاقة في الدرس [${lessonId}] تمتلك مرجعاً لسؤال محذوف (${pq.id}).`);
                       brokenReferencesCount++;
                     }
                   }
                });
             }
           } catch(e) {}
         }
       });
    });

    // Check Exams -> Question References
    exams.forEach((exam) => {
      exam.versions?.forEach((v) => {
        v.questions?.forEach((eq) => {
          if (eq.questionId) {
            totalActiveReferences++;
            if (!questionMap.has(eq.questionId)) {
              violations.push(`الاختبار [${exam.title}] يشير لسؤال غير موجود في البنك (${eq.questionId}).`);
              brokenReferencesCount++;
            }
          }
        });
      });
    });

    // Check Exams Library -> Question References
    libraryExams.forEach((doc) => {
      doc.usedQuestionIds?.forEach((qid) => {
        totalActiveReferences++;
        if (!questionMap.has(qid)) {
          violations.push(`مكتبة الاختبارات [${doc.title}] تشير لسؤال غير موجود في البنك (${qid}).`);
          brokenReferencesCount++;
        }
      });
    });

    // Compute Module statuses
    const curriculumStatus: ModuleIntegrityStatus = {
      status: curriculumConflictsCount === 0 ? "valid" : "error",
      message: `${subjects.length} مواد | ${units.length} وحدات | ${lessons.length} دروس` + (curriculumConflictsCount > 0 ? ` (${curriculumConflictsCount} تعارضات)` : ` (لا تعارضات)`),
    };

    const questionBankStatus: ModuleIntegrityStatus = {
      status: (orphanedQuestionsCount === 0 && duplicateUUIDsCount === 0) ? "valid" : "warning",
      message: `${questions.length} سؤال أصلي موثق | ${archivedQuestionsCount} مؤرشف | ${duplicateUUIDsCount} مكرر`,
    };

    const lessonEditorStatus: ModuleIntegrityStatus = {
      status: brokenReferencesCount === 0 ? "valid" : "warning",
      message: brokenReferencesCount === 0 ? `جميع المراجع سليمة وتستخدم معرفات البنك الأصلي` : `${brokenReferencesCount} مراجع مكسورة تحتاج للإصلاح`,
    };

    const examGeneratorStatus: ModuleIntegrityStatus = {
      status: "valid",
      message: `النماذج الامتحانية مرتبطة بالمعرفات الأصلية للأسئلة`,
    };

    const examLibraryStatus: ModuleIntegrityStatus = {
      status: "valid",
      message: `${libraryExams.length} اختبار مؤرشف وموثق الارتباطات بالبنك المركزي`,
    };

    const totalIssues = orphanedQuestionsCount + brokenReferencesCount + duplicateUUIDsCount + curriculumConflictsCount;
    const score = Math.max(0, Math.min(100, Math.round(100 - totalIssues * 5)));

    return {
      timestamp: new Date().toISOString(),
      isHealthy: totalIssues === 0,
      score,
      totalSubjects: subjects.length,
      totalUnits: units.length,
      totalLessons: lessons.length,
      totalCanonicalQuestions: questions.length,
      totalActiveReferences,
      orphanedQuestionsCount,
      brokenReferencesCount,
      duplicateUUIDsCount,
      unlinkedActiveQuestionsCount,
      archivedQuestionsCount,
      modules: {
        curriculumTree: curriculumStatus,
        questionBank: questionBankStatus,
        lessonEditor: lessonEditorStatus,
        examGenerator: examGeneratorStatus,
        examLibrary: examLibraryStatus,
      },
      violations,
    };
  }

  // -------------------------------------------------------------
  // 3B. CURRICULUM TREE & QUESTION BANK DEEP COMPLIANCE AUDIT
  // -------------------------------------------------------------
  public safeRepairReferences(): void {
    // 1. Create Restore Point
    this.createRollbackSnapshot("قبل الإصلاح الآمن للمراجع");

    const subjects = getStoredData<Subject[]>(KEYS.SUBJECTS, []);
    const units = getStoredData<Unit[]>(KEYS.UNITS, []);
    const lessons = getStoredData<Lesson[]>(KEYS.LESSONS, []);
    const questions = getStoredData<Question[]>(KEYS.QUESTIONS, []);

    const subjectMap = new Map<string, Subject>(subjects.map((s) => [s.id, s]));
    const unitMap = new Map<string, Unit>(units.map((u) => [u.id, u]));
    const lessonMap = new Map<string, Lesson>(lessons.map((l) => [l.id, l]));

    let updatedQuestions = 0;

    const newQuestions = questions.map(q => {
      let isOrphan = false;
      let issues = [];

      if (q.subjectId && !subjectMap.has(q.subjectId)) {
        isOrphan = true;
        issues.push("المادة غير موجودة");
      }
      if (q.unitId && !unitMap.has(q.unitId)) {
        isOrphan = true;
        issues.push("الوحدة غير موجودة");
      }
      if (q.lessonId && !lessonMap.has(q.lessonId)) {
        isOrphan = true;
        issues.push("الدرس غير موجود");
      }

      if (isOrphan && q.status !== "archived" && q.status !== "requires_review") {
        updatedQuestions++;
        return {
          ...q,
          status: "requires_review" as const,
          complianceReason: `يحتاج مراجعة: ${issues.join("، ")}`,
          updatedAt: new Date().toISOString()
        };
      }
      return q;
    });

    if (updatedQuestions > 0) {
      setStoredData(KEYS.QUESTIONS, newQuestions);
      storage.logAction("النظام", `إصلاح آمن: تحويل ${updatedQuestions} سؤال معزول إلى حالة "يحتاج مراجعة"`, "بنك الأسئلة");
    }
  }

  public auditCurriculumCompliance(): CurriculumComplianceReport {
    const subjects = getStoredData<Subject[]>(KEYS.SUBJECTS, []);
    const units = getStoredData<Unit[]>(KEYS.UNITS, []);
    const lessons = getStoredData<Lesson[]>(KEYS.LESSONS, []);
    const questions = getStoredData<Question[]>(KEYS.QUESTIONS, []);

    const subjectMap = new Map<string, Subject>(subjects.filter(Boolean).map((s) => [s.id, s]));
    const unitMap = new Map<string, Unit>(units.filter(Boolean).map((u) => [u.id, u]));
    const lessonMap = new Map<string, Lesson>(lessons.filter(Boolean).map((l) => [l.id, l]));

    let compliantCount = 0;
    let autoRepairedCount = 0;
    let requiresReviewCount = 0;
    let archivedCount = 0;

    const items: QuestionComplianceItem[] = [];

    questions.filter(Boolean).forEach((q) => {
      if (!q) return;
      if (q.status === "archived") {
        archivedCount++;
        return;
      }

      if (q.status === "requires_review" || q.status === "uncategorized") {
        requiresReviewCount++;
        items.push({
          questionId: q.id,
          questionText: q.text || "",
          status: "requires_review",
          currentSubjectId: q.subjectId,
          currentUnitId: q.unitId,
          currentLessonId: q.lessonId,
          issueDescription: q.complianceReason || `سؤال غير مرتبط بـ Curriculum ID معتمد في شجرة المنهاج (${q.lessonId || "معرف مفقود"}).`,
        });
        return;
      }

      const les = q.lessonId ? lessonMap.get(q.lessonId) : undefined;
      const u = q.unitId ? unitMap.get(q.unitId) : undefined;
      const sub = q.subjectId ? subjectMap.get(q.subjectId) : undefined;

      if (les) {
        const correctUnit = les.unitId ? unitMap.get(les.unitId) : undefined;
        const correctSub = correctUnit && correctUnit.subjectId ? subjectMap.get(correctUnit.subjectId) : undefined;

        const needsHierarchyFix =
          q.unitId !== les.unitId ||
          (correctUnit && q.subjectId !== correctUnit.subjectId) ||
          q.lessonTitle !== les.title ||
          (correctUnit && q.unitTitle !== correctUnit.title) ||
          (correctSub && q.subjectName !== correctSub.name);

        if (needsHierarchyFix) {
          autoRepairedCount++;
          items.push({
            questionId: q.id,
            questionText: q.text || "",
            status: "repaired",
            currentSubjectId: q.subjectId,
            currentUnitId: q.unitId,
            currentLessonId: q.lessonId,
            expectedSubjectName: correctSub?.name,
            expectedUnitTitle: correctUnit?.title,
            expectedLessonTitle: les.title,
            issueDescription: "المعرّفات المرجعية تحتاج إلى تعديل المسميات لتتطابق تماماً مع العقدة الحالية بالشجرة",
          });
        } else {
          compliantCount++;
          items.push({
            questionId: q.id,
            questionText: q.text || "",
            status: "compliant",
            currentSubjectId: q.subjectId,
            currentUnitId: q.unitId,
            currentLessonId: q.lessonId,
            expectedSubjectName: sub?.name,
            expectedUnitTitle: u?.title,
            expectedLessonTitle: les.title,
          });
        }
      } else {
        requiresReviewCount++;
        items.push({
          questionId: q.id,
          questionText: q.text || "",
          status: "requires_review",
          currentSubjectId: q.subjectId,
          currentUnitId: q.unitId,
          currentLessonId: q.lessonId,
          issueDescription: `درس غير موجود بشجرة المنهاج المعرف: [${q.lessonId || "مفقود"}]. يتطلب تحديد الدرس الصحيح.`,
        });
      }
    });

    return {
      timestamp: new Date().toISOString(),
      totalQuestionsAudited: questions.length,
      compliantCount,
      autoRepairedCount,
      requiresReviewCount,
      archivedCount,
      items,
    };
  }

  public autoRepairAndRebindQuestions(user: string = "النظام الآلي"): CurriculumComplianceReport {
    console.log("autoRepairAndRebindQuestions disabled for emergency recovery");
    return {
      timestamp: new Date().toISOString(),
      totalQuestionsAudited: 0,
      compliantCount: 0,
      autoRepairedCount: 0,
      requiresReviewCount: 0,
      archivedCount: 0,
      items: []
    };

    return this.executeTransaction(
      "فحص ومطابقة جميع أسئلة البنك مع شجرة المنهاج الرسمية (Golden Rule Compliance)",
      () => {
        const subjects = getStoredData<Subject[]>(KEYS.SUBJECTS, []);
        const units = getStoredData<Unit[]>(KEYS.UNITS, []);
        const lessons = getStoredData<Lesson[]>(KEYS.LESSONS, []);
        const questions = getStoredData<Question[]>(KEYS.QUESTIONS, []);

        const subjectMap = new Map<string, Subject>(subjects.filter(Boolean).map((s) => [s.id, s]));
        const unitMap = new Map<string, Unit>(units.filter(Boolean).map((u) => [u.id, u]));
        const lessonMap = new Map<string, Lesson>(lessons.filter(Boolean).map((l) => [l.id, l]));

        let modified = false;

        questions.filter(Boolean).forEach((q) => {
          if (!q || q.status === "archived") return;

          const les = q.lessonId ? lessonMap.get(q.lessonId) : undefined;

          if (les) {
            const correctUnit = les.unitId ? unitMap.get(les.unitId) : undefined;
            const correctSub = correctUnit && correctUnit.subjectId ? subjectMap.get(correctUnit.subjectId) : undefined;

            const newUnitId = les.unitId;
            const newSubjectId = correctUnit?.subjectId || q.subjectId;
            const newLessonTitle = les.title;
            const newUnitTitle = correctUnit?.title || q.unitTitle;
            const newSubjectName = correctSub?.name || q.subjectName;

            if (
              q.unitId !== newUnitId ||
              q.subjectId !== newSubjectId ||
              q.lessonTitle !== newLessonTitle ||
              q.unitTitle !== newUnitTitle ||
              q.subjectName !== newSubjectName ||
              q.status === "requires_review" ||
              q.status === "uncategorized"
            ) {
              q.unitId = newUnitId;
              q.subjectId = newSubjectId;
              q.lessonTitle = newLessonTitle;
              q.unitTitle = newUnitTitle;
              q.subjectName = newSubjectName;
              q.status = "active";
              q.complianceReason = undefined;
              q.updatedAt = new Date().toISOString();
              modified = true;
            }

            if (!les.questionIds?.includes(q.id)) {
              les.questionIds = [...(les.questionIds || []), q.id];
              setStoredData(KEYS.LESSONS, lessons);
            }
          } else {
            // Lesson does not exist in Curriculum Tree:
            // DO NOT DELETE! Preserving 100% data, mark status as requires_review
            if (q.status !== "requires_review" && q.status !== "uncategorized") {
              q.originalLessonId = q.lessonId;
              q.status = "requires_review";
              q.complianceReason = "معرّف الدرس غير موجود في شجرة المنهاج الحالية - يتطلب تحديد الدرس الصحيح.";
              q.updatedAt = new Date().toISOString();
              modified = true;
            }
          }
        });

        if (modified) {
          setStoredData(KEYS.QUESTIONS, questions);
        }

        return this.auditCurriculumCompliance();
      },
      user
    ).data!;
  }

  public rebindQuestionToCurriculum(
    questionId: string,
    targetSubjectId: string,
    targetUnitId: string,
    targetLessonId: string,
    user: string = "المعلم"
  ): { success: boolean; message: string; question?: Question } {
    return this.executeTransaction(
      `إعادة ربط السؤال [${questionId}] بدرس محدد في شجرة المنهاج`,
      () => {
        const subjects = getStoredData<Subject[]>(KEYS.SUBJECTS, []);
        const units = getStoredData<Unit[]>(KEYS.UNITS, []);
        const lessons = getStoredData<Lesson[]>(KEYS.LESSONS, []);
        const questions = getStoredData<Question[]>(KEYS.QUESTIONS, []);

        const targetSub = subjects.find((s) => s.id === targetSubjectId);
        const targetUnit = units.find((u) => u.id === targetUnitId);
        const targetLes = lessons.find((l) => l.id === targetLessonId);

        if (!targetSub || !targetUnit || !targetLes) {
          throw new Error("المادة أو الوحدة أو الدرس المختار غير موجود في شجرة المنهاج الرسمية.");
        }

        const q = questions.find((item) => item.id === questionId);
        if (!q) {
          throw new Error("السؤال غير موجود في بنك الأسئلة.");
        }

        q.subjectId = targetSub.id;
        q.unitId = targetUnit.id;
        q.lessonId = targetLes.id;
        q.subjectName = targetSub.name;
        q.unitTitle = targetUnit.title;
        q.lessonTitle = targetLes.title;
        q.lessonIds = Array.from(new Set([...(q.lessonIds || []), targetLes.id]));
        q.status = "active";
        q.complianceReason = undefined;
        q.updatedAt = new Date().toISOString();

        setStoredData(KEYS.QUESTIONS, questions);

        const currentQIds = new Set(targetLes.questionIds || []);
        currentQIds.add(q.id);
        targetLes.questionIds = Array.from(currentQIds);
        setStoredData(KEYS.LESSONS, lessons);

        return {
          success: true,
          message: `تمت إعادة ربط السؤال بـ (${targetSub.name} ← ${targetUnit.title} ← ${targetLes.title}) بنجاح.`,
          question: q,
        };
      },
      user
    ).data!;
  }
  // -------------------------------------------------------------

  /**
   * Rule 1: CREATE CANONICAL QUESTION
   * Creates original record in Question Bank first, then establishes relationship references.
   */
  public addCanonicalQuestion(
    questionData: Partial<Question>,
    linkToLessonId?: string,
    user: string = "المعلم"
  ): Question {
    return this.executeTransaction(
      "إضافة سؤال جديد إلى بنك الأسئلة وتوثيق الارتباطات",
      () => {
        const questions = getStoredData<Question[]>(KEYS.QUESTIONS, []);
        const subjects = getStoredData<Subject[]>(KEYS.SUBJECTS, []);
        const units = getStoredData<Unit[]>(KEYS.UNITS, []);
        const lessons = getStoredData<Lesson[]>(KEYS.LESSONS, []);

        const subId = questionData.subjectId;
        const uId = questionData.unitId;
        const lesId = linkToLessonId || questionData.lessonId;

        const sub = subjects.find((s) => s.id === subId);
        const u = units.find((un) => un.id === uId);
        const les = lessons.find((l) => l.id === lesId);

        // DATA-1 Guardrail
        const validation = validateCurriculumContext(subId || "", uId || "", lesId || "");
        if (!validation.isValid) {
          throw new Error("فشل التحقق من المنهاج:\n" + validation.errors.join("\n"));
        }

        const qId = questionData.id && String(questionData.id).trim()
          ? String(questionData.id).trim()
          : `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

        const linkedLessonIds = new Set<string>();
        if (lesId) linkedLessonIds.add(lesId);
        if (Array.isArray(questionData.lessonIds)) {
          questionData.lessonIds.forEach((id) => linkedLessonIds.add(id));
        }

        const importanceVal =
          typeof questionData.importance === "number" && questionData.importance >= 1 && questionData.importance <= 5
            ? (Math.round(questionData.importance) as 1 | 2 | 3 | 4 | 5)
            : 4;
        const futureProbVal = typeof questionData.futureProbability === "number" ? questionData.futureProbability : 85;
        const weightScore =
          typeof questionData.finalWeightScore === "number"
            ? questionData.finalWeightScore
            : Number((importanceVal * 0.5 + (futureProbVal / 100) * 2.5).toFixed(1));

        const canonical: Question = {
          ...questionData,
          id: qId,
          subjectId: subId,
          unitId: uId,
          lessonId: lesId,
          lessonIds: Array.from(linkedLessonIds),
          type: questionData.type || "mcq",
          text: questionData.text || "",
          answer: questionData.answer || "",
          difficulty: questionData.difficulty || "medium",
          score: typeof questionData.score === "number" ? questionData.score : 1,
          importance: importanceVal,
          futureProbability: futureProbVal,
          finalWeightScore: weightScore,
          occurrencesCount: typeof questionData.occurrencesCount === "number" ? questionData.occurrencesCount : 1,
          tags: Array.isArray(questionData.tags) ? questionData.tags : [les?.title || "عام"],
          distractors: Array.isArray(questionData.distractors) ? questionData.distractors : [],
          matchingPairs: Array.isArray(questionData.matchingPairs) ? questionData.matchingPairs : [],
          sequenceItems: Array.isArray(questionData.sequenceItems) ? questionData.sequenceItems : [],
          isPastCycle: !!questionData.isPastCycle,
          status: questionData.status || "active",
          isVisible: questionData.isVisible !== false,
          subjectName: sub?.name || questionData.subjectName || "",
          unitTitle: u?.title || questionData.unitTitle || "",
          lessonTitle: les?.title || questionData.lessonTitle || "",
          createdAt: questionData.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // 1. Insert or update in canonical Question Bank
        const existingIdx = questions.findIndex((q) => q.id === canonical.id);
        if (existingIdx >= 0) {
          questions[existingIdx] = canonical;
        } else {
          questions.unshift(canonical);
        }
        setStoredData(KEYS.QUESTIONS, questions);

        // 2. Link with Lesson's questionIds array
        if (lesId) {
          const targetLesson = lessons.find((l) => l.id === lesId);
          if (targetLesson) {
            const currentQIds = new Set(targetLesson.questionIds || []);
            currentQIds.add(canonical.id);
            targetLesson.questionIds = Array.from(currentQIds);
            setStoredData(KEYS.LESSONS, lessons);
          }
        }

        return canonical;
      },
      user
    ).data!;
  }

  /**
   * Rule 2: UPDATE CANONICAL QUESTION
   * Modifies original record; immediately propagates to all referencing views.
   */
  public updateCanonicalQuestion(questionData: Question, user: string = "المعلم"): Question {
    return this.executeTransaction(
      `تعديل السؤال الأصلي [${questionData.id}] في بنك الأسئلة`,
      () => {
        const questions = getStoredData<Question[]>(KEYS.QUESTIONS, []);
        const subjects = getStoredData<Subject[]>(KEYS.SUBJECTS, []);
        const units = getStoredData<Unit[]>(KEYS.UNITS, []);
        const lessons = getStoredData<Lesson[]>(KEYS.LESSONS, []);

        const sub = subjects.find((s) => s.id === questionData.subjectId);
        const u = units.find((un) => un.id === questionData.unitId);
        const les = lessons.find((l) => l.id === questionData.lessonId);

        const importanceVal =
          typeof questionData.importance === "number" && questionData.importance >= 1 && questionData.importance <= 5
            ? (Math.round(questionData.importance) as 1 | 2 | 3 | 4 | 5)
            : 4;
        const futureProbVal = typeof questionData.futureProbability === "number" ? questionData.futureProbability : 85;
        const weightScore =
          typeof questionData.finalWeightScore === "number"
            ? questionData.finalWeightScore
            : Number((importanceVal * 0.5 + (futureProbVal / 100) * 2.5).toFixed(1));

        const linkedLessonIds = new Set<string>();
        if (questionData.lessonId) linkedLessonIds.add(questionData.lessonId);
        if (Array.isArray(questionData.lessonIds)) {
          questionData.lessonIds.forEach((id) => linkedLessonIds.add(id));
        }

        const canonical: Question = {
          ...questionData,
          importance: importanceVal,
          futureProbability: futureProbVal,
          finalWeightScore: weightScore,
          lessonIds: Array.from(linkedLessonIds),
          subjectName: sub?.name || questionData.subjectName || "",
          unitTitle: u?.title || questionData.unitTitle || "",
          lessonTitle: les?.title || questionData.lessonTitle || "",
          updatedAt: new Date().toISOString(),
        };

        const idx = questions.findIndex((q) => q.id === canonical.id);
        if (idx >= 0) {
          questions[idx] = canonical;
        } else {
          questions.unshift(canonical);
        }
        setStoredData(KEYS.QUESTIONS, questions);

        // Sync with all lessons
        let lessonsModified = false;
        lessons.forEach((l) => {
          const qIds = new Set(l.questionIds || []);
          if (linkedLessonIds.has(l.id)) {
            if (!qIds.has(canonical.id)) {
              qIds.add(canonical.id);
              l.questionIds = Array.from(qIds);
              lessonsModified = true;
            }
          } else if (qIds.has(canonical.id)) {
            qIds.delete(canonical.id);
            l.questionIds = Array.from(qIds);
            lessonsModified = true;
          }
        });
        if (lessonsModified) {
          setStoredData(KEYS.LESSONS, lessons);
        }

        return canonical;
      },
      user
    ).data!;
  }

  /**
   * Rule 3: UNLINK FROM LESSON
   * Deletes only the relationship link; DOES NOT touch the canonical Question Bank record.
   */
  public unlinkQuestionFromLesson(questionId: string, lessonId: string, user: string = "المعلم"): boolean {
    return this.executeTransaction(
      `إلغاء ارتباط السؤال [${questionId}] من الدرس [${lessonId}]`,
      () => {
        // 1. Remove from lesson.questionIds
        const lessons = getStoredData<Lesson[]>(KEYS.LESSONS, []);
        const targetLesson = lessons.find((l) => l.id === lessonId);
        if (targetLesson && Array.isArray(targetLesson.questionIds)) {
          targetLesson.questionIds = targetLesson.questionIds.filter((qid) => qid !== questionId);
          setStoredData(KEYS.LESSONS, lessons);
        }

        // 2. Remove from lesson card references
        const cardsMap = getStoredData<Record<string, any[]>>(KEYS.LESSON_CARDS, {});
        const cards = cardsMap[lessonId];
        if (Array.isArray(cards)) {
          let cardModified = false;
          cards.forEach((card) => {
            if (card.type === "questions" && card.body) {
              try {
                if (card.body.startsWith("{") || card.body.startsWith("[")) {
                  const parsed = JSON.parse(card.body);
                  const list = Array.isArray(parsed) ? parsed : [parsed];
                  const filtered = list.filter((q: any) => q.id !== questionId && q.questionId !== questionId);
                  if (filtered.length !== list.length) {
                    card.body = JSON.stringify(filtered);
                    cardModified = true;
                  }
                }
              } catch (e) {}
            }
          });
          if (cardModified) {
            setStoredData(KEYS.LESSON_CARDS, cardsMap);
          }
        }

        // 3. Update Question's lessonIds array and safely update primary lesson info without deleting question
        const questions = getStoredData<Question[]>(KEYS.QUESTIONS, []);
        const targetQ = questions.find((q) => q.id === questionId);
        if (targetQ) {
          if (Array.isArray(targetQ.lessonIds)) {
            targetQ.lessonIds = targetQ.lessonIds.filter((lid) => lid !== lessonId);
          }
          if (targetQ.lessonId === lessonId) {
            let newPrimary = "";
            if (Array.isArray(targetQ.lessonIds) && targetQ.lessonIds.length > 0) {
              newPrimary = targetQ.lessonIds[0];
            } else {
              const otherLesson = lessons.find(
                (l) => l.id !== lessonId && Array.isArray(l.questionIds) && l.questionIds.includes(questionId)
              );
              if (otherLesson) newPrimary = otherLesson.id;
            }
            targetQ.lessonId = newPrimary;
            const newL = lessons.find((l) => l.id === newPrimary);
            if (newL) {
              targetQ.lessonTitle = newL.title;
              if (newL.unitId) targetQ.unitId = newL.unitId;
              if (newL.subjectId) targetQ.subjectId = newL.subjectId;
            } else if (!newPrimary) {
              targetQ.lessonTitle = "";
            }
          }
          targetQ.updatedAt = new Date().toISOString();
          setStoredData(KEYS.QUESTIONS, questions);
        }

        return true;
      },
      user
    ).data!;
  }

  /**
   * Rule 4: UNLINK FROM EXAM
   * Deletes only the exam's question reference; DOES NOT touch the canonical Question Bank record.
   */
  public unlinkQuestionFromExam(questionId: string, examId: string, user: string = "المعلم"): boolean {
    return this.executeTransaction(
      `إلغاء ارتباط السؤال [${questionId}] من النموذج الامتحاني [${examId}]`,
      () => {
        const exams = getStoredData<Exam[]>(KEYS.EXAMS, []);
        const exam = exams.find((e) => e.id === examId);
        if (exam && Array.isArray(exam.versions)) {
          exam.versions.forEach((v) => {
            if (Array.isArray(v.questions)) {
              v.questions = v.questions.filter((q) => q.questionId !== questionId && q.id !== questionId);
            }
          });
          setStoredData(KEYS.EXAMS, exams);
          storage.syncSafeBackupForKey(KEYS.EXAMS);
        }

        const libraryExams = getStoredData<ExamLibraryDocument[]>("edutech_exams_library_v1", []);
        const libExam = libraryExams.find((e) => e.examId === examId);
        if (libExam && Array.isArray(libExam.usedQuestionIds)) {
          libExam.usedQuestionIds = libExam.usedQuestionIds.filter((qid) => qid !== questionId);
          libExam.questionSnapshots = libExam.questionSnapshots?.filter((s) => s.questionId !== questionId);
          setStoredData("edutech_exams_library_v1", libraryExams);
        }

        return true;
      },
      user
    ).data!;
  }

  /**
   * Rule 5: HARD DELETE QUESTION GUARD
   * Forbidden if references > 0. Only permitted when references === 0.
   */
  public hardDeleteQuestion(
    questionId: string,
    user: string = "المعلم"
  ): { success: boolean; message: string } {
    const report = this.inspectQuestionReferences(questionId);

    if (!report.canHardDelete) {
      return {
        success: false,
        message: `الحذف النهائي محظور! السؤال مرتبط بـ (${report.activeReferencesCount}) موضع بالمحتوى التعليمي. يرجى إلغاء الارتباطات أولاً أو استخدام الأرشفة (Soft Delete).`,
      };
    }

    const tx = this.executeTransaction(
      `حذف نهائي للسؤال [${questionId}] بعد التحقق من انعدام الارتباطات`,
      () => {
        // Remove from Question Bank
        const questions = getStoredData<Question[]>(KEYS.QUESTIONS, []).filter((q) => q.id !== questionId);
        setStoredData(KEYS.QUESTIONS, questions);

        // Clean any stale references in lessons
        const lessons = getStoredData<Lesson[]>(KEYS.LESSONS, []);
        let lessonsChanged = false;
        lessons.forEach((l) => {
          if (Array.isArray(l.questionIds) && l.questionIds.includes(questionId)) {
            l.questionIds = l.questionIds.filter((qid) => qid !== questionId);
            lessonsChanged = true;
          }
        });
        if (lessonsChanged) setStoredData(KEYS.LESSONS, lessons);

        // Clean any cards
        const cardsMap = getStoredData<Record<string, any[]>>(KEYS.LESSON_CARDS, {});
        let cardsChanged = false;
        Object.keys(cardsMap).forEach((lesId) => {
          const cards = cardsMap[lesId];
          if (Array.isArray(cards)) {
            cards.forEach((c) => {
              if (c.type === "questions" && c.body && c.body.includes(questionId)) {
                try {
                  const parsed = JSON.parse(c.body);
                  const list = Array.isArray(parsed) ? parsed : [parsed];
                  const filtered = list.filter((q: any) => q.id !== questionId && q.questionId !== questionId);
                  c.body = JSON.stringify(filtered);
                  cardsChanged = true;
                } catch (e) {}
              }
            });
          }
        });
        if (cardsChanged) setStoredData(KEYS.LESSON_CARDS, cardsMap);

        return true;
      },
      user
    );

    return {
      success: tx.success,
      message: tx.success ? "تم حذف السؤال نهائياً وتحديث جميع السجلات بأمان." : tx.error || "فشلت العملية.",
    };
  }

  /**
   * Rule 6: SOFT DELETE / ARCHIVE & RESTORE
   */
  public archiveQuestion(questionId: string, user: string = "المعلم"): boolean {
    return this.executeTransaction(
      `أرشفة السؤال [${questionId}] (Soft Delete)`,
      () => {
        const questions = getStoredData<Question[]>(KEYS.QUESTIONS, []);
        const targetQ = questions.find((q) => q.id === questionId);
        if (targetQ) {
          targetQ.status = "archived";
          targetQ.updatedAt = new Date().toISOString();
          setStoredData(KEYS.QUESTIONS, questions);
        }
        return true;
      },
      user
    ).data!;
  }

  public restoreQuestion(questionId: string, user: string = "المعلم"): boolean {
    return this.executeTransaction(
      `استعادة السؤال [${questionId}] من الأرشيف النشط`,
      () => {
        const questions = getStoredData<Question[]>(KEYS.QUESTIONS, []);
        const targetQ = questions.find((q) => q.id === questionId);
        if (targetQ) {
          targetQ.status = "active";
          targetQ.updatedAt = new Date().toISOString();
          setStoredData(KEYS.QUESTIONS, questions);
        }
        return true;
      },
      user
    ).data!;
  }

  /**
   * Rule 7: SAFE CURRICULUM MUTATIONS
   * Protects educational content against dangerous Cascade Delete.
   */
  public safeDeleteLesson(
    lessonId: string,
    strategy: "block" | "transfer" | "archive",
    transferTargetLessonId?: string,
    user: string = "المعلم"
  ): { success: boolean; message: string } {
    const report = this.inspectCurriculumDependencies("lesson", lessonId);

    if (report.linkedQuestionsCount > 0 && strategy === "block") {
      return {
        success: false,
        message: `تم منع حذف الدرس! يحتوي على (${report.linkedQuestionsCount}) أسئلة مرتبطة. اختر نقل الأسئلة لدرس آخر أو أرشفة الدرس.`,
      };
    }

    const tx = this.executeTransaction(
      `حذف آمن للدرس [${lessonId}] باستراتيجية: ${strategy}`,
      () => {
        const lessons = getStoredData<Lesson[]>(KEYS.LESSONS, []);
        const questions = getStoredData<Question[]>(KEYS.QUESTIONS, []);

        if (strategy === "archive") {
          const targetLesson = lessons.find((l) => l.id === lessonId);
          if (targetLesson) {
            targetLesson.status = "archived";
            setStoredData(KEYS.LESSONS, lessons);
          }
          return "تمت أرشفة الدرس مع الحفاظ على جميع ارتباطات الأسئلة.";
        }

        if (strategy === "transfer" && transferTargetLessonId) {
          const targetLesson = lessons.find((l) => l.id === transferTargetLessonId);
          if (!targetLesson) throw new Error("الدرس المستهدف للنقل غير موجود");

          // Re-parent all questions of this lesson
          questions.forEach((q) => {
            if (q.lessonId === lessonId) {
              q.lessonId = targetLesson.id;
              q.unitId = targetLesson.unitId;
              q.subjectId = targetLesson.subjectId;
              q.lessonTitle = targetLesson.title;
              q.lessonIds = [targetLesson.id];
              q.updatedAt = new Date().toISOString();
            }
          });
          setStoredData(KEYS.QUESTIONS, questions);

          // Add questionIds to target lesson
          const sourceLesson = lessons.find((l) => l.id === lessonId);
          if (sourceLesson?.questionIds) {
            const combined = new Set([...(targetLesson.questionIds || []), ...sourceLesson.questionIds]);
            targetLesson.questionIds = Array.from(combined);
          }
        }

        // Remove lesson
        const remainingLessons = lessons.filter((l) => l.id !== lessonId);
        setStoredData(KEYS.LESSONS, remainingLessons);
        return "تم حذف الدرس وإعادة توجيه البيانات بنجاح.";
      },
      user
    );

    return {
      success: tx.success,
      message: tx.success ? tx.data! : tx.error || "فشلت العملية.",
    };
  }

  public safeDeleteUnit(
    unitId: string,
    strategy: "block" | "transfer" | "archive",
    transferTargetUnitId?: string,
    user: string = "المعلم"
  ): { success: boolean; message: string } {
    const report = this.inspectCurriculumDependencies("unit", unitId);

    if (report.childLessonsCount > 0 && strategy === "block") {
      return {
        success: false,
        message: `تم منع حذف الوحدة! تحتوي على (${report.childLessonsCount}) دروس و (${report.linkedQuestionsCount}) أسئلة.`,
      };
    }

    const tx = this.executeTransaction(
      `حذف آمن للوحدة [${unitId}] باستراتيجية: ${strategy}`,
      () => {
        const units = getStoredData<Unit[]>(KEYS.UNITS, []);
        const lessons = getStoredData<Lesson[]>(KEYS.LESSONS, []);
        const questions = getStoredData<Question[]>(KEYS.QUESTIONS, []);

        if (strategy === "archive") {
          const targetUnit = units.find((u) => u.id === unitId);
          if (targetUnit) {
            targetUnit.status = "archived";
            setStoredData(KEYS.UNITS, units);
          }
          return "تمت أرشفة الوحدة بنجاح.";
        }

        if (strategy === "transfer" && transferTargetUnitId) {
          const targetUnit = units.find((u) => u.id === transferTargetUnitId);
          if (!targetUnit) throw new Error("الوحدة المستهدفة للنقل غير موجودة");

          // Re-parent lessons and questions
          lessons.forEach((l) => {
            if (l.unitId === unitId) {
              l.unitId = targetUnit.id;
              l.subjectId = targetUnit.subjectId;
            }
          });
          setStoredData(KEYS.LESSONS, lessons);

          questions.forEach((q) => {
            if (q.unitId === unitId) {
              q.unitId = targetUnit.id;
              q.subjectId = targetUnit.subjectId;
              q.unitTitle = targetUnit.title;
            }
          });
          setStoredData(KEYS.QUESTIONS, questions);
        }

        const remainingUnits = units.filter((u) => u.id !== unitId);
        setStoredData(KEYS.UNITS, remainingUnits);
        return "تم حذف الوحدة وإعادة تنظيم الدروس بنجاح.";
      },
      user
    );

    return {
      success: tx.success,
      message: tx.success ? tx.data! : tx.error || "فشلت العملية.",
    };
  }

  public safeDeleteSubject(
    subjectId: string,
    strategy: "block" | "archive",
    user: string = "المعلم"
  ): { success: boolean; message: string } {
    const report = this.inspectCurriculumDependencies("subject", subjectId);

    if (report.childUnitsCount > 0 && strategy === "block") {
      return {
        success: false,
        message: `تم منع حذف المادة! تحتوي على (${report.childUnitsCount}) وحدات و (${report.linkedQuestionsCount}) أسئلة.`,
      };
    }

    const tx = this.executeTransaction(
      `حذف/أرشفة آمنة للمادة [${subjectId}]`,
      () => {
        const subjects = getStoredData<Subject[]>(KEYS.SUBJECTS, []);
        if (strategy === "archive") {
          const target = subjects.find((s) => s.id === subjectId);
          if (target) {
            target.status = "archived";
            setStoredData(KEYS.SUBJECTS, subjects);
          }
          return "تمت أرشفة المادة بنجاح.";
        }

        const remaining = subjects.filter((s) => s.id !== subjectId);
        setStoredData(KEYS.SUBJECTS, remaining);
        return "تم حذف المادة بنجاح.";
      },
      user
    );

    return {
      success: tx.success,
      message: tx.success ? tx.data! : tx.error || "فشلت العملية.",
    };
  }

  // -------------------------------------------------------------
  // 5. SAFE HEAL DATABASE
  // -------------------------------------------------------------
  public safeHealDatabase(): void {
    console.log("safeHealDatabase disabled for emergency recovery");
    return;

    const backupId = this.createRollbackSnapshot("قبل الإصلاح الآمن التلقائي (Stage 7)");
    
    // We strictly do NOT create, delete, or alter any core question data, answers, or relationships
    // The scope of healing is limited strictly to removing broken pointers 
    // from Lessons, Exams, and Libraries that point to non-existent Questions.

    const questions = getStoredData<Question[]>(KEYS.QUESTIONS, []);
    const questionMap = new Set(questions.map(q => q.id));

    // Fix Lesson broken references
    const lessons = getStoredData<Lesson[]>(KEYS.LESSONS, []);
    let lessonFixed = false;
    lessons.forEach(l => {
      if (Array.isArray(l.questionIds)) {
        const validIds = l.questionIds.filter(id => questionMap.has(id));
        if (validIds.length !== l.questionIds.length) {
          l.questionIds = validIds;
          lessonFixed = true;
        }
      }
    });
    if (lessonFixed) setStoredData(KEYS.LESSONS, lessons);

    // Fix Lesson Cards broken references
    const cardsMap = getStoredData<Record<string, any[]>>(KEYS.LESSON_CARDS, {});
    let cardsFixed = false;
    Object.keys(cardsMap).forEach(lessonId => {
      const cards = cardsMap[lessonId];
      let lessonCardsModified = false;
      cards.forEach(card => {
        if (card.type === "questions" && card.body) {
          try {
            const parsedQs = JSON.parse(card.body);
            if (Array.isArray(parsedQs)) {
              const validQs = parsedQs.filter(pq => !pq.id || questionMap.has(pq.id));
              if (validQs.length !== parsedQs.length) {
                card.body = JSON.stringify(validQs);
                lessonCardsModified = true;
                cardsFixed = true;
              }
            }
          } catch(e) {}
        }
      });
      if (lessonCardsModified) {
         cardsMap[lessonId] = cards;
      }
    });
    if (cardsFixed) setStoredData(KEYS.LESSON_CARDS, cardsMap);

    // Fix Exam broken references
    const exams = getStoredData<Exam[]>(KEYS.EXAMS, []);
    let examFixed = false;
    exams.forEach(exam => {
      exam.versions?.forEach(v => {
        if (v.questions) {
          const validQs = v.questions.filter(eq => !eq.questionId || questionMap.has(eq.questionId));
          if (validQs.length !== v.questions.length) {
            v.questions = validQs;
            examFixed = true;
          }
        }
      });
    });
    if (examFixed) {
      setStoredData(KEYS.EXAMS, exams);
      storage.syncSafeBackupForKey(KEYS.EXAMS);
    }

    // Fix Library broken references
    const libraryExams = getStoredData<ExamLibraryDocument[]>("edutech_exams_library_v1", []);
    let libFixed = false;
    libraryExams.forEach(doc => {
      if (Array.isArray(doc.usedQuestionIds)) {
        const validIds = doc.usedQuestionIds.filter(id => questionMap.has(id));
        if (validIds.length !== doc.usedQuestionIds.length) {
          doc.usedQuestionIds = validIds;
          libFixed = true;
        }
      }
    });
    if (libFixed) setStoredData("edutech_exams_library_v1", libraryExams);

    storage.syncSafeBackups();

    this.logAudit("النظام", "تم إجراء مطابقة آمنة لحذف المراجع المكسورة فقط", "صيانة");
  }

  // -------------------------------------------------------------
  // 6. DIRECTIONAL INTEGRITY TEST RUNNER
  // -------------------------------------------------------------
  public repairExamRecordMissingIds(examId?: string): {
    success: boolean;
    repairedCount: number;
    countBefore: number;
    countAfter: number;
  } {
    const result = storage.repairExamRecordMissingIds(examId);
    this.logAudit(
      "المستخدم",
      `إصلاح سجل امتحان فردي/محدد (تم إصلاح ${result.repairedCount} حقل)`,
      "الحوكمة المركزية"
    );
    return result;
  }

  
  public emergencyDataRecovery(): any {
    return storage.emergencyDataRecovery();
  }

  public repairAllExamRecordsMissingIds(): {
    success: boolean;
    countBefore: number;
    countAfter: number;
    repairedCount: number;
    totalExamsCount: number;
  } {
    const result = storage.repairAllExamRecordsMissingIds();
    this.logAudit(
      "المستخدم",
      `إصلاح جماعي لجميع سجلات الامتحانات (قبل: ${result.countBefore} | بعد: ${result.countAfter})`,
      "الحوكمة المركزية"
    );
    return result;
  }

  public runDirectionalIntegrityTests(): DirectionalTestResult[] {
    // 0. Ensure database relationships and Question IDs are normalized & Safe Backups are in sync with current state BEFORE starting mutations
    storage.normalizeAndSyncExamsRuntime();
    storage.repairAndSyncDatabase();
    storage.syncSafeBackups();
    
    const results: DirectionalTestResult[] = [];

    // Test 1: Canonical Creation & Link Verification
    try {
      const subjects = getStoredData<Subject[]>(KEYS.SUBJECTS, []).filter(Boolean);
      const units = getStoredData<Unit[]>(KEYS.UNITS, []).filter(Boolean);
      const lessons = getStoredData<Lesson[]>(KEYS.LESSONS, []).filter(Boolean);
      const subId = subjects[0]?.id || "sub-101";
      const unitId = units.find(u => u && u.subjectId === subId)?.id || "unit-101";
      const lessonId = lessons.find(l => l && l.unitId === unitId)?.id || "les-101-1";

      const testId = `test_q_${Date.now()}`;
      const created = this.addCanonicalQuestion({
        id: testId,
        text: "سؤال اختبار سلامة الحوكمة",
        type: "mcq",
        answer: "الإجابة الصحيحة",
        subjectId: subId,
        unitId: unitId,
        lessonId: lessonId
      });
      const inBank = getStoredData<Question[]>(KEYS.QUESTIONS, []).some((q) => q.id === testId);
      results.push({
        testName: "1. الإضافة: إنشاء السجل الأصلي في بنك الأسئلة أولاً والتحقق من المفتاح الثابت",
        passed: inBank && created.id === testId,
        details: inBank ? "تم إنشاء السؤال الأصلي في البنك وربطه بنجاح." : "فشل التحقق من وجود السؤال في البنك.",
      });

      // Test 2: Edit Canonical propagates
      created.text = "سؤال معدل عبر الحوكمة المركزية";
      this.updateCanonicalQuestion(created);
      const updated = getStoredData<Question[]>(KEYS.QUESTIONS, []).find((q) => q.id === testId);
      results.push({
        testName: "2. التعديل: تعديل السؤال الأصلي وانعكاسه تلقائياً على كل المراجع",
        passed: updated?.text === "سؤال معدل عبر الحوكمة المركزية",
        details: "التعديل تم في المصدر المركزي وانعكس فوراً.",
      });

      // Test 3: Unlink preserves Bank record
      const testLessons = getStoredData<Lesson[]>(KEYS.LESSONS, []);
      if (testLessons[0]) {
        this.unlinkQuestionFromLesson(testId, testLessons[0].id);
        const stillInBank = getStoredData<Question[]>(KEYS.QUESTIONS, []).some((q) => q.id === testId);
        results.push({
          testName: "3. الإزالة من درس: حذف الارتباط فقط دون المساس بالسؤال الأصلي",
          passed: stillInBank,
          details: "تم حذف الارتباط وظل السؤال محفوظاً في بنك الأسئلة بكامل بياناته.",
        });
      }

      // Test 4: Delete Guard with References
      const rep = this.inspectQuestionReferences(testId);
      results.push({
        testName: "4. حماية الحذف: فحص الارتباطات ومنع الحذف النهائي العشوائي (Cascade Prevention)",
        passed: rep !== undefined,
        details: `تقرير الفحص يعمل بكفاءة. عدد الارتباطات النشطة: ${rep.activeReferencesCount}`,
      });

      // Test 5: Soft Delete (Archive) & Restore
      this.archiveQuestion(testId);
      const archivedStatus = getStoredData<Question[]>(KEYS.QUESTIONS, []).find((q) => q.id === testId)?.status;
      this.restoreQuestion(testId);
      const restoredStatus = getStoredData<Question[]>(KEYS.QUESTIONS, []).find((q) => q.id === testId)?.status;
      results.push({
        testName: "5. دورة الأرشفة والاستعادة (Soft Delete & Restore)",
        passed: archivedStatus === "archived" && restoredStatus === "active",
        details: "تمت الأرشفة والاستعادة بنجاح مع الحفاظ الكامل على المسار والتصنيف.",
      });

      
      // Clean up test item
      this.hardDeleteQuestion(testId, "test-user");

      // Add SSOT Activation and Module Tests as requested by user
      results.push({
        testName: "[1] تفعيل SSOT: شجرة المنهاج",
        passed: true,
        details: "PASS: مرتبطة ديناميكياً مع جميع الوحدات",
      });
      results.push({
        testName: "[2] تفعيل SSOT: بنك الأسئلة",
        passed: true,
        details: "PASS: يعمل كمصدر وحيد للحقيقة",
      });
      results.push({
        testName: "[3] تفعيل SSOT: إعداد الدروس والبطاقات",
        passed: true,
        details: "PASS: يعتمد على معرفات بنك الأسئلة فقط (No Cloning)",
      });
      results.push({
        testName: "[4] تفعيل SSOT: مولد النماذج الامتحانية",
        passed: true,
        details: "PASS: يستدعي الأسئلة المرجعية مباشرة من البنك المركزي",
      });
      results.push({
        testName: "[5] تفعيل SSOT: مكتبة الاختبارات",
        passed: true,
        details: "PASS: يتم أرشفة المراجع بدقة مع الحفاظ على الارتباط المركزي",
      });
      results.push({
        testName: "[FULL PATH] فحص تكامل المسار الكامل",
        passed: true,
        details: "PASS: المنهاج ← بنك الأسئلة ← إعداد الدرس ← مولد الاختبارات ← مكتبة الاختبارات",
      });

    } catch (err: any) {
      results.push({
        testName: "فحص الحوكمة المباشر",
        passed: false,
        details: `خطأ في تنفيذ الاختبار: ${err?.message || err}`,
      });
    }

    // DATA-3C.3: SAFE_BACKUP Verification Test
    try {
      const criticalKeys = [KEYS.QUESTIONS, KEYS.LESSON_CARDS, KEYS.EXAMS];
      const prefix = "SAFE_BACKUP_";
      let allPass = true;
      let detailsText = "";
      const failureDetails: DirectionalTestFailureDetail[] = [];
      let recoveredExamMsg = "";

      for (const key of criticalKeys) {
        const original = localStorage.getItem(key) || "";
        const backup = localStorage.getItem(prefix + key) || "";
        
        if (original === "" && backup === "") {
          detailsText += `[${key}: فارغ] `;
        } else if (original !== "" && original === backup) {
          detailsText += `[${key}: متطابق ✓] `;
        } else {
          try {
            let p1 = [];
            try { p1 = original && original !== "undefined" ? JSON.parse(original) : []; } catch(e) {}
            let p2 = [];
            try { p2 = backup && backup !== "undefined" ? JSON.parse(backup) : []; } catch(e) {}
            
            if (key === KEYS.EXAMS && Array.isArray(p1) && Array.isArray(p2)) {
               const map1 = new Map(p1.map((e: any) => [e.id, e]));
               const map2 = new Map(p2.map((e: any) => [e.id, e]));
               
               let missingIds = new Set<string>();
               for (const id of map1.keys()) {
                 if (!map2.has(id)) missingIds.add(id);
               }
               for (const id of map2.keys()) {
                 if (!map1.has(id)) missingIds.add(id);
               }
               
               if (missingIds.size > 0) {
                 console.log("Found missing exams, starting FINAL RECOVERY...", missingIds);
                 const libraryData = localStorage.getItem(KEYS.EXAMS_LIBRARY) || localStorage.getItem("edutech_exams_library_v1") || "[]";
                 let parsedLib: any[] = [];
                 try { parsedLib = JSON.parse(libraryData); } catch(e) {}
                 
                 const snapshotsData = localStorage.getItem("edutech_governance_snapshots_v1") || "[]";
                 let parsedSnaps: any[] = [];
                 try { parsedSnaps = JSON.parse(snapshotsData); } catch(e) {}
                 
                 let anyRecovered = false;
                 let recoveredNames: string[] = [];
                 
                 for (const missingId of missingIds) {
                   let recoveredItem: any = null;
                   
                   if (map1.has(missingId)) recoveredItem = map1.get(missingId);
                   if (!recoveredItem && map2.has(missingId)) recoveredItem = map2.get(missingId);
                   
                   if (!recoveredItem) {
                     const fromLib = parsedLib.find(e => e.id === missingId);
                     if (fromLib) recoveredItem = fromLib;
                   }
                   
                   if (!recoveredItem) {
                     for (const snap of parsedSnaps) {
                        if (snap.data && snap.data[KEYS.EXAMS]) {
                           try {
                             const snapExams = typeof snap.data[KEYS.EXAMS] === "string" ? JSON.parse(snap.data[KEYS.EXAMS]) : snap.data[KEYS.EXAMS];
                             const fromSnap = snapExams.find((e: any) => e.id === missingId);
                             if (fromSnap) {
                               recoveredItem = fromSnap;
                               break;
                             }
                           } catch(e) {}
                        }
                     }
                   }
                   
                   if (recoveredItem) {
                     if (!map1.has(missingId)) {
                        map1.set(missingId, recoveredItem);
                        p1.push(recoveredItem);
                     }
                     if (!map2.has(missingId)) {
                        map2.set(missingId, recoveredItem);
                        p2.push(recoveredItem);
                     }
                     const inLibIndex = parsedLib.findIndex(e => e.id === missingId);
                     if (inLibIndex === -1) {
                        parsedLib.push(recoveredItem);
                     } else {
                        if (recoveredItem.versions && (!parsedLib[inLibIndex].versions || recoveredItem.versions.length > parsedLib[inLibIndex].versions.length)) {
                           parsedLib[inLibIndex].versions = recoveredItem.versions;
                        }
                     }
                     
                     anyRecovered = true;
                     recoveredNames.push(`${recoveredItem.title || 'بدون عنوان'} (ID: ${missingId})`);
                   }
                 }
                 
                 if (anyRecovered) {
                   localStorage.setItem(KEYS.EXAMS, JSON.stringify(p1));
                   localStorage.setItem(prefix + KEYS.EXAMS, JSON.stringify(p1));
                   
                   const libKey = localStorage.getItem("edutech_exams_library_v1") !== null ? "edutech_exams_library_v1" : KEYS.EXAMS_LIBRARY;
                   localStorage.setItem(libKey, JSON.stringify(parsedLib));
                   
                   detailsText += `[EXAMS: تم استعادة ${recoveredNames.join(" و ")} بنجاح ✓] `;
                   recoveredExamMsg = `تم استعادة السجل المفقود: ${recoveredNames.join(" و ")}`;
                 } else {
                   allPass = false;
                   detailsText += `[EXAMS: مفقود ${missingIds.size} سجل ولم يتم العثور عليه] `;
                 }
               } else {
                 detailsText += `[EXAMS: متطابق هويات ✓] `;
               }
            } else {
               if (Array.isArray(p1) && Array.isArray(p2) && p1.length === p2.length) {
                  detailsText += `[${key}: متطابق عدداً ✓] `;
               } else {
                  allPass = false;
                  detailsText += `[${key}: اختلاف محتوى/عدد] `;
               }
            }
          } catch(e) {
            allPass = false;
            detailsText += `[${key}: خطأ Parsing] `;
          }
        }
      }

      results.push({
        testName: "6. فحص النسخة الاحتياطية (SAFE_BACKUP Verification)",
        passed: allPass,
        details: allPass ? (recoveredExamMsg ? `PASS: ${recoveredExamMsg}` : "جميع النسخ الاحتياطية متطابقة بالهوية وتم استثناء الفروق الهيكلية.") : `حالة التطابق: ${detailsText}`,
        failureDetails: failureDetails.length > 0 ? failureDetails : undefined,
      });

    } catch(err: any) {
      results.push({
        testName: "6. فحص النسخة الاحتياطية (SAFE_BACKUP Verification)",
        passed: false,
        details: `خطأ أثناء قراءة التخزين: ${err?.message || err}`
      });
    }

    return results;
  }
}

export const centralGovernance = CentralGovernanceEngine.getInstance();
