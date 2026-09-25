import { cleanLeakedTokens, unescapeHtmlEntities } from "../services/bidiContentPipeline";

export interface ResolvedAnswerDetails {
  rawAnswer: string;
  cleanedAnswer: string;
  hasAnswer: boolean;
  source: "direct_answer" | "legacy_option_is_correct" | "none";
  correctOption?: any;
}

/**
 * Central Answer Resolver:
 * Makes `question.answer` the primary source of truth.
 * Allows reading saved `isCorrect` option as legacy backward compatibility without modifying or generating data.
 */
export function resolveQuestionAnswer(question: any): string {
  if (!question) return "";

  // 1. Primary Source: question.answer
  let rawAns = question.answer || "";
  let cleanedAns = cleanLeakedTokens(unescapeHtmlEntities(rawAns)).trim();

  if (cleanedAns.length > 0) {
    return cleanedAns;
  }

  // 2. Legacy Fallback: check options/distractors for `isCorrect === true`
  const options = question.distractors || question.options || [];
  if (Array.isArray(options) && options.length > 0) {
    const correctOpt = options.find((o: any) => typeof o === "object" && o !== null && o.isCorrect === true);
    if (correctOpt) {
      const optRaw = typeof correctOpt === "string" ? correctOpt : (correctOpt.text || "");
      cleanedAns = cleanLeakedTokens(unescapeHtmlEntities(optRaw)).trim();
      if (cleanedAns.length > 0) {
        return cleanedAns;
      }
    }
  }

  return "";
}

/**
 * Returns true if the question has an answer (either in question.answer or via legacy option.isCorrect)
 */
export function hasAnswer(question: any): boolean {
  return resolveQuestionAnswer(question).length > 0;
}

/**
 * Finds the correct option object or string for a question if available.
 */
export function getCorrectOption(question: any): any | null {
  if (!question) return null;

  const options = question.distractors || question.options || [];
  if (!Array.isArray(options) || options.length === 0) return null;

  // 1. Check if an option has `isCorrect === true`
  const explicitCorrect = options.find((o: any) => typeof o === "object" && o !== null && o.isCorrect === true);
  if (explicitCorrect) return explicitCorrect;

  // 2. Check if option text matches resolved answer
  const resolvedAns = resolveQuestionAnswer(question);
  if (resolvedAns.length > 0) {
    const matchedOpt = options.find((o: any, idx: number) => {
      const rawText = typeof o === "string" ? o : (o.text || "");
      const cleanedOptText = cleanLeakedTokens(unescapeHtmlEntities(rawText)).trim();
      if (cleanedOptText === resolvedAns) return true;

      const arabicLetters = ["أ", "ب", "ج", "د", "هـ", "و"];
      const latinLetters = ["A", "B", "C", "D", "E", "F"];
      const arLabel = arabicLetters[idx] || `${idx + 1}`;
      const latLabel = latinLetters[idx] || `${idx + 1}`;

      if (
        resolvedAns === arLabel ||
        resolvedAns === `(${arLabel})` ||
        resolvedAns === latLabel ||
        resolvedAns === `(${latLabel})` ||
        resolvedAns === `${idx + 1}`
      ) {
        return true;
      }

      return false;
    });

    if (matchedOpt) return matchedOpt;
  }

  return null;
}

/**
 * Checks whether a specific option in a question is the correct one.
 */
export function isOptionCorrect(question: any, option: any, optionIndex?: number): boolean {
  if (!question || !option) return false;

  // 1. Direct legacy property check
  if (typeof option === "object" && option !== null && option.isCorrect === true) {
    return true;
  }

  // 2. Check against resolved answer
  const resolvedAns = resolveQuestionAnswer(question);
  if (!resolvedAns) return false;

  const rawOptText = typeof option === "string" ? option : (option.text || "");
  const cleanedOptText = cleanLeakedTokens(unescapeHtmlEntities(rawOptText)).trim();

  if (cleanedOptText.length > 0 && cleanedOptText === resolvedAns) {
    return true;
  }

  if (optionIndex !== undefined) {
    const arabicLetters = ["أ", "ب", "ج", "د", "هـ", "و"];
    const latinLetters = ["A", "B", "C", "D", "E", "F"];
    const arLabel = arabicLetters[optionIndex] || `${optionIndex + 1}`;
    const latLabel = latinLetters[optionIndex] || `${optionIndex + 1}`;

    if (
      resolvedAns === arLabel ||
      resolvedAns === `(${arLabel})` ||
      resolvedAns === latLabel ||
      resolvedAns === `(${latLabel})` ||
      resolvedAns === `${optionIndex + 1}`
    ) {
      return true;
    }
  }

  return false;
}
