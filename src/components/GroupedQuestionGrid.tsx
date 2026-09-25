import React from "react";
import { MathText } from "./MathText";
import { QuestionNumberNode, QuestionNumberFormat } from "./QuestionNumberNode";
import { GroupedQuestionUnit, GroupedChildItem, SubItemNumberingStyle, GroupingDensity } from "../services/groupingEngine";
import { analyzeContentScript, cleanLeakedTokens, unescapeHtmlEntities } from "../services/bidiContentPipeline";
import { QuestionAnswerKeyBox } from "./QuestionRenderer";
import { resolveQuestionAnswer, isOptionCorrect, hasAnswer } from "../utils/answerResolver";
import { Layers, Sparkles, BookOpen, FileText, Hash, Tag } from "lucide-react";
import { BookReference } from "../types";

export interface GroupedQuestionGridProps {
  unit: GroupedQuestionUnit;
  mainQuestionNumber?: number | string;
  numberFormat?: QuestionNumberFormat;
  numberingStyle?: SubItemNumberingStyle;
  columns?: 2 | 3 | 4 | "auto";
  density?: GroupingDensity;
  showMarks?: boolean;
  showAnswerKey?: boolean;
  activeFontFamily?: string;
  questionSize?: string;
  optionsSize?: string;
  marksSize?: string;
  spacingPx?: string;
  optionSpacingPx?: string;
  forceDirection?: "rtl" | "ltr" | "auto";
  mode?: "exam-print" | "card" | "compact" | "preview" | "preview-only";
  canSwap?: boolean;
  onSwapQuestion?: (questionId: string) => void;
  onRemoveQuestion?: (questionId: string) => void;
  onEditQuestion?: (question: any) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const GroupedQuestionGrid: React.FC<GroupedQuestionGridProps> = ({
  unit,
  mainQuestionNumber,
  numberFormat = "dash",
  numberingStyle = "paren-num",
  columns = "auto",
  density = "compact",
  showMarks = false,
  showAnswerKey = false,
  activeFontFamily = "inherit",
  questionSize = "11pt",
  optionsSize = "10pt",
  marksSize = "10pt",
  spacingPx,
  optionSpacingPx,
  forceDirection = "auto",
  mode = "exam-print",
  canSwap = false,
  onSwapQuestion,
  onRemoveQuestion,
  onEditQuestion,
  className = "",
  style = {},
}) => {
  if (!unit || !unit.items || unit.items.length === 0) return null;

  const numVal = mainQuestionNumber !== undefined ? mainQuestionNumber : unit.groupIndex || 1;
  const rawHeader = unit.commonHeader || "أجب عن التمارين التالية:";

  // Script & Direction Analysis
  const scriptAnalysis = analyzeContentScript(rawHeader);
  const detectedDir: "rtl" | "ltr" =
    forceDirection === "rtl"
      ? "rtl"
      : forceDirection === "ltr"
      ? "ltr"
      : scriptAnalysis.primaryDirection;
  const isRTL = detectedDir === "rtl";

  // Grid columns resolution
  const effectiveColumns =
    columns === "auto" ? unit.suggestedColumns || 2 : columns;

  const isCardMode = mode === "card";

  // Formatting marks
  const totalMarks = unit.totalMarks;
  const markPerItem = unit.markPerItem !== undefined
    ? Number(unit.markPerItem).toFixed(unit.markPerItem % 1 === 0 ? 0 : 2)
    : undefined;

  // Grid columns class & inline styles
  const gridColClass =
    effectiveColumns === 4
      ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-4"
      : effectiveColumns === 3
      ? "grid-cols-1 sm:grid-cols-3"
      : "grid-cols-1 sm:grid-cols-2";

  // Extract and consolidate book reference metadata (المرجع الكتابي للبطاقة)
  const groupBookRef = isCardMode
    ? unit.primaryBookReference || unit.items?.[0]?.bookReference || unit.items?.[0]?.originalQuestion?.bookReference
    : null;
  const shouldShowGroupBookRef =
    isCardMode &&
    Boolean(
      groupBookRef &&
      groupBookRef.showInCard !== false &&
      (groupBookRef.bookSource || groupBookRef.pageNumber || groupBookRef.exerciseNumber || groupBookRef.questionTitle)
    );

  return (
    <div
      id={`grouped-question-block-${unit.id}`}
      data-unit-id={unit.id}
      data-group-type="grouped-grid"
      className={`grouped-question-grid-container question-block relative my-2 break-inside-avoid print:break-inside-avoid ${
        isCardMode
          ? "bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/60 rounded-xl px-3.5 py-2.5 shadow-3xs h-auto min-h-0"
          : "border-b border-slate-200/70 pb-3 print:border-none print:pb-2"
      } ${className}`}
      dir={detectedDir}
      style={{
        fontFamily: activeFontFamily,
        fontSize: questionSize,
        direction: detectedDir,
        breakInside: "avoid",
        pageBreakInside: "avoid",
        ...style,
      }}
    >
      {/* 
        1. COMMON PARENT HEADER ROW (الجذر الموحد / رأس السؤال المشترك)
      */}
      <div
        className="common-parent-header-row flex items-baseline justify-between gap-3 mb-2 bg-slate-50/80 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-200/80 dark:border-slate-700/60 print:bg-transparent print:border-none print:p-0 print:mb-2"
        dir={detectedDir}
        style={{ fontSize: questionSize, fontFamily: activeFontFamily }}
      >
        <div className="flex items-baseline flex-1 min-w-0" dir={detectedDir}>
          {/* Main Question Number Node */}
          <QuestionNumberNode
            value={numVal}
            format={numberFormat}
            direction={detectedDir}
            fontFamily={activeFontFamily}
            fontSize={questionSize}
            className="text-blue-900 dark:text-blue-400 font-black shrink-0"
          />

          {/* Common Parent Header Prompt */}
          <div
            className="common-header-text flex-1 font-bold text-slate-900 dark:text-slate-100 leading-snug min-w-0"
            dir={detectedDir}
            style={{ fontSize: questionSize, fontFamily: activeFontFamily }}
          >
            <MathText
              text={cleanLeakedTokens(unescapeHtmlEntities(rawHeader))}
              dir={detectedDir}
              style={{ fontFamily: activeFontFamily, fontSize: questionSize }}
            />
          </div>
        </div>

        {/* Group Marks & Badges */}
        <div className="flex items-center gap-2 shrink-0 select-none">
          {showMarks && totalMarks > 0 && (
            <span
              className="font-mono font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 shrink-0 print:border-slate-500 print:bg-transparent text-[9pt]"
              style={{ fontSize: marksSize }}
            >
              [{totalMarks} {isRTL ? "درجات" : "marks"}
              {markPerItem && unit.items.length > 1 ? ` - كل تمرين ${markPerItem}` : ""}]
            </span>
          )}

          {mode !== "exam-print" && mode !== "preview-only" && mode !== "preview" && (
            <span
              className="no-print print:hidden text-[9px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100/70 dark:bg-blue-950/60 px-1.5 py-0.5 rounded flex items-center gap-1 border border-blue-200 dark:border-blue-800"
              title="تم تجميع هذا السؤال آلياً عبر محرك التجميع (Grouping Engine)"
            >
              <Layers className="w-2.5 h-2.5 text-blue-600" />
              <span>شبكة تمارين ({unit.items.length})</span>
            </span>
          )}
        </div>
      </div>

      {/* 
        1.5 GROUP-LEVEL BOOK REFERENCE METADATA (المرجع الكتابي للبطاقة المجمعة)
      */}
      {shouldShowGroupBookRef && groupBookRef && (
        <div
          className="group-book-reference-bar flex flex-wrap items-center gap-2.5 text-[10px] text-slate-600 dark:text-slate-300 bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 rounded-md px-2.5 py-1 mb-2.5 w-fit max-w-full overflow-hidden print:border-slate-300 print:text-black print:bg-transparent"
          dir={detectedDir}
        >
          {groupBookRef.bookSource && (
            <span className="flex items-center gap-1 shrink-0 font-medium">
              <BookOpen className="w-3 h-3 text-emerald-600 dark:text-emerald-400 print:text-black" />
              <span>{groupBookRef.bookSource}</span>
            </span>
          )}
          {groupBookRef.pageNumber && (
            <span className="flex items-center gap-1 shrink-0 font-medium">
              <FileText className="w-3 h-3 text-blue-600 dark:text-blue-400 print:text-black" />
              <span>{isRTL ? "صفحة:" : "Page:"} {groupBookRef.pageNumber}</span>
            </span>
          )}
          {groupBookRef.exerciseNumber && (
            <span className="flex items-center gap-1 shrink-0 font-medium">
              <Hash className="w-3 h-3 text-purple-600 dark:text-purple-400 print:text-black" />
              <span>{isRTL ? "تمرين:" : "Ex:"} {groupBookRef.exerciseNumber}</span>
            </span>
          )}
          {groupBookRef.questionTitle && (
            <span className="flex items-center gap-1 font-medium truncate">
              <Tag className="w-3 h-3 text-orange-600 dark:text-orange-400 print:text-black" />
              <span>{groupBookRef.questionTitle}</span>
            </span>
          )}
        </div>
      )}

      {/* 
        2. CHILD EXERCISES AUTO-NUMBERED GRID (شبكة التمارين التابعة المرقمة آلياً)
      */}
      <div
        className={`sub-exercises-grid grid ${gridColClass} w-full`}
        dir={detectedDir}
        style={{
          fontFamily: activeFontFamily,
          fontSize: optionsSize,
          gridTemplateColumns: `repeat(${effectiveColumns}, minmax(0, 1fr))`,
          gap: spacingPx || optionSpacingPx || "0.625rem",
        }}
      >
        {unit.items.map((item: GroupedChildItem, itemIdx: number) => {
          const itemMarks = item.allocatedMarks !== undefined ? item.allocatedMarks : unit.markPerItem;
          const cleanedChildPrompt = cleanLeakedTokens(unescapeHtmlEntities(item.cleanPrompt || "")).trim();
          const targetQ = item.originalQuestion || item;
          const cleanedAns = resolveQuestionAnswer(targetQ);
          const shouldShowAns = showAnswerKey && !item.hideAnswer && hasAnswer(targetQ);
          const itemBookRef = item.bookReference || item.originalQuestion?.bookReference;
          const shouldShowItemBookRef = itemBookRef && (
            ((mode === "exam-print" || mode === "preview") && itemBookRef.showInPrint !== false) ||
            (mode === "compact") ||
            (mode === "preview-only") ||
            (isCardMode && itemBookRef.showInCard !== false)
          );

          return (
            <div
              key={item.id || `grid-item-${itemIdx}`}
              id={`grid-cell-${item.id}`}
              className={`sub-exercise-cell flex flex-col justify-between border border-slate-300 dark:border-slate-700/80 rounded-lg p-2 sm:p-2.5 bg-white dark:bg-slate-900/60 shadow-2xs print:shadow-none print:border-slate-400 print:bg-transparent break-inside-avoid print:break-inside-avoid transition-all hover:border-blue-300 dark:hover:border-blue-700 ${
                density === "ultra-compact" ? "p-1.5 gap-1" : "p-2.5 gap-1.5"
              }`}
              dir={detectedDir}
              style={{
                fontFamily: activeFontFamily,
                fontSize: optionsSize,
              }}
            >
              {/* Header inside grid cell: Auto Sub-Number & Expression */}
              <div className="flex items-start justify-between gap-1.5 w-full">
                <div className="flex items-baseline gap-1.5 flex-1 min-w-0" dir={detectedDir}>
                  {/* Auto Sub-Numbering badge (1), (2), (أ), (ب)... */}
                  <span
                    className="sub-item-badge select-none font-extrabold text-blue-900 dark:text-blue-300 print:text-black shrink-0"
                    style={{
                      fontSize: optionsSize,
                      fontFamily: activeFontFamily,
                    }}
                  >
                    {item.subLabel || `(${itemIdx + 1})`}
                  </span>

                  {/* Clean Child Sub-exercise Content */}
                  <div
                    className="sub-item-expression flex-1 font-semibold text-slate-900 dark:text-slate-100 leading-relaxed min-w-0"
                    dir={detectedDir}
                    style={{
                      fontSize: optionsSize,
                      fontFamily: activeFontFamily,
                    }}
                  >
                    <MathText
                      text={cleanedChildPrompt || "(تمرين)"}
                      dir={detectedDir}
                      style={{
                        fontFamily: activeFontFamily,
                        fontSize: optionsSize,
                      }}
                    />
                  </div>
                </div>

                {/* Sub-item specific mark if requested */}
                {showMarks && itemMarks !== undefined && itemMarks > 0 && !markPerItem && (
                  <span
                    className="font-mono text-[9px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700 shrink-0 print:border-none"
                  >
                    [{itemMarks}د]
                  </span>
                )}

                {/* Interactive Edit / Swap controls in Editor Card Mode */}
                {mode !== "exam-print" && mode !== "preview-only" && mode !== "preview" && (canSwap || onRemoveQuestion || onEditQuestion) && (
                  <div className="flex items-center gap-1 no-print print:hidden shrink-0 opacity-40 hover:opacity-100 transition">
                    {onEditQuestion && (
                      <button
                        type="button"
                        onClick={() => onEditQuestion(item.originalQuestion)}
                        className="px-1.5 py-0.5 rounded text-[8pt] bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 cursor-pointer"
                        title="تعديل الفقرة"
                      >
                        تعديل
                      </button>
                    )}
                    {canSwap && onSwapQuestion && (
                      <button
                        type="button"
                        onClick={() => onSwapQuestion(item.id)}
                        className="px-1.5 py-0.5 rounded text-[8pt] bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 cursor-pointer"
                        title="استبدال"
                      >
                        استبدال
                      </button>
                    )}
                    {onRemoveQuestion && (
                      <button
                        type="button"
                        onClick={() => onRemoveQuestion(item.id)}
                        className="px-1.5 py-0.5 rounded text-[8pt] bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 cursor-pointer"
                        title="حذف"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Optional Child Image */}
              {item.imageUrl && (
                <div className="my-1 flex justify-center max-w-full">
                  <img
                    src={item.imageUrl}
                    alt="صورة التمرين"
                    className="max-h-28 max-w-full object-contain rounded border border-slate-200 dark:border-slate-700 bg-white p-0.5"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              {/* MCQ Distractors inside Grid Cell if present */}
              {item.distractors && item.distractors.length > 0 && (
                <div className="mt-1 space-y-1 w-full text-[9pt]" dir={detectedDir}>
                  {item.distractors.map((d: any, dIdx: number) => {
                    const optLabel = isRTL
                      ? ["أ", "ب", "ج", "د"][dIdx] || `${dIdx + 1}`
                      : ["A", "B", "C", "D"][dIdx] || `${dIdx + 1}`;
                    const optText = typeof d === "string" ? d : d.text || "";
                    const isCorrect = isOptionCorrect(item.originalQuestion || item, d, dIdx);

                    return (
                      <div
                        key={dIdx}
                        className="flex items-center gap-1 text-slate-800 dark:text-slate-200"
                        dir={detectedDir}
                      >
                        <span className="font-bold shrink-0">({optLabel})</span>
                        <div
                          className="flex-1 min-w-0 max-w-full break-words leading-snug mcq-option-content overflow-visible"
                          style={{
                            wordBreak: "break-word",
                            overflowWrap: "anywhere",
                            whiteSpace: "normal",
                          }}
                        >
                          <MathText text={optText} dir={detectedDir} className="inline-block max-w-full" />
                        </div>
                        {isCorrect && showAnswerKey && (
                          <span className="text-emerald-600 font-bold text-[9px]">✓</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Compact Model Answer (سلّم التصحيح المدمج) inside the cell if Answer Key is toggled */}
              {shouldShowAns && (
                <div
                  className="sub-item-answer-key mt-1.5 pt-1 border-t border-purple-200 dark:border-purple-800/80 bg-purple-50/70 dark:bg-purple-950/40 p-1.5 rounded text-purple-950 dark:text-purple-200 text-[9pt] leading-snug print:border-purple-300 print:text-black"
                  dir={detectedDir}
                >
                  <div className="flex items-center gap-1 font-bold text-[8.5pt] text-purple-800 dark:text-purple-300 mb-0.5">
                    <span>🔑</span>
                    <span>{isRTL ? "الحل:" : "Solution:"}</span>
                  </div>
                  <div className="font-medium">
                    <MathText
                      text={cleanedAns}
                      dir={detectedDir}
                      style={{ fontSize: `calc(${optionsSize} * 0.9)` }}
                    />
                  </div>
                </div>
              )}

              {/* Specific Sub-item Metadata / Book Reference if available and differs or provides specific exercise info */}
              {shouldShowItemBookRef && itemBookRef && (itemBookRef.exerciseNumber || itemBookRef.pageNumber || itemBookRef.questionTitle) && (
                <div
                  className="sub-item-metadata-footer flex items-center gap-1.5 text-[8pt] text-slate-500 dark:text-slate-400 mt-1 pt-1 border-t border-slate-100 dark:border-slate-800/80 print:border-slate-200 print:text-black select-none"
                  dir={detectedDir}
                >
                  <BookOpen className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400 shrink-0 print:text-black" />
                  <span className="truncate">
                    {[
                      itemBookRef.pageNumber ? `${isRTL ? "ص" : "p."}${itemBookRef.pageNumber}` : null,
                      itemBookRef.exerciseNumber ? `${isRTL ? "ت" : "ex."}${itemBookRef.exerciseNumber}` : null,
                      itemBookRef.questionTitle
                    ].filter(Boolean).join(" • ")}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
