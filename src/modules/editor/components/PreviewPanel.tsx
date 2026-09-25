import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Columns,
  Printer,
  ChevronRight,
  ChevronLeft,
  Layers,
  ChevronDown,
  LayoutGrid,
  BetweenVerticalEnd,
  Wand2,
  Sparkles,
  BarChart3,
  Scissors,
  RefreshCw,
  Sliders,
  Type,
  Target,
  Bookmark,
  Lightbulb,
  AlertCircle,
  BookOpen,
  AlignJustify,
  Check,
  Plus,
  Minus,
} from "lucide-react";
import { PaginatedA4Preview } from "../../../components/PaginatedA4Preview";
import { PrintPreviewModal } from "../../../components/PrintPreviewModal";
import { MathText } from "../../../components/MathText";
import { RichTextEditor } from "./RichTextEditor";
import { PrintTemplate } from "../../../types/index";
import { parseQuestionsFromContent } from "../../../services/questionParser";
import { QuestionRenderer, QuestionAnswerKeyBox, createAnswerKeyItems } from "../../../components/QuestionRenderer";
import { GroupedQuestionGrid } from "../../../components/GroupedQuestionGrid";
import {
  analyzeAndGroupQuestions,
  GridColumnsOption,
  SubItemNumberingStyle,
  GroupingDensity,
} from "../../../services/groupingEngine";
import { analyzePageLayout, optimizeCardPageBreaks } from "../../../services/pageLayoutOptimizer";
import { storage } from "../../../services/storage";

// Calming pastel color themes for alternating cards
export const PASTEL_CARD_PALETTES = [
  {
    bgGradient: "bg-gradient-to-br from-white to-blue-50/50 dark:from-slate-900 dark:to-blue-950/30",
    border: "border-gray-100 dark:border-slate-800",
    hoverBorder: "hover:border-blue-200 dark:hover:border-blue-800",
    accent: "text-blue-800 dark:text-blue-300",
    accentBorder: "border-blue-500",
  },
  {
    bgGradient: "bg-gradient-to-br from-white to-emerald-50/50 dark:from-slate-900 dark:to-emerald-950/30",
    border: "border-gray-100 dark:border-slate-800",
    hoverBorder: "hover:border-emerald-200 dark:hover:border-emerald-800",
    accent: "text-emerald-800 dark:text-emerald-300",
    accentBorder: "border-emerald-500",
  },
  {
    bgGradient: "bg-gradient-to-br from-white to-purple-50/50 dark:from-slate-900 dark:to-purple-950/30",
    border: "border-gray-100 dark:border-slate-800",
    hoverBorder: "hover:border-purple-200 dark:hover:border-purple-800",
    accent: "text-purple-800 dark:text-purple-300",
    accentBorder: "border-purple-500",
  },
  {
    bgGradient: "bg-gradient-to-br from-white to-amber-50/50 dark:from-slate-900 dark:to-amber-950/30",
    border: "border-gray-100 dark:border-slate-800",
    hoverBorder: "hover:border-amber-200 dark:hover:border-amber-800",
    accent: "text-amber-800 dark:text-amber-300",
    accentBorder: "border-amber-500",
  },
  {
    bgGradient: "bg-gradient-to-br from-white to-rose-50/50 dark:from-slate-900 dark:to-rose-950/30",
    border: "border-gray-100 dark:border-slate-800",
    hoverBorder: "hover:border-rose-200 dark:hover:border-rose-800",
    accent: "text-rose-800 dark:text-rose-300",
    accentBorder: "border-rose-500",
  },
  {
    bgGradient: "bg-gradient-to-br from-white to-indigo-50/50 dark:from-slate-900 dark:to-indigo-950/30",
    border: "border-gray-100 dark:border-slate-800",
    hoverBorder: "hover:border-indigo-200 dark:hover:border-indigo-800",
    accent: "text-indigo-800 dark:text-indigo-300",
    accentBorder: "border-indigo-500",
  },
  {
    bgGradient: "bg-gradient-to-br from-white to-teal-50/50 dark:from-slate-900 dark:to-teal-950/30",
    border: "border-gray-100 dark:border-slate-800",
    hoverBorder: "hover:border-teal-200 dark:hover:border-teal-800",
    accent: "text-teal-800 dark:text-teal-300",
    accentBorder: "border-teal-500",
  },
  {
    bgGradient: "bg-gradient-to-br from-white to-sky-50/50 dark:from-slate-900 dark:to-sky-950/30",
    border: "border-gray-100 dark:border-slate-800",
    hoverBorder: "hover:border-sky-200 dark:hover:border-sky-800",
    accent: "text-sky-800 dark:text-sky-300",
    accentBorder: "border-sky-500",
  },
];


function splitHtmlIntoBlocks(html: string): string[] {
  if (!html) return [];
  if (typeof document === 'undefined') return [html];
  
  const div = document.createElement('div');
  div.innerHTML = html;
  
  // If the user pasted plain text without any tags, wrap it in a <p> tag so it gets processed
  if (div.children.length === 0 && div.textContent?.trim().length) {
    const p = document.createElement('p');
    p.innerHTML = html;
    div.innerHTML = '';
    div.appendChild(p);
  }
  
  const blocks: string[] = [];
  Array.from(div.children).forEach(child => {
    if (child.tagName === 'P') {
      let parts: string[] = [child.innerHTML];
      
      // 1. Split by <br> tags
      if (child.innerHTML.includes('<br')) {
        parts = child.innerHTML.split(/<br\s*\/?>/i);
      }
      
      // 2. Further split very long text chunks by sentences (period, question mark, exclamation mark followed by space)
      const finalParts: string[] = [];
      parts.forEach(part => {
        if (part.length > 300 && !part.includes('<img') && !part.includes('<table')) {
          // Attempt to split by Arabic or English sentence endings, preserving the punctuation
          const sentences = part.split(/(?<=[.؟!؟])\s+(?=[^<]*$)/);
          let currentChunk = "";
          sentences.forEach(sentence => {
            if (currentChunk.length + sentence.length > 300) {
              if (currentChunk) finalParts.push(currentChunk.trim());
              currentChunk = sentence;
            } else {
              currentChunk += (currentChunk ? " " : "") + sentence;
            }
          });
          if (currentChunk) finalParts.push(currentChunk.trim());
        } else {
          finalParts.push(part.trim());
        }
      });
      
      finalParts.forEach(part => {
        if (part) {
          const newP = document.createElement('p');
          newP.innerHTML = part;
          Array.from(child.attributes).forEach(attr => {
            newP.setAttribute(attr.name, attr.value);
          });
          blocks.push(newP.outerHTML);
        }
      });
    } else if (child.tagName === 'UL' || child.tagName === 'OL') {
        // Split lists if they have many items
        const listItems = Array.from(child.children);
        if (listItems.length > 3) {
            let currentList = document.createElement(child.tagName);
            Array.from(child.attributes).forEach(attr => currentList.setAttribute(attr.name, attr.value));
            
            listItems.forEach((li, idx) => {
                currentList.appendChild(li.cloneNode(true));
                if (currentList.children.length >= 3 || idx === listItems.length - 1) {
                    blocks.push(currentList.outerHTML);
                    currentList = document.createElement(child.tagName);
                    Array.from(child.attributes).forEach(attr => currentList.setAttribute(attr.name, attr.value));
                }
            });
        } else {
            blocks.push(child.outerHTML);
        }
    } else {
      blocks.push(child.outerHTML);
    }
  });
  
  return blocks.length > 0 ? blocks : [html];
}

export const PreviewPanel = ({
  returnLabel,
  isPrintModalOpen: propIsPrintModalOpen,
  setIsPrintModalOpen: propSetIsPrintModalOpen,
  activeTemplate,
  subjectName,
  unitTitle,
  lesson,
  paragraphs,
  onUpdateParagraphs,
  attachedQuestions,
  zoomLevel,
  setZoomLevel,
  isFullscreen,
  setIsFullscreen,
  isNavCollapsed = false,
  onCollapse,
  groupingEnabled: propGroupingEnabled,
  onGroupingEnabledChange,
  groupingColumns: propGroupingColumns,
  onGroupingColumnsChange,
  groupingNumberingStyle: propGroupingNumberingStyle,
  onGroupingNumberingStyleChange,
  groupingDensity: propGroupingDensity,
  onGroupingDensityChange,
  onTemplateChange,
}: {
  returnLabel?: string;
  isPrintModalOpen?: boolean;
  setIsPrintModalOpen?: (open: boolean) => void;
  activeTemplate: PrintTemplate;
  subjectName: string;
  unitTitle: string;
  lesson: any;
  paragraphs: any[];
  onUpdateParagraphs?: (paragraphs: any[]) => void;
  attachedQuestions: any[];
  zoomLevel: number;
  setZoomLevel: (z: number) => void;
  isFullscreen: boolean;
  setIsFullscreen: (b: boolean) => void;
  isNavCollapsed?: boolean;
  onCollapse?: () => void;
  groupingEnabled?: boolean;
  onGroupingEnabledChange?: (enabled: boolean) => void;
  groupingColumns?: GridColumnsOption;
  onGroupingColumnsChange?: (columns: GridColumnsOption) => void;
  groupingNumberingStyle?: SubItemNumberingStyle;
  onGroupingNumberingStyleChange?: (style: SubItemNumberingStyle) => void;
  groupingDensity?: GroupingDensity;
  onGroupingDensityChange?: (density: GroupingDensity) => void;
  onTemplateChange?: (newTemplate: PrintTemplate) => void;
}) => {
  const [internalIsPrintModalOpen, setInternalIsPrintModalOpen] = useState(false);
  const isPrintModalOpen = propIsPrintModalOpen ?? internalIsPrintModalOpen;
  const setIsPrintModalOpen = propSetIsPrintModalOpen ?? setInternalIsPrintModalOpen;

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState<'single' | 'double'>('single');

  useEffect(() => {
    if (isFullscreen) return;
    let targetCardId: string | null = null;
    try {
      targetCardId = sessionStorage.getItem("edutech-preview-focus-card");
    } catch {
      return;
    }
    if (!targetCardId) return;

    const frame = requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(
        `[data-preview-card-id="${CSS.escape(targetCardId || "")}"]`,
      );
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      try {
        sessionStorage.removeItem("edutech-preview-focus-card");
      } catch {
        // Preview still works when browser storage is unavailable.
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [isFullscreen, paragraphs]);

  // Grouping Engine configuration states (Controlled with persistent fallback to lesson properties)
  const [internalGroupingEnabled, setInternalGroupingEnabled] = useState<boolean>(() => {
    return lesson?.groupingEnabled !== undefined ? lesson.groupingEnabled : true;
  });
  const groupingEnabled = propGroupingEnabled !== undefined ? propGroupingEnabled : internalGroupingEnabled;
  const setGroupingEnabled = (val: boolean) => {
    setInternalGroupingEnabled(val);
    if (onGroupingEnabledChange) onGroupingEnabledChange(val);
  };

  const [internalGroupingColumns, setInternalGroupingColumns] = useState<GridColumnsOption>(() => {
    return lesson?.groupingColumns || "auto";
  });
  const groupingColumns = propGroupingColumns !== undefined ? propGroupingColumns : internalGroupingColumns;
  const setGroupingColumns = (val: GridColumnsOption) => {
    setInternalGroupingColumns(val);
    if (onGroupingColumnsChange) onGroupingColumnsChange(val);
  };

  const [internalGroupingNumberingStyle, setInternalGroupingNumberingStyle] = useState<SubItemNumberingStyle>(() => {
    return (lesson?.groupingNumberingStyle as SubItemNumberingStyle) || "paren-num";
  });
  const groupingNumberingStyle = propGroupingNumberingStyle !== undefined ? propGroupingNumberingStyle : internalGroupingNumberingStyle;
  const setGroupingNumberingStyle = (val: SubItemNumberingStyle) => {
    setInternalGroupingNumberingStyle(val);
    if (onGroupingNumberingStyleChange) onGroupingNumberingStyleChange(val);
  };

  const [internalGroupingDensity, setInternalGroupingDensity] = useState<GroupingDensity>(() => {
    return lesson?.groupingDensity || "compact";
  });
  const groupingDensity = propGroupingDensity !== undefined ? propGroupingDensity : internalGroupingDensity;
  const setGroupingDensity = (val: GroupingDensity) => {
    setInternalGroupingDensity(val);
    if (onGroupingDensityChange) onGroupingDensityChange(val);
  };

  useEffect(() => {
    if (lesson) {
      if (lesson.groupingEnabled !== undefined) setInternalGroupingEnabled(lesson.groupingEnabled);
      if (lesson.groupingColumns) setInternalGroupingColumns(lesson.groupingColumns);
      if (lesson.groupingNumberingStyle) setInternalGroupingNumberingStyle(lesson.groupingNumberingStyle as SubItemNumberingStyle);
      if (lesson.groupingDensity) setInternalGroupingDensity(lesson.groupingDensity);
    }
  }, [lesson?.id, lesson?.groupingEnabled, lesson?.groupingColumns, lesson?.groupingNumberingStyle, lesson?.groupingDensity]);

  const [isGroupingPopoverOpen, setIsGroupingPopoverOpen] = useState(false);
  const groupingPopoverRef = useRef<HTMLDivElement>(null);

  // Page Layout Optimizer states
  const [isOptimizerPopoverOpen, setIsOptimizerPopoverOpen] = useState(false);
  const optimizerPopoverRef = useRef<HTMLDivElement>(null);

  // Card & Typography Settings states
  const [isTypographyPopoverOpen, setIsTypographyPopoverOpen] = useState(false);
  const typographyPopoverRef = useRef<HTMLDivElement>(null);

  const handleUpdateTemplateTypography = (updates: Partial<NonNullable<PrintTemplate["typography"]>>) => {
    if (!onTemplateChange) return;
    const currentTypo = activeTemplate.typography || {
      fontFamily: "Cairo",
      baseFontSize: 12,
      headingSize: 18,
    };
    const updated: PrintTemplate = {
      ...activeTemplate,
      typography: {
        ...currentTypo,
        ...updates,
      },
    };
    onTemplateChange(updated);
  };

  const layoutReport = useMemo(() => {
    return analyzePageLayout(paragraphs, activeTemplate);
  }, [paragraphs, activeTemplate]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target) return;
      if (
        groupingPopoverRef.current &&
        !groupingPopoverRef.current.contains(target) &&
        !target.closest?.('[data-popover="grouping"]')
      ) {
        setIsGroupingPopoverOpen(false);
      }
      if (
        optimizerPopoverRef.current &&
        !optimizerPopoverRef.current.contains(target) &&
        !target.closest?.('[data-popover="optimizer"]')
      ) {
        setIsOptimizerPopoverOpen(false);
      }
      if (
        typographyPopoverRef.current &&
        !typographyPopoverRef.current.contains(target) &&
        !target.closest?.('[data-popover="typography"]')
      ) {
        setIsTypographyPopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const previewItems = useMemo(() => {
    let cardIndex = 0;
    return paragraphs
    .filter((p) => p.isVisible !== false && !p.hidden)
    .flatMap((p) => {
        if (p.type === "questions") {
          let questionsList: any[] = [];
          if (p.body) {
            try {
              if (p.body.startsWith("{") || p.body.startsWith("[")) {
                const data = JSON.parse(p.body);
                questionsList = Array.isArray(data) ? data : [data];
              } else {
                const parseRes = parseQuestionsFromContent(p.body);
                if (parseRes && parseRes.questions && parseRes.questions.length > 0) {
                  questionsList = parseRes.questions.map((q, idx) => ({
                    id: q.id || `q-${idx}`,
                    text: q.questionText || p.body,
                    score: q.marks || 1,
                    type: q.type,
                    distractors: q.options || [],
                    answer: q.modelAnswer || "",
                    isVisible: (q as any).isVisible !== false
                  }));
                } else {
                  questionsList = [{ id: "q-1", text: p.body, score: 1, isVisible: true }];
                }
              }
            } catch (e) {
              questionsList = [{ id: "q-1", text: p.body, score: 1, isVisible: true }];
            }
          }

          const allBankQuestions = storage.getQuestions();
          const bankMap = new Map(allBankQuestions.map(bq => [bq.id, bq]));

          const normalizedQuestions = questionsList.map((q: any) => {
            const bankQ = q && q.id ? bankMap.get(q.id) : null;
            if (bankQ) {
              return {
                ...bankQ,
                ...q,
                text: bankQ.text || q.text || "",
                answer: bankQ.answer || q.answer || "",
                bookReference: bankQ.bookReference || q.bookReference,
                distractors: (bankQ.distractors && bankQ.distractors.length > 0)
                  ? bankQ.distractors
                  : (q.distractors && q.distractors.length > 0 ? q.distractors : (bankQ as any).options || q.options || []),
                options: (bankQ.distractors && bankQ.distractors.length > 0)
                  ? bankQ.distractors
                  : (q.distractors && q.distractors.length > 0 ? q.distractors : (bankQ as any).options || q.options || []),
                matchingPairs: (bankQ.matchingPairs && bankQ.matchingPairs.length > 0)
                  ? bankQ.matchingPairs
                  : (q.matchingPairs || []),
                sequenceItems: (bankQ.sequenceItems && bankQ.sequenceItems.length > 0)
                  ? bankQ.sequenceItems
                  : (q.sequenceItems || []),
                hideAnswer: q.hideAnswer === true || q.hideAnswer === "true",
                isVisible: q.isVisible !== false && q.isVisible !== "false",
              };
            }
            return {
              ...q,
              hideAnswer: q?.hideAnswer === true || q?.hideAnswer === "true",
              isVisible: q?.isVisible !== false && q?.isVisible !== "false",
            };
          });

          const visibleQuestionsList = normalizedQuestions.filter((q) => q.isVisible !== false && !q.hidden);

          if (visibleQuestionsList.length > 0) {
            const headerItem = {
              id: p.id + "-header",
              content: (
                <h3
                  className={`font-extrabold border-b-[3px] border-blue-200 dark:border-blue-800 pb-1.5 mt-3 mb-2 ${p.style?.color || "text-blue-900 dark:text-blue-300"}`}
                  style={{
                    fontFamily: p.style?.fontFamily || activeTemplate.typography?.fontFamily,
                    fontSize: p.style?.fontSize
                      ? (typeof p.style.fontSize === 'number' ? `${p.style.fontSize}px` : p.style.fontSize)
                      : `${activeTemplate.typography?.headingSize || 18}px`,
                    color: p.style?.color && !p.style.color.startsWith("text-") ? p.style.color : undefined
                  }}
                >
                  {p.title}
                </h3>
              )
            };
                       
            const qItems: any[] = [];

            // Grouping Engine: Analyze prompt texts and group under common stems
            const groupedUnits = analyzeAndGroupQuestions(visibleQuestionsList, {
              enabled: groupingEnabled,
              maxColumns: groupingColumns,
              numberingStyle: groupingNumberingStyle,
              density: groupingDensity,
              stripCommonPrefix: true,
            });

            groupedUnits.forEach((unit, unitIdx) => {
              const currentPalette = PASTEL_CARD_PALETTES[cardIndex % PASTEL_CARD_PALETTES.length];
              cardIndex++;

              if (unit.isGroup) {
                // Grouped Unit: Split large groups (>3 items) into smaller chunks so cards flow naturally across pages without giant blank gaps
                const CHUNK_SIZE = 3;
                const itemsList = unit.items || [];
                const chunks = [];

                if (itemsList.length <= CHUNK_SIZE) {
                  chunks.push({ chunkItems: itemsList, suffix: "" });
                } else {
                  for (let c = 0; c < itemsList.length; c += CHUNK_SIZE) {
                    const chunkItems = itemsList.slice(c, c + CHUNK_SIZE);
                    const suffix = c === 0 ? "" : " (تابع)";
                    chunks.push({ chunkItems, suffix });
                  }
                }

                chunks.forEach((chunk, chunkIdx) => {
                  const chunkPalette = PASTEL_CARD_PALETTES[cardIndex % PASTEL_CARD_PALETTES.length];
                  cardIndex++;

                  const chunkUnit = {
                    ...unit,
                    id: `${unit.id}-c${chunkIdx}`,
                    commonHeader: chunk.suffix ? `${unit.commonHeader}${chunk.suffix}` : unit.commonHeader,
                    items: chunk.chunkItems,
                  };

                  const cardPaddingStyle = activeTemplate.typography?.cardPadding !== undefined
                    ? `${activeTemplate.typography.cardPadding}px`
                    : "10px 16px";
                  const questionSpacingVal = activeTemplate.typography?.questionSpacing !== undefined
                    ? `${activeTemplate.typography.questionSpacing}px`
                    : "12px";
                  const optionSpacingVal = activeTemplate.typography?.questionOptionSpacing !== undefined
                    ? `${activeTemplate.typography.questionOptionSpacing}px`
                    : "8px";

                  qItems.push({
                    id: `${p.id}-grouped-${unit.id}-c${chunkIdx}`,
                    content: (
                      <div
                        className={`rounded-xl border ${chunkPalette.border} ${chunkPalette.bgGradient} shadow-3xs break-inside-avoid print:break-inside-avoid print:bg-transparent print:border-gray-200 print:shadow-none h-auto min-h-0`}
                        style={{ padding: cardPaddingStyle }}
                      >
                        <GroupedQuestionGrid
                          unit={chunkUnit}
                          mainQuestionNumber={unit.groupIndex}
                          numberFormat="dash"
                          numberingStyle={groupingNumberingStyle}
                          columns={groupingColumns}
                          density={groupingDensity}
                          showAnswerKey={p.showAnswerKey === true}
                          activeFontFamily={activeTemplate.typography?.fontFamily || "inherit"}
                          questionSize={`${activeTemplate.typography?.questionFontSize || activeTemplate.typography?.baseFontSize || 11}pt`}
                          optionsSize={`${activeTemplate.typography?.optionsFontSize || 10}pt`}
                          marksSize={`${activeTemplate.typography?.marksFontSize || 10}pt`}
                          spacingPx={questionSpacingVal}
                          optionSpacingPx={optionSpacingVal}
                          mode="exam-print"
                        />
                      </div>
                    ),
                  });
                });
              } else {
                // Single question unit rendered in alternating pastel gradient card
                const q = unit.items[0]?.originalQuestion || visibleQuestionsList[unitIdx];
                if (!q) return;

                const cardLevelShowAnswer = p.showAnswerKey === true;
                const shouldShowAns = cardLevelShowAnswer && (q.hideAnswer !== true && q.hideAnswer !== "true");
                
                const cardPaddingStyle = activeTemplate.typography?.cardPadding !== undefined
                  ? `${activeTemplate.typography.cardPadding}px`
                  : "10px 16px";
                const questionSpacingVal = activeTemplate.typography?.questionSpacing !== undefined
                  ? `${activeTemplate.typography.questionSpacing}px`
                  : "12px";
                const optionSpacingVal = activeTemplate.typography?.questionOptionSpacing !== undefined
                  ? `${activeTemplate.typography.questionOptionSpacing}px`
                  : "8px";

                qItems.push({
                  id: `${p.id}-${q.id || unitIdx}`,
                  content: (
                    <div
                      className={`rounded-xl border ${currentPalette.border} ${currentPalette.bgGradient} shadow-3xs break-inside-avoid print:break-inside-avoid print:bg-transparent print:border-gray-200 print:shadow-none h-auto min-h-0`}
                      style={{ padding: cardPaddingStyle }}
                    >
                      <QuestionRenderer
                        question={q}
                        questionNumber={unit.groupIndex || unitIdx + 1}
                        numberFormat="dash"
                        showAnswerKey={shouldShowAns}
                        suppressAnswerBox={shouldShowAns}
                        activeFontFamily={activeTemplate.typography?.fontFamily || "inherit"}
                        questionSize={`${activeTemplate.typography?.questionFontSize || activeTemplate.typography?.baseFontSize || 11}pt`}
                        optionsSize={`${activeTemplate.typography?.optionsFontSize || 10}pt`}
                        spacingPx={questionSpacingVal}
                        optionSpacingPx={optionSpacingVal}
                        mode="exam-print"
                        style={{ marginTop: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
                      />
                      {shouldShowAns && (
                        <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                          {createAnswerKeyItems(
                            q,
                            `${p.id}-${q.id || unitIdx}`,
                            `${activeTemplate.typography?.optionsFontSize || 10}pt`,
                            activeTemplate.typography?.fontFamily || "inherit"
                          ).map((item) => (
                            <div key={item.id}>{item.content}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                });
              }
            });

            return [headerItem, ...qItems];
          }
          return [];
        }
      
      const currentPalette = PASTEL_CARD_PALETTES[cardIndex % PASTEL_CARD_PALETTES.length];
      cardIndex++;

      if (p.type === "notes" && p.body && p.body.startsWith("{")) {
        try {
          const data = JSON.parse(p.body);
          const noteGradients: any = {
            info: "bg-blue-50/30 dark:bg-blue-950/20 border-blue-200/70 dark:border-blue-900/50 text-blue-900 dark:text-blue-200 border-r-[3.5px] border-r-blue-600",
            warning: "bg-amber-50/30 dark:bg-amber-950/20 border-amber-200/70 dark:border-amber-900/50 text-amber-900 dark:text-amber-200 border-r-[3.5px] border-r-amber-500",
            tip: "bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-200/70 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-200 border-r-[3.5px] border-r-emerald-600",
            quote: "bg-slate-50/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 italic border-r-[3.5px] border-r-slate-400",
          };
          const colorClass = p.customColor || (noteGradients[data.type] || "bg-amber-50/30 dark:bg-amber-950/25 border border-amber-200/70 dark:border-amber-900/50 border-r-[3.5px] border-r-amber-500");
          const cardDisplayMode = activeTemplate.typography?.cardDisplayMode || "normal";
          const defaultCardPadding = cardDisplayMode === "compact" ? "5px 8px" : "8px 12px";
          const cardPaddingStyle = activeTemplate.typography?.cardPadding !== undefined
            ? `${activeTemplate.typography.cardPadding}px`
            : defaultCardPadding;
          const noteHtml = (data.text || "").replace(/(<p><br><\/p>\s*)+$/g, "").replace(/(<br\s*\/?>\s*)+$/g, "");
          
          return [{
            id: p.id,
            forceBreakAfter: p.forceBreakAfter,
            forceBreakBefore: p.forceBreakBefore,
            content: (
              <div 
                className={`transition-all rounded-lg border ${colorClass} shadow-3xs break-inside-auto print:orphans-4 print:widows-4 print:bg-transparent print:border-gray-200 print:shadow-none h-auto min-h-0`}
                style={{ 
                  padding: cardPaddingStyle,
                  /* @ts-ignore */
                  "--card-line-spacing": `${p.lineSpacing || 0}px`,
                }}
              >
                <div 
                  className="whitespace-normal text-justify [&>div>*:last-child]:mb-0 [&>*:last-child]:mb-0"
                  style={{
                    /* @ts-ignore */
                    "--card-line-spacing": `${p.lineSpacing || 0}px`,
                  }}
                >
                  <MathText text={noteHtml} />
                </div>
              </div>
            )
          }];
        } catch (e) {}
      }
      
      if (p.type === "page-break") {
        return [{
          id: p.id,
          forceBreakAfter: true,
          content: (
            <div className="my-3 py-2 px-3 border-y-2 border-dashed border-rose-400/80 bg-rose-50/50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 rounded-lg flex items-center justify-between text-xs font-bold print:hidden select-none">
              <span className="flex items-center gap-2">
                <BetweenVerticalEnd className="w-4 h-4 text-rose-600 animate-pulse" />
                <span>✂️ فاصل صفحة يدوياً (Manual Page Break)</span>
              </span>
              <span className="text-[10px] bg-rose-100 dark:bg-rose-900/60 px-2 py-0.5 rounded text-rose-800 dark:text-rose-200">
                A4 Page Break
              </span>
            </div>
          )
        }];
      }

      // Map lesson content card types to their standard textbook layout
      const cardDisplayMode = activeTemplate.typography?.cardDisplayMode || "normal";
      
      const getCardColorClasses = (type: string, customColor?: string) => {
        if (customColor) return customColor;
        if (cardDisplayMode === "textbook") {
          switch (type) {
            case "title": 
            case "explanation": 
            case "images": 
            case "tables": 
              return "bg-transparent border-0 px-0 shadow-none text-slate-900 dark:text-slate-100";
            case "objectives": 
              return "bg-emerald-50/25 dark:bg-emerald-950/20 border-r-[3.5px] border-r-emerald-600 border border-emerald-200/60 dark:border-emerald-900/40 rounded-lg text-slate-900 dark:text-slate-100 shadow-2xs";
            case "concepts": 
              return "bg-blue-50/25 dark:bg-blue-950/20 border-r-[3.5px] border-r-blue-600 border border-blue-200/60 dark:border-blue-900/40 rounded-lg text-slate-900 dark:text-slate-100 shadow-2xs";
            case "math": 
              return "bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100";
            case "activities": 
              return "bg-indigo-50/20 dark:bg-indigo-950/20 border-r-[3.5px] border-r-indigo-600 border border-indigo-200/60 dark:border-indigo-900/40 rounded-lg text-slate-900 dark:text-slate-100 shadow-2xs";
            case "notes": 
              return "bg-amber-50/30 dark:bg-amber-950/25 border-r-[3.5px] border-r-amber-500 border border-amber-200/70 dark:border-amber-900/50 rounded-lg text-slate-900 dark:text-slate-100 shadow-2xs";
            case "examples": 
              return "bg-amber-50/20 dark:bg-amber-950/20 border-r-[3.5px] border-r-amber-600 border border-amber-200/60 dark:border-amber-900/40 rounded-lg text-slate-900 dark:text-slate-100 shadow-2xs";
            default: 
              return "bg-transparent border-0 px-0 shadow-none text-slate-900 dark:text-slate-100";
          }
        }

        if (cardDisplayMode === "compact") {
          switch (type) {
            case "title": 
              return "bg-transparent border-none px-0 shadow-none";
            case "objectives": 
              return "bg-emerald-50/20 dark:bg-emerald-950/15 border-r-[3px] border-r-emerald-600 border border-emerald-200/50 dark:border-emerald-900/30 rounded-md text-slate-900 dark:text-slate-100";
            case "concepts": 
              return "bg-blue-50/20 dark:bg-blue-950/15 border-r-[3px] border-r-blue-600 border border-blue-200/50 dark:border-blue-900/30 rounded-md text-slate-900 dark:text-slate-100";
            case "explanation": 
              return "bg-transparent border-0 px-0 shadow-none text-slate-900 dark:text-slate-100";
            case "images": 
            case "tables": 
              return "bg-transparent border-0 px-0 shadow-none text-slate-900 dark:text-slate-100";
            case "math": 
              return "bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/60 dark:border-slate-800/60 rounded-md text-slate-900 dark:text-slate-100";
            case "activities": 
              return "bg-indigo-50/15 dark:bg-indigo-950/15 border-r-[3px] border-r-indigo-600 border border-indigo-200/50 dark:border-indigo-900/30 rounded-md text-slate-900 dark:text-slate-100";
            case "notes": 
              return "bg-amber-50/25 dark:bg-amber-950/20 border-r-[3px] border-r-amber-500 border border-amber-200/60 dark:border-amber-900/40 rounded-md text-slate-900 dark:text-slate-100";
            case "examples": 
              return "bg-amber-50/15 dark:bg-amber-950/15 border-r-[3px] border-r-amber-600 border border-amber-200/50 dark:border-amber-900/30 rounded-md text-slate-900 dark:text-slate-100";
            default: 
              return "bg-transparent border-none px-0 shadow-none text-slate-900 dark:text-slate-100";
          }
        }

        // Normal mode (default)
        switch (type) {
          case "title": 
            return "bg-transparent border-none px-0 shadow-none";
          case "objectives": 
            return "bg-emerald-50/30 dark:bg-emerald-950/20 border-r-[3.5px] border-r-emerald-600 border border-emerald-200/70 dark:border-emerald-900/40 rounded-lg text-slate-900 dark:text-slate-100 shadow-2xs";
          case "concepts": 
            return "bg-blue-50/30 dark:bg-blue-950/20 border-r-[3.5px] border-r-blue-600 border border-blue-200/70 dark:border-blue-900/40 rounded-lg text-slate-900 dark:text-slate-100 shadow-2xs";
          case "explanation": 
            return "bg-slate-50/20 dark:bg-slate-900/20 border border-slate-200/60 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100";
          case "images": 
            return "bg-transparent border-none px-0 shadow-none text-slate-900 dark:text-slate-100";
          case "tables": 
            return "bg-transparent border-none px-0 shadow-none text-slate-900 dark:text-slate-100";
          case "math": 
            return "bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800/70 rounded-lg text-slate-900 dark:text-slate-100";
          case "activities": 
            return "bg-indigo-50/25 dark:bg-indigo-950/20 border-r-[3.5px] border-r-indigo-600 border border-indigo-200/70 dark:border-indigo-900/40 rounded-lg text-slate-900 dark:text-slate-100 shadow-2xs";
          case "notes": 
            return "bg-amber-50/35 dark:bg-amber-950/25 border-r-[3.5px] border-r-amber-500 border border-amber-200/80 dark:border-amber-900/50 rounded-lg text-slate-900 dark:text-slate-100 shadow-2xs";
          case "examples": 
            return "bg-amber-50/25 dark:bg-amber-950/20 border-r-[3.5px] border-r-amber-600 border border-amber-200/70 dark:border-amber-900/40 rounded-lg text-slate-900 dark:text-slate-100 shadow-2xs";
          default: 
            return "bg-transparent border-none px-0 shadow-none text-slate-900 dark:text-slate-100";
        }
      };

      const cardColorClass = getCardColorClasses(p.type, p.customColor);
      const isUnframed = (cardDisplayMode === "textbook" && (p.type === "title" || p.type === "explanation" || p.type === "tables" || p.type === "images")) ||
        (cardDisplayMode !== "textbook" && (p.type === "title" || p.type === "tables" || p.type === "images"));
      const isLargeText = p.type === "explanation" || p.type === "tables" || p.type === "examples" || p.type === "concepts" || p.type === "math";
      const defaultCardPadding = cardDisplayMode === "compact"
        ? "5px 8px"
        : cardDisplayMode === "textbook"
          ? "8px 12px"
          : "10px 14px";
      const cardPaddingStyle = isUnframed 
        ? "2px 0px"
        : (activeTemplate.typography?.cardPadding !== undefined
            ? `${activeTemplate.typography.cardPadding}px`
            : defaultCardPadding);

      const cleanBody = (p.body || "").replace(/(<p><br><\/p>\s*)+$/g, "").replace(/(<br\s*\/?>\s*)+$/g, "");

      const getCardBadge = (type: string, title?: string) => {
        if (!title && !type) return null;
        switch (type) {
          case "objectives":
            return (
              <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300 text-xs mb-1.5 pb-1 border-b border-emerald-200/50 dark:border-emerald-900/30">
                <Target className="w-3.5 h-3.5 text-emerald-600" />
                <span>{title || "الأهداف ومخرجات التعلم"}</span>
              </div>
            );
          case "concepts":
            return (
              <div className="flex items-center gap-1.5 font-bold text-blue-900 dark:text-blue-300 text-xs mb-1.5 pb-1 border-b border-blue-200/50 dark:border-blue-900/30">
                <Bookmark className="w-3.5 h-3.5 text-blue-600" />
                <span>{title || "مفهوم رئيسي / تعريف"}</span>
              </div>
            );
          case "examples":
            return (
              <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-300 text-xs mb-1.5 pb-1 border-b border-amber-200/50 dark:border-amber-900/30">
                <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                <span>{title || "مثال تطبيقي محلول"}</span>
              </div>
            );
          case "notes":
            return (
              <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-300 text-xs mb-1.5 pb-1 border-b border-amber-200/50 dark:border-amber-900/30">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>{title || "إضاءة / ملاحظة هامة"}</span>
              </div>
            );
          case "activities":
            return (
              <div className="flex items-center gap-1.5 font-bold text-indigo-900 dark:text-indigo-300 text-xs mb-1.5 pb-1 border-b border-indigo-200/50 dark:border-indigo-900/30">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>{title || "نشاط تدريبي / تطبيق"}</span>
              </div>
            );
          default:
            return null;
        }
      };

      const hasCustomBadge = ["objectives", "concepts", "examples", "notes", "activities"].includes(p.type);

      return [{
        id: p.id,
        forceBreakAfter: p.forceBreakAfter,
        forceBreakBefore: p.forceBreakBefore,
        content: (
          <section
            data-preview-card-id={p.id}
            className={`transition-all ${isLargeText ? "break-inside-auto print:orphans-4 print:widows-4" : "break-inside-avoid"} ${cardColorClass} ${isUnframed ? "" : "print:bg-transparent print:border-gray-200 print:shadow-none h-auto min-h-0"} my-1.5`}
            style={{
              padding: cardPaddingStyle,
              /* @ts-ignore */
              "--card-line-spacing": `${p.lineSpacing || 0}px`,
            }}
          >
            {p.forceBreakAfter && (
              <div className="print:hidden text-[10px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 px-2 py-0.5 rounded inline-flex items-center gap-1 font-bold mb-2">
                <BetweenVerticalEnd className="w-3 h-3" />
                <span>فاصل صفحة مجبر بعدها</span>
              </div>
            )}

            {hasCustomBadge && getCardBadge(p.type, p.title)}

            {p.title && p.type === "title" && (
              <div className="border-b-2 border-slate-900 dark:border-slate-100 pb-2 mb-3 text-center sm:text-right">
                <h2
                  className="font-black tracking-tight text-slate-900 dark:text-slate-100"
                  style={{
                    fontFamily: p.style?.fontFamily || activeTemplate.typography?.fontFamily,
                    fontSize: p.style?.fontSize
                      ? (typeof p.style.fontSize === 'number' ? `${p.style.fontSize}px` : p.style.fontSize)
                      : `${activeTemplate.typography?.headingSize || 18}px`,
                    color: p.style?.color && !p.style.color.startsWith("text-") ? p.style.color : undefined
                  }}
                >
                  {p.title}
                </h2>
              </div>
            )}
            {p.title && p.type === "explanation" && (
              <h3
                className="font-extrabold text-slate-900 dark:text-slate-100 pb-1 mb-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 text-sm"
                style={{
                  fontFamily: p.style?.fontFamily || activeTemplate.typography?.fontFamily,
                  fontSize: p.style?.fontSize
                    ? (typeof p.style.fontSize === 'number' ? `${p.style.fontSize}px` : p.style.fontSize)
                    : `${(activeTemplate.typography?.headingSize || 16) - 1}px`,
                  color: p.style?.color && !p.style.color.startsWith("text-") ? p.style.color : undefined
                }}
              >
                <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
                <span>{p.title}</span>
              </h3>
            )}
            {p.title && !hasCustomBadge && p.type !== "title" && p.type !== "explanation" && (
              <h3
                className="font-bold mb-1.5 flex items-center gap-2 text-slate-900 dark:text-slate-100"
                style={{
                  fontFamily: p.style?.fontFamily || activeTemplate.typography?.fontFamily,
                  fontSize: p.style?.fontSize
                    ? (typeof p.style.fontSize === 'number' ? `${p.style.fontSize}px` : p.style.fontSize)
                    : `${(activeTemplate.typography?.headingSize || 16) - 2}px`,
                  color: p.style?.color && !p.style.color.startsWith("text-") ? p.style.color : undefined
                }}
              >
                <span>{p.title}</span>
              </h3>
            )}
            <div 
              className="text-slate-900 dark:text-slate-100 whitespace-normal text-justify leading-relaxed [&>div>*:last-child]:mb-0 [&>*:last-child]:mb-0"
              style={{
                /* @ts-ignore */
                "--card-line-spacing": `${p.lineSpacing || 0}px`,
              }}
            >
              <MathText text={cleanBody} />
            </div>
          </section>
        )
      }];
    });
  }, [paragraphs, activeTemplate, groupingEnabled, groupingColumns, groupingNumberingStyle, groupingDensity]);

  const previewTemplate = useMemo(() => ({
    ...activeTemplate,
    headerContent: {
      ...activeTemplate?.headerContent,
      rightText: activeTemplate?.headerContent?.rightText || subjectName || "",
      centerText: activeTemplate?.headerContent?.centerText || unitTitle || "",
      leftText: activeTemplate?.headerContent?.leftText || lesson?.title || "",
      subjectName: subjectName || "اسم المادة",
    },
  }), [activeTemplate, subjectName, unitTitle, lesson?.title]);


  const previewSettings = <>          {/* Grouping Engine Quick Control in Preview Panel */}
          <div className="relative shrink-0 z-50" ref={groupingPopoverRef} data-popover="grouping">
            <button
              onClick={() => setIsGroupingPopoverOpen(!isGroupingPopoverOpen)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition border cursor-pointer ${
                groupingEnabled
                  ? "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 shadow-2xs"
                  : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
              }`}
              title="محرك تجميع الأسئلة الذكي تحت جذر موحد وشبكة مرقمة"
            >
              <Layers className={`w-3.5 h-3.5 ${groupingEnabled ? "text-blue-600 dark:text-blue-400" : "text-slate-400"}`} />
              <span className="hidden md:inline">تجميع الأسئلة</span>
              {groupingEnabled && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              )}
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {isGroupingPopoverOpen && (
              <div
                className="absolute right-0 top-full mt-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-3.5 z-[100] w-76 text-right animate-in fade-in zoom-in-95 duration-150 space-y-3.5 ring-1 ring-black/10 select-none"
                onClick={(e) => e.stopPropagation()}
                data-popover="grouping-content"
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                  <div className="flex items-center gap-1.5 font-extrabold text-xs text-slate-800 dark:text-slate-100">
                    <LayoutGrid className="w-4 h-4 text-blue-600" />
                    <span>محرك تجميع الأسئلة (Grouping Engine)</span>
                  </div>
                </div>

                {/* Toggle Enable */}
                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">تفعيل التجميع الذكي</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">شبكة مدمجة لمنع الفراغات</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setGroupingEnabled(!groupingEnabled);
                    }}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                      groupingEnabled ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-600"
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        groupingEnabled ? "-translate-x-4" : "-translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {groupingEnabled && (
                  <>
                    {/* Columns Selector */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                        أعمدة شبكة التمارين (Grid Columns):
                      </label>
                      <div className="grid grid-cols-4 gap-1">
                        {(["auto", 2, 3, 4] as const).map((col) => (
                          <button
                            key={col}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setGroupingColumns(col);
                            }}
                            className={`py-1 text-[11px] font-bold rounded border transition-colors cursor-pointer ${
                              groupingColumns === col
                                ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                                : "bg-slate-50 dark:bg-slate-750 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                            }`}
                          >
                            {col === "auto" ? "تلقائي" : `${col} أعمدة`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Numbering Style */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                        نمط ترقيم التمارين التابعة:
                      </label>
                      <div className="grid grid-cols-3 gap-1">
                        {[
                          { id: "paren-num", label: "(1), (2)..." },
                          { id: "paren-alpha", label: "(أ), (ب)..." },
                          { id: "dash", label: "1-, 2-..." },
                        ].map((st) => (
                          <button
                            key={st.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setGroupingNumberingStyle(st.id as SubItemNumberingStyle);
                            }}
                            className={`py-1 text-[11px] font-bold rounded border transition-colors cursor-pointer ${
                              groupingNumberingStyle === st.id
                                ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                                : "bg-slate-50 dark:bg-slate-750 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                            }`}
                          >
                            {st.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Density */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                        كثافة التنسيق (Space Savings):
                      </label>
                      <div className="grid grid-cols-2 gap-1">
                        {[
                          { id: "compact", label: "مدمج (Compact)" },
                          { id: "ultra-compact", label: "فائق الدمج" },
                        ].map((den) => (
                          <button
                            key={den.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setGroupingDensity(den.id as GroupingDensity);
                            }}
                            className={`py-1 text-[10px] font-bold rounded border transition-colors cursor-pointer ${
                              groupingDensity === den.id
                                ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                                : "bg-slate-50 dark:bg-slate-750 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                            }`}
                          >
                            {den.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Page Layout Optimizer Popover */}
          <div className="relative shrink-0 z-50" ref={optimizerPopoverRef} data-popover="optimizer">
            <button
              onClick={() => setIsOptimizerPopoverOpen(!isOptimizerPopoverOpen)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition border cursor-pointer ${
                layoutReport.hasLargeGaps
                  ? "bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700 shadow-2xs"
                  : "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 shadow-2xs"
              }`}
              title="محسن توزيع البطاقات على صفحات A4 لمنع الفراغات وتوزيع المحتوى ذكياً"
            >
              <BetweenVerticalEnd className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="hidden md:inline">تخطيط الصفحات</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-extrabold ${
                layoutReport.efficiencyScorePercentage >= 80
                  ? "bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100"
                  : "bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100"
              }`}>
                {layoutReport.efficiencyScorePercentage}% كفاءة
              </span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {isOptimizerPopoverOpen && (
              <div
                className="absolute right-0 top-full mt-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-4 z-[100] w-80 text-right animate-in fade-in zoom-in-95 duration-150 space-y-3.5 ring-1 ring-black/10 select-none"
                onClick={(e) => e.stopPropagation()}
                data-popover="optimizer-content"
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2.5">
                  <div className="flex items-center gap-2 font-black text-xs text-slate-800 dark:text-slate-100">
                    <Wand2 className="w-4 h-4 text-blue-600" />
                    <span>محسن تخطيط وتقسيم الصفحات (Page Layout Optimizer)</span>
                  </div>
                </div>

                {/* Report Overview */}
                <div className="bg-slate-50 dark:bg-slate-900/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-600 dark:text-slate-300">إجمالي صفحات A4 المقدرة:</span>
                    <span className="font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-lg border border-blue-200 dark:border-blue-900/50">
                      {layoutReport.totalPages} صفحات
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-600 dark:text-slate-300">معدل الفراغ المستغل:</span>
                    <span className="font-extrabold text-emerald-700 dark:text-emerald-400">
                      {layoutReport.efficiencyScorePercentage}% كفاءة التوزيع
                    </span>
                  </div>

                  {/* Page-by-page progress bars */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-500 block mb-1">نسبة امتلاء كل صفحة:</span>
                    {layoutReport.pageDistribution.map((p) => {
                      const fillPercentage = 100 - p.whiteSpacePercentage;
                      return (
                        <div key={p.pageNumber} className="space-y-0.5">
                          <div className="flex justify-between text-[10px] font-bold text-slate-600 dark:text-slate-400">
                            <span>صفحة {p.pageNumber} ({p.cards.length} بطاقة)</span>
                            <span>{fillPercentage}% ممتلئة ({p.whiteSpacePercentage}% فارغ)</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden flex">
                            <div
                              className={`h-full transition-all duration-300 ${
                                fillPercentage > 85
                                  ? "bg-emerald-500"
                                  : fillPercentage > 60
                                  ? "bg-blue-500"
                                  : "bg-amber-500"
                              }`}
                              style={{ width: `${fillPercentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Recommendations */}
                <div className="p-2.5 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 dark:text-blue-300">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>توصية المحسن الذكي:</span>
                  </div>
                  <p className="text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed font-medium">
                    {layoutReport.recommendations[0] || "توزيع ممتاز لبطاقات الدرس."}
                  </p>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (!onUpdateParagraphs) return;
                      const { optimizedCards, breaksAddedCount, breaksRemovedCount } = optimizeCardPageBreaks(paragraphs, activeTemplate);
                      onUpdateParagraphs(optimizedCards);
                      setIsOptimizerPopoverOpen(false);
                      const msg = `✨ تم تطبيق تحسين فواصل الصفحات! تم إضافة (${breaksAddedCount}) فاصل، وتعديل (${breaksRemovedCount}) فاصل بنجاح.`;
                      if (typeof (window as any).safeAlert === "function") {
                        (window as any).safeAlert(msg);
                      }
                    }}
                    disabled={!onUpdateParagraphs}
                    className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Wand2 className="w-4 h-4" />
                    <span>تطبيق تحسين وتقسيم الفواصل تلقائياً</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!onUpdateParagraphs) return;
                      const cleaned = paragraphs.map((c: any) => ({
                        ...c,
                        forceBreakAfter: false,
                      }));
                      onUpdateParagraphs(cleaned);
                      setIsOptimizerPopoverOpen(false);
                      const msg = "🔄 تم مسح وإعادة ضبط جميع فواصل الصفحات التلقائية بنجاح.";
                      if (typeof (window as any).safeAlert === "function") {
                        (window as any).safeAlert(msg);
                      }
                    }}
                    disabled={!onUpdateParagraphs}
                    className="w-full py-1.5 px-3 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-bold text-xs rounded-xl border border-amber-200 dark:border-amber-800/80 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                    <span>مسح وإعادة ضبط جميع فواصل الصفحات</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!onUpdateParagraphs) return;
                      const newPageBreak = {
                        id: "p-break-" + Date.now(),
                        title: "✂️ فاصل صفحة يدوياً",
                        body: "",
                        type: "page-break",
                        forceBreakAfter: true,
                      };
                      onUpdateParagraphs([...paragraphs, newPageBreak]);
                      setIsOptimizerPopoverOpen(false);
                      const msg = "✂️ تم إدراج فاصل صفحة يدوياً في نهاية المستند.";
                      if (typeof (window as any).safeAlert === "function") {
                        (window as any).safeAlert(msg);
                      }
                    }}
                    disabled={!onUpdateParagraphs}
                    className="w-full py-1.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Scissors className="w-3.5 h-3.5 text-rose-600" />
                    <span>إضافة فاصل صفحة يدوياً في نهاية الدرس</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Card & Typography Popover */}
          <div className="relative shrink-0 z-50" ref={typographyPopoverRef} data-popover="typography">
            <button
              onClick={() => setIsTypographyPopoverOpen(!isTypographyPopoverOpen)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition border cursor-pointer ${
                isTypographyPopoverOpen
                  ? "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 shadow-2xs"
                  : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
              }`}
              title="تنسيق نمط البطاقات وتباعد الأسطر وحجم الخط"
            >
              <Sliders className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="hidden md:inline">تنسيق البطاقات والخط</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {isTypographyPopoverOpen && (
              <div
                className="absolute right-0 top-full mt-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-4 z-[100] w-84 text-right animate-in fade-in zoom-in-95 duration-150 space-y-4 ring-1 ring-black/10 select-none max-h-[85vh] overflow-y-auto custom-scrollbar"
                onClick={(e) => e.stopPropagation()}
                data-popover="typography-content"
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2.5">
                  <div className="flex items-center gap-2 font-black text-xs text-slate-800 dark:text-slate-100">
                    <Sliders className="w-4 h-4 text-blue-600" />
                    <span>تنسيق البطاقات والخطوط (Card & Typography)</span>
                  </div>
                </div>

                {/* 1. Card Display Mode */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-200 block">
                    نمط عرض البطاقات داخل الدرس:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: "normal", label: "عادي", desc: "مؤطر خفيف وأنيق" },
                      { id: "compact", label: "مضغوط", desc: "مدمج لتوفير الصفحات" },
                      { id: "textbook", label: "كتابي", desc: "كتاب وزاري رصين" },
                    ].map((mode) => {
                      const isSelected = (activeTemplate.typography?.cardDisplayMode || "normal") === mode.id;
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => handleUpdateTemplateTypography({ cardDisplayMode: mode.id as any })}
                          className={`p-2 rounded-lg border text-right transition cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                              : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <span className="font-extrabold text-xs block">{mode.label}</span>
                          <span className={`text-[9px] mt-0.5 ${isSelected ? "text-blue-100" : "text-slate-400"}`}>
                            {mode.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Line Spacing / Line Height */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-200">تباعد الأسطر (Line Spacing):</span>
                    <span className="font-mono font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded">
                      {activeTemplate.typography?.lineHeight || (activeTemplate.typography?.lineSpacing ? (activeTemplate.typography.lineSpacing / 10 + 1.2).toFixed(1) : 1.6)}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { val: 1.3, label: "1.3 (مضغوط)" },
                      { val: 1.5, label: "1.5 (متوازن)" },
                      { val: 1.7, label: "1.7 (كتابي)" },
                      { val: 1.9, label: "1.9 (واسع)" },
                    ].map((lh) => {
                      const cur = Number(activeTemplate.typography?.lineHeight || (activeTemplate.typography?.lineSpacing ? (activeTemplate.typography.lineSpacing / 10 + 1.2).toFixed(1) : 1.6));
                      const isSel = Math.abs(cur - lh.val) < 0.05;
                      return (
                        <button
                          key={lh.val}
                          type="button"
                          onClick={() => handleUpdateTemplateTypography({ lineHeight: lh.val, lineSpacing: Math.round((lh.val - 1.2) * 10) })}
                          className={`py-1 text-[10px] font-bold rounded border transition cursor-pointer ${
                            isSel
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {lh.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Card Padding (تباعد العناصر داخل البطاقة) */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-200">الهوامش داخل البطاقة (Card Padding):</span>
                    <span className="font-mono font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded">
                      {activeTemplate.typography?.cardPadding !== undefined ? activeTemplate.typography.cardPadding : 10}px
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {[4, 8, 12, 16].map((pad) => {
                      const isSel = (activeTemplate.typography?.cardPadding ?? 10) === pad;
                      return (
                        <button
                          key={pad}
                          type="button"
                          onClick={() => handleUpdateTemplateTypography({ cardPadding: pad })}
                          className={`py-1 text-[10px] font-bold rounded border transition cursor-pointer ${
                            isSel
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {pad}px
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Card Spacing (المسافة بين البطاقات) */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-200">المسافة بين البطاقات (Card Spacing):</span>
                    <span className="font-mono font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded">
                      {activeTemplate.typography?.cardSpacing !== undefined ? activeTemplate.typography.cardSpacing : (activeTemplate.typography?.questionSpacing ?? 14)}px
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {[4, 8, 12, 16, 20].map((sp) => {
                      const curSp = activeTemplate.typography?.cardSpacing !== undefined ? activeTemplate.typography.cardSpacing : (activeTemplate.typography?.questionSpacing ?? 14);
                      const isSel = curSp === sp;
                      return (
                        <button
                          key={sp}
                          type="button"
                          onClick={() => handleUpdateTemplateTypography({ cardSpacing: sp, questionSpacing: sp })}
                          className={`py-1 text-[10px] font-bold rounded border transition cursor-pointer ${
                            isSel
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {sp}px
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 5. Font Sizes */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-200">حجم خط المتن (Base Font):</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleUpdateTemplateTypography({ baseFontSize: Math.max(9, (activeTemplate.typography?.baseFontSize || 12) - 1) })}
                        className="w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-xs cursor-pointer"
                      >
                        -
                      </button>
                      <span className="font-mono font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded text-[11px]">
                        {activeTemplate.typography?.baseFontSize || 12}pt
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateTemplateTypography({ baseFontSize: Math.min(20, (activeTemplate.typography?.baseFontSize || 12) + 1) })}
                        className="w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-xs cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {[10, 11, 12, 13, 14].map((sz) => {
                      const isSel = (activeTemplate.typography?.baseFontSize || 12) === sz;
                      return (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => handleUpdateTemplateTypography({ baseFontSize: sz })}
                          className={`py-1 text-[10px] font-bold rounded border transition cursor-pointer ${
                            isSel
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {sz}pt
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div></>;
  if (isFullscreen) return (
    <PrintPreviewModal isOpen onClose={() => { setIsFullscreen(false); setIsPrintModalOpen(false); }}
      title={lesson?.title} lessonWorkspace={{ returnLabel, path: [subjectName, unitTitle].filter(Boolean).join(' / '),
        outline: paragraphs.filter(p => p.isVisible !== false && !p.hidden).map(p => ({id: p.id, title: p.title || 'بطاقة الدرس'})) }}
      initialOrientation={previewTemplate.orientation === 'landscape' ? 'landscape' : 'portrait'}
      extraToolbarContent={previewSettings}>
      <PaginatedA4Preview template={previewTemplate} title={lesson?.title}
        subtitle={`الأهداف التعليمية: ${lesson?.objectives?.join(" • ") || "مخرجات المنهاج المعتمدة"}`}
        hierarchyText={`${unitTitle || "الوحدة"}\n${lesson?.title || "الدرس"} | ${lesson?.durationMinutes ? lesson.durationMinutes + " دقيقة" : "45 دقيقة"}`}
        items={previewItems} />
    </PrintPreviewModal>
  );

  return (
    <div
      className={`transition-all h-full ${isFullscreen ? "fixed inset-0 z-50 bg-slate-900/95 flex flex-col items-center justify-start overflow-hidden p-0 sm:p-3 backdrop-blur-sm" : "w-full flex flex-col bg-slate-100 dark:bg-slate-950/50 relative overflow-hidden border-r border-slate-200 dark:border-slate-800"}`}
    >
      <div
        className={`relative z-40 px-3 py-2 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900 flex items-center justify-between gap-2 shadow-xs ${isFullscreen ? "w-full max-w-[210mm] mx-auto rounded-none sm:rounded-t-xl sm:mt-2" : ""}`}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shrink-0 hover:bg-slate-100 dark:hover:bg-slate-800 px-2 py-1 rounded-lg transition cursor-pointer"
            title="فتح نافذة معاينة الطباعة الشاملة"
          >
            <Printer className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">معاينة وطباعة</span>
          </button>

{previewSettings}
        </div>

        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs overflow-x-auto">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - (viewMode === 'double' ? 2 : 1)))}
            disabled={currentPage <= 1}
            className="p-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-40"
            title="الصفحة السابقة"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span
            className="text-[10px] font-bold text-slate-600 dark:text-slate-300 min-w-[2.5rem] text-center"
            dir="ltr"
          >
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            className="p-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-40"
            title="الصفحة التالية"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5"></div>
          <button
            onClick={() => setZoomLevel(Math.max(40, zoomLevel - 10))}
            className="p-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="تصغير"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 w-9 text-center cursor-pointer hover:text-slate-800 dark:hover:text-slate-100" onClick={() => setZoomLevel(100)} title="إعادة التكبير 100%">
            {Math.round(zoomLevel)}%
          </span>
          <button
            onClick={() => setZoomLevel(Math.min(200, zoomLevel + 10))}
            className="p-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="تكبير"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5"></div>
          <button
            onClick={() => setZoomLevel(1.0)}
            className="px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
            title="إعادة ضبط الحجم (100%)"
          >
            ↔ 100%
          </button>
          <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5"></div>
          <button
            onClick={() => setViewMode(viewMode === 'single' ? 'double' : 'single')}
            className={`p-1 rounded transition ${viewMode === 'double' ? "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
            title="عرض صفحتين"
          >
            <Columns className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5"></div>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={`p-1 rounded transition ${isFullscreen ? "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
            title={isFullscreen ? "تصغير الشاشة" : "ملء الشاشة"}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {!isFullscreen && onCollapse && (
          <button
            onClick={onCollapse}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors shrink-0 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            title="طي لوحة المعاينة"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className={`flex-1 overflow-auto flex justify-center items-start custom-scrollbar transition-all duration-300 relative z-0 ${
        isNavCollapsed ? "p-2 sm:p-4 bg-slate-200/90 dark:bg-slate-950" : "p-4 bg-slate-200/80 dark:bg-slate-950"
      }`}>
        <div
          className="transition-all duration-300 ease-out flex flex-col items-center"
          style={{
            zoom: zoomLevel / 100,
            width: "100%",
            maxWidth: activeTemplate.orientation === "landscape" ? "297mm" : "210mm",
          }}
        >
          {/* Live Preview */}
          <PaginatedA4Preview
            currentPageIndex={currentPage - 1}
            viewMode={viewMode}
            onPagesChange={(count) => {
              setTotalPages(count);
              if (currentPage > count) setCurrentPage(count || 1);
            }}
            template={previewTemplate}
            title={lesson?.title}
            subtitle={`الأهداف التعليمية: ${lesson?.objectives?.join(" • ") || "مخرجات المنهاج المعتمدة"}`}
            hierarchyText={`${unitTitle || "الوحدة"}\n${lesson?.title || "الدرس"} | ${lesson?.durationMinutes ? lesson.durationMinutes + " دقيقة" : "45 دقيقة"}`}
            items={previewItems}
          />
        </div>
      </div>
      
      {/* Print Modal */}
      {isPrintModalOpen && setIsPrintModalOpen && (
        <PrintPreviewModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          title={`${subjectName || "المادة"} - ${unitTitle || "الوحدة"} - ${lesson?.title || "الدرس"}`}
          groupingEnabled={groupingEnabled}
          onGroupingEnabledChange={setGroupingEnabled}
          groupingColumns={groupingColumns}
          onGroupingColumnsChange={setGroupingColumns}
          groupingNumberingStyle={groupingNumberingStyle}
          onGroupingNumberingStyleChange={setGroupingNumberingStyle}
          groupingDensity={groupingDensity}
          onGroupingDensityChange={setGroupingDensity}
        >
          <PaginatedA4Preview
            template={previewTemplate}
            title={lesson?.title}
            subtitle={`الأهداف التعليمية: ${lesson?.objectives?.join(" • ") || "مخرجات المنهاج المعتمدة"}`}
            hierarchyText={`${unitTitle || "الوحدة"}\n${lesson?.title || "الدرس"} | ${lesson?.durationMinutes ? lesson.durationMinutes + " دقيقة" : "45 دقيقة"}`}
            items={previewItems}
          />
        </PrintPreviewModal>
      )}
    </div>
  );
};
