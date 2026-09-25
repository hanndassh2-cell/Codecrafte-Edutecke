import {
  ExamLibraryDocument,
  ExamScope,
  QuestionSnapshot,
  Question,
  ExamIntegrityReport,
  QuestionIntegrityItem,
  QuestionType,
  Exam,
} from "../types";
import { getStoredData, setStoredData, storage } from "./storage";
import { repositories } from "../repositories";

/**
 * DATABASE INDEXING RECOMMENDATION FOR PRODUCTION (MongoDB / Firestore / PostgreSQL):
 *
 * To ensure ultra-fast query execution and prevent full Collection Scans when teachers filter
 * questions by subject, unit, lesson, and archived status:
 *
 * 1. MongoDB Compound Index:
 *    db.Questions_Bank.createIndex(
 *      { subjectId: 1, unitId: 1, lessonId: 1, isArchived: 1, type: 1 },
 *      { name: "idx_questions_scope_filtering" }
 *    );
 *
 * 2. Firestore Composite Index:
 *    Collection: Questions_Bank
 *    Fields: subjectId ASC, unitId ASC, isArchived ASC, type ASC
 *
 * 3. PostgreSQL Composite Index:
 *    CREATE INDEX idx_questions_scope ON questions_bank (subject_id, unit_id, lesson_id, is_archived, type);
 */

const KEYS = {
  EXAMS_LIBRARY: "edutech_exams_library_v1",
};

export class ExamLibraryService {
  /**
   * Get all exams from the Exams_Library collection
   */
  getExamsLibrary(): ExamLibraryDocument[] {
    let library = getStoredData<ExamLibraryDocument[] | null>(KEYS.EXAMS_LIBRARY, null);
    if (library === null) {
      const storageExams = storage.getExams();
      if (storageExams && storageExams.length > 0) {
        const questions = storage.getQuestions();
        library = storageExams.map((exam) => {
          const usedQuestionIds: string[] = [];
          exam.versions?.forEach((v) => {
            v.questions?.forEach((q) => {
              if (q.questionId && !usedQuestionIds.includes(q.questionId)) {
                usedQuestionIds.push(q.questionId);
              }
            });
          });

          const snapshots = usedQuestionIds.map((qId) => {
            const foundQ = questions.find((q) => q.id === qId);
            return {
              questionId: qId,
              questionType: foundQ?.type || ("mcq" as any),
              customTypeName: foundQ?.customTypeName,
              text: foundQ?.text || "سؤال امتحاني",
              answer: foundQ?.answer || "",
              allocatedMarks: 20,
              difficulty: foundQ?.difficulty || "medium",
              snapshotTimestamp: exam.createdAt || new Date().toISOString(),
            };
          });

          return {
            examId: exam.id,
            title: exam.title,
            scope: {
              subjectId: exam.subjectId || "",
              unitIds: exam.unitIds || [],
              lessonIds: exam.lessonIds || [],
              isComprehensive: true,
            },
            generationMethod: (exam.generationType === "semi_auto"
              ? "semi"
              : exam.generationType === "auto"
                ? "auto"
                : "manual") as any,
            usedQuestionIds,
            questionSnapshots: snapshots,
            totalQuestions: exam.totalQuestions || usedQuestionIds.length,
            totalMarks: exam.totalMarks || 100,
            status: "published" as const,
            createdAt: exam.createdAt || new Date().toISOString(),
            updatedAt: exam.createdAt || new Date().toISOString(),
            createdById: "usr-1",
            createdByName: exam.createdBy || "المعلم",
          };
        });
        setStoredData(KEYS.EXAMS_LIBRARY, library);
      } else {
        library = [];
        setStoredData(KEYS.EXAMS_LIBRARY, []);
      }
    }
    
    // Dynamically resolve snapshots from SSOT
    return library.map(doc => {
      if (Array.isArray(doc.questionSnapshots)) {
        doc.questionSnapshots = doc.questionSnapshots.map((snap: any) => {
           // We just merge the latest bank question fields into the snapshot, keeping the snapshot metadata like allocatedMarks
           const resolved = storage.resolveQuestion({ id: snap.questionId }) as any;
           return {
             ...snap,
             text: resolved?.text || snap.text,
             answer: resolved?.answer || snap.answer,
             difficulty: resolved?.difficulty || snap.difficulty,
             questionType: resolved?.type || snap.questionType,
             customTypeName: resolved?.customTypeName || snap.customTypeName,
           };
        });
      }
      return doc;
    });
  }

  /**
   * Get a single exam document from Exams_Library by ID
   */
  getExamById(examId: string): ExamLibraryDocument | undefined {
    const library = this.getExamsLibrary();
    return library.find((e) => e.examId === examId);
  }

  /**
   * Create question snapshots for an array of question IDs from the Question Bank
   */
  createQuestionSnapshots(
    questions: Question[],
    marksPerQuestionMap?: Record<string, number>,
    sectionMap?: Record<string, string>,
  ): QuestionSnapshot[] {
    const now = new Date().toISOString();
    return questions.map((q) => {
      const allocated = marksPerQuestionMap?.[q.id] || 5;
      const sectionId = sectionMap?.[q.id];
      return {
        questionId: q.id,
        sectionId: sectionId,
        questionType: q.type,
        customTypeName: q.customTypeName,
        text: q.text,
        answer: q.answer,
        allocatedMarks: allocated,
        difficulty: q.difficulty,
        distractors: q.distractors,
        matchingPairs: q.matchingPairs,
        sequenceItems: q.sequenceItems,
        imageUrl: q.imageUrl,
        audioUrl: q.audioUrl,
        snapshotTimestamp: now,
        originalBankVersionHash: `${q.id}_v_${q.updatedAt || q.createdAt}`,
      };
    });
  }

  /**
   * Save or update an exam model in the Exams_Library collection with full question snapshots
   */
  saveExamToLibrary(doc: ExamLibraryDocument): ExamLibraryDocument {
    const library = this.getExamsLibrary();
    const existingIndex = library.findIndex((e) => e.examId === doc.examId);

    const updatedDoc: ExamLibraryDocument = {
      ...doc,
      updatedAt: new Date().toISOString(),
      createdAt: doc.createdAt || new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      library[existingIndex] = updatedDoc;
    } else {
      library.unshift(updatedDoc);
    }

    setStoredData(KEYS.EXAMS_LIBRARY, library);

    // Sync with storage.saveExam so edutech_exams_v1 stays strictly synchronized with active question IDs
    try {
      const examForStorage: Exam = {
        durationMinutes: updatedDoc.durationMinutes || doc.durationMinutes,
        id: doc.examId,
        title: doc.title,
        subjectId: doc.scope?.subjectId || "",
        unitIds: doc.scope?.unitIds || [],
        lessonIds: doc.scope?.lessonIds || [],
        totalQuestions: doc.totalQuestions,
        totalMarks: doc.totalMarks,
        difficultyProfile: "balanced",
        generationType:
          doc.generationMethod === "semi"
            ? "semi_auto"
            : doc.generationMethod === "auto"
              ? "auto"
              : "manual",
        versions: doc.versions && doc.versions.length > 0
          ? doc.versions
          : [
              {
                versionCode: "أ",
                questions: (doc.questionSnapshots || []).map((snap, idx) => ({
                  id: snap.questionId,
                  questionId: snap.questionId,
                  allocatedMarks: snap.allocatedMarks,
                  questionOrder: idx + 1,
                  sectionId: snap.sectionId || "sec-1",
                })),
              },
            ],
        createdAt: doc.createdAt,
        createdBy: doc.createdByName || "المعلم",
        status: "finalized",
        libraryDoc: updatedDoc,
      };
      storage.saveExam(examForStorage);
    } catch (err) {
      console.warn("Failed to sync examToLibrary with storage.saveExam:", err);
    }

    storage.logAction(
      doc.createdByName || "المعلم",
      existingIndex >= 0
        ? "تحديث نموذج امتحان بمكتبة الاختبارات"
        : "حفظ نموذج امتحان جديد بمكتبة الاختبارات",
      "مكتبة النماذج والاختبارات (Exams_Library)",
      doc.examId,
      doc.title,
    );

    return updatedDoc;
  }

  /**
   * Delete an exam document from Exams_Library collection by ID
   */
  deleteExamFromLibrary(examId: string): boolean {
    const library = this.getExamsLibrary();
    const filtered = library.filter((e) => e.examId !== examId && (e as any).id !== examId);

    // Also remove from storage service (edutech_exams_v1) to release questions in exam generator
    storage.deleteExam(examId);

    setStoredData(KEYS.EXAMS_LIBRARY, filtered);

    storage.logAction(
      "المعلم",
      "حذف نموذج امتحان من مكتبة الاختبارات وإعادة أسئلته للمولد",
      "مكتبة النماذج والاختبارات (Exams_Library)",
      examId,
      "",
    );

    return true;
  }

  /**
   * Soft-delete a question in the Question Bank (isArchived: true)
   * Ensures the question is hidden from future exam generation without corrupting historical exams.
   */
  softDeleteQuestion(
    questionId: string,
    operatorName: string = "المعلم",
  ): boolean {
    const questions = storage.getQuestions();
    const targetIdx = questions.findIndex((q) => q.id === questionId);

    if (targetIdx < 0) return false;

    questions[targetIdx] = {
      ...questions[targetIdx],
      isArchived: true,
      status: "archived",
      archivedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setStoredData("edutech_questions_v1", questions);

    storage.logAction(
      operatorName,
      "أرشفة سؤال (Soft Delete) في بنك الأسئلة",
      "بنك الأسئلة (Questions_Bank)",
      questionId,
      questions[targetIdx].text.substring(0, 40),
    );

    return true;
  }

  /**
   * Calculate dynamic question capacity for a target scope & exclusion settings
   * Excludes archived questions and optionally previously used question IDs.
   */
  getAvailableQuestionCapacity(
    scope: ExamScope,
    options?: {
      excludeQuestionIds?: string[];
      filterOnlyApproved?: boolean;
    },
  ): {
    totalAvailable: number;
    byType: Record<QuestionType | string, number>;
    availableQuestions: Question[];
  } {
    const allQuestions = storage.getQuestions();
    const excludeSet = new Set(options?.excludeQuestionIds || []);

    // Filter active (non-archived) questions matching scope
    const availableQuestions = (allQuestions || []).filter((q) => {
      if (!q) return false;
      // 1. Soft delete check
      if (q.isArchived === true || q.status === "archived") return false;

      // 2. Exclusion list check
      if (excludeSet.has(q.id)) return false;

      // 3. Subject scope check
      if (scope?.subjectId && q.subjectId !== scope.subjectId) return false;

      // 4. Unit scope check (if not comprehensive final exam)
      if (!scope?.isComprehensive && scope?.unitIds && scope.unitIds.length > 0) {
        if (!scope.unitIds.includes(q.unitId)) return false;
      }

      // 5. Lesson scope check
      if (scope?.lessonIds && scope.lessonIds.length > 0) {
        if (!scope.lessonIds.includes(q.lessonId)) return false;
      }

      return true;
    });

    const byType: Record<string, number> = {};
    availableQuestions.forEach((q) => {
      if (q && q.type) {
        byType[q.type] = (byType[q.type] || 0) + 1;
      }
    });

    return {
      totalAvailable: availableQuestions.length,
      byType,
      availableQuestions,
    };
  }

  /**
   * Check integrity of questions in an existing exam document against the current Question Bank
   * Detects if any questions were modified or soft-deleted since the exam was created.
   */
  checkExamIntegrity(examId: string): ExamIntegrityReport {
    const examDoc = this.getExamById(examId);
    if (!examDoc) {
      return {
        examId,
        examTitle: "نموذج غير موجود",
        hasWarnings: false,
        intactCount: 0,
        modifiedCount: 0,
        archivedCount: 0,
        items: [],
      };
    }

    const currentBankQuestions = storage.getQuestions();
    const bankMap = new Map(currentBankQuestions.map((q) => [q.id, q]));

    let intactCount = 0;
    let modifiedCount = 0;
    let archivedCount = 0;

    const items: QuestionIntegrityItem[] = (examDoc.questionSnapshots || []).map(
      (snap) => {
        const bankItem = bankMap.get(snap.questionId);

        if (
          !bankItem ||
          bankItem.isArchived === true ||
          bankItem.status === "archived"
        ) {
          archivedCount++;
          return {
            questionId: snap.questionId,
            snapshot: snap,
            status: "archived",
            currentBankQuestion: bankItem,
            diffSummary:
              "تم إرسال هذا السؤال إلى الأرشيف (Soft Deleted) من بنك الأسئلة الرئيسي.",
          };
        }

        // Check if text or answer was modified
        const isModified =
          bankItem.text !== snap.text ||
          bankItem.answer !== snap.answer ||
          JSON.stringify(bankItem.distractors) !==
            JSON.stringify(snap.distractors);

        if (isModified) {
          modifiedCount++;
          return {
            questionId: snap.questionId,
            snapshot: snap,
            status: "modified",
            currentBankQuestion: bankItem,
            diffSummary:
              "تم تعديل نص أو خيارات أو إجابة هذا السؤال في بنك الأسئلة بعد إنشاء هذا النموذج.",
          };
        }

        intactCount++;
        return {
          questionId: snap.questionId,
          snapshot: snap,
          status: "intact",
          currentBankQuestion: bankItem,
        };
      },
    );

    return {
      examId: examDoc.examId,
      examTitle: examDoc.title,
      hasWarnings: modifiedCount > 0 || archivedCount > 0,
      intactCount,
      modifiedCount,
      archivedCount,
      items,
    };
  }

  /**
   * Resolve an integrity issue for a question during re-editing
   */
  resolveIntegrityIssue(
    examId: string,
    questionId: string,
    action: "keep_snapshot" | "update_from_bank" | "replace_with_similar",
  ): ExamLibraryDocument | undefined {
    const examDoc = this.getExamById(examId);
    if (!examDoc) return undefined;

    const bankQuestions = storage.getQuestions();
    const bankItem = bankQuestions.find((q) => q.id === questionId);

    const updatedSnapshots = [...examDoc.questionSnapshots];
    const snapIdx = updatedSnapshots.findIndex(
      (s) => s.questionId === questionId,
    );

    if (snapIdx < 0) return examDoc;

    if (action === "update_from_bank" && bankItem) {
      // Refresh snapshot from current bank version
      updatedSnapshots[snapIdx] = {
        ...updatedSnapshots[snapIdx],
        text: bankItem.text,
        answer: bankItem.answer,
        distractors: bankItem.distractors,
        matchingPairs: bankItem.matchingPairs,
        sequenceItems: bankItem.sequenceItems,
        snapshotTimestamp: new Date().toISOString(),
      };
    } else if (action === "replace_with_similar") {
      // Find an available active question matching same type & scope
      const targetType = updatedSnapshots[snapIdx].questionType;
      const usedSet = new Set(examDoc.usedQuestionIds);

      const candidate = (bankQuestions || []).find(
        (q) =>
          q &&
          q.id !== questionId &&
          !usedSet.has(q.id) &&
          q.isArchived !== true &&
          q.status !== "archived" &&
          q.subjectId === examDoc.scope?.subjectId &&
          q.type === targetType,
      );

      if (candidate) {
        // Replace question ID in used list & snapshot
        const newUsedIds = (examDoc.usedQuestionIds || []).map((id) =>
          id === questionId ? candidate.id : id,
        );
        examDoc.usedQuestionIds = newUsedIds;

        updatedSnapshots[snapIdx] = {
          questionId: candidate.id,
          questionType: candidate.type,
          customTypeName: candidate.customTypeName,
          text: candidate.text,
          answer: candidate.answer,
          allocatedMarks: updatedSnapshots[snapIdx].allocatedMarks,
          difficulty: candidate.difficulty,
          distractors: candidate.distractors,
          matchingPairs: candidate.matchingPairs,
          sequenceItems: candidate.sequenceItems,
          imageUrl: candidate.imageUrl,
          audioUrl: candidate.audioUrl,
          snapshotTimestamp: new Date().toISOString(),
        };
      }
    }

    examDoc.questionSnapshots = updatedSnapshots;
    return this.saveExamToLibrary(examDoc);
  }
}

export const examLibraryService = new ExamLibraryService();
