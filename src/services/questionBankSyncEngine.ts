import { QuestionObject } from "./questionObjectBuilder";
import { storage, KEYS, setStoredData, getStoredData } from "./storage";
import { Question } from "../types";

export interface QuestionBankItem extends QuestionObject {
  uuid: string; // Standard UUID identifier (e.g., 550e8400-e29b-41d4-a716-446655440000)
  status: "active" | "archived";
  version: number;
  lastSyncedAt: string;
  fingerprint: string; // Text fingerprint for deduplication
  lessonIds?: string[];
  importance?: number;
  futureProbability?: number;
  finalWeightScore?: number;
}

export type SyncRemovalStrategy = "delete" | "archive" | "keep";

export interface SyncActionLog {
  uuid: string;
  questionText: string;
  action: "created" | "updated" | "archived" | "deleted" | "kept" | "unchanged";
  reason: string;
  timestamp: string;
}

export interface SyncDiffReport {
  createdItems: QuestionBankItem[];
  updatedItems: QuestionBankItem[];
  removedCandidates: QuestionBankItem[];
  unchangedItems: QuestionBankItem[];
  actionLogs: SyncActionLog[];
  summary: {
    totalIncoming: number;
    totalInBankBefore: number;
    totalInBankAfter: number;
    createdCount: number;
    updatedCount: number;
    archivedCount: number;
    deletedCount: number;
    keptCount: number;
    unchangedCount: number;
  };
}

/**
 * Generates a standard UUID v4 or fallback unique UUID format
 */
export function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Creates a normalized text fingerprint to detect duplicate questions regardless of spacing/punctuation
 */
export function createQuestionFingerprint(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[^\w\u0600-\u06FF]/g, "")
    .trim();
}

/**
 * Maps a Question from edutech_questions_v1 store into QuestionBankItem
 */
export function mapQuestionToBankItem(q: Question): QuestionBankItem {
  if (!q) {
    return {
      questionId: generateUUID(),
      uuid: generateUUID(),
      status: "active",
      version: 1,
      lastSyncedAt: new Date().toISOString(),
      fingerprint: "",
      questionType: "mcq" as any,
      questionTypeLabelArabic: "اختيار من متعدد",
      questionText: "",
      choices: [],
      correctAnswer: "",
      difficulty: "medium" as any,
      difficultyLabelArabic: "متوسط",
      marks: 2,
      lessonId: "",
      lessonIds: [],
      subjectId: "",
      unitId: "",
      importance: 3,
      futureProbability: 75,
      finalWeightScore: 80,
      keywords: [],
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
  const choices = Array.isArray(q.distractors) && q.distractors.length > 0
    ? q.distractors.map((d: any, idx: number) => ({
        id: d?.id || `c_${idx}`,
        letter: String.fromCharCode(0x0621 + idx),
        text: d?.text || "",
        isCorrect: !!d?.isCorrect,
      }))
    : [];

  return {
    questionId: q.id || generateUUID(),
    uuid: (q as any).uuid || q.id || generateUUID(),
    status: (q.status === "archived" ? "archived" : "active") as "active" | "archived",
    version: (q as any).version || 1,
    lastSyncedAt: q.updatedAt || new Date().toISOString(),
    fingerprint: createQuestionFingerprint(q.text || ""),
    questionType: (q.type || "mcq") as any,
    questionTypeLabelArabic: q.type || "اختيار من متعدد",
    questionText: q.text || "",
    choices: choices,
    correctAnswer: q.answer || (choices.find(c => c.isCorrect)?.text || ""),
    difficulty: (q.difficulty || "medium") as any,
    difficultyLabelArabic: q.difficulty === "easy" ? "سهل" : q.difficulty === "hard" ? "صعب" : "متوسط",
    marks: (q as any).marks || 2,
    lessonId: q.lessonId || "",
    lessonIds: Array.isArray(q.lessonIds) ? q.lessonIds : (q.lessonId ? [q.lessonId] : []),
    subjectId: q.subjectId || "",
    unitId: q.unitId || "",
    importance: q.importance || 3,
    futureProbability: q.futureProbability || 75,
    finalWeightScore: q.finalWeightScore || 80,
    keywords: q.tags || [],
    metadata: {
      ...((q as any).metadata || {}),
      bookReference: q.bookReference,
    },
    createdAt: q.createdAt || new Date().toISOString(),
    updatedAt: q.updatedAt || new Date().toISOString(),
  };
}

/**
 * Maps a QuestionBankItem back to standard Question for edutech_questions_v1 store
 */
export function mapBankItemToQuestion(item: QuestionBankItem, existingQuestion?: Question): Question {
  const lessonIdsSet = new Set<string>();
  if (existingQuestion?.lessonIds) {
    existingQuestion.lessonIds.forEach((lid) => lid && lessonIdsSet.add(lid));
  }
  if (existingQuestion?.lessonId) lessonIdsSet.add(existingQuestion.lessonId);
  if (item.lessonIds) {
    item.lessonIds.forEach((lid) => lid && lessonIdsSet.add(lid));
  }
  if (item.lessonId) lessonIdsSet.add(item.lessonId);

  const mergedLessonIds = Array.from(lessonIdsSet);

  return {
    id: item.uuid || item.questionId || existingQuestion?.id || generateUUID(),
    subjectId: item.subjectId || existingQuestion?.subjectId || "",
    unitId: item.unitId || existingQuestion?.unitId || "",
    lessonId: item.lessonId || existingQuestion?.lessonId || (mergedLessonIds[0] || ""),
    lessonIds: mergedLessonIds,
    type: (item.questionType || existingQuestion?.type || "mcq") as any,
    text: item.questionText || existingQuestion?.text || "",
    answer: item.correctAnswer || existingQuestion?.answer || "",
    difficulty: item.difficulty || existingQuestion?.difficulty || "medium",
    importance: (item.importance || existingQuestion?.importance || 3) as any,
    futureProbability: item.futureProbability || existingQuestion?.futureProbability || 75,
    finalWeightScore: item.finalWeightScore || existingQuestion?.finalWeightScore || 80,
    tags: item.keywords || existingQuestion?.tags || [],
    status: item.status || existingQuestion?.status || "active",
    distractors: Array.isArray(item.choices) && item.choices.length > 0
      ? item.choices.map((c: any) => ({
          id: c.id,
          text: c.text,
          isCorrect: !!c.isCorrect,
        }))
      : (existingQuestion?.distractors || []),
    isPastCycle: existingQuestion?.isPastCycle || false,
    occurrencesCount: existingQuestion?.occurrencesCount || 1,
    subjectName: existingQuestion?.subjectName,
    unitTitle: existingQuestion?.unitTitle,
    lessonTitle: existingQuestion?.lessonTitle,
    bookReference: (item as any).bookReference || (item.metadata as any)?.bookReference || existingQuestion?.bookReference,
    createdAt: existingQuestion?.createdAt || item.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Retrieves the current Question Bank items directly from single source of truth (edutech_questions_v1)
 */
export function getStoredQuestionBank(): QuestionBankItem[] {
  try {
    const rawQuestions = storage.getQuestions();
    if (Array.isArray(rawQuestions) && rawQuestions.length > 0) {
      return rawQuestions.filter(Boolean).map((q) => mapQuestionToBankItem(q));
    }
  } catch (err) {
    console.error("Error reading Question Bank from storage:", err);
  }
  return [];
}

/**
 * Saves updated Question Bank array into persistent local storage (edutech_questions_v1)
 */
export function saveQuestionBank(bank: QuestionBankItem[]): void {
  try {
    const existingQuestions = storage.getQuestions().filter(Boolean);
    const existingMap = new Map<string, Question>(existingQuestions.filter(q => q && q.id).map((q) => [q.id, q]));

    const updatedQuestions: Question[] = (bank || []).filter(Boolean).map((item) => {
      const existing = existingMap.get(item.uuid) || existingMap.get(item.questionId);
      return mapBankItemToQuestion(item, existing);
    });

    setStoredData(KEYS.QUESTIONS, updatedQuestions);
  } catch (err) {
    console.error("Error writing Question Bank to storage:", err);
  }
}

/**
 * Compares incoming Question Objects with existing Question Bank items.
 * Generates an analytical diff report before performing actual mutation.
 */
export function compareQuestionObjectsWithBank(
  incomingObjects: QuestionObject[],
  targetLessonId?: string
): {
  incomingMapped: { incoming: QuestionObject; matchedBankItem: QuestionBankItem | null }[];
  diffReport: SyncDiffReport;
} {
  const currentBank = getStoredQuestionBank();
  const logs: SyncActionLog[] = [];

  const createdItems: QuestionBankItem[] = [];
  const updatedItems: QuestionBankItem[] = [];
  const unchangedItems: QuestionBankItem[] = [];

  const incomingMapped: { incoming: QuestionObject; matchedBankItem: QuestionBankItem | null }[] = [];
  const matchedBankUuids = new Set<string>();

  const now = new Date().toISOString();

  incomingObjects.forEach((inc) => {
    const incFingerprint = createQuestionFingerprint(inc.questionText);

    // Try matching by questionId, or UUID in metadata, or text fingerprint (deduplication)
    const matched = currentBank.find(
      (b) =>
        b.uuid === inc.questionId ||
        b.questionId === inc.questionId ||
        (incFingerprint && b.fingerprint === incFingerprint)
    );

    if (matched) {
      matchedBankUuids.add(matched.uuid);
      incomingMapped.push({ incoming: inc, matchedBankItem: matched });

      // Check if content actually changed
      const hasChanged =
        matched.questionText !== inc.questionText ||
        matched.marks !== inc.marks ||
        matched.difficulty !== inc.difficulty ||
        (inc.correctAnswer && matched.correctAnswer !== inc.correctAnswer) ||
        JSON.stringify(matched.choices) !== JSON.stringify(inc.choices);

      if (hasChanged) {
        const mergedLessonIds = Array.from(new Set([
          ...(matched.lessonIds || []),
          ...(inc.lessonIds || []),
          ...(matched.lessonId ? [matched.lessonId] : []),
          ...(inc.lessonId ? [inc.lessonId] : []),
          ...(targetLessonId ? [targetLessonId] : [])
        ]));

        const updatedItem: QuestionBankItem = {
          ...matched,
          ...inc,
          uuid: matched.uuid, // preserve UUID
          correctAnswer: inc.correctAnswer || matched.correctAnswer, // preserve correct model answer
          importance: inc.importance || matched.importance,
          futureProbability: inc.futureProbability || matched.futureProbability,
          finalWeightScore: inc.finalWeightScore || matched.finalWeightScore,
          subjectId: inc.subjectId || matched.subjectId,
          unitId: inc.unitId || matched.unitId,
          lessonId: inc.lessonId || matched.lessonId,
          lessonIds: mergedLessonIds,
          status: "active",
          version: (matched.version || 1) + 1,
          lastSyncedAt: now,
          fingerprint: incFingerprint || matched.fingerprint,
          createdAt: matched.createdAt || now,
          updatedAt: now,
        };
        updatedItems.push(updatedItem);
        logs.push({
          uuid: matched.uuid,
          questionText: inc.questionText,
          action: "updated",
          reason: "تم تحديث بيانات السؤال وتعديل الإصدار إلى v" + (matched.version + 1),
          timestamp: now,
        });
      } else {
        unchangedItems.push(matched);
        logs.push({
          uuid: matched.uuid,
          questionText: inc.questionText,
          action: "unchanged",
          reason: "لا يوجد تغيير في كائن السؤال المخزن في البنك",
          timestamp: now,
        });
      }
    } else {
      // New Question Object -> assign UUID
      const newUuid = generateUUID();
      const newItem: QuestionBankItem = {
        ...inc,
        uuid: newUuid,
        status: "active",
        version: 1,
        lastSyncedAt: now,
        fingerprint: incFingerprint,
        createdAt: now,
        updatedAt: now,
      };
      createdItems.push(newItem);
      incomingMapped.push({ incoming: inc, matchedBankItem: newItem });
      logs.push({
        uuid: newUuid,
        questionText: inc.questionText,
        action: "created",
        reason: "سؤال جديد لم يسبق وجوده في البنك، تم إسناد UUID جديد له",
        timestamp: now,
      });
    }
  });

  // Identify removed candidates (items in Bank for target lesson but not present in incoming list)
  const removedCandidates = currentBank.filter((b) => {
    if (b.status !== "active" || matchedBankUuids.has(b.uuid)) return false;
    if (targetLessonId && targetLessonId.trim()) {
      const matchLesson = b.lessonId === targetLessonId || (Array.isArray(b.lessonIds) && b.lessonIds.includes(targetLessonId));
      return matchLesson;
    }
    return true;
  });

  const diffReport: SyncDiffReport = {
    createdItems,
    updatedItems,
    removedCandidates,
    unchangedItems,
    actionLogs: logs,
    summary: {
      totalIncoming: incomingObjects.length,
      totalInBankBefore: currentBank.length,
      totalInBankAfter: currentBank.length,
      createdCount: createdItems.length,
      updatedCount: updatedItems.length,
      archivedCount: 0,
      deletedCount: 0,
      keptCount: 0,
      unchangedCount: unchangedItems.length,
    },
  };

  return { incomingMapped, diffReport };
}

/**
 * Performs actual Question Bank synchronization applying the user's chosen removal strategy for missing items.
 */
export function executeQuestionBankSync(
  incomingObjects: QuestionObject[],
  removalStrategy: SyncRemovalStrategy = "keep",
  customRemovalDecisions?: Record<string, SyncRemovalStrategy>,
  targetLessonId?: string
): {
  finalBank: QuestionBankItem[];
  diffReport: SyncDiffReport;
} {
  const currentBank = getStoredQuestionBank();
  const { diffReport } = compareQuestionObjectsWithBank(incomingObjects, targetLessonId);

  const now = new Date().toISOString();
  const finalBankMap = new Map<string, QuestionBankItem>();

  // 1. Put all current bank items in map
  currentBank.forEach((item) => finalBankMap.set(item.uuid, item));

  // 2. Apply updated items
  diffReport.updatedItems.forEach((item) => {
    finalBankMap.set(item.uuid, item);
  });

  // 3. Apply created new items
  diffReport.createdItems.forEach((item) => {
    finalBankMap.set(item.uuid, item);
  });

  // 4. Handle missing / removed candidates according to user decision
  let deletedCount = 0;
  let archivedCount = 0;
  let keptCount = 0;

  diffReport.removedCandidates.forEach((item) => {
    const strategy = customRemovalDecisions?.[item.uuid] || removalStrategy;

    if (strategy === "delete") {
      // Check usage before hard deletion
      const usage = storage.checkQuestionUsage(item.uuid);
      if (usage.inUse) {
        // Block hard deletion if question is linked
        keptCount++;
        diffReport.actionLogs.push({
          uuid: item.uuid,
          questionText: item.questionText,
          action: "kept",
          reason: "الحذف النهائي محظور! السؤال مرتبط بمحتوى تعليمي، تم الإبقاء عليه بالبنك.",
          timestamp: now,
        });
      } else {
        finalBankMap.delete(item.uuid);
        deletedCount++;
        diffReport.actionLogs.push({
          uuid: item.uuid,
          questionText: item.questionText,
          action: "deleted",
          reason: "تم حذف السؤال غير المرتبط نهائياً من البنك",
          timestamp: now,
        });
      }
    } else if (strategy === "archive") {
      const archivedItem: QuestionBankItem = {
        ...item,
        status: "archived",
        updatedAt: now,
        lastSyncedAt: now,
      };
      finalBankMap.set(item.uuid, archivedItem);
      archivedCount++;
      diffReport.actionLogs.push({
        uuid: item.uuid,
        questionText: item.questionText,
        action: "archived",
        reason: "تم تحويل حالة السؤال إلى مؤرشف (Archived)",
        timestamp: now,
      });
    } else {
      // Keep
      keptCount++;
      diffReport.actionLogs.push({
        uuid: item.uuid,
        questionText: item.questionText,
        action: "kept",
        reason: "تم الإبقاء على السؤال دون تغيير في البنك",
        timestamp: now,
      });
    }
  });

  const finalBankArray = Array.from(finalBankMap.values());

  // Save directly to persistent storage (edutech_questions_v1)
  saveQuestionBank(finalBankArray);

  // Update summary counts in diff report
  diffReport.summary.totalInBankAfter = finalBankArray.length;
  diffReport.summary.deletedCount = deletedCount;
  diffReport.summary.archivedCount = archivedCount;
  diffReport.summary.keptCount = keptCount;

  return {
    finalBank: finalBankArray,
    diffReport,
  };
}

