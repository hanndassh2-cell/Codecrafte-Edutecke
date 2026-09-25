/**
 * Centralized BiDi & Content Ingestion Pipeline
 * 
 * Single Gateway for direction detection (RTL / LTR / Mixed),
 * Unicode BiDi normalization, list/numbering preservation,
 * equation and table isolation across all ingestion channels:
 * (AI, OCR, Word, Paste, Question Parser, Editor, Previews, Print/PDF).
 */

import { normalizeHtmlLists, parsePlainTextListItem } from "../utils/listEngine";
import { convertMathMLInText, convertWordLinearMathToTeX, isMathEquationLine } from "../components/MathText";

export const BIDI_LRI = "\u2066"; // Left-to-Right Isolate
export const BIDI_RLI = "\u2067"; // Right-to-Left Isolate
export const BIDI_FSI = "\u2068"; // First Strong Isolate
export const BIDI_PDI = "\u2069"; // Pop Directional Isolate
export const LRM = "\u200E"; // Left-to-Right Mark
export const RLM = "\u200F"; // Right-to-Left Mark

export interface ScriptAnalysis {
  primaryDirection: "rtl" | "ltr";
  hasRtl: boolean;
  hasLtr: boolean;
  isMixed: boolean;
  isMath: boolean;
  rtlCharCount: number;
  ltrCharCount: number;
  mathSymbolCount: number;
  firstStrong: "rtl" | "ltr" | "none";
}

export interface PipelineOptions {
  forceDirection?: "rtl" | "ltr" | "auto";
  preserveInlineStyles?: boolean;
  cleanWordJunk?: boolean;
  isolateInlineLtr?: boolean;
  normalizeLists?: boolean;
  convertEquations?: boolean;
  keepColors?: boolean;
  keepFonts?: boolean;
}

// Unicode ranges for Arabic, Hebrew, and RTL scripts
const RTL_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u0590-\u05FF]/;
const RTL_GLOBAL_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u0590-\u05FF]/g;

// Unicode ranges for Latin & European scripts
const LTR_REGEX = /[A-Za-z\u00C0-\u024F\u0370-\u03FF\u0400-\u04FF]/;
const LTR_GLOBAL_REGEX = /[A-Za-z\u00C0-\u024F\u0370-\u03FF\u0400-\u04FF]/g;

// Math symbols & operators
const MATH_REGEX = /[\$\^\\_→⇌➔⟶⇅⁺⁻⁼⁽⁾⁰¹²³⁴⁵⁶⁷⁸⁹₊₋₌₍₎₀₁₂₃₄₅₆₇₈₉\=\+\-\*\/\×\÷\±\≠\<\>\≤\≥]|->|<=>|\\frac|\\sqrt|\\ce|\\mathrm|\\begin/;

/**
 * Decodes escaped HTML entities recursively if the string contains escaped HTML markup (e.g. &lt;p dir=&quot;rtl&quot;&gt;)
 */
export function unescapeHtmlEntities(str: string): string {
  if (!str) return "";
  let res = str;
  let prev = "";
  let iterations = 0;
  while (res !== prev && iterations < 5) {
    prev = res;
    iterations++;
    if (/&[a-zA-Z0-9#x]+;/i.test(res)) {
      res = res
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"')
        .replace(/&(?:apos|#39|#039);/gi, "'")
        .replace(/&(?:nbsp|#160|#xa0);/gi, " ")
        .replace(/&#x2F;|&#47;/gi, "/")
        .replace(/&amp;/gi, "&");
    }
  }
  return res;
}

/**
 * Universal Token & Placeholder Cleaner:
 * Unconditionally strips any internal leaked tokens (e.g. __BIDI_MATH_0__, BIDI_MATH_0, __BIDI_...__)
 * to prevent any internal placeholders from leaking into user UI, previews, print, or database.
 */
export function cleanLeakedTokens(text: string): string {
  if (!text) return "";
  let cleaned = unescapeHtmlEntities(text);

  // 1. Remove leaked BIDI_MATH placeholders (both formatted and unformatted)
  cleaned = cleaned.replace(/[\u2066\u2067\u2068]?(__BIDI_MATH_\d+__|BIDI_MATH_\d+)[\u2069]?/gi, "");

  // 2. Remove any other internal leaked placeholders (e.g. __BIDI_TAG_0__, __LATEX_TOKEN_...__, __PLACEHOLDER_...__)
  cleaned = cleaned.replace(/__BIDI_[A-Za-z0-9_]+__/gi, "");
  cleaned = cleaned.replace(/__LATEX_[A-Za-z0-9_]+__/gi, "");
  cleaned = cleaned.replace(/__MATH_[A-Za-z0-9_]+__/gi, "");
  cleaned = cleaned.replace(/__TOKEN_[A-Za-z0-9_]+__/gi, "");
  cleaned = cleaned.replace(/__RAW_MATH_[A-Za-z0-9_]+__/gi, "");

  // 3. Remove orphaned or empty directional isolate sequences
  cleaned = cleaned.replace(/[\u2066\u2067\u2068\u200E\u200F]\s*[\u2069]/g, " ");

  return cleaned;
}

/**
 * Converts any HTML / Math text to clean plain text for tooltips, titles, labels, or collapsed headers.
 */
export function stripHtml(html: string): string {
  if (!html) return "";
  let clean = cleanLeakedTokens(html);
  // Remove HTML tags
  clean = clean.replace(/<[^>]*>/g, " ");
  // Collapse whitespace
  return clean.replace(/\s+/g, " ").trim();
}

/**
 * Analyzes script composition and returns detailed direction metrics.
 */
export function analyzeContentScript(text: string): ScriptAnalysis {
  if (!text) {
    return {
      primaryDirection: "rtl",
      hasRtl: false,
      hasLtr: false,
      isMixed: false,
      isMath: false,
      rtlCharCount: 0,
      ltrCharCount: 0,
      mathSymbolCount: 0,
      firstStrong: "none",
    };
  }

  const cleaned = cleanLeakedTokens(text);

  // Strip math equations ($...$ and $$...$$) and HTML tags when checking text script
  const plainTextWithoutMath = cleaned
    .replace(/\$\$[\s\S]*?\$\$/g, " ")
    .replace(/\$[^\$]+?\$/g, " ")
    .replace(/<[^>]*>/g, " ");

  const rtlMatches = plainTextWithoutMath.match(RTL_GLOBAL_REGEX) || [];
  const ltrMatches = plainTextWithoutMath.match(LTR_GLOBAL_REGEX) || [];
  const rtlCharCount = rtlMatches.length;
  const ltrCharCount = ltrMatches.length;

  const isMath = isMathEquationLine(cleaned) || MATH_REGEX.test(cleaned);

  let firstStrong: "rtl" | "ltr" | "none" = "none";
  for (let i = 0; i < plainTextWithoutMath.length; i++) {
    const char = plainTextWithoutMath[i];
    if (RTL_REGEX.test(char)) {
      firstStrong = "rtl";
      break;
    }
    if (LTR_REGEX.test(char)) {
      firstStrong = "ltr";
      break;
    }
  }

  const hasRtl = rtlCharCount > 0;
  const hasLtr = ltrCharCount > 0;
  const isMixed = hasRtl && hasLtr;

  // Determine primary direction:
  // 1. If line is a pure math equation -> LTR
  // 2. If RTL characters exist and make up at least 25% of letters or first strong is RTL -> RTL (standard Arabic exam context)
  // 3. Otherwise, if exclusively LTR letters -> LTR
  let primaryDirection: "rtl" | "ltr" = "rtl";
  if (isMath && rtlCharCount === 0) {
    primaryDirection = "ltr";
  } else if (rtlCharCount > 0) {
    primaryDirection = "rtl";
  } else if (ltrCharCount > 0 && rtlCharCount === 0) {
    primaryDirection = "ltr";
  } else {
    primaryDirection = firstStrong === "ltr" ? "ltr" : "rtl";
  }

  return {
    primaryDirection,
    hasRtl,
    hasLtr,
    isMixed,
    isMath,
    rtlCharCount,
    ltrCharCount,
    mathSymbolCount: (cleaned.match(/[\+\-\=\/\*\<\>\±\≠\≤\≥\^\\_]/g) || []).length,
    firstStrong,
  };
}

/**
 * Detects the dominant direction for a given text or HTML snippet.
 */
export function detectDirection(content: string): "rtl" | "ltr" {
  return analyzeContentScript(content).primaryDirection;
}

interface ContentToken {
  type: "text" | "math" | "tag";
  content: string;
}

/**
 * Safely segments a string into text, math ($...$, $$...$$, \\begin{...}\\end{...}), and HTML tags
 * without injecting fragile string placeholders that could be corrupted by secondary regex passes.
 */
function tokenizeContent(text: string): ContentToken[] {
  const tokens: ContentToken[] = [];
  const regex = /(\$\$[\s\S]*?\$\$|\$(?:\\\$|[^\$])+?\$|\\begin\{[a-zA-Z0-9*]+\}[\s\S]*?\\end\{[a-zA-Z0-9*]+\}|<[^>]+>)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({
        type: "text",
        content: text.substring(lastIndex, match.index),
      });
    }

    const matchedStr = match[0];
    if (matchedStr.startsWith("<") && matchedStr.endsWith(">")) {
      tokens.push({
        type: "tag",
        content: matchedStr,
      });
    } else {
      tokens.push({
        type: "math",
        content: matchedStr,
      });
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push({
      type: "text",
      content: text.substring(lastIndex),
    });
  }

  return tokens;
}

/**
 * Normalizes plain text containing mixed RTL/LTR or math terms
 * by inserting proper Unicode BiDi isolation characters where necessary.
 */
export function normalizeBidiPlainText(text: string, options: PipelineOptions = {}): string {
  if (!text) return "";

  // Always strip any leaked internal tokens first
  let sanitized = cleanLeakedTokens(text);

  // If text is pure numbers or symbols without letters, return cleaned
  if (!RTL_REGEX.test(sanitized) && !LTR_REGEX.test(sanitized)) {
    return sanitized;
  }

  // Pre-process list items if present
  const lines = sanitized.split("\n");
  const processedLines = lines.map((line) => {
    if (!line.trim()) return line;

    // Check for list or procedural step prefixes like "1.", "2.", "أ)", "الخطوة الأولى:", "•"
    const parsedItem = parsePlainTextListItem(line);
    if (parsedItem) {
      // Re-assemble with clean spacing and proper separator
      const marker = parsedItem.marker;
      const content = parsedItem.content;
      const contentDir = analyzeContentScript(content).primaryDirection;
      
      if (contentDir === "rtl") {
        // Arabic context: Ensure marker and content are joined cleanly without flip
        return `${marker} ${normalizeInlineMixedBidiText(content, "rtl")}`;
      } else {
        return `${marker} ${content}`;
      }
    }

    const script = analyzeContentScript(line);
    if (script.primaryDirection === "rtl" && script.isMixed) {
      return normalizeInlineMixedBidiText(line, "rtl");
    }

    return line;
  });

  return cleanLeakedTokens(processedLines.join("\n"));
}

/**
 * Isolates Latin words, acronyms, formulas, procedural operations (e.g. R_1 -> R_2),
 * and units inside an Arabic text string using safe tokenization instead of string placeholders.
 */
export function normalizeInlineMixedBidiText(text: string, parentDir: "rtl" | "ltr" = "rtl"): string {
  if (!text || parentDir !== "rtl") return text || "";

  // Clean any leaked tokens first
  const sanitized = cleanLeakedTokens(text);

  // Tokenize string to safely isolate math formulas and HTML tags
  const tokens = tokenizeContent(sanitized);

  // Regex to detect inline Latin phrases, formulas, procedural transitions (e.g. "R1 -> R2", "DNA", "pH = 7", "100 km/h", "CO2")
  const latinPhraseRegex = /([A-Za-z0-9][A-Za-z0-9\s\+\-\*\/\=\.\,\:\_\^\(\)\[\]\%\→\⟶\⇌\⇄\<\>]{0,45}[A-Za-z0-9]|[A-Za-z])/g;

  const processed = tokens.map((token) => {
    if (token.type === "math") {
      // Wrap math expression with directional isolate for perfect bidirectional rendering
      return `${BIDI_LRI}${token.content}${BIDI_PDI}`;
    }

    if (token.type === "tag") {
      return token.content;
    }

    // Process pure text segments
    return token.content.replace(latinPhraseRegex, (match) => {
      // If match contains Arabic characters, do not isolate as LTR
      if (RTL_REGEX.test(match)) return match;
      // If match is just standalone numbers or whitespace or basic punctuation, do not wrap unnecessarily
      if (/^[\d\s\.\,\-]+$/.test(match)) return match;
      // Wrap with Unicode LRI (Left-to-Right Isolate) and PDI (Pop Directional Isolate)
      return `${BIDI_LRI}${match}${BIDI_PDI}`;
    });
  });

  return cleanLeakedTokens(processed.join(""));
}

/**
 * Cleans and standardizes an HTML string to ensure proper direction,
 * list structure, math protection, table RTL layout, and BiDi isolation.
 */
export function normalizeBidiHtml(rawHtml: string, options: PipelineOptions = {}): string {
  if (!rawHtml) return "";

  try {
    let cleanHtml = cleanLeakedTokens(rawHtml);

    // 1. Clean Word and external Office junk XML & comments
    if (options.cleanWordJunk !== false) {
      cleanHtml = cleanHtml
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/<xml>[\s\S]*?<\/xml>/gi, "")
        .replace(/<style>[\s\S]*?<\/style>/gi, "")
        .replace(/<o:p>[\s\S]*?<\/o:p>/gi, "");
    }

    // 2. Convert Linear Word equations and MathML to standard TeX
    if (options.convertEquations !== false) {
      cleanHtml = convertWordLinearMathToTeX(cleanHtml);
      cleanHtml = convertMathMLInText(cleanHtml);
    }

    // 3. Normalize Lists with Central List Engine
    if (options.normalizeLists !== false) {
      cleanHtml = normalizeHtmlLists(cleanHtml);
    }

    if (typeof window === "undefined") {
      return cleanLeakedTokens(cleanHtml);
    }

    // 4. Parse DOM for block-level and inline-level Direction & BiDi Normalization
    const parser = new DOMParser();
    const doc = parser.parseFromString(cleanHtml, "text/html");

    // 4.5 Normalize Block Elements: Split `<br>` tags within <p> or <div> into independent paragraphs
    const blocksWithBr = Array.from(doc.querySelectorAll("p, div")).filter(el => el.querySelector("br"));
    blocksWithBr.forEach(block => {
      // Avoid splitting if inside a table, or if it contains nested block elements (like another div/p/ul/table)
      if (block.closest("table") || block.querySelector("p, div, ul, ol, table")) return;
      
      const htmlParts = block.innerHTML.split(/<br\s*\/?>/i);
      if (htmlParts.length > 1) {
        const grandParent = block.parentNode;
        if (grandParent) {
          htmlParts.forEach(part => {
             const newP = doc.createElement("p");
             newP.innerHTML = part.trim() ? part : "<br>";
             // Copy original attributes (e.g. dir, style, class) to the new split blocks
             Array.from(block.attributes).forEach(attr => {
               if (attr.name !== 'id') newP.setAttribute(attr.name, attr.value);
             });
             grandParent.insertBefore(newP, block);
          });
          grandParent.removeChild(block);
        }
      }
    });

    // Clean false-positive single-item lists (e.g. single question wrapped in <ol><li> or <ul><li>)
    const lists = doc.querySelectorAll("ul, ol");
    lists.forEach((listEl) => {
      const items = listEl.querySelectorAll(":scope > li");
      // If it's a single item list that was accidentally wrapped
      // Single-item list unwrapping has been removed to preserve valid lists.

      // Real list: ensure the list container itself has strict direction and alignment
      const listText = listEl.textContent || "";
      const listScript = analyzeContentScript(listText);
      const listDir = options.forceDirection && options.forceDirection !== "auto"
        ? options.forceDirection
        : listScript.primaryDirection;

      listEl.setAttribute("dir", listDir);
      (listEl as HTMLElement).style.direction = listDir;
      // (listEl as HTMLElement).style.unicodeBidi = "isolate";
      // (listEl as HTMLElement).style.textAlign = listDir === "rtl" ? "right" : "left";
    });

    // Standardize Tables: Arabic tables must be RTL with properly aligned headers and cells
    const tables = doc.querySelectorAll("table");
    tables.forEach((table) => {
      const tableText = table.textContent || "";
      const tableScript = analyzeContentScript(tableText);
      const tableDir = options.forceDirection || tableScript.primaryDirection;

      table.setAttribute("dir", tableDir);
      table.classList.add("bidi-normalized-table");
      const currentStyle = table.getAttribute("style") || "";
      table.setAttribute(
        "style",
        `direction: ${tableDir}; text-align: ${tableDir === "rtl" ? "right" : "left"}; border-collapse: collapse; width: 100%; max-width: 100%; ${currentStyle}`
      );

      // Ensure every row and cell has consistent alignment
      const cells = table.querySelectorAll("th, td");
      cells.forEach((cell) => {
        const cellText = cell.textContent || "";
        const cellScript = analyzeContentScript(cellText);
        const cellDir = cellScript.primaryDirection;
        (cell as HTMLElement).style.direction = cellDir;
        // (cell as HTMLElement).style.unicodeBidi = "isolate";
        // Removed text-align from cells
      });
    });

    // Standardize Block Elements (p, h1-h6, blockquote, div, li, ul, ol)
    const blockElements = doc.querySelectorAll("p, h1, h2, h3, h4, h5, h6, blockquote, li, div");
    blockElements.forEach((el) => {
      const text = el.textContent || "";
      if (!text.trim() && el.querySelectorAll("img, table, .katex, math, tiptap-math").length === 0) {
        return;
      }

      const script = analyzeContentScript(text);
      const isMath = isMathEquationLine(text);
      const existingDir = el.getAttribute("dir");
      const dirMode = el.getAttribute("data-dir-mode");

      let targetDir: "rtl" | "ltr" = "rtl";
      if (options.forceDirection && options.forceDirection !== "auto") {
        targetDir = options.forceDirection;
      } else if (dirMode === "manual" && (existingDir === "ltr" || existingDir === "rtl")) {
        targetDir = existingDir as "rtl" | "ltr";
      } else if (isMath) {
        targetDir = "ltr";
      } else {
        targetDir = script.primaryDirection;
      }

      el.setAttribute("dir", targetDir);
      (el as HTMLElement).style.direction = targetDir;
      // Removed unicodeBidi from block elements as per request

      // Removed text-align overrides to let standard dir attribute handle alignment
    });

    // Protect all KaTeX & math spans
    const mathSpans = doc.querySelectorAll(".katex, .katex-display, tiptap-math, [data-type='equation']");
    mathSpans.forEach((m) => {
      m.setAttribute("dir", "ltr");
      (m as HTMLElement).style.direction = "ltr";
      (m as HTMLElement).style.unicodeBidi = "isolate";
      (m as HTMLElement).style.textAlign = "left";
    });

    // Clean trailing empty blocks/paragraphs to prevent unnecessary vertical space at the bottom
    let lastChild = doc.body.lastElementChild;
    while (lastChild) {
      if (['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'UL', 'OL'].includes(lastChild.tagName)) {
        const text = lastChild.textContent || "";
        const hasMediaOrMath = lastChild.querySelectorAll("img, table, .katex, math, tiptap-math").length > 0;
        if (!text.trim() && !hasMediaOrMath) {
          const prev = lastChild.previousElementSibling;
          doc.body.removeChild(lastChild);
          lastChild = prev;
        } else {
          break; // Stop at the first non-empty element
        }
      } else {
        break; // If it's not a standard block, stop
      }
    }

    let resultHtml = doc.body.innerHTML;

    // Clean up empty style attributes or excess whitespace
    resultHtml = resultHtml.replace(/style=""/g, "").replace(/\s+dir="auto"/g, ' dir="rtl"');

    return cleanLeakedTokens(resultHtml);
  } catch (err) {
    console.error("Error in normalizeBidiHtml:", err);
    return cleanLeakedTokens(rawHtml);
  }
}

/**
 * Universal Gateway: Sanitizes and processes ANY raw content before inserting
 * into state, database entities, cards, or rich editors.
 * 
 * Works symmetrically for AI generated text, OCR results, Word imports,
 * Clipboard pastes, and question parser outputs.
 */
export function processCentralContentPipeline(
  input: string,
  options: PipelineOptions = {}
): {
  html: string;
  plainText: string;
  direction: "rtl" | "ltr";
  scriptAnalysis: ScriptAnalysis;
} {
  if (!input) {
    return {
      html: "",
      plainText: "",
      direction: "rtl",
      scriptAnalysis: analyzeContentScript(""),
    };
  }

  const cleanedInput = cleanLeakedTokens(input);
  const isHtml = /<[a-z][\s\S]*>/i.test(cleanedInput);
  let processedHtml = "";
  let processedPlainText = "";

  if (isHtml) {
    processedHtml = normalizeBidiHtml(cleanedInput, options);
    if (typeof window !== "undefined") {
      const parser = new DOMParser();
      const doc = parser.parseFromString(processedHtml, "text/html");
      processedPlainText = cleanLeakedTokens(doc.body.textContent || "");
    } else {
      processedPlainText = cleanLeakedTokens(cleanedInput.replace(/<[^>]*>/g, " "));
    }
  } else {
    processedPlainText = normalizeBidiPlainText(cleanedInput, options);
    // Convert plain text into proper HTML paragraphs and semantic lists
    const lines = processedPlainText.split("\n");
    let inList: "ul" | "ol" | null = null;
    let currentListStyle = "";
    const htmlParts: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) {
        if (inList) {
          htmlParts.push(`</${inList}>`);
          inList = null;
          currentListStyle = "";
        }
        htmlParts.push("<p><br></p>");
        continue;
      }

      const parsed = parsePlainTextListItem(line);
      if (parsed.isList && parsed.type) {
        const listTag = parsed.type === "bullet" ? "ul" : "ol";
        if (inList !== listTag || currentListStyle !== parsed.style) {
          if (inList) {
            htmlParts.push(`</${inList}>`);
          }
          inList = listTag;
          currentListStyle = parsed.style;
          htmlParts.push(`<${listTag} data-list-style="${parsed.style}">`);
        }
        const itemDir = analyzeContentScript(parsed.content).primaryDirection;
        htmlParts.push(`<li dir="${itemDir}" data-dir="${itemDir}"><p dir="${itemDir}">${parsed.content}</p></li>`);
      } else {
        if (inList) {
          htmlParts.push(`</${inList}>`);
          inList = null;
          currentListStyle = "";
        }
        const dir = analyzeContentScript(line).primaryDirection;
        htmlParts.push(`<p dir="${dir}" data-dir="${dir}" style="direction: ${dir}; unicode-bidi: isolate; text-align: ${dir === "rtl" ? "right" : "left"};">${line}</p>`);
      }
    }

    if (inList) {
      htmlParts.push(`</${inList}>`);
    }

    processedHtml = htmlParts.join("");
    processedHtml = normalizeBidiHtml(processedHtml, options);
  }

  const scriptAnalysis = analyzeContentScript(processedPlainText || cleanedInput);

  return {
    html: cleanLeakedTokens(processedHtml),
    plainText: cleanLeakedTokens(processedPlainText),
    direction: scriptAnalysis.primaryDirection,
    scriptAnalysis,
  };
}

