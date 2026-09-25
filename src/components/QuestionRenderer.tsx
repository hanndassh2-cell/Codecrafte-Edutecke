import React, { useMemo } from "react";
import { MathText } from "./MathText";
import { BookOpen, FileText, Hash, Tag } from "lucide-react";
import { analyzeContentScript, cleanLeakedTokens, unescapeHtmlEntities } from "../services/bidiContentPipeline";
import { QuestionNumberNode, QuestionNumberFormat } from "./QuestionNumberNode";
import { BookReference } from "../types";
import { storage } from "../services/storage";

export type { QuestionNumberFormat };

export interface QuestionRendererProps {
  question: any;
  index?: number;                  // 0-based or 1-based index
  questionNumber?: number | string; // Explicit number if already computed
  numberFormat?: QuestionNumberFormat;
  customNumberLabel?: string;
  allocatedMarks?: number;
  showMarks?: boolean;
  showAnswerKey?: boolean;
  suppressAnswerBox?: boolean;
  activeFontFamily?: string;
  questionSize?: string;
  optionsSize?: string;
  marksSize?: string;
  spacingPx?: string;
  optionSpacingPx?: string;
  forceDirection?: "rtl" | "ltr" | "auto";
  mode?: "exam-print" | "card" | "compact" | "preview" | "preview-only";
  canSwap?: boolean;
  onSwapQuestion?: (questionId: string, sectionId?: string) => void;
  onRemoveQuestion?: (questionId: string) => void;
  onEditQuestion?: (question: any) => void;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Safely splits a multi-step answer key into logical chunks without breaking TeX block math ($$ ... $$)
 */
export function getAnswerKeyChunks(cleanedAns: string): string[] {
  if (!cleanedAns || !cleanedAns.trim()) return [];

  const text = cleanedAns.trim();

  // 1. Split the text into segments separating text and display math blocks.
  const parts = text.split(/(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\])/g);
  
  const chunks: string[] = [];
  let currentChunk = "";

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part.trim()) continue;

    const isMath = part.startsWith("$$") || part.startsWith("\\[");

    if (isMath) {
      // Add the math block to the current chunk
      currentChunk += (currentChunk ? "\n" : "") + part;
      // Close the chunk AFTER a math block to allow page break
      chunks.push(currentChunk.trim());
      currentChunk = "";
    } else {
      // It's a text part. Split by HTML block tags or newlines
      const textLines = part.replace(/<\/p>|<br\s*\/?>/gi, "\n").split(/\n+/);
      
      for (const line of textLines) {
        if (!line.trim()) continue;
        
        const isNewStepHeader = /^(\d+[\.\-\)]|\*|•|\-|الخطوة|تطبيق|استنتاج|المعالم|الحل|قانون)/i.test(line.trim());
        const isCurrentLarge = currentChunk.length > 180;
        
        if ((isNewStepHeader || isCurrentLarge) && currentChunk.trim()) {
          chunks.push(currentChunk.trim());
          currentChunk = line;
        } else {
          currentChunk += (currentChunk ? "\n" : "") + line;
        }
      }
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [cleanedAns];
}

/**
 * Helper to check if text contains math equations or LaTeX formatting
 */
export function containsEquation(text: string): boolean {
  if (!text) return false;
  if (/\$\$|\\\[|\\\(|\$[^\$]+\$/i.test(text)) return true;
  if (/\\(frac|sqrt|int|sum|prod|lim|matrix|bmatrix|pmatrix|vmatrix|cases|over|under|vec|hat|bar|alpha|beta|gamma|theta|pi|infty)/i.test(text)) return true;
  if (/[a-zA-Z0-9_\{\}]+\^[a-zA-Z0-9_\{\}]+|[a-zA-Z0-9_\{\}]+_[a-zA-Z0-9_\{\}]+/i.test(text)) return true;
  return false;
}

/**
 * Dynamically determines the optimal MCQ option column count (1, 2, or 4 columns)
 * based on option text length, equations, and multiline content.
 */
export function determineMcqColumns(
  distractors: { id: string; text: string; isCorrect?: boolean }[],
  overrideColumns?: number | string
): 1 | 2 | 4 {
  if (overrideColumns) {
    const num = parseInt(String(overrideColumns), 10);
    if (num === 1 || num === 2 || num === 4) return num as 1 | 2 | 4;
  }

  if (!distractors || distractors.length === 0) return 4;

  let maxLen = 0;
  let hasMath = false;
  let hasComplexMath = false;
  let hasMultiLine = false;

  distractors.forEach((d) => {
    const raw = d.text || "";
    const clean = raw.replace(/<[^>]*>/g, "").trim();
    if (clean.length > maxLen) maxLen = clean.length;

    if (raw.includes("\n") || raw.includes("<br") || raw.includes("<p")) {
      hasMultiLine = true;
    }

    if (containsEquation(raw)) {
      hasMath = true;
      if (/\\(frac|sqrt|int|sum|matrix|bmatrix|pmatrix|vmatrix|cases)/i.test(raw) || clean.length > 22) {
        hasComplexMath = true;
      }
    }
  });

  // Rule 1: 1 Column Layout (Full row per option -> 4 rows)
  // Used if options have complex math equations, long text (> 38 chars), multiline, or non-standard distractors count
  if (hasComplexMath || maxLen > 38 || hasMultiLine || distractors.length > 4 || distractors.length === 3) {
    return 1;
  }

  // Rule 2: 2 Columns Layout (Grid of 2 columns x N rows)
  // Used if options have medium length text (18 - 38 chars) or standard math formulas where 2 columns fit comfortably
  if (maxLen > 18 || (hasMath && maxLen > 10)) {
    return 2;
  }

  // Rule 3: 4 Columns Layout (1 row of 4 options)
  // Used if options are very short (e.g. <= 18 chars, single words or numbers) without complex math
  return 4;
}

/**
  * Standalone Model Answer & Grading Rubric Component
  */
export interface QuestionAnswerKeyBoxProps {
  question: any;
  chunkText?: string;
  isFirst?: boolean;
  isLast?: boolean;
  optionsSize?: string;
  activeFontFamily?: string;
  className?: string;
}

import { debugLog } from "../utils/debugLog";
import { resolveQuestionAnswer, isOptionCorrect } from "../utils/answerResolver";

export const QuestionAnswerKeyBox: React.FC<QuestionAnswerKeyBoxProps> = ({
  question,
  chunkText,
  isFirst = true,
  isLast = true,
  optionsSize = "10pt",
  activeFontFamily = "inherit",
  className = "",
}) => {
  if (!question) return null;
  let cleanedAns = resolveQuestionAnswer(question);
  let rawAns = question.answer || cleanedAns;
  const rawText = question.text || "";
  const scriptInfo = analyzeContentScript(rawText + " " + cleanedAns);
  const detectedDir = scriptInfo.hasRtl || scriptInfo.primaryDirection === "rtl" ? "rtl" : "ltr";
  const isRTL = detectedDir === "rtl";

  const textToRender = chunkText !== undefined ? chunkText : cleanedAns;
  debugLog("QuestionAnswerKeyBox", "Rendered Answer", { questionId: question.id, rawAns, cleanedAns, correctOpt: question.distractors?.find((o: any) => o.isCorrect), textToRender });
  

  const roundingClasses =
    isFirst && isLast
      ? "rounded-lg mt-1.5"
      : isFirst
      ? "rounded-t-lg mt-1.5 border-b-0"
      : isLast
      ? "rounded-b-lg border-t-0"
      : "border-t-0 border-b-0";

  return (
    <div
      className={`model-answer-box p-2.5 bg-purple-50/90 dark:bg-purple-950/50 border-2 border-purple-300 dark:border-purple-700 text-purple-950 dark:text-purple-100 ${roundingClasses} font-bold flex flex-col gap-1.5 print:bg-purple-50/70 print:text-purple-950 print:border-purple-400 print:p-2 break-inside-avoid print:break-inside-avoid ${className}`}
      dir={detectedDir}
      style={{
        fontSize: optionsSize,
        fontFamily: activeFontFamily,
      }}
    >
      {isFirst && (
        <div className="flex items-center gap-1.5 font-extrabold text-purple-950 dark:text-purple-100 border-b border-purple-200 dark:border-purple-800 pb-1 print:border-purple-300">
          <span className="text-purple-700 dark:text-purple-300">🔑</span>
          <span>{isRTL ? "إجابة وسلّم تصحيح المعلم النموذجية:" : "Teacher Model Answer & Rubric:"}</span>
        </div>
      )}
      <div className="text-purple-900 dark:text-purple-200 font-semibold leading-snug print:text-slate-900">
        <MathText
          text={
            textToRender !== ""
              ? textToRender
              : (isRTL ? "لا توجد إجابة نموذجية بعد — أكمل مراجعة السؤال" : "No model answer yet — complete the question review")
          }
          style={{ fontFamily: activeFontFamily }}
          dir={detectedDir}
        />
      </div>
    </div>
  );
};

/**
 * Creates printable item blocks for the answer key of a question,
 * allowing long multi-step solutions to break naturally across pages.
 */
export function createAnswerKeyItems(
  question: any,
  questionId: string | number,
  optionsSize: string = "10pt",
  activeFontFamily: string = "inherit"
): { id: string; content: React.ReactNode }[] {
  const rawAns = question.answer || "";
  const cleanedAns = cleanLeakedTokens(unescapeHtmlEntities(rawAns || "")).trim();
  const chunks = getAnswerKeyChunks(cleanedAns);

  if (chunks.length <= 1) {
    return [
      {
        id: `anskey-${questionId}-full`,
        content: (
          <QuestionAnswerKeyBox
            question={question}
            optionsSize={optionsSize}
            activeFontFamily={activeFontFamily}
          />
        ),
      },
    ];
  }

  return chunks.map((chunkText, chunkIdx) => ({
    id: `anskey-${questionId}-step-${chunkIdx}`,
    content: (
      <QuestionAnswerKeyBox
        question={question}
        chunkText={chunkText}
        isFirst={chunkIdx === 0}
        isLast={chunkIdx === chunks.length - 1}
        optionsSize={optionsSize}
        activeFontFamily={activeFontFamily}
      />
    ),
  }));
}

/**
 * Normalizes question text by unwrapping accidental HTML lists and removing
 * legacy hardcoded leading numbers so that QuestionNumberNode is the single source of truth.
 */
export const cleanQuestionTextForRender = (rawHtml: string, fontSize?: string): string => {
  if (!rawHtml) return "";
  let clean = cleanLeakedTokens(unescapeHtmlEntities(rawHtml.trim()));

  // The unwrapping of single-item lists has been removed because it broke valid lists.

  // 2. Strip hardcoded manual leading numbering inside paragraphs or plain text (e.g. "1-", "س1:", "(1)")
  clean = clean.replace(/^(<p[^>]*>)\s*(?:(?:س|السؤال)\s*\d+[\s:\-.)]+|\(?\d+\)?[\s:\-.)]+)\s*/i, "$1");
  clean = clean.replace(/^\s*(?:(?:س|السؤال)\s*\d+[\s:\-.)]+|\(?\d+\)?[\s:\-.)]+)\s*/i, "");

  return clean;
};

/**
 * Centralized Unified Question Renderer & Question Block
 * 
 * Renders questions consistently across Exam Preview, Print Sheets (A4),
 * PDF Exporter, Question Bank, and Editor Cards.
 * 
 * Architectural Guarantees:
 * - Completely stops the use of HTML Bullet / Numbered lists (<ol>, <ul>, <li>) for question numbers.
 * - Utilizes an independent QuestionNumberNode connected to the Question Block.
 * - Automatically positions the number based on direction (RTL -> Right, LTR -> Left).
 * - Sits on the exact same line as the start of the question text with snug spacing.
 * - Keeps number, marks, title, options, and content as a cohesive unbreakable unit (break-inside: avoid).
 */
export const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question,
  index,
  questionNumber,
  numberFormat = "dash",
  customNumberLabel,
  allocatedMarks,
  showMarks = false,
  showAnswerKey = false,
  suppressAnswerBox = false,
  activeFontFamily = "inherit",
  questionSize = "11pt",
  optionsSize = "10pt",
  marksSize = "10pt",
  spacingPx = "12px",
  optionSpacingPx = "3px",
  forceDirection = "auto",
  mode = "exam-print",
  canSwap = false,
  onSwapQuestion,
  onRemoveQuestion,
  onEditQuestion,
  className = "",
  style = {},
}) => {
  if (!question) return null;

  const rawQId = question.id || question.questionId || "";
  const bankQ = rawQId ? storage.getQuestionById(rawQId) : null;
  const q = bankQ ? { ...question, ...bankQ } : question;
  const qId = q.id || q.questionId || "";
  const rawText = q.text || "";
  const qType = q.type || q.questionType || "essay";

  // Calculate actual numeric index (1-based)
  const numVal =
    questionNumber !== undefined
      ? questionNumber
      : index !== undefined
      ? index + 1
      : 1;

  // Determine Directionality
  const scriptAnalysis = analyzeContentScript(rawText);
  const detectedDir: "rtl" | "ltr" =
    forceDirection === "rtl"
      ? "rtl"
      : forceDirection === "ltr"
      ? "ltr"
      : scriptAnalysis.primaryDirection;

  const isRTL = detectedDir === "rtl";

  // Cleaned text ready for inline rendering
  const cleanedText = cleanQuestionTextForRender(rawText, questionSize);

  // Question Marks
  const marks =
    allocatedMarks !== undefined
      ? allocatedMarks
      : q.allocatedMarks !== undefined
      ? q.allocatedMarks
      : q.marks !== undefined
      ? q.marks
      : undefined;

  // Distractors for MCQ
  const rawDistractors = q.distractors || q.options || [];
  const distractorsList: { id: string; text: string; isCorrect?: boolean }[] =
    Array.isArray(rawDistractors)
      ? rawDistractors.map((d: any, dIdx: number) => {
          if (typeof d === "string") {
            return { id: `opt-${dIdx}`, text: d, isCorrect: false };
          }
          return {
            id: d.id || `opt-${dIdx}`,
            text: d.text || "",
            isCorrect: d.isCorrect,
          };
        })
      : [];


  const isCardMode = mode === "card";

  const bookRef = useMemo<BookReference | null>(() => {
    // In all exam outputs, student sheets, print previews, and exports, strictly NEVER display question metadata / book reference
    if (!isCardMode) {
      return null;
    }
    const rawRef = q.bookReference;
    if (typeof rawRef === "string" && rawRef.trim()) {
      return {
        bookSource: rawRef.trim(),
        showInCard: true,
        showInPrint: false,
      };
    }
    if (rawRef && typeof rawRef === "object") {
      return {
        ...rawRef,
        bookSource: rawRef.bookSource || "",
        showInCard: rawRef.showInCard !== false,
        showInPrint: false,
      };
    }
    return null;
  }, [q.bookReference, isCardMode]);

  const shouldShowBookRef =
    isCardMode &&
    Boolean(
      bookRef &&
      bookRef.showInCard !== false &&
      (bookRef.bookSource || bookRef.pageNumber || bookRef.exerciseNumber || bookRef.questionTitle)
    );


  return (
    <div
      id={`question-block-${qId}`}
      data-question-id={qId}
      data-question-type={qType}
      className={`exam-question-item question-block question-renderer-block px-1 [.a4-print-sheet_&]:!p-0 [.a4-print-sheet_&]:!my-0 relative group break-inside-avoid print:break-inside-avoid ${
        isCardMode
          ? "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 [.a4-print-sheet_&]:!p-0 [.a4-print-sheet_&]:!border-none [.a4-print-sheet_&]:!rounded-none [.a4-print-sheet_&]:!bg-transparent shadow-3xs [.a4-print-sheet_&]:!shadow-none h-auto min-h-0"
          : "border-b border-slate-200/60 print:border-none"
      } ${className}`}
      dir={detectedDir}
      style={{
        fontFamily: activeFontFamily,
        fontSize: questionSize,
        paddingTop: isCardMode ? "0.625rem" : `${Math.max(0, Math.min(8, parseFloat(spacingPx) * (8 / 12)))}px`,
        paddingBottom: isCardMode ? "0.625rem" : `${Math.max(0, Math.min(8, parseFloat(spacingPx) * (8 / 12)))}px`,
        marginBottom: isCardMode ? "0.5rem" : spacingPx,
        marginTop: isCardMode ? "0" : spacingPx,
        direction: detectedDir,
        
        
        breakInside: "avoid",
        pageBreakInside: "avoid",
        "--card-line-spacing": `${q.lineSpacing || 0}px`,
        ...style,
      } as React.CSSProperties}
    >
            {shouldShowBookRef && (
        <div className="flex items-center gap-3 text-[10px] text-slate-500 bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 rounded-md px-2.5 py-1.5 mb-2 w-fit max-w-full overflow-hidden print:border-slate-300 print:text-black">
          {bookRef.bookSource && (
            <span className="flex items-center gap-1 shrink-0"><BookOpen className="w-3 h-3 text-emerald-600 print:text-black" /> {bookRef.bookSource}</span>
          )}
          {bookRef.pageNumber && (
            <span className="flex items-center gap-1 shrink-0"><FileText className="w-3 h-3 text-blue-600 print:text-black" /> صفحة: {bookRef.pageNumber}</span>
          )}
          {bookRef.exerciseNumber && (
            <span className="flex items-center gap-1 shrink-0"><Hash className="w-3 h-3 text-purple-600 print:text-black" /> تمرين: {bookRef.exerciseNumber}</span>
          )}
          {bookRef.questionTitle && (
            <span className="flex items-center gap-1 truncate"><Tag className="w-3 h-3 text-orange-600 print:text-black" /> {bookRef.questionTitle}</span>
          )}
        </div>
      )}
      {/* 
        Unified Question Header Row:
        - Question Prompt Container: Contains QuestionNumberNode + Question Text on the EXACT SAME LINE
        - Right/Left Indicators: Marks Badge and Interactive Action Buttons
      */}
      <div
        className="question-header-row flex items-start justify-between gap-2.5 w-full"
        dir={detectedDir}
        style={{
          fontSize: questionSize,
          fontFamily: activeFontFamily,
          direction: detectedDir,
          
          
        }}
      >
        <div
          className="question-prompt-container flex items-baseline flex-1 leading-snug text-slate-900 dark:text-slate-100 font-semibold min-w-0"
          dir={detectedDir}
          style={{
            fontSize: questionSize,
            fontFamily: activeFontFamily,
            direction: detectedDir,
            
            
          }}
        >
          {/* Independent Question Number Node */}
          <QuestionNumberNode
            value={numVal}
            format={numberFormat}
            customLabel={customNumberLabel}
            direction={detectedDir}
            fontFamily={activeFontFamily}
            fontSize={questionSize}
          />

          {/* Question Text Node on the very same line */}
          <div
            className="question-text-node flex-1 text-slate-900 dark:text-slate-100 leading-snug font-semibold min-w-0"
            dir={detectedDir}
            style={{
              fontSize: questionSize,
              fontFamily: activeFontFamily,
              direction: detectedDir,
              
              
            }}
          >
            <MathText
              text={cleanedText}
              dir={detectedDir}
              style={{ fontFamily: activeFontFamily, fontSize: questionSize }}
            />
          </div>
        </div>

        {/* Right/Left Indicators: Marks Badge and Non-Printable Action Controls */}
        <div className="flex items-center gap-2 shrink-0 select-none">
          {showMarks && marks !== undefined && (
            <span
              className="font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100/90 print:bg-transparent dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 shrink-0 print:border-slate-400"
              style={{ fontSize: marksSize }}
            >
              [{marks} {isRTL ? "درجة" : "marks"}]
            </span>
          )}

          {/* Interactive actions for editor card mode only */}
          {mode !== "exam-print" && mode !== "preview-only" && mode !== "preview" && (canSwap || onRemoveQuestion || onEditQuestion) && (
            <div className="flex items-center gap-1 no-print print:hidden shrink-0 opacity-80 group-hover:opacity-100 transition">
              {onEditQuestion && (
                <button
                  type="button"
                  onClick={() => onEditQuestion(q)}
                  className="px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-blue-900 dark:text-blue-300 font-bold text-[10pt] border border-blue-200 dark:border-blue-800 transition cursor-pointer"
                  title="تعديل السؤال"
                >
                  <span>تعديل</span>
                </button>
              )}
              {canSwap && onSwapQuestion && (
                <button
                  type="button"
                  onClick={() => onSwapQuestion(qId, q.sectionId)}
                  className="px-2 py-0.5 rounded bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-300 font-bold text-[10pt] border border-amber-200 dark:border-amber-800 transition cursor-pointer"
                  title="استبدال السؤال بسؤال آخر من نفس النوع"
                >
                  <span>استبدال</span>
                </button>
              )}
              {onRemoveQuestion && (
                <button
                  type="button"
                  onClick={() => onRemoveQuestion(qId)}
                  className="px-2 py-0.5 rounded bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 font-bold text-[10pt] border border-red-200 dark:border-red-800 transition cursor-pointer"
                  title="حذف السؤال من النموذج"
                >
                  <span>حذف</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Question Attached Media Image if present */}
      {q.imageUrl && (
        <div
          className="question-image-container my-2 max-w-full flex justify-center"
          dir={detectedDir}
        >
          <img
            src={q.imageUrl}
            alt="صورة السؤال"
            className="max-h-56 max-w-full object-contain rounded-md border border-slate-300 dark:border-slate-700 bg-white p-1"
            referrerPolicy="no-referrer"
          />
        </div>
      )}

      {/* 
        QUESTION TYPE SPECIFIC BODIES:
      */}

      {/* 1. MCQ (Multiple Choice Questions) */}
      {(qType === "mcq" || qType === "multiple_choice") && distractorsList.length > 0 && (
        <div
          className="question-mcq-options pb-0.5 w-full max-w-full overflow-visible"
          dir={detectedDir}
          style={{
            paddingInlineStart: isCardMode ? "0" : "1.25rem",
            paddingTop: optionSpacingPx,
          }}
        >
          {(() => {
            const numCols = determineMcqColumns(
              distractorsList,
              q.optionsLayout || q.mcqColumns || q.mcqLayout
            );

            // Group distractors into rows of `numCols`
            const optionRows: (typeof distractorsList)[] = [];
            for (let i = 0; i < distractorsList.length; i += numCols) {
              optionRows.push(distractorsList.slice(i, i + numCols));
            }

            return (
              <table
                className="w-full table-fixed border-separate border-spacing-0 border border-slate-700 dark:border-slate-500 print:border-slate-900 text-slate-900 dark:text-slate-100 font-medium my-0.5"
                style={{
                  fontSize: optionsSize,
                  fontFamily: activeFontFamily,
                  width: "100%",
                  maxWidth: "100%",
                  tableLayout: "fixed",
                  borderCollapse: "collapse",
                }}
                dir={detectedDir}
              >
                <tbody>
                  {optionRows.map((rowGroup, rowIdx) => (
                    <tr key={`mcq-row-${rowIdx}`} className="align-middle" style={{ height: "auto" }}>
                      {rowGroup.map((d, colIdx) => {
                        const dIdx = rowIdx * numCols + colIdx;
                        const arabicLetters = ["أ", "ب", "ج", "د", "هـ", "و"];
                        const latinLetters = ["A", "B", "C", "D", "E", "F"];
                        const optionLabel = isRTL
                          ? arabicLetters[dIdx] || `${dIdx + 1}`
                          : latinLetters[dIdx] || `${dIdx + 1}`;

                        const rawOptText = d.text || "";
                        const optionText = cleanLeakedTokens(unescapeHtmlEntities(rawOptText));
                        const isCorrect = isOptionCorrect(q, d, dIdx);

                        const isVeryLongInCol =
                          numCols > 1 &&
                          rawOptText.length > (numCols === 4 ? 18 : 38);

                        const colWidth = `${100 / numCols}%`;

                        return (
                          <td
                            key={d.id || `opt-${dIdx}`}
                            className="border border-slate-700 dark:border-slate-500 print:border-slate-900 px-2.5 py-1 text-right align-middle bg-white/60 dark:bg-slate-800/40 print:bg-transparent overflow-hidden"
                            style={{
                              width: colWidth,
                              maxWidth: colWidth,
                              direction: detectedDir,
                              verticalAlign: "middle",
                              height: "auto",
                              wordBreak: "break-word",
                              overflowWrap: "anywhere",
                            }}
                          >
                            <div
                              className={`flex items-center justify-start gap-1.5 w-full min-w-0 max-w-full ${isRTL ? "text-right" : "text-left"}`}
                              dir={detectedDir}
                              style={{
                                fontSize: isVeryLongInCol
                                  ? `calc(${optionsSize} * 0.9)`
                                  : optionsSize,
                                fontFamily: activeFontFamily,
                                lineHeight: 1.3,
                              }}
                            >
                              <span
                                className="shrink-0 font-extrabold text-slate-900 dark:text-slate-100 print:text-black select-none text-center inline-block"
                                style={{
                                  fontSize: isVeryLongInCol
                                    ? `calc(${optionsSize} * 0.9)`
                                    : optionsSize,
                                  fontFamily: activeFontFamily,
                                }}
                              >
                                ({optionLabel})
                              </span>
                              <div
                                className="flex-1 min-w-0 max-w-full break-words leading-snug mcq-option-content overflow-visible"
                                style={{
                                  wordBreak: "break-word",
                                  overflowWrap: "anywhere",
                                  whiteSpace: "normal",
                                }}
                              >
                                <MathText
                                  text={optionText}
                                  className={`inline-block ${isRTL ? "text-right" : "text-left"} max-w-full`}
                                  style={{
                                    fontFamily: activeFontFamily,
                                    fontSize: isVeryLongInCol
                                      ? `calc(${optionsSize} * 0.9)`
                                      : optionsSize,
                                  }}
                                  dir={detectedDir}
                                />
                              </div>
                              {isCorrect && showAnswerKey && (
                                <span className="text-[9px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-1 py-0.5 rounded border border-emerald-300 dark:border-emerald-700 shrink-0 print:border-emerald-600 print:text-emerald-900">
                                  ✓
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                      {/* Empty filler cells if row has fewer columns than numCols */}
                      {rowGroup.length < numCols &&
                        Array.from({ length: numCols - rowGroup.length }).map((_, emptyIdx) => (
                          <td
                            key={`empty-${emptyIdx}`}
                            className="border border-slate-700 dark:border-slate-500 print:border-slate-900 px-2 py-1 bg-white/60 dark:bg-slate-800/40 print:bg-transparent"
                            style={{ width: `${100 / numCols}%` }}
                          />
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          })()}
        </div>
      )}

      {/* 2. True / False */}
      {(qType === "true_false" || qType === "tf") && (
        <div
          className="question-tf-options font-bold text-slate-900 dark:text-slate-100 flex items-center gap-8"
          dir={detectedDir}
          style={{
            fontSize: optionsSize,
            fontFamily: activeFontFamily,
            paddingInlineStart: "1.5rem",
            paddingTop: optionSpacingPx,
          }}
        >
          {(() => {
            const normAns = resolveQuestionAnswer(q).toLowerCase();
            const isTrue = normAns === "صح" || normAns === "صواب" || normAns === "صحيح" || normAns === "true" || normAns === "1";
            const isFalse = normAns === "خطأ" || normAns === "خاطئ" || normAns === "false" || normAns === "0";

            return isRTL ? (
              <>
                <span className="inline-flex items-center gap-1">
                  (&nbsp;{showAnswerKey && isTrue ? <strong className="text-emerald-700 font-black">✓</strong> : <span className="opacity-0">✓</span>}&nbsp;) صَحّ
                </span>
                <span className="inline-flex items-center gap-1">
                  (&nbsp;{showAnswerKey && isFalse ? <strong className="text-emerald-700 font-black">✓</strong> : <span className="opacity-0">✓</span>}&nbsp;) خَطَأ
                </span>
              </>
            ) : (
              <>
                <span className="inline-flex items-center gap-1">
                  (&nbsp;{showAnswerKey && isTrue ? <strong className="text-emerald-700 font-black">✓</strong> : <span className="opacity-0">✓</span>}&nbsp;) True
                </span>
                <span className="inline-flex items-center gap-1">
                  (&nbsp;{showAnswerKey && isFalse ? <strong className="text-emerald-700 font-black">✓</strong> : <span className="opacity-0">✓</span>}&nbsp;) False
                </span>
              </>
            );
          })()}
        </div>
      )}

      {/* 3. Matching (المزاوجة / التوصيل) */}
      {qType === "matching" && q.matchingPairs && q.matchingPairs.length > 0 && (
        <div
          className="question-matching-container pt-2 pb-1 w-full"
          dir={detectedDir}
          style={{ paddingInlineStart: "1.5rem" }}
        >
          <table
            className="w-full border-separate border-spacing-0 border border-slate-900 dark:border-slate-600 text-slate-900 dark:text-slate-100"
            style={{ fontSize: optionsSize, fontFamily: activeFontFamily }}
          >
            <thead>
              <tr className="bg-slate-100 print:bg-transparent dark:bg-slate-800 font-bold border-b border-slate-900 dark:border-slate-600">
                <th className="border-r border-slate-900 dark:border-slate-600 p-1.5 text-center w-1/2">
                  {isRTL ? "العمود الأول (أ)" : "Column A"}
                </th>
                <th className="p-1.5 text-center w-1/2">
                  {isRTL ? "العمود الثاني (ب)" : "Column B"}
                </th>
              </tr>
            </thead>
            <tbody>
              {q.matchingPairs.map((pair: any, pIdx: number) => {
                const arabicLetters = ["أ", "ب", "ج", "د", "هـ", "و"];
                const latinLetters = ["A", "B", "C", "D", "E", "F"];
                const rightLabel = isRTL
                  ? arabicLetters[pIdx] || `${pIdx + 1}`
                  : latinLetters[pIdx] || `${pIdx + 1}`;

                return (
                  <tr key={pIdx} className="border-b border-slate-300 dark:border-slate-700">
                    <td className="border-r border-slate-900 dark:border-slate-600 p-2 align-top">
                      <div className="flex items-baseline gap-2" dir={detectedDir}>
                        <span className="font-bold shrink-0">{pIdx + 1}.</span>
                        <div className="flex-1">
                          <MathText
                            text={cleanLeakedTokens(unescapeHtmlEntities(pair.left || ""))}
                            style={{ fontFamily: activeFontFamily }}
                            dir={detectedDir}
                          />
                        </div>
                        <span className="font-bold shrink-0 text-slate-400 select-none">
                          [ &nbsp;&nbsp;&nbsp; ]
                        </span>
                      </div>
                    </td>
                    <td className="p-2 align-top">
                      <div className="flex items-baseline gap-2" dir={detectedDir}>
                        <span className="font-bold shrink-0">({rightLabel})</span>
                        <div className="flex-1">
                          <MathText
                            text={cleanLeakedTokens(unescapeHtmlEntities(pair.right || ""))}
                            style={{ fontFamily: activeFontFamily }}
                            dir={detectedDir}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. Sequence / Ordering (الترتيب) */}
      {qType === "ordering" && q.sequenceItems && q.sequenceItems.length > 0 && (
        <div
          className="question-ordering-container pt-2 pb-1 space-y-1.5"
          dir={detectedDir}
          style={{ paddingInlineStart: "1.5rem", fontSize: optionsSize, fontFamily: activeFontFamily }}
        >
          {q.sequenceItems.map((item: string, sIdx: number) => (
            <div
              key={sIdx}
              className="flex items-baseline gap-2 font-medium"
              dir={detectedDir}
            >
              <span className="font-bold text-slate-800 dark:text-slate-200 shrink-0 select-none">
                [ &nbsp;&nbsp;&nbsp;&nbsp; ]
              </span>
              <div className="flex-1">
                <MathText
                  text={cleanLeakedTokens(unescapeHtmlEntities(item || ""))}
                  style={{ fontFamily: activeFontFamily }}
                  dir={detectedDir}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. Teacher Model Answer / Scoring Rubric (Answer Key) */}
      {showAnswerKey && !suppressAnswerBox && (
        <QuestionAnswerKeyBox
          question={q}
          optionsSize={optionsSize}
          activeFontFamily={activeFontFamily}
        />
      )}
    </div>
  );
};
