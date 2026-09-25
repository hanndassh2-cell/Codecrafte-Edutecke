import React from "react";
import { getArabicQuestionLabel } from "../services/SharedPrintService";

export type QuestionNumberFormat =
  | "dash"        // "1-"
  | "dot"         // "1."
  | "paren"       // "(1)"
  | "label"       // "السؤال 1:" or "Question 1:"
  | "arabicWord"  // "السؤال الأول:"
  | "custom"      // uses customLabel
  | "none";       // no number

export interface QuestionNumberNodeProps {
  /**
   * Question numeric index or display string (1-based)
   */
  value: number | string;
  /**
   * Format type for number rendering
   */
  format?: QuestionNumberFormat;
  /**
   * Custom prefix / label when format === "custom" or explicit override
   */
  customLabel?: string;
  /**
   * Layout direction ("rtl" or "ltr")
   */
  direction?: "rtl" | "ltr";
  /**
   * Font family styling
   */
  fontFamily?: string;
  /**
   * Font size string (e.g., "11pt", "14px", "0.875rem")
   */
  fontSize?: string;
  /**
   * Optional custom classes
   */
  className?: string;
  /**
   * Optional inline styles
   */
  style?: React.CSSProperties;
}

/**
 * QuestionNumberNode
 * 
 * An independent, first-class Question Number Node connected directly to the Question Block.
 * NOT part of any RichText or HTML List (<ol>, <ul>, <li>).
 * 
 * Key Architectural Rules:
 * - Positioned automatically based on card direction:
 *   - RTL: Positioned at the physical right start of the question text on the exact same line.
 *   - LTR: Positioned at the physical left start of the question text on the exact same line.
 * - Stays snugly aligned to the question text without breaking into a separate line.
 * - Uses standard unicode-bidi isolation and non-breaking formatting.
 */
export const QuestionNumberNode: React.FC<QuestionNumberNodeProps> = ({
  value,
  format = "dash",
  customLabel,
  direction = "rtl",
  fontFamily,
  fontSize,
  className = "",
  style = {},
}) => {
  if (format === "none") return null;

  const isRTL = direction === "rtl";

  let labelText = "";
  if (customLabel) {
    labelText = customLabel;
  } else {
    switch (format) {
      case "dash":
        labelText = `${value}-`;
        break;
      case "dot":
        labelText = `${value}.`;
        break;
      case "paren":
        labelText = `(${value})`;
        break;
      case "label":
        labelText = isRTL ? `السؤال ${value}:` : `Question ${value}:`;
        break;
      case "arabicWord":
        labelText =
          typeof value === "number"
            ? `${getArabicQuestionLabel(value)}:`
            : `${value}:`;
        break;
      case "custom":
        labelText = customLabel || `${value}-`;
        break;
      default:
        labelText = `${value}-`;
        break;
    }
  }

  if (!labelText) return null;

  return (
    <span
      data-node-type="question-number-node"
      className={`question-number-node select-none inline-flex items-baseline font-bold shrink-0 text-slate-900 dark:text-slate-100 ${className}`}
      dir={direction}
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        whiteSpace: "nowrap",
        
        lineHeight: "inherit",
        flexShrink: 0,
        marginInlineEnd: "0.4rem",
        fontFamily: fontFamily || "inherit",
        fontSize: fontSize || "inherit",
        direction,
        ...style,
      }}
    >
      {labelText}
    </span>
  );
};
