/**
 * Grouping Engine (محرك تجميع الأسئلة الذكي)
 * 
 * Analyzes question prompts, extracts Common Parent Headers (الجذر الموحد),
 * groups similar/sibling exercises, and transforms them into an auto-numbered
 * compact Grid layout to minimize page space consumption and eliminate blank gaps.
 */

import { cleanLeakedTokens, unescapeHtmlEntities } from "./bidiContentPipeline";
import { cleanQuestionTextForRender } from "../components/QuestionRenderer";
import { BookReference } from "../types";

export type GridColumnsOption = "auto" | 2 | 3 | 4;
export type SubItemNumberingStyle = "paren-num" | "paren-alpha" | "paren-latin" | "dash" | "dot" | "roman";
export type GroupingDensity = "compact" | "normal" | "spaced" | "ultra-compact" | "standard";

export interface GroupingEngineOptions {
  enabled?: boolean;
  minGroupSize?: number;              // Minimum items to form a group (default: 2)
  maxColumns?: GridColumnsOption;     // Default: 'auto'
  numberingStyle?: SubItemNumberingStyle; // Default: 'paren-num' (1), (2), (3)...
  density?: GroupingDensity;         // Default: 'compact'
  groupSimilarTypesOnly?: boolean;   // Default: true
  stripCommonPrefix?: boolean;       // Default: true
  customHeadersMap?: Record<string, string>; // Manual override headers
}

export interface GroupedChildItem {
  id: string;
  originalQuestion: any;
  subIndex: number;                  // 1-based index (1, 2, 3...)
  subLabel: string;                  // e.g. "(1)", "(أ)", "1-"
  cleanPrompt: string;               // Stripped sub-exercise text / formula
  allocatedMarks?: number;
  hideAnswer?: boolean;
  answer?: string;
  distractors?: any[];
  imageUrl?: string;
  type?: string;
  bookReference?: BookReference;
}

export interface GroupedQuestionUnit {
  isGroup: boolean;
  id: string;
  groupIndex?: number;               // 1-based main question index (1, 2, 3...)
  mainNumberLabel?: string;          // e.g. "السؤال الأول:" or "1-"
  commonHeader: string;              // Parent stem (e.g. "أحسب ما يلي:")
  items: GroupedChildItem[];         // Array of child exercises
  totalMarks: number;
  markPerItem?: number;
  questionType: string;
  suggestedColumns: 2 | 3 | 4;
  rawQuestions: any[];
  savedHeightPx?: number;            // Estimated vertical height saved
  bookReferences?: BookReference[];
  primaryBookReference?: BookReference;
}

const ARABIC_ALPHABET = [
  "أ", "ب", "ج", "د", "هـ", "و", "ز", "ح", "ط", "ي",
  "ك", "ل", "م", "ن", "س", "ع", "ف", "ص", "ق", "ر", "ش", "ت", "ث", "خ", "ذ", "ض", "ظ", "غ"
];

const LATIN_ALPHABET = [
  "a", "b", "c", "d", "e", "f", "g", "h", "i", "j",
  "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"
];

const ROMAN_NUMERALS = [
  "i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x",
  "xi", "xii", "xiii", "xiv", "xv", "xvi", "xvii", "xviii", "xix", "xx"
];

/**
 * Generate formatted label for child items inside a grid
 */
export function getSubItemLabel(
  index: number, // 0-based
  style: SubItemNumberingStyle = "paren-num",
  isRTL: boolean = true
): string {
  const num = index + 1;
  switch (style) {
    case "paren-num":
      return `(${num})`;
    case "paren-alpha":
      return isRTL
        ? `(${ARABIC_ALPHABET[index % ARABIC_ALPHABET.length] || num})`
        : `(${LATIN_ALPHABET[index % LATIN_ALPHABET.length] || num})`;
    case "paren-latin":
      return `(${LATIN_ALPHABET[index % LATIN_ALPHABET.length] || num})`;
    case "dash":
      return `${num}-`;
    case "dot":
      return `${num}.`;
    case "roman":
      return `(${ROMAN_NUMERALS[index % ROMAN_NUMERALS.length] || num})`;
    default:
      return `(${num})`;
  }
}

/**
 * Strips HTML wrapper tags, unescapes entities, and cleans whitespace
 */
export function extractPlainTextForAnalysis(html: string): string {
  if (!html) return "";
  let clean = unescapeHtmlEntities(html);
  clean = cleanLeakedTokens(clean);
  // Replace break/p tags with spaces or newlines
  clean = clean.replace(/<\/p>|<br\s*\/?>/gi, "\n");
  // Remove other HTML tags
  clean = clean.replace(/<[^>]+>/g, " ");
  // Strip hardcoded question numbers like "1-", "س1:", "(1)"
  clean = clean.replace(/^\s*(?:(?:س|السؤال)\s*\d+[\s:\-.)]+|\(?\d+\)?[\s:\-.)]+)\s*/i, "");
  // Normalize multiple spaces
  clean = clean.replace(/[ \t]+/g, " ").trim();
  return clean;
}

/**
 * Standard Arabic & Multilingual Command Verbs used in Exams and Curricula
 */
const COMMAND_VERBS_REGEX = /^(أحسب|احسب|بسط|بسّط|حلل|حلّل|حل|أوجد|اوجد|عيّن|عين|اكتب|أكتب|أكمل|اكمل|أعرب|اعرب|حوّل|حول|استخرج|استنتج|قارن|علل|علّل|فسر|فسّر|بيّن|بين|أثبت|اثبت|ضع علامة|اختر الإجابة|صل بين|رتب|رتّب|ميّز|وضح|وضّح|Evaluate|Calculate|Simplify|Solve|Find|Complete|Convert|Determine|State|Explain|Derive|Differentiate|Integrate)/i;

/**
 * Analyzes a question text and splits it into:
 * 1. Command Stem / Parent Header candidate
 * 2. Specific Child sub-problem / mathematical formula
 */
export function splitQuestionPromptAndChild(rawHtmlOrText: string): {
  stem: string;
  childContent: string;
  hasExplicitDelimiter: boolean;
} {
  const plain = extractPlainTextForAnalysis(rawHtmlOrText);
  if (!plain) {
    return { stem: "", childContent: "", hasExplicitDelimiter: false };
  }

  // 1. Check for explicit delimiters (Colon `:`, Semicolon `؛`, Newline `\n`, Dash ` - `)
  const delimiterMatch = plain.match(/^([^:\n؛—–]{4,90}[:\n؛—–])\s*([\s\S]+)$/);
  if (delimiterMatch) {
    const stem = delimiterMatch[1].trim();
    const childContent = delimiterMatch[2].trim();
    if (stem.length >= 4 && childContent.length > 0) {
      return { stem, childContent, hasExplicitDelimiter: true };
    }
  }

  // 2. Check for Command Verb + Statement followed by Math Formula or sub-expression ($...$, A = ..., f(x) = ...)
  const verbMatch = plain.match(COMMAND_VERBS_REGEX);
  if (verbMatch) {
    // Look for where the expression or math starts (e.g. $, A=, f(x), (1), number)
    const mathStartIdx = plain.search(/(\$|\\\[|[A-Za-z]\s*\(?[xXyYzZ]?\)?\s*[\=\:\<]|\\sqrt|\\frac|[0-9]+\s*[\+\-\*\/])/);
    if (mathStartIdx > 6) {
      const stem = plain.substring(0, mathStartIdx).trim();
      const childContent = plain.substring(mathStartIdx).trim();
      if (stem.length >= 4 && childContent.length > 0) {
        // Ensure stem has nice colon if missing
        const formattedStem = stem.endsWith(":") || stem.endsWith("؛") ? stem : `${stem}:`;
        return { stem: formattedStem, childContent, hasExplicitDelimiter: false };
      }
    }
  }

  // 3. Look for newline separated prompt and expression
  const lines = plain.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length >= 2) {
    return {
      stem: lines[0].endsWith(":") ? lines[0] : `${lines[0]}:`,
      childContent: lines.slice(1).join(" "),
      hasExplicitDelimiter: true,
    };
  }

  return { stem: "", childContent: plain, hasExplicitDelimiter: false };
}

/**
 * Computes the Longest Common Prefix between two strings, normalized for spaces & punctuation
 */
export function findLongestCommonPrefix(str1: string, str2: string): string {
  if (!str1 || !str2) return "";
  let i = 0;
  while (i < str1.length && i < str2.length && str1[i] === str2[i]) {
    i++;
  }
  let prefix = str1.substring(0, i);
  // Roll back to the last space, colon, or punctuation boundary if cut mid-word
  if (i < str1.length && i < str2.length) {
    const lastBoundary = Math.max(prefix.lastIndexOf(" "), prefix.lastIndexOf(":"), prefix.lastIndexOf("؛"));
    if (lastBoundary > 3) {
      prefix = prefix.substring(0, lastBoundary + 1);
    }
  }
  return prefix.trim();
}

/**
 * Normalizes stem for fuzzy comparison (removes diacritics, extra spaces, trailing colons)
 */
export function normalizeStemKey(stem: string): string {
  if (!stem) return "";
  return stem
    .replace(/[\u064B-\u065F\u0670]/g, "") // remove Arabic tashkeel
    .replace(/[\s:؛\-\.\(\)]+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Determines optimal grid columns for child exercises
 */
export function computeOptimalGridColumns(
  items: GroupedChildItem[],
  maxColumnsOption: GridColumnsOption = "auto"
): 2 | 3 | 4 {
  if (maxColumnsOption === 2) return 2;
  if (maxColumnsOption === 3) return 3;
  if (maxColumnsOption === 4) return 4;

  // Auto column detection:
  // If all items are very short (e.g. single equation or < 35 chars) and >= 3 items -> 3 columns
  // Otherwise -> 2 columns
  const allShort = items.every(
    item => (item.cleanPrompt || "").length < 40 && !item.distractors?.length && !item.imageUrl
  );

  if (allShort && items.length >= 3) {
    return 3;
  }

  return 2;
}

/**
 * Strips the parent stem from the original HTML text, retaining any math and formatting
 */
export function stripStemFromHtml(rawHtml: string, stem: string): string {
  if (!rawHtml || !stem) return rawHtml || "";

  let cleaned = cleanQuestionTextForRender(rawHtml);
  
  // Extract plain version of stem for exact/fuzzy replacement
  const cleanStem = stem.replace(/[:؛\s]+$/, "").trim();
  if (!cleanStem) return cleaned;

  // 1. Try direct replacement
  const directRegex = new RegExp(`^\\s*(?:<p[^>]*>)?\\s*${escapeRegExp(cleanStem)}[:؛\\s-–—]*`, "i");
  if (directRegex.test(cleaned)) {
    cleaned = cleaned.replace(directRegex, "<p>");
    // Fix empty opening tag
    cleaned = cleaned.replace(/^<p>\s*<\/p>/i, "").trim();
    if (!cleaned.startsWith("<") && cleaned) {
      cleaned = `<p>${cleaned}</p>`;
    }
    return cleaned;
  }

  // 2. Try with plain text split
  const split = splitQuestionPromptAndChild(rawHtml);
  if (split.childContent && split.stem) {
    return split.childContent;
  }

  return cleaned;
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Core Grouping Engine:
 * Analyzes questions, identifies common parent headers (الجذور الموحدة),
 * extracts clean child exercises, and structures them into grouped units.
 */
export function analyzeAndGroupQuestions(
  questions: any[],
  options: GroupingEngineOptions = {}
): GroupedQuestionUnit[] {
  const {
    enabled = true,
    minGroupSize = 2,
    maxColumns = "auto",
    numberingStyle = "paren-num",
    groupSimilarTypesOnly = true,
    stripCommonPrefix = true,
  } = options;

  if (!questions || questions.length === 0) return [];

  // If grouping engine is disabled, return flat 1-to-1 units
  if (!enabled) {
    return questions.map((q, idx) => {
      const qId = q.id || q.questionId || `q-${idx}`;
      const marks = q.allocatedMarks !== undefined ? q.allocatedMarks : (q.score || q.marks || 0);
      return {
        isGroup: false,
        id: `unit-single-${qId}`,
        groupIndex: idx + 1,
        mainNumberLabel: `${idx + 1}-`,
        commonHeader: "",
        items: [
          {
            id: qId,
            originalQuestion: q,
            subIndex: 1,
            subLabel: `${idx + 1}-`,
            cleanPrompt: q.text || "",
            allocatedMarks: marks,
            hideAnswer: q.hideAnswer === true,
            answer: q.answer || "",
            distractors: q.distractors || q.options || [],
            imageUrl: q.imageUrl,
            type: q.type || q.questionType,
          },
        ],
        totalMarks: marks,
        markPerItem: marks,
        questionType: q.type || q.questionType || "essay",
        suggestedColumns: 2,
        rawQuestions: [q],
        savedHeightPx: 0,
      };
    });
  }

  // Analyze each question and extract its candidate stem
  const analyzedList = questions.map((q, idx) => {
    const qId = q.id || q.questionId || `q-${idx}`;
    const rawText = q.text || "";
    const split = splitQuestionPromptAndChild(rawText);
    const marks = q.allocatedMarks !== undefined ? q.allocatedMarks : (q.score || q.marks || 0);
    const type = q.type || q.questionType || "essay";

    return {
      q,
      qId,
      rawText,
      stem: split.stem,
      childContent: split.childContent,
      normalizedStem: normalizeStemKey(split.stem),
      marks,
      type,
      originalIndex: idx,
    };
  });

  const resultUnits: GroupedQuestionUnit[] = [];
  let currentIndex = 0;
  let mainQuestionCounter = 1;

  while (currentIndex < analyzedList.length) {
    const current = analyzedList[currentIndex];
    let groupEndIndex = currentIndex;

    // Check if current item has a viable stem or if consecutive items share a common prefix
    let effectiveStem = current.stem;
    let effectiveNormalizedStem = current.normalizedStem;

    // 1. Look ahead for consecutive questions sharing the same stem / common prefix
    let lookAhead = currentIndex + 1;
    while (lookAhead < analyzedList.length) {
      const next = analyzedList[lookAhead];

      // Check type compatibility if enabled
      if (groupSimilarTypesOnly && next.type !== current.type) {
        break;
      }

      // Check if they share identical/similar stem
      const sameStem =
        effectiveNormalizedStem &&
        next.normalizedStem &&
        (effectiveNormalizedStem === next.normalizedStem ||
          effectiveNormalizedStem.includes(next.normalizedStem) ||
          next.normalizedStem.includes(effectiveNormalizedStem));

      if (sameStem) {
        groupEndIndex = lookAhead;
        lookAhead++;
        continue;
      }

      // Check Longest Common Prefix between raw question texts
      const lcp = findLongestCommonPrefix(
        extractPlainTextForAnalysis(current.rawText),
        extractPlainTextForAnalysis(next.rawText)
      );

      if (lcp.length >= 6) {
        effectiveStem = lcp.endsWith(":") || lcp.endsWith("؛") ? lcp : `${lcp}:`;
        effectiveNormalizedStem = normalizeStemKey(effectiveStem);
        groupEndIndex = lookAhead;
        lookAhead++;
      } else {
        break;
      }
    }

    // Cap max items per single group card block to 4 items so cards remain paginatable on A4 sheets
    if (groupEndIndex - currentIndex + 1 > 4) {
      groupEndIndex = currentIndex + 3;
    }
    const groupSize = groupEndIndex - currentIndex + 1;

    if (groupSize >= minGroupSize && effectiveStem && effectiveStem.length >= 4) {
      // Create a Grouped Unit!
      const groupItems: GroupedChildItem[] = [];
      let groupTotalMarks = 0;
      const rawGroupQuestions: any[] = [];

      for (let i = currentIndex; i <= groupEndIndex; i++) {
        const itemData = analyzedList[i];
        const subIndex = i - currentIndex + 1;
        const subLabel = getSubItemLabel(i - currentIndex, numberingStyle, true);
        
        let cleanedPrompt = itemData.childContent;
        if (stripCommonPrefix) {
          cleanedPrompt = stripStemFromHtml(itemData.rawText, effectiveStem);
        }

        groupItems.push({
          id: itemData.qId,
          originalQuestion: itemData.q,
          subIndex,
          subLabel,
          cleanPrompt: cleanedPrompt,
          allocatedMarks: itemData.marks,
          hideAnswer: itemData.q.hideAnswer === true,
          answer: itemData.q.answer || "",
          distractors: itemData.q.distractors || itemData.q.options || [],
          imageUrl: itemData.q.imageUrl,
          type: itemData.type,
          bookReference: itemData.q.bookReference,
        });

        groupTotalMarks += Number(itemData.marks || 0);
        rawGroupQuestions.push(itemData.q);
      }

      // Aggregate all book references from the group items
      const allBookRefs = groupItems
        .map(item => item.bookReference || item.originalQuestion?.bookReference)
        .filter((b): b is BookReference => Boolean(b && (b.bookSource || b.pageNumber || b.exerciseNumber || b.questionTitle)));

      let primaryBookRef: BookReference | undefined = undefined;
      if (allBookRefs.length > 0) {
        const firstRef = allBookRefs[0];
        const allSameSource = allBookRefs.every(b => b.bookSource === firstRef.bookSource);
        const bookSource = allSameSource ? firstRef.bookSource : Array.from(new Set(allBookRefs.map(b => b.bookSource).filter(Boolean))).join("، ");
        
        const uniquePages = Array.from(new Set(allBookRefs.map(b => b.pageNumber).filter(Boolean)));
        const pageNumber = uniquePages.length > 0 ? uniquePages.join("، ") : (firstRef.pageNumber || "");

        const uniqueExercises = Array.from(new Set(allBookRefs.map(b => b.exerciseNumber).filter(Boolean)));
        const exerciseNumber = uniqueExercises.length > 0 ? uniqueExercises.join("، ") : (firstRef.exerciseNumber || "");

        const uniqueTitles = Array.from(new Set(allBookRefs.map(b => b.questionTitle).filter(Boolean)));
        const questionTitle = uniqueTitles.length > 0 ? uniqueTitles.join(" • ") : (firstRef.questionTitle || "");

        const showInCard = allBookRefs.some(b => b.showInCard !== false);
        const showInPrint = allBookRefs.some(b => b.showInPrint !== false);

        primaryBookRef = {
          bookSource,
          pageNumber,
          exerciseNumber,
          questionTitle,
          showInCard,
          showInPrint,
        };
      }

      const suggestedCols = computeOptimalGridColumns(groupItems, maxColumns);
      // Rough estimation: each separate block was ~75px, grouped grid uses ~(75 / cols) * rows + 35px header
      const rows = Math.ceil(groupItems.length / suggestedCols);
      const originalHeight = groupItems.length * 75;
      const groupedHeight = rows * 55 + 40;
      const savedHeight = Math.max(0, originalHeight - groupedHeight);

      resultUnits.push({
        isGroup: true,
        id: `group-unit-${currentIndex}-${groupEndIndex}`,
        groupIndex: mainQuestionCounter,
        mainNumberLabel: `${mainQuestionCounter}-`,
        commonHeader: effectiveStem,
        items: groupItems,
        totalMarks: groupTotalMarks,
        markPerItem: groupItems.length > 0 ? groupTotalMarks / groupItems.length : undefined,
        questionType: current.type,
        suggestedColumns: suggestedCols,
        rawQuestions: rawGroupQuestions,
        savedHeightPx: savedHeight,
        bookReferences: allBookRefs,
        primaryBookReference: primaryBookRef,
      });

      mainQuestionCounter++;
      currentIndex = groupEndIndex + 1;
    } else {
      // Single Isolated Question Unit
      const q = current.q;
      resultUnits.push({
        isGroup: false,
        id: `unit-single-${current.qId}`,
        groupIndex: mainQuestionCounter,
        mainNumberLabel: `${mainQuestionCounter}-`,
        commonHeader: "",
        items: [
          {
            id: current.qId,
            originalQuestion: q,
            subIndex: 1,
            subLabel: `${mainQuestionCounter}-`,
            cleanPrompt: q.text || "",
            allocatedMarks: current.marks,
            hideAnswer: q.hideAnswer === true,
            answer: q.answer || "",
            distractors: q.distractors || q.options || [],
            imageUrl: q.imageUrl,
            type: current.type,
            bookReference: q.bookReference,
          },
        ],
        totalMarks: current.marks,
        markPerItem: current.marks,
        questionType: current.type,
        suggestedColumns: 2,
        rawQuestions: [q],
        savedHeightPx: 0,
        bookReferences: q.bookReference ? [q.bookReference] : undefined,
        primaryBookReference: q.bookReference,
      });

      mainQuestionCounter++;
      currentIndex++;
    }
  }

  return resultUnits;
}
