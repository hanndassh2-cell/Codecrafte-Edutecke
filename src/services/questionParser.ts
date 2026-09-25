import { SemanticElement } from "./contentAnalyzer";
import { normalizeBidiPlainText, normalizeBidiHtml } from "./bidiContentPipeline";

export type ParsedQuestionType =
  | "mcq" // اختيار متعدد
  | "true_false" // صح وخطأ
  | "explain_reason" // علل / فسر
  | "definition" // عرف / مفهوم
  | "fill_blanks" // أكمل الفراغ
  | "ordering" // رتب
  | "matching" // وصل / طابق
  | "essay" // مقالي / إنشائي
  | "computational" // حسابي / مسألة
  | "practical" // عملي / تجربة
  | "image_based" // سؤال يعتمد على صورة
  | "table_based" // سؤال يعتمد على جدول
  | "equation_based"; // سؤال يعتمد على معادلة

export interface QuestionOption {
  id: string;
  letter: string; // أ, ب, ج, د or 1, 2, 3, 4
  text: string;
  isCorrect?: boolean;
}

export interface ParsedQuestion {
  id: string;
  type: ParsedQuestionType;
  typeLabelArabic: string;
  questionText: string;
  rawContent: string;
  options?: QuestionOption[];
  modelAnswer?: string;
  marks?: number; // الدرجة المكتشفة
  marksLabel?: string; // e.g. "3 درجات"
  difficulty?: "easy" | "medium" | "hard";
  difficultyLabelArabic?: string;
  hasImage: boolean;
  hasTable: boolean;
  hasEquation: boolean;
  imageUrl?: string;
  tableHtml?: string;
  equationText?: string;
  metadata?: Record<string, any>;
}

export interface QuestionParserResult {
  questions: ParsedQuestion[];
  summary: {
    totalQuestions: number;
    typesCount: Record<string, number>;
    withAnswersCount: number;
    withOptionsCount: number;
    mediaQuestionsCount: number;
  };
}

export const QUESTION_TYPE_LABELS: Record<ParsedQuestionType, string> = {
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
};

/**
 * Question Parser Service
 * Analyzes questions from raw HTML, plain text, or SemanticElement arrays.
 * Extracts: Question text, Options, Answer, Marks, Difficulty, Media references.
 * DOES NOT save to database; outputs structured ParsedQuestion objects.
 */
export function parseQuestionsFromContent(
  input: string | SemanticElement[]
): QuestionParserResult {
  const parsedQuestions: ParsedQuestion[] = [];

  let textBlocks: { id: string; html: string; text: string }[] = [];

  if (typeof input === "string") {
    textBlocks = extractBlocksFromHtmlOrText(input);
  } else if (Array.isArray(input)) {
    textBlocks = input.map((el) => ({
      id: el.id,
      html: el.htmlContent,
      text: el.textContent,
    }));
  }

  // Parse blocks into question items
  let currentQuestion: Partial<ParsedQuestion> | null = null;
  let currentRawLines: string[] = [];

  textBlocks.forEach((block, index) => {
    const text = block.text.trim();
    const html = block.html;

    if (!text && !html.includes("<img") && !html.includes("<table")) {
      return;
    }

    const isQHeader = isQuestionHeader(text);
    const isNewStart = isNewQuestionStart(text);

    if (isQHeader || isNewStart) {
      // Flush previous question if existing
      if (currentQuestion && currentQuestion.questionText) {
        parsedQuestions.push(finalizeQuestionObject(currentQuestion, currentRawLines));
      }

      // Start new question
      currentRawLines = [text || html];
      currentQuestion = initQuestionObject(text || html, html, block.id + "_" + index);
    } else if (currentQuestion) {
      // Continuation line (options, answer, sub-parts)
      currentRawLines.push(text || html);
      appendQuestionDetails(currentQuestion, text, html);
    } else {
      // Start a new loose question if no active question exists
      currentRawLines = [text || html];
      currentQuestion = initQuestionObject(text || html, html, block.id + "_" + index);
    }
  });

  // Flush final question
  if (currentQuestion && currentQuestion.questionText) {
    parsedQuestions.push(finalizeQuestionObject(currentQuestion, currentRawLines));
  }

  // Safety Fallback: if input was provided but parsedQuestions is empty
  if (parsedQuestions.length === 0 && typeof input === "string" && input.trim()) {
    const rawTrimmed = input.trim();
    const fallbackObj = initQuestionObject(rawTrimmed, `<p>${rawTrimmed}</p>`, "fallback");
    parsedQuestions.push(finalizeQuestionObject(fallbackObj, [rawTrimmed]));
  }

  // Calculate summary
  const typesCount: Record<string, number> = {};
  let withAnswersCount = 0;
  let withOptionsCount = 0;
  let mediaQuestionsCount = 0;

  parsedQuestions.forEach((q) => {
    typesCount[q.type] = (typesCount[q.type] || 0) + 1;
    if (q.modelAnswer) withAnswersCount++;
    if (q.options && q.options.length > 0) withOptionsCount++;
    if (q.hasImage || q.hasTable || q.hasEquation) mediaQuestionsCount++;
  });

  return {
    questions: parsedQuestions,
    summary: {
      totalQuestions: parsedQuestions.length,
      typesCount,
      withAnswersCount,
      withOptionsCount,
      mediaQuestionsCount,
    },
  };
}

/* ==================== HELPER PARSING LOGIC ==================== */

function extractBlocksFromHtmlOrText(raw: string): { id: string; html: string; text: string }[] {
  if (!raw || !raw.trim()) return [];

  // Check if string is HTML with tags
  if (raw.includes("<") && raw.includes(">") && (raw.includes("</") || raw.includes("/>") || raw.includes("<p") || raw.includes("<div") || raw.includes("<li") || raw.includes("<tr"))) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(raw, "text/html");
    const elements: { id: string; html: string; text: string }[] = [];

    Array.from(doc.body.children).forEach((child, i) => {
      elements.push({
        id: "block_" + i,
        html: child.outerHTML,
        text: child.textContent?.trim() || "",
      });
    });

    if (elements.length > 0) return elements;
  }

  // Split plain text by any line breaks (\r\n or \n)
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0);
  return lines.map((line, i) => ({
    id: "line_" + i,
    html: `<p>${line}</p>`,
    text: line,
  }));
}

function isOptionLine(text: string): boolean {
  const clean = text.trim();
  if (!clean) return false;
  return (
    /^([أ-يa-zA-Z1-6])[\)\.\-\:\/]\s+/i.test(clean) ||
    /^[\(（]([أ-يa-zA-Z1-6])[\)）]\s*/i.test(clean) ||
    /^(الخيار|الاختيار|بديل|الفقرة)\s*([1-6أ-يa-zA-Z])\s*[\:\-\)\.]/i.test(clean) ||
    /^([أ-يa-zA-Z1-6])\s*[\-–—]\s+/i.test(clean)
  );
}

function isQuestionHeader(text: string): boolean {
  const clean = text.trim();
  if (!clean) return false;
  if (isOptionLine(clean)) return false;

  const hasPrefix =
    /^(س\s*[\d:]|سؤال|س\d+|س\s*:|س\s*-|السؤال|س\/|[-•*]\s*س)/i.test(clean);

  const cleanNoNum = clean.replace(/^(\d+[\.\-\)]|[\(（]\d+[\)）]|س\s*[\d:]*|سؤال\d*)\s*/i, "");
  const hasVerb =
    /^(اختر|إختر|علل|فسر|عرف|أكمل|ضع|رتب|وصل|طابق|احسب|أوجد|اكتب|اذكر|أذكر|بين|قارن|وضح|حدد|استخرج|ما|لماذا|كيف|كم)/i.test(cleanNoNum);

  const hasQMark = clean.includes("؟") || clean.includes("?");

  return hasPrefix || hasVerb || hasQMark;
}

function isNewQuestionStart(text: string): boolean {
  const clean = text.trim();
  if (isOptionLine(clean)) return false;
  return (
    /^(س\s*[\d:]|سؤال|س\d+|س\s*:|س\s*-|السؤال|س\/)/i.test(clean) ||
    /^\d+[\.\-\)]\s*(ما|لماذا|كيف|كم|علل|عرف|اختر|إختر|ضع|رتب|وصل|طابق|احسب|أوجد|اكتب|اذكر|أذكر|بين|قارن|وضح|حدد|استخرج|[\u0600-\u06FF]{3,})/i.test(clean) ||
    /^[\(（]\d+[\)）]\s*(ما|لماذا|كيف|كم|علل|عرف|اختر|إختر|ضع|رتب|وصل|طابق|احسب|أوجد|اكتب|اذكر|أذكر|بين|قارن|وضح|حدد|استخرج|[\u0600-\u06FF]{3,})/i.test(clean) ||
    /^[-•*]\s*(س|سؤال|علل|عرف|اختر|احسب)/i.test(clean)
  );
}

function isQuestionKeywords(text: string): boolean {
  return (
    text.includes("ما هو") ||
    text.includes("ما هي") ||
    text.includes("لماذا") ||
    text.includes("كيف") ||
    text.includes("كم عدد") ||
    text.includes("ما الناتج") ||
    text.includes("أذكر")
  );
}

function initQuestionObject(rawText: string, html: string, idSuffix: string): Partial<ParsedQuestion> {
  const id = "parsed_q_" + idSuffix + "_" + Math.random().toString(36).substring(2, 6);

  // Check media traits
  const hasImage = html.includes("<img") || /\[صورة\]|الشكل المرفق|الشكل المجاور/i.test(rawText);
  const hasTable = html.includes("<table") || /الجدول التالي|الجدول المرفق/i.test(rawText);
  const hasEquation =
    html.includes("<math") || rawText.includes("$$") || /\$[^$]+\$/.test(rawText) || /\\frac|\\sum/i.test(rawText);

  // Extract Image URL if present
  let imageUrl: string | undefined = undefined;
  if (html.includes("<img")) {
    const srcMatch = html.match(/src=["']([^"']+)["']/i);
    if (srcMatch) imageUrl = srcMatch[1];
  }

  // Extract Marks if present (e.g., [3 درجات], (درجتان), (علامة))
  const marksMatch = rawText.match(/\[?\(?(\d+)\s*(درجات|درجة|علامات|علامة|درجتان|علامتان)\)?\]?/i);
  let marks: number | undefined = undefined;
  let marksLabel: string | undefined = undefined;

  if (marksMatch) {
    marks = parseInt(marksMatch[1], 10);
    marksLabel = marksMatch[0];
  } else if (/درجتان|علامتان/i.test(rawText)) {
    marks = 2;
    marksLabel = "درجتان";
  } else if (/درجة واحدة|علامة واحدة/i.test(rawText)) {
    marks = 1;
    marksLabel = "درجة واحدة";
  }

  // Extract difficulty
  let difficulty: "easy" | "medium" | "hard" = "medium";
  if (/\[سهل\]|\(سهل\)/i.test(rawText)) difficulty = "easy";
  else if (/\[صعب\]|\(صعب\)/i.test(rawText)) difficulty = "hard";
  else if (/\[متوسط\]|\(متوسط\)/i.test(rawText)) difficulty = "medium";

  // Clean raw question prompt text
  let cleanedQuestionText = rawText
    .replace(/^س\s*[\d:]*\s*/i, "")
    .replace(/^سؤال\s*[\d:]*\s*/i, "")
    .replace(/\[?\(?(\d+)\s*(درجات|درجة|علامات|علامة)\)?\]?/gi, "")
    .replace(/\[(سهل|متوسط|صعب)\]/gi, "")
    .trim();

  return {
    id,
    questionText: normalizeBidiPlainText(cleanedQuestionText || rawText),
    rawContent: rawText,
    hasImage,
    hasTable,
    hasEquation,
    imageUrl,
    tableHtml: hasTable ? normalizeBidiHtml(html) : undefined,
    marks,
    marksLabel,
    difficulty,
    options: [],
  };
}

function appendQuestionDetails(qObj: Partial<ParsedQuestion>, text: string, html: string) {
  if (!qObj) return;

  // Check if line represents an Answer (e.g. "ج:", "الحل:", "الإجابة:")
  if (/^(ج:|الإجابة:|الحل:|الجواب:|الإجابة النموذجية:)/i.test(text)) {
    qObj.modelAnswer = normalizeBidiPlainText(text.replace(/^(ج:|الإجابة:|الحل:|الجواب:|الإجابة النموذجية:)\s*/i, "").trim());
    return;
  }

  // Check if line represents an Option (e.g. "أ)", "(أ)", "ب-", "1)", "الخيار أ:", "[1]")
  const optMatch =
    text.match(/^([أ-يa-zA-Z1-6])[\)\.\-\:\/]\s*(.+)/) ||
    text.match(/^[\(（\[]([أ-يa-zA-Z1-6])[\)）\]]\s*(.+)/) ||
    text.match(/^(?:الخيار|الاختيار|بديل|الفقرة)\s*([1-6أ-يa-zA-Z])\s*[\:\-\)\.]\s*(.+)/) ||
    text.match(/^([أ-يa-zA-Z1-6])\s*[\-–—]\s+(.+)/);

  if (optMatch) {
    if (!qObj.options) qObj.options = [];
    const letter = optMatch[1];
    const optText = optMatch[2].trim();
    const isCorrect =
      optText.includes("*") ||
      optText.includes("(صح)") ||
      optText.includes("(صحيح)") ||
      optText.includes("(✓)") ||
      optText.includes("[صح]") ||
      optText.includes("[✓]");
    const cleanedOptText = normalizeBidiPlainText(
      optText.replace(/\*|\(صح\)|\(صحيح\)|\(✓\)|\([xX]\)|\[صح\]|\[✓\]/g, "").trim()
    );
    qObj.options.push({
      id: "opt_" + Math.random().toString(36).substring(2, 6),
      letter,
      text: cleanedOptText,
      isCorrect,
    });
    if (isCorrect && !qObj.modelAnswer) {
      qObj.modelAnswer = cleanedOptText;
    }
    return;
  }

  // Check if line contains inline choices like "أ) كذا  ب) كذا"
  const multiOptMatches = Array.from(
    text.matchAll(/(?:[\(（\[]?([أ-يa-zA-Z1-6])[\)）\]\.\-\:\/]\s*)([^\s\(（\[أ-يa-zA-Z1-6][^\)\n]+)/g)
  );
  if (multiOptMatches.length > 1) {
    if (!qObj.options) qObj.options = [];
    multiOptMatches.forEach((m) => {
      const optRaw = m[2].trim();
      const isCorrect =
        optRaw.includes("*") ||
        optRaw.includes("(صح)") ||
        optRaw.includes("(✓)") ||
        optRaw.includes("[صح]") ||
        optRaw.includes("[✓]");
      const cleanedOpt = normalizeBidiPlainText(
        optRaw.replace(/\*|\(صح\)|\(✓\)|\([xX]\)|\[صح\]|\[✓\]/g, "").trim()
      );
      qObj.options?.push({
        id: "opt_" + Math.random().toString(36).substring(2, 6),
        letter: m[1],
        text: cleanedOpt,
        isCorrect,
      });
      if (isCorrect && !qObj.modelAnswer) {
        qObj.modelAnswer = cleanedOpt;
      }
    });
    return;
  }

  // Append extra text to question prompt if no answer/option match
  if (!qObj.modelAnswer && (!qObj.options || qObj.options.length === 0)) {
    qObj.questionText = normalizeBidiPlainText((qObj.questionText || "") + " " + text);
  }
}

function finalizeQuestionObject(qObj: Partial<ParsedQuestion>, rawLines: string[]): ParsedQuestion {
  const fullText = qObj.questionText || "";

  // Determine specific question type
  let type: ParsedQuestionType = "essay";

  if (qObj.hasImage) {
    type = "image_based";
  } else if (qObj.hasTable) {
    type = "table_based";
  } else if (qObj.hasEquation) {
    type = "equation_based";
  } else if (qObj.options && qObj.options.length > 0) {
    type = "mcq";
  } else if (/صح وخطأ|ضع (✓) أو (✗)|\(  \)|صح أم خطأ/i.test(fullText)) {
    type = "true_false";
  } else if (/علل|فسر|بين سبب|وضح سبب/i.test(fullText)) {
    type = "explain_reason";
  } else if (/عرف|ما المقصود بـ|حدد مفهوم|ما تعريف/i.test(fullText)) {
    type = "definition";
  } else if (/\.\.\.\.|____|أكمل الفراغ|ضع الكلمة المناسبة/i.test(fullText)) {
    type = "fill_blanks";
  } else if (/رتب|الترتيب التسلسلي|ضع الخطوات/i.test(fullText)) {
    type = "ordering";
  } else if (/صل|وصل|طابق بين|صل بخط/i.test(fullText)) {
    type = "matching";
  } else if (/احسب|أوجد|ما الناتج|احسب قيمة|تطبيق عددي/i.test(fullText)) {
    type = "computational";
  } else if (/في التجربة|خطوات العمل|استنتج من التجربة|عملي/i.test(fullText)) {
    type = "practical";
  }

  const diffLabelMap: Record<string, string> = {
    easy: "سهل",
    medium: "متوسط",
    hard: "صعب",
  };

  return {
    id: qObj.id || "q_" + Date.now(),
    type,
    typeLabelArabic: QUESTION_TYPE_LABELS[type] || "سؤال",
    questionText: normalizeBidiPlainText(qObj.questionText || "نص السؤال غير محدد"),
    rawContent: rawLines.join("\n"),
    options: (qObj.options || []).map((opt) => ({
      ...opt,
      text: normalizeBidiPlainText(opt.text),
    })),
    modelAnswer: qObj.modelAnswer ? normalizeBidiPlainText(qObj.modelAnswer) : undefined,
    marks: qObj.marks,
    marksLabel: qObj.marksLabel,
    difficulty: qObj.difficulty || "medium",
    difficultyLabelArabic: diffLabelMap[qObj.difficulty || "medium"],
    hasImage: !!qObj.hasImage,
    hasTable: !!qObj.hasTable,
    hasEquation: !!qObj.hasEquation,
    imageUrl: qObj.imageUrl,
    tableHtml: qObj.tableHtml ? normalizeBidiHtml(qObj.tableHtml) : undefined,
    metadata: {
      optionsCount: qObj.options?.length || 0,
      linesCount: rawLines.length,
    },
  };
}

export { parseQuestionsFromContent as parseQuestionsFromInput };
