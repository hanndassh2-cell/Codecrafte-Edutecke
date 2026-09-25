import { Subject, Unit, Lesson, Question } from "../../../types/index";

export interface LessonStats {
  totalCards: number;
  questionCount: number;
  imageCount: number;
  tableCount: number;
  equationCount: number;
  objectiveCount: number;
  conceptCount: number;
  activityCount: number;
  exampleCount: number;
  noteCount: number;
  explanationCount: number;
  titleCount: number;
}

export const getLessonStats = (lesson: Lesson, allQuestions: any[]): LessonStats => {
  const paragraphs = lesson.contentParagraphs || [];
  
  // Deduplicate allQuestions by id to avoid duplicate count bugs
  const uniqueQuestions = Array.from(
    new Map((allQuestions || []).filter(Boolean).map((q) => [q.id, q])).values()
  );

  const lessonQuestions = uniqueQuestions.filter((q) => {
    if (!q) return false;
    const matchesId = q.lessonId === lesson.id;
    const matchesIdsArray = q.lessonIds && Array.isArray(q.lessonIds) && q.lessonIds.includes(lesson.id);
    return matchesId || matchesIdsArray;
  });

  const totalCards = paragraphs.length;
  const questionCount = lessonQuestions.length;
  
  // Support both plural and singular names for types to avoid missing statistics
  const imageCount = paragraphs.filter((p) => p.type === "images" || p.type === "image" || p.type === "img").length;
  const tableCount = paragraphs.filter((p) => p.type === "tables" || p.type === "table").length;
  const equationCount = paragraphs.filter((p) => p.type === "math" || p.type === "equation" || p.type === "formula").length;
  const objectiveCount = lesson.objectives?.length || paragraphs.filter((p) => p.type === "objectives" || p.type === "objective").length;
  const conceptCount = paragraphs.filter((p) => p.type === "concepts" || p.type === "concept").length;
  const activityCount = paragraphs.filter((p) => p.type === "activities" || p.type === "activity").length;
  const exampleCount = paragraphs.filter((p) => p.type === "examples" || p.type === "example" || p.type === "exercise" || p.type === "problem").length;
  const noteCount = paragraphs.filter((p) => p.type === "notes" || p.type === "note").length;
  const explanationCount = paragraphs.filter((p) => p.type === "explanation" || p.type === "explain" || p.type === "summary").length;
  const titleCount = paragraphs.filter((p) => p.type === "title" || p.type === "heading").length;

  return {
    totalCards,
    questionCount,
    imageCount,
    tableCount,
    equationCount,
    objectiveCount,
    conceptCount,
    activityCount,
    exampleCount,
    noteCount,
    explanationCount,
    titleCount,
  };
};

export const calculateLessonCompletion = (lesson: Lesson, stats: LessonStats) => {
  const elements = [
    { name: "title", present: !!lesson.title || stats.titleCount > 0 },
    { name: "objectives", present: (lesson.objectives && lesson.objectives.length > 0) || stats.objectiveCount > 0 },
    { name: "explanation", present: stats.explanationCount > 0 },
    { name: "concepts", present: stats.conceptCount > 0 },
    { name: "questions", present: stats.questionCount > 0 },
    { name: "activities", present: stats.activityCount > 0 },
    { name: "examples", present: stats.exampleCount > 0 },
    { name: "images", present: stats.imageCount > 0 },
    { name: "notes", present: stats.noteCount > 0 },
    { name: "equations", present: stats.equationCount > 0 },
    { name: "tables", present: stats.tableCount > 0 },
  ];

  const presentCount = elements.filter((e) => e.present).length;
  const percentage = Math.round((presentCount / elements.length) * 100);
  return {
    percentage,
    elements,
  };
};

export const getLessonAutoStatus = (lesson: Lesson, stats: LessonStats, completion: number): string => {
  const totalParagraphs = lesson.contentParagraphs?.length || 0;

  // 1. لم يبدأ (Not Started)
  if (totalParagraphs === 0 && stats.questionCount === 0 && (lesson.objectives?.length || 0) === 0) {
    return "not_started";
  }

  // 2. يحتوي أخطاء (Contains Errors)
  const hasEmptyParagraphs = lesson.contentParagraphs?.some((p) => !p.body || p.body.trim() === "") ?? false;
  const lacksBasicInfo = !lesson.title || lesson.title.trim() === "";
  if (hasEmptyParagraphs || lacksBasicInfo || (lesson.durationMinutes || 0) <= 0) {
    return "has_errors";
  }

  // 3. مكتمل (Completed)
  if (completion >= 90 || lesson.status === "completed" || lesson.status === "approved") {
    return "completed";
  }

  // 4. قيد المراجعة (Under Review)
  if (lesson.status === "review") {
    return "review";
  }

  // 5. قيد التحرير (Editing / In Progress)
  return "in_progress";
};

export const getUnitStats = (unit: Unit, unitLessons: Lesson[], allQuestions: any[]) => {
  const totalLessons = unitLessons.length;
  let completedCount = 0;
  let inProgressCount = 0;
  let totalQuestions = 0;
  let totalImages = 0;
  let totalActivities = 0;
  let totalEquations = 0;
  let totalCompletionSum = 0;

  unitLessons.forEach((lesson) => {
    const lStats = getLessonStats(lesson, allQuestions);
    const lCompletion = calculateLessonCompletion(lesson, lStats).percentage;
    const lStatus = getLessonAutoStatus(lesson, lStats, lCompletion);

    if (lStatus === "completed") {
      completedCount++;
    } else if (lStatus === "in_progress") {
      inProgressCount++;
    }

    totalQuestions += lStats.questionCount;
    totalImages += lStats.imageCount;
    totalActivities += lStats.activityCount;
    totalEquations += lStats.equationCount;
    totalCompletionSum += lCompletion;
  });

  const averageCompletion = totalLessons > 0 ? Math.round(totalCompletionSum / totalLessons) : 0;

  return {
    totalLessons,
    completedCount,
    inProgressCount,
    totalQuestions,
    totalImages,
    totalActivities,
    totalEquations,
    averageCompletion,
  };
};

export const getSubjectStats = (subject: Subject, allLessons: Lesson[], allQuestions: any[]) => {
  if (!subject) {
    return {
      totalLessons: 0,
      totalQuestions: 0,
      totalImages: 0,
      totalTables: 0,
      totalEquations: 0,
      averageCompletion: 0,
    };
  }
  const subLessons = (allLessons || []).filter((l) => l && l.subjectId === subject.id && l.status !== "archived");

  const totalLessons = subLessons.length;
  let totalQuestions = 0;
  let totalImages = 0;
  let totalTables = 0;
  let totalEquations = 0;
  let totalCompletionSum = 0;

  subLessons.forEach((lesson) => {
    const lStats = getLessonStats(lesson, allQuestions);
    const lCompletion = calculateLessonCompletion(lesson, lStats).percentage;

    totalQuestions += lStats.questionCount;
    totalImages += lStats.imageCount;
    totalTables += lStats.tableCount;
    totalEquations += lStats.equationCount;
    totalCompletionSum += lCompletion;
  });

  const averageCompletion = totalLessons > 0 ? Math.round(totalCompletionSum / totalLessons) : 0;

  return {
    totalLessons,
    totalQuestions,
    totalImages,
    totalTables,
    totalEquations,
    averageCompletion,
  };
};

export const lessonMatchesSearch = (lesson: Lesson, term: string, stats: LessonStats): boolean => {
  const t = term.toLowerCase().trim();
  if (!t) return true;

  // 1. Lesson title
  if (lesson.title.toLowerCase().includes(t)) return true;

  // 2. Lesson index/number
  if (String(lesson.orderIndex).includes(t)) return true;

  // 3. Objectives
  if (lesson.objectives?.some((obj) => obj.toLowerCase().includes(t))) return true;

  // 4. Concepts in paragraphs
  const paragraphs = lesson.contentParagraphs || [];
  const conceptParagraphs = paragraphs.filter((p) => p.type === "concepts");
  if (conceptParagraphs.some((p) => p.body.toLowerCase().includes(t) || p.title?.toLowerCase().includes(t))) return true;

  // 5. Explanation words
  const explanationParagraphs = paragraphs.filter((p) => p.type === "explanation");
  if (explanationParagraphs.some((p) => p.body.toLowerCase().includes(t) || p.title?.toLowerCase().includes(t))) return true;

  // 6. Content type
  if (t === "صور" || t === "صورة" || t === "image" || t === "images") {
    if (stats.imageCount > 0) return true;
  }
  if (t === "جداول" || t === "جدول" || t === "table" || t === "tables") {
    if (stats.tableCount > 0) return true;
  }
  if (t === "معادلات" || t === "معادلة" || t === "math" || t === "equations") {
    if (stats.equationCount > 0) return true;
  }
  if (t === "أهداف" || t === "هدف" || t === "objective" || t === "objectives") {
    if (stats.objectiveCount > 0) return true;
  }
  if (t === "مفاهيم" || t === "مفهوم" || t === "concept" || t === "concepts") {
    if (stats.conceptCount > 0) return true;
  }
  if (t === "أسئلة" || t === "سؤال" || t === "question" || t === "questions") {
    if (stats.questionCount > 0) return true;
  }

  // General paragraph search
  if (paragraphs.some((p) => p.title?.toLowerCase().includes(t) || p.body?.toLowerCase().includes(t))) {
    return true;
  }

  return false;
};

export const filterLesson = (
  lesson: Lesson,
  stats: LessonStats,
  completion: number,
  status: string,
  activeFilter: string
): boolean => {
  switch (activeFilter) {
    case "completed":
      return status === "completed" || completion >= 90;
    case "incomplete":
      return status !== "completed" && completion < 90;
    case "has_questions":
      return stats.questionCount > 0;
    case "no_objectives":
      return stats.objectiveCount === 0;
    case "no_explanation":
      return stats.explanationCount === 0;
    case "needs_review":
      return status === "review" || lesson.status === "review";
    case "has_images":
      return stats.imageCount > 0;
    case "has_equations":
      return stats.equationCount > 0;
    case "has_tables":
      return stats.tableCount > 0;
    case "all":
    default:
      return true;
  }
};
