import { ParsedQuestion } from "./questionParser";

export interface QuestionChoice {
  id: string;
  letter: string; // أ, ب, ج, د or 1, 2, 3, 4
  text: string;
  isCorrect: boolean;
}

export interface QuestionObject {
  questionId: string;
  questionType: string; // mcq, true_false, explain_reason, definition, etc.
  questionTypeLabelArabic: string;
  questionText: string;
  choices: QuestionChoice[];
  correctAnswer: string;
  difficulty: "easy" | "medium" | "hard";
  difficultyLabelArabic: string;
  marks: number;
  lessonId: string;
  lessonIds?: string[];
  unitId: string;
  subjectId: string;
  importance?: number;
  futureProbability?: number;
  finalWeightScore?: number;
  keywords: string[];
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionObjectContext {
  lessonId?: string;
  unitId?: string;
  subjectId?: string;
  defaultKeywords?: string[];
  defaultMarks?: number;
}

export const QUESTION_TYPE_ARABIC_NAMES: Record<string, string> = {
  mcq: "اختيار من متعدد",
  true_false: "صح وخطأ",
  explain_reason: "علل / وضح السبب",
  definition: "عرف / مفهوم",
  fill_blanks: "أكمل الفراغات",
  ordering: "رتب / ترتيب تسلسلي",
  matching: "وصل / مطابقة",
  essay: "مقالي / إنشائي",
  computational: "حسابي / مسألة رياضية",
  practical: "عملي / تجربة مخبرية",
  image_based: "سؤال يعتمد على صورة",
  table_based: "سؤال يعتمد على جدول",
  equation_based: "سؤال يعتمد على معادلة",
  custom: "سؤال مخصص",
};

/**
 * Builds a single complete Question Object entity from raw or parsed question data.
 */
export function buildQuestionObject(
  parsed: ParsedQuestion | Partial<QuestionObject>,
  context?: QuestionObjectContext
): QuestionObject {
  const now = new Date().toISOString();
  const pq = parsed as ParsedQuestion;
  const qo = parsed as QuestionObject;

  // Generate unique Question ID if missing
  const questionId =
    qo.questionId ||
    pq.id ||
    "q_obj_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);

  const questionType = qo.questionType || pq.type || "essay";
  const questionTypeLabelArabic =
    QUESTION_TYPE_ARABIC_NAMES[questionType] || pq.typeLabelArabic || "سؤال";

  const questionText = parsed.questionText || (parsed as any).text || pq.rawContent || "نص السؤال غير محدد";

  // Build choices array
  let choices: QuestionChoice[] = [];
  if (qo.choices && Array.isArray(qo.choices)) {
    choices = qo.choices;
  } else if (pq.options && Array.isArray(pq.options)) {
    choices = pq.options.map((opt, i) => ({
      id: opt.id || "choice_" + i,
      letter: opt.letter || String.fromCharCode(0x0623 + i), // أ, ب, ج, د
      text: opt.text,
      isCorrect: !!opt.isCorrect,
    }));
  }

  // Derive correct answer string
  let correctAnswer = qo.correctAnswer || pq.modelAnswer || "";
  if (!correctAnswer && choices.length > 0) {
    const correctOpt = choices.find((c) => c.isCorrect);
    if (correctOpt) {
      correctAnswer = `${correctOpt.letter}) ${correctOpt.text}`;
    }
  }

  // Extract keywords automatically from question text
  const extractedKeywords = extractKeywordsFromText(questionText);
  const combinedKeywords = Array.from(
    new Set([...(context?.defaultKeywords || []), ...extractedKeywords, ...(parsed.metadata?.keywords || [])])
  );

  const difficulty = parsed.difficulty || "medium";
  const diffLabelMap: Record<string, string> = {
    easy: "سهل",
    medium: "متوسط",
    hard: "صعب",
  };

  const marks = typeof parsed.marks === "number" ? parsed.marks : context?.defaultMarks || 1;

  const metadata: Record<string, any> = {
    ...(parsed.metadata || {}),
    hasImage: pq.hasImage || false,
    hasTable: pq.hasTable || false,
    hasEquation: pq.hasEquation || false,
    imageUrl: pq.imageUrl,
    tableHtml: pq.tableHtml,
    builtAt: now,
    engineVersion: "QuestionObjectBuilder_v1.0",
  };

  return {
    questionId,
    questionType,
    questionTypeLabelArabic,
    questionText,
    choices,
    correctAnswer,
    difficulty,
    difficultyLabelArabic: diffLabelMap[difficulty] || "متوسط",
    marks,
    lessonId: (parsed as QuestionObject).lessonId || context?.lessonId || "lesson_default",
    unitId: (parsed as QuestionObject).unitId || context?.unitId || "unit_default",
    subjectId: (parsed as QuestionObject).subjectId || context?.subjectId || "subject_default",
    keywords: combinedKeywords,
    metadata,
    createdAt: (parsed as QuestionObject).createdAt || now,
    updatedAt: now,
  };
}

/**
 * Builds a list of Question Objects from parsed question results.
 */
export function buildBatchQuestionObjects(
  parsedQuestions: ParsedQuestion[],
  context?: QuestionObjectContext
): QuestionObject[] {
  if (!parsedQuestions || parsedQuestions.length === 0) return [];
  return parsedQuestions.map((q) => buildQuestionObject(q, context));
}

/**
 * Validates a Question Object to ensure complete data integrity.
 */
export function validateQuestionObject(qObj: QuestionObject): {
  isValid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  if (!qObj.questionText || qObj.questionText.trim().length < 3) {
    warnings.push("نص السؤال قصير جداً أو مفقود.");
  }

  if (qObj.questionType === "mcq" && qObj.choices.length < 2) {
    warnings.push("سؤال الاختيار من متعدد يتطلب خيارين على الأقل.");
  }

  if (qObj.questionType === "mcq" && !qObj.choices.some((c) => c.isCorrect)) {
    warnings.push("لم يتم تحديد أي إجابة صحيحة بين الخيارات.");
  }

  if (qObj.marks <= 0) {
    warnings.push("درجة السؤال تساوي صفر.");
  }

  return {
    isValid: warnings.length === 0,
    warnings,
  };
}

/**
 * Extract Arabic keywords from question text
 */
function extractKeywordsFromText(text: string): string[] {
  if (!text) return [];
  const words = text
    .replace(/[^\w\s\u0600-\u06FF]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .filter(
      (w) =>
        ![
          "سؤال",
          "الإجابة",
          "الصحيحة",
          "التالي",
          "التي",
          "الذي",
          "هذا",
          "هذه",
          "أحسب",
          "أوجد",
          "اختر",
          "إختر",
          "علامة",
          "درجة",
        ].includes(w)
    );

  return Array.from(new Set(words)).slice(0, 5);
}
