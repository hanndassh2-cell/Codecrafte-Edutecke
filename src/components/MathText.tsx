import React, { useMemo } from "react";
import katex from "katex";
import { useInView } from "react-intersection-observer";
import "katex/dist/contrib/mhchem.js";
import { normalizeHtmlLists } from "../utils/listEngine";
import { cleanLeakedTokens, unescapeHtmlEntities } from "../services/bidiContentPipeline";
import { convertWordLinearMathToTeX, isMathEquationLine } from "../utils/mathConverter";

export { convertWordLinearMathToTeX, isMathEquationLine };

if (typeof window !== "undefined") {
  (window as any).katex = katex;
}

interface MathTextProps {
  text: string;
  className?: string;
  inline?: boolean;
  dir?: "rtl" | "ltr" | "auto";
  style?: React.CSSProperties;
  onEquationClick?: (rawEquation: string) => void;
}

interface Segment {
  type: "text" | "inline-math" | "block-math";
  content: string;
}

function renderMixedText(text: string) {
  const cleaned = cleanLeakedTokens(text);
  const parts = cleaned.split(
    /([\+\-±]?\s*[0-9A-Za-z][0-9A-Za-z\s\-\+\=\_\/\.\%\(\)\[\]\{\}\<\>\,\:\;\|\*\^\!\@\#\$\&\~\×\÷]*[0-9A-Za-z]|[0-9A-Za-z])/g,
  );
  return parts.map((part, i) => {
    if (/[0-9A-Za-z]/.test(part)) {
      return (
        <span
          key={i}
          dir="ltr"
          className="inline-block mx-[2px] font-medium text-[0.95em] [direction:ltr]"
          style={{
            fontFamily: "system-ui, sans-serif",
            unicodeBidi: "isolate",
            direction: "ltr",
          }}
        >
          {part}
        </span>
      );
    }
    return part;
  });
}

function parseDomNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || "";
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return "";
  }

  const el = node as Element;
  const tag = (el.localName || el.tagName || "")
    .toLowerCase()
    .replace(/^[a-z0-9_]+:/, "");

  const children = Array.from(el.childNodes).filter((n) => {
    if (n.nodeType === Node.ELEMENT_NODE) return true;
    if (n.nodeType === Node.TEXT_NODE && n.textContent && n.textContent.trim())
      return true;
    return false;
  });

  const findChild = (parent: Element, childTag: string) => {
    const direct = Array.from(parent.children).find(
      (c) =>
        (c.localName || c.tagName || "")
          .toLowerCase()
          .replace(/^[a-z0-9_]+:/, "") === childTag.toLowerCase(),
    );
    if (direct) return direct;
    return (
      parent.querySelector(childTag) ||
      parent.querySelector(`m\\:${childTag}`) ||
      parent.querySelector(`mml\\:${childTag}`)
    );
  };

  switch (tag) {
    case "math":
    case "omath":
    case "omathpara":
    case "mrow":
    case "style":
    case "semantics":
    case "r":
      return children.map(parseDomNode).join("");

    case "mi":
    case "mn":
    case "t":
      return el.textContent?.trim() || "";

    case "mo": {
      const op = el.textContent?.trim() || "";
      if (op === "→" || op === "➔" || op === "⟶" || op === "->")
        return " \\longrightarrow ";
      if (op === "⇌" || op === "⇄" || op === "<=>")
        return " \\rightleftharpoons ";
      if (op === "↑") return " \\uparrow ";
      if (op === "↓") return " \\downarrow ";
      if (op === "±") return " \\pm ";
      if (op === "×") return " \\times ";
      if (op === "÷") return " \\div ";
      if (op === "=") return " = ";
      if (op === "+") return " + ";
      if (op === "-") return " - ";
      return ` ${op} `;
    }

    case "mtext":
      return `\\text{${el.textContent?.trim() || ""}}`;

    case "msub":
    case "ssub": {
      const baseEl = findChild(el, "e") || children[0];
      const subEl = findChild(el, "sub") || children[1];
      const base = baseEl ? parseDomNode(baseEl) : "";
      const sub = subEl ? parseDomNode(subEl).trim() : "";
      return `${base}_{${sub}}`;
    }

    case "msup":
    case "ssup": {
      const baseEl = findChild(el, "e") || children[0];
      const supEl = findChild(el, "sup") || children[1];
      const base = baseEl ? parseDomNode(baseEl) : "";
      const sup = supEl ? parseDomNode(supEl).trim() : "";
      return `${base}^{${sup}}`;
    }

    case "msubsup":
    case "ssubsup": {
      const baseEl = findChild(el, "e") || children[0];
      const subEl = findChild(el, "sub") || children[1];
      const supEl = findChild(el, "sup") || children[2];
      const base = baseEl ? parseDomNode(baseEl) : "";
      const sub = subEl ? parseDomNode(subEl).trim() : "";
      const sup = supEl ? parseDomNode(supEl).trim() : "";
      return `${base}_{${sub}}^{${sup}}`;
    }

    case "spre": {
      const baseEl = findChild(el, "e") || children[2];
      const subEl = findChild(el, "sub") || children[0];
      const supEl = findChild(el, "sup") || children[1];
      const base = baseEl ? parseDomNode(baseEl) : "";
      const sub = subEl ? parseDomNode(subEl).trim() : "";
      const sup = supEl ? parseDomNode(supEl).trim() : "";
      return `{}_{${sub}}^{${sup}}${base}`;
    }

    case "mfrac":
    case "f": {
      const numEl = findChild(el, "num") || children[0];
      const denEl = findChild(el, "den") || children[1];
      const num = numEl ? parseDomNode(numEl) : "";
      const den = denEl ? parseDomNode(denEl) : "";
      return `\\frac{${num}}{${den}}`;
    }

    case "msqrt": {
      const inner = children.map(parseDomNode).join("");
      return `\\sqrt{${inner}}`;
    }

    case "mroot":
    case "rad": {
      const baseEl = findChild(el, "e") || children[0];
      const degEl = findChild(el, "deg") || children[1];
      const base = baseEl ? parseDomNode(baseEl) : "";
      const deg = degEl ? parseDomNode(degEl).trim() : "";
      return deg ? `\\sqrt[${deg}]{${base}}` : `\\sqrt{${base}}`;
    }

    case "m":
    case "mtable":
    case "matrix": {
      const rowNodes = children.filter((c) => {
        if (c.nodeType !== Node.ELEMENT_NODE) return false;
        const elNode = c as Element;
        const t = (elNode.localName || elNode.tagName || "")
          .toLowerCase()
          .replace(/^[a-z0-9_]+:/, "");
        return t === "mr" || t === "mtr" || t === "tr";
      });

      if (rowNodes.length > 0) {
        const rows = rowNodes.map(parseDomNode);
        return `\\begin{matrix} ${rows.join(" \\\\ ")} \\end{matrix}`;
      }

      const rows = children.map(parseDomNode);
      return `\\begin{matrix} ${rows.join(" \\\\ ")} \\end{matrix}`;
    }

    case "mr":
    case "mtr":
    case "tr": {
      const cells = children.map(parseDomNode);
      return cells.join(" & ");
    }

    case "mtd":
    case "td": {
      return children.map(parseDomNode).join("");
    }

    case "d":
    case "mfenced": {
      let open = "(";
      let close = ")";

      const dPr = findChild(el, "dpr") || findChild(el, "dPr");
      if (dPr) {
        const begChr = findChild(dPr, "begchr") || findChild(dPr, "begChr");
        const endChr = findChild(dPr, "endchr") || findChild(dPr, "endChr");
        if (begChr) open = begChr.getAttribute("m:val") || begChr.getAttribute("val") || "(";
        if (endChr) close = endChr.getAttribute("m:val") || endChr.getAttribute("val") || ")";
      } else {
        open = el.getAttribute("open") || el.getAttribute("m:open") || "(";
        close = el.getAttribute("close") || el.getAttribute("m:close") || ")";
      }

      const innerNodes = children.filter((c) => c !== dPr);
      const inner = innerNodes.map(parseDomNode).join("");

      if (open === "[" && close === "]") return `\\left[ ${inner} \\right]`;
      if (open === "(" && close === ")") return `\\left( ${inner} \\right)`;
      if (open === "{" && close === "}") return `\\left\\{ ${inner} \\right\\}`;
      if (open === "|" && close === "|") return `\\left| ${inner} \\right|`;
      if (open === "||" && close === "||") return `\\left\\| ${inner} \\right\\|`;

      return `\\left${open} ${inner} \\right${close}`;
    }

    case "func": {
      const fNameEl = findChild(el, "fname") || findChild(el, "fName") || children[0];
      const bodyEl = findChild(el, "e") || children[1];
      const fName = fNameEl ? parseDomNode(fNameEl).trim() : "";
      const body = bodyEl ? parseDomNode(bodyEl).trim() : "";

      const stdFuncs = [
        "sin",
        "cos",
        "tan",
        "cot",
        "sec",
        "csc",
        "sinh",
        "cosh",
        "tanh",
        "log",
        "ln",
        "lim",
        "max",
        "min",
        "det",
        "gcd",
        "deg",
      ];
      if (stdFuncs.includes(fName.toLowerCase())) {
        return `\\${fName.toLowerCase()}{${body}}`;
      }
      return `${fName}{${body}}`;
    }

    case "nary": {
      const naryPr = findChild(el, "narypr") || findChild(el, "naryPr");
      let opSymbol = "\\int";
      if (naryPr) {
        const chrEl = findChild(naryPr, "chr");
        const val = chrEl?.getAttribute("m:val") || chrEl?.getAttribute("val") || "";
        if (val === "∑" || val === "sum") opSymbol = "\\sum";
        else if (val === "∏" || val === "prod") opSymbol = "\\prod";
        else if (val === "∫" || val === "int") opSymbol = "\\int";
        else if (val === "∬") opSymbol = "\\iint";
        else if (val === "∭") opSymbol = "\\iiint";
        else if (val === "∮") opSymbol = "\\oint";
        else if (val === "⋃") opSymbol = "\\bigcup";
        else if (val === "⋂") opSymbol = "\\bigcap";
      }

      const subEl = findChild(el, "sub");
      const supEl = findChild(el, "sup");
      const bodyEl = findChild(el, "e");

      const sub = subEl ? parseDomNode(subEl).trim() : "";
      const sup = supEl ? parseDomNode(supEl).trim() : "";
      const body = bodyEl ? parseDomNode(bodyEl).trim() : "";

      let res = opSymbol;
      if (sub) res += `_{${sub}}`;
      if (sup) res += `^{${sup}}`;
      if (body) res += ` ${body}`;
      return res;
    }

    case "limlow":
    case "limupp": {
      const eEl = findChild(el, "e") || children[0];
      const limEl = findChild(el, "lim") || children[1];
      const eVal = eEl ? parseDomNode(eEl).trim() : "";
      const limVal = limEl ? parseDomNode(limEl).trim() : "";
      return `\\lim_{${limVal}} ${eVal}`;
    }

    case "eqarr":
    case "eqarray": {
      const rows = children.map(parseDomNode);
      return `\\begin{aligned} ${rows.join(" \\\\ ")} \\end{aligned}`;
    }

    case "acc":
    case "accent": {
      const accPr = findChild(el, "accpr") || findChild(el, "accPr");
      let chr = "^";
      if (accPr) {
        const chrEl = findChild(accPr, "chr");
        chr = chrEl?.getAttribute("m:val") || chrEl?.getAttribute("val") || "^";
      }
      const bodyEl = findChild(el, "e") || children[0];
      const body = bodyEl ? parseDomNode(bodyEl) : "";
      if (chr === "̂" || chr === "^" || chr === "hat") return `\\hat{${body}}`;
      if (chr === "⃗" || chr === "vec" || chr === "→") return `\\vec{${body}}`;
      if (chr === "̄" || chr === "bar") return `\\bar{${body}}`;
      if (chr === "̇" || chr === "dot") return `\\dot{${body}}`;
      if (chr === "̈" || chr === "ddot") return `\\ddot{${body}}`;
      if (chr === "̃" || chr === "tilde") return `\\tilde{${body}}`;
      return `\\hat{${body}}`;
    }

    case "bar": {
      const bodyEl = findChild(el, "e") || children[0];
      const body = bodyEl ? parseDomNode(bodyEl) : "";
      return `\\overline{${body}}`;
    }

    case "groupchr": {
      const bodyEl = findChild(el, "e") || children[0];
      const body = bodyEl ? parseDomNode(bodyEl) : "";
      return `\\overbrace{${body}}`;
    }

    case "e": {
      return children.map(parseDomNode).join("");
    }

    default:
      return children.map(parseDomNode).join("");
  }
}

/**
 * Clean up extra spaces and malformed superscript/subscript braces in TeX output
 */
export function cleanupTeXSpacesAndFormatting(tex: string): string {
  if (!tex) return "";

  let res = tex;

  // Clean up extra spaces inside superscripts & subscripts: ^{ + } -> ^{+}, ^{ - } -> ^{-}, _{ 3 } -> _{3}
  res = res
    .replace(/\^\{\s*([\+\-0-9A-Za-z]+)\s*\}/g, "^{$1}")
    .replace(/_\{\s*([\+\-0-9A-Za-z]+)\s*\}/g, "_{$1}")
    .replace(/\^\{\s*\+\s*\}/g, "^{+}")
    .replace(/\^\{\s*\-\s*\}/g, "^{-}");

  // Fix erroneous prefix superscripts if generated like { - }^HA -> HA^{-}
  res = res.replace(/\{\s*([\+\-])\s*\}\^([A-Za-z0-9]+)/g, "$2^{$1}");

  // Remove multiple consecutive spaces inside TeX
  res = res.replace(/  +/g, " ");

  return res.trim();
}

/**
 * Convert a standalone MathML string into a LaTeX TeX expression
 */
export function convertMathMLToTeX(mathmlStr: string): string {
  if (typeof window === "undefined" || !mathmlStr) return mathmlStr;

  try {
    const parser = new DOMParser();
    const cleanXml = mathmlStr
      .replace(/xmlns(:[a-zA-Z0-9_]+)?="[^"]*"/gi, "")
      .replace(/<(\/)?m:/gi, "<$1");

    let doc = parser.parseFromString(cleanXml, "text/xml");
    if (doc.querySelector("parsererror")) {
      doc = parser.parseFromString(mathmlStr, "text/html");
    }

    const root =
      doc.querySelector("math") ||
      doc.querySelector("omath") ||
      doc.querySelector("omathpara") ||
      doc.documentElement;

    if (!root) return mathmlStr;

    let tex = parseDomNode(root).replace(/\s+/g, " ").trim();
    tex = cleanupTeXSpacesAndFormatting(tex);
    return tex;
  } catch (err) {
    console.error("Error converting MathML to TeX:", err);
    return mathmlStr;
  }
}

/**
 * Scan raw text for <mml:math>, <math>, <m:oMath> or <oMath> tags pasted from MS Word and convert them to $...$ TeX formulas
 */
export function convertMathMLInText(text: string): string {
  if (!text) return "";

  // Always unescape HTML entities first
  let unescaped = text
    .replace(/&amp;\s*amp;/gi, "&")
    .replace(/&amp;\s*/gi, "&")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#160;/g, " ")
    .replace(/\t/g, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"');

  unescaped = convertWordLinearMathToTeX(unescaped);

  if (
    !unescaped.includes("<") ||
    (!unescaped.includes("math") &&
      !unescaped.includes("Math") &&
      !unescaped.includes("oMath"))
  ) {
    return unescaped;
  }

  const mathmlRegex =
    /<(?:[a-zA-Z0-9_]+:)?(?:math|oMath|oMathPara)[\s\S]*?<\/(?:[a-zA-Z0-9_]+:)?(?:math|oMath|oMathPara)>/gi;

  return unescaped.replace(mathmlRegex, (match) => {
    try {
      const tex = convertMathMLToTeX(match);
      if (tex && tex.trim()) {
        return `$${tex.trim()}$`;
      }
    } catch (e) {
      console.error("Failed to parse MathML:", e);
    }
    return match;
  });
}

/**
 * Pre-processes text to ensure chemical equations, ions, arrows, and math macros
 * are automatically formatted as TeX math formulas even if typed as plain text like "NaOH → Na^+ + OH^-"
 */
function normalizeMathText(raw: string): string {
  if (!raw) return "";

  let unescaped = cleanLeakedTokens(raw)
    .replace(/&amp;\s*amp;/gi, "&")
    .replace(/&amp;\s*/gi, "&")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#160;/g, " ")
    .replace(/\t/g, " ");

  // Convert Word Linear Math (UnicodeMath) matrices first
  let result = convertWordLinearMathToTeX(unescaped);

  // Convert HTML <sub> and <sup> tags to TeX _ and ^
  result = result
    .replace(/<sub[^>]*>\s*([\s\S]*?)\s*<\/sub>/gi, (_, inner) => "_{" + inner.trim() + "}")
    .replace(/<sup[^>]*>\s*([\s\S]*?)\s*<\/sup>/gi, (_, inner) => "^{" + inner.trim() + "}");

  // Convert Unicode superscripts and subscripts to TeX _ and ^
  const unicodeMap: Record<string, string> = {
    '⁺': '^+', '⁻': '^-', '⁼': '^=', '⁽': '^(', '⁾': '^)',
    '⁰': '^0', '¹': '^1', '²': '^2', '³': '^3', '⁴': '^4',
    '⁵': '^5', '⁶': '^6', '⁷': '^7', '⁸': '^8', '⁹': '^9',
    '₊': '_+', '₋': '_-', '₌': '_=', '₍': '_(', '₎': '_)',
    '₀': '_0', '₁': '_1', '₂': '_2', '₃': '_3', '₄': '_4',
    '₅': '_5', '₆': '_6', '₇': '_7', '₈': '_8', '₉': '_9',
  };
  result = result.replace(/[⁺⁻⁼⁽⁾⁰¹²³⁴⁵⁶⁷⁸⁹₊₋₌₍₎₀₁₂₃₄₅₆₇₈₉]/g, (match) => unicodeMap[match] || match);

  // Convert MS Word MathML tags
  result = convertMathMLInText(result);

  // Clean up Word Unicode math garbage & normalize Unicode minus
  result = result
    .replace(/〖/g, "")
    .replace(/〗/g, "")
    .replace(/\\begin\s*OH/g, "OH")
    .replace(/[\u2212−]/g, "-");

  // Clean artifact linebreaks and tabs inside pasted chemical/math formula parts
  result = result
    .replace(/([A-Za-z\}])\s*[\r\n\t]+\s*([0-9]+)/g, "$1_$2")
    .replace(/([0-9A-Za-z\}])\s*[\r\n\t]+\s*([\+\-])/g, "$1$2");

  // Standardize LaTeX delimiters: \( ... \) -> $ ... $ and \[ ... \] -> $$ ... $$
  result = result
    .replace(/\\\(([\s\S]+?)\\\)/g, "$$1$")
    .replace(/\\\[([\s\S]+?)\\\]/g, "$$$1$$$");

  // Process plain text parts outside $...$ or $$...$$
  const parts = result.split(/(\$\$[\s\S]+?\$\$|\$(?:\\\$|[^\$])+?\$)/g);

  const processed = parts.map((part) => {
    if (part.startsWith("$")) {
      return part;
    }

    let textPart = part;

    // Auto-detect ANY LaTeX environment e.g. A = \begin{bmatrix} ... \end{bmatrix}, \begin{equation*} ...
    const latexEnvRegex = /((?:[A-Za-z0-9٠-٩\s\=\+\-\*\/\(\)]*)?\\begin\{[a-zA-Z\*]+\}[\s\S]*?\\end\{[a-zA-Z\*]+\})/g;

    textPart = textPart.replace(latexEnvRegex, (match) => {
      const leadingWs = match.match(/^\s*/)?.[0] || "";
      const trailingWs = match.match(/\s*$/)?.[0] || "";
      const trimmed = match.trim();
      return `${leadingWs}$${trimmed}$${trailingWs}`;
    });

    // Auto-detect math equation lines
    if (isMathEquationLine(textPart) && !textPart.startsWith("$")) {
      return `$${textPart.trim()}$`;
    }

    // Auto-detect \left ... \right expressions
    textPart = textPart.replace(
      /(\\left[\(\[\{\|\.][\s\S]*?\\right[\)\}\]\|\.])/g,
      (match) => `$${match.trim()}$`
    );

    // Auto-detect chemical reaction equations or math expressions containing arrows, macros, or math/chem notation
    const mathBlockRegex =
      /((?:\\[a-zA-Z]+(?:\{[^}]*\})*|\{?[A-Za-z0-9_\^\+\-\(\)\[\]\{\}\/]+\}?|[→➔⟶⇌⇄±≠≤≥∞π∫∑√°]|\->|<=>)(?:[ \t]*(?:\\[a-zA-Z]+(?:\{[^}]*\})*|\{?[A-Za-z0-9_\^\+\-\(\)\[\]\{\}\/]+\}?|[→➔⟶⇌⇄±≠≤≥∞π∫∑√°]|\->|<=>|\+|=|-|\/))*)/g;

    textPart = textPart.replace(mathBlockRegex, (match) => {
      const trimmed = match.trim();
      if (
        /\\|_|\^|->|→|➔|⟶|⇌|⇄|<=>|\\rightarrow|\\longrightarrow|\\rightleftharpoons|\\xrightarrow|\\frac|\\sqrt|\\ce|\\mathrm|\\text|\{/.test(
          trimmed,
        )
      ) {
        return `$${trimmed}$`;
      }
      return match;
    });

    // Auto-detect bare LaTeX math macros (\frac, \sqrt, \int, \sum, \lim, \ce, \vec, \rightarrow, etc.)
    textPart = textPart.replace(
      /(?<!\$)\\([a-zA-Z]+)(\{[^}]*\})*/g,
      (match) => `$${match.trim()}$`
    );

    // Split again by $ in case previous replacements wrapped parts in $
    const subParts = textPart.split(/(\$(?:\\\$|[^\$])+?\$)/g);
    textPart = subParts
      .map((subPart) => {
        if (subPart.startsWith("$")) return subPart;

        let s = subPart;
        const ionRegex = /(?:^|\b|\s|\()(\{?[A-Z][a-zA-Z0-9\(\)]*\}?(?:_[0-9A-Za-z\{\}\+\-]+)?(?:\^[\+\-0-9A-Za-z\{\}\/]+)+|\{[A-Za-z0-9\+\-]+\}_[0-9A-Za-z\+\-]+\^[\+\-0-9A-Za-z]+)(?:\b|\s|$|\))/g;
        return s.replace(ionRegex, (m, p1) => m.replace(p1, `$${p1}$`));
      })
      .join("");

    return textPart;
  });

  let finalRes = processed.join("");

  // Post-process: clean up orphan or duplicate dollar delimiters and amp; in matrix environments
  finalRes = finalRes
    .replace(/\\begin\{([a-zA-Z]+)\}([\s\S]*?)\\end\{\1\}/g, (match, envName, body) => {
      const cleanBody = body
        .replace(/&amp;\s*/gi, " & ")
        .replace(/\bamp;\s*/gi, " ")
        .replace(/&/g, " & ")
        .replace(/\s*&\s*/g, " & ");
      return `\\begin{${envName}}${cleanBody}\\end{${envName}}`;
    });

  return finalRes;
}

/**
 * Tokenize string into text, inline-math ($...$), and block-math ($$...$$)
 */
function parseMathSegments(text: string): Segment[] {
  const normalized = normalizeMathText(text);
  const segments: Segment[] = [];

  // Match $$...$$ or $...$
  const regex = /\$\$([\s\S]+?)\$\$|\$((?:\\\$|[^\$])+?)\$|(\\begin\{[a-zA-Z0-9*]+\}[\s\S]*?\\end\{[a-zA-Z0-9*]+\})/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(normalized)) !== null) {
    const matchIndex = match.index;

    // Plain text before math
    if (matchIndex > lastIndex) {
      segments.push({
        type: "text",
        content: normalized.substring(lastIndex, matchIndex),
      });
    }

    if (match[1] !== undefined) {
      // Block math $$...$$
      segments.push({
        type: "block-math",
        content: match[1].trim(),
      });
    } else if (match[2] !== undefined) {
      // Inline math $...$
      segments.push({
        type: "inline-math",
        content: match[2].trim(),
      });
    }

    lastIndex = regex.lastIndex;
  }

  // Remaining plain text
  if (lastIndex < normalized.length) {
    segments.push({
      type: "text",
      content: normalized.substring(lastIndex),
    });
  }

  return segments;
}

/**
 * Clean up TeX string to replace raw chemical arrows and mhchem fallbacks
 * with proper LaTeX vector arrows (\longrightarrow, \rightleftharpoons, \xrightarrow)
 */
function sanitizeTeXForWordArrows(tex: string, displayMode: boolean = false): string {
  if (!tex) return "";

  // Strip invisible Bidi directional tokens that break KaTeX parsing
  let cleaned = tex.replace(/[\u2066\u2067\u2068\u2069\u200E\u200F]/g, "");

  // If rendering inline (displayMode === false), convert display-only environments to inline-safe equivalents
  if (!displayMode) {
    cleaned = cleaned
      .replace(/\\begin\{align\*?\}/g, "\\begin{aligned}")
      .replace(/\\end\{align\*?\}/g, "\\end{aligned}")
      .replace(/\\begin\{gather\*?\}/g, "\\begin{gathered}")
      .replace(/\\end\{gather\*?\}/g, "\\end{gathered}")
      .replace(/\\begin\{equation\*?\}/g, "\\begin{aligned}")
      .replace(/\\end\{equation\*?\}/g, "\\end{aligned}")
      .replace(/\\begin\{multline\*?\}/g, "\\begin{aligned}")
      .replace(/\\end\{multline\*?\}/g, "\\end{aligned}");
  }

  // Replace any \ce{...} tags with \mathrm{...} or inner content
  cleaned = cleaned.replace(/\\ce\{([^}]+)\}/g, "\\mathrm{$1}");

  // Fix spaces between chemical element symbol and subscript number e.g. "NH 3" -> "NH_3", "H 2" -> "H_2"
  cleaned = cleaned.replace(/([A-Z][a-z]?)\s+([0-9]+)/g, "$1_$2");

  // Replace unsupported KaTeX environments with aligned
  cleaned = cleaned.replace(/\\begin\{equation\}/g, "\\begin{aligned}");
  cleaned = cleaned.replace(/\\end\{equation\}/g, "\\end{aligned}");
  cleaned = cleaned.replace(/\\begin\{math\}/g, "\\begin{aligned}");
  cleaned = cleaned.replace(/\\end\{math\}/g, "\\end{aligned}");
  cleaned = cleaned.replace(/\\begin\{eqnarray\}/g, "\\begin{aligned}");
  cleaned = cleaned.replace(/\\end\{eqnarray\}/g, "\\end{aligned}");

  // Convert chemical reaction arrows to LaTeX macros
  cleaned = cleaned
    .replace(/->\[\\Delta\]/g, " \\xrightarrow{\\Delta} ")
    .replace(/->\[([^\]]+)\]/g, " \\xrightarrow{\\text{$1}} ")
    .replace(/->|→|\\rightarrow/g, " \\longrightarrow ")
    .replace(/<=>|⇌|\\rightleftharpoons/g, " \\rightleftharpoons ");

  return cleaned;
}

/**
 * Safely render TeX string to HTML via KaTeX with MS Word arrow macros
 */
function renderTeXToHTML(tex: string, displayMode: boolean): string {
  try {
    const sanitized = sanitizeTeXForWordArrows(tex, displayMode);

    let html = katex.renderToString(sanitized, {
      displayMode,
      throwOnError: false,
      output: "htmlAndMathml",
      strict: false,
      macros: {
        "\\ce": "\\mathrm{#1}",
      },
    });

    if (html.includes("katex-error") || html.includes("ParseError")) {
      const fallbackSanitized = tex
        .replace(/\\begin\{align\*?\}/g, "\\begin{aligned}")
        .replace(/\\end\{align\*?\}/g, "\\end{aligned}")
        .replace(/\\begin\{gather\*?\}/g, "\\begin{gathered}")
        .replace(/\\end\{gather\*?\}/g, "\\end{gathered}")
        .replace(/\\begin\{equation\*?\}/g, "\\begin{aligned}")
        .replace(/\\end\{equation\*?\}/g, "\\end{aligned}")
        .replace(/\\begin\{multline\*?\}/g, "\\begin{aligned}")
        .replace(/\\end\{multline\*?\}/g, "\\end{aligned}");

      html = katex.renderToString(fallbackSanitized, {
        displayMode,
        throwOnError: false,
        output: "htmlAndMathml",
        strict: false,
        macros: {
          "\\ce": "\\mathrm{#1}",
        },
      });
    }

    return html;
  } catch (err) {
    try {
      const fallbackSanitized = tex
        .replace(/\\begin\{align\*?\}/g, "\\begin{aligned}")
        .replace(/\\end\{align\*?\}/g, "\\end{aligned}")
        .replace(/\\begin\{gather\*?\}/g, "\\begin{gathered}")
        .replace(/\\end\{gather\*?\}/g, "\\end{gathered}")
        .replace(/\\begin\{equation\*?\}/g, "\\begin{aligned}")
        .replace(/\\end\{equation\*?\}/g, "\\end{aligned}");

      return katex.renderToString(fallbackSanitized, {
        displayMode,
        throwOnError: false,
        output: "htmlAndMathml",
        strict: false,
      });
    } catch (e) {
      console.error("KaTeX rendering error:", err);
      const cleanErrText = tex.replace(/\\ce\{([^}]+)\}/g, "$1");
      return `<span class="text-slate-700 dark:text-slate-200 font-sans text-xs">${cleanErrText}</span>`;
    }
  }
}

/**
 * Helper to explicitly format pasted chemical/math equations in text inputs
 */
export function formatPastedEquation(raw: string): string {
  if (!raw) return "";

  let unescaped = raw
    .replace(/&amp;\s*amp;/gi, "&")
    .replace(/&amp;\s*/gi, "&")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#160;/g, " ")
    .replace(/\t/g, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"');

  let result = convertWordLinearMathToTeX(unescaped);
  result = convertMathMLInText(result);

  // Convert Unicode superscripts and subscripts to TeX _ and ^
  const unicodeMap: Record<string, string> = {
    '⁺': '^+', '⁻': '^-', '⁼': '^=', '⁽': '^(', '⁾': '^)',
    '⁰': '^0', '¹': '^1', '²': '^2', '³': '^3', '⁴': '^4',
    '⁵': '^5', '⁶': '^6', '⁷': '^7', '⁸': '^8', '⁹': '^9',
    '₊': '_+', '₋': '_-', '₌': '_=', '₍': '_(', '₎': '_)',
    '₀': '_0', '₁': '_1', '₂': '_2', '₃': '_3', '₄': '_4',
    '₅': '_5', '₆': '_6', '₇': '_7', '₈': '_8', '₉': '_9',
  };
  result = result.replace(/[⁺⁻⁼⁽⁾⁰¹²³⁴⁵⁶⁷⁸⁹₊₋₌₍₎₀₁₂₃₄₅₆₇₈₉]/g, (match) => unicodeMap[match] || match);

  // Clean up Word Unicode math garbage (e.g. 〖OH〗)
  result = result.replace(/〖/g, "").replace(/〗/g, "");

  // Strip any \ce{...}
  result = result.replace(/\\ce\{([^}]+)\}/g, "$1");

  // Process plain text parts that are outside $...$ or $$...$$
  const parts = result.split(/(\$\$[\s\S]+?\$\$|\$(?:\\\$|[^\$])+?\$)/g);

  const processed = parts.map((part) => {
    if (part.startsWith("$")) {
      return part.replace(/\\ce\{([^}]+)\}/g, "$1");
    }

    let textPart = part;

    // Normalize unicode reaction arrows
    textPart = textPart
      .replace(/[→➔⟶]/g, " \\longrightarrow ")
      .replace(/[⇌⇄]/g, " \\rightleftharpoons ");

    // Auto-detect chemical reaction equations pasted like "NH_3+HCl\rightarrow{NH}_4^++{Cl}^-" or "2H2 + O2 -> 2H2O"
    const mathBlockRegex =
      /((?:\\[a-zA-Z]+(?:\{[^}]*\})*|\{?[A-Za-z0-9_\^\+\-\(\)\[\]\{\}\/]+\}?|[→➔⟶⇌⇄±≠≤≥∞π∫∑√°]|\->|<=>)(?:[ \t]*(?:\\[a-zA-Z]+(?:\{[^}]*\})*|\{?[A-Za-z0-9_\^\+\-\(\)\[\]\{\}\/]+\}?|[→➔⟶⇌⇄±≠≤≥∞π∫∑√°]|\->|<=>|\+|=|-|\/))*)/g;

    textPart = textPart.replace(mathBlockRegex, (match) => {
      const trimmed = match.trim();
      if (
        /\\|_|\^|->|→|➔|⟶|⇌|⇄|<=>|\\rightarrow|\\longrightarrow|\\rightleftharpoons|\\xrightarrow|\\frac|\\sqrt|\\ce|\\mathrm|\\text|\{/.test(
          trimmed,
        )
      ) {
        return `$${trimmed}$`;
      }
      return match;
    });

    // Auto-detect bare chemical ions with charges like Na^+, OH^-, H3O^+, Cl^-
    const ionRegex =
      /(?:^|\b|\s)(\{?[A-Z][a-zA-Z0-9\(\)]*\}?\^[\+\-0-9]+)(?:\b|\s|$)/g;
    const subParts = textPart.split(/(\$(?:\\\$|[^\$])+?\$)/g);
    textPart = subParts
      .map((subPart) => {
        if (subPart.startsWith("$")) return subPart;
        return subPart.replace(ionRegex, (match, p1) =>
          match.replace(p1, `$${p1}$`),
        );
      })
      .join("");

    return textPart;
  });

  let finalRes = processed.join("");

  // Post-process: clean up orphan or duplicate dollar delimiters and amp; in matrix environments
  finalRes = finalRes
    .replace(/\\begin\{([a-zA-Z]+)\}([\s\S]*?)\\end\{\1\}/g, (match, envName, body) => {
      const cleanBody = body
        .replace(/&amp;\s*/gi, " & ")
        .replace(/\bamp;\s*/gi, " ")
        .replace(/&/g, " & ")
        .replace(/\s*&\s*/g, " & ");
      return `\\begin{${envName}}${cleanBody}\\end{${envName}}`;
    });

  return finalRes.trim();
}

/**
 * Process an HTML string, find text nodes containing math, and replace them with rendered KaTeX HTML
 */
export function processHtmlWithMath(html: string): string {
  if (typeof window === "undefined" || !html) return html;

  try {
    let cleanInputHtml = cleanLeakedTokens(unescapeHtmlEntities(html));
    cleanInputHtml = convertWordLinearMathToTeX(cleanInputHtml);
    cleanInputHtml = convertMathMLInText(cleanInputHtml);
    cleanInputHtml = normalizeHtmlLists(cleanInputHtml);

    const parser = new DOMParser();
    const doc = parser.parseFromString(cleanInputHtml, "text/html");

    // Pre-convert <sub> and <sup> tags to TeX _ and ^ in the DOM tree
    Array.from(doc.querySelectorAll("sub")).forEach((sub) => {
      if (sub.parentNode) {
        sub.parentNode.replaceChild(doc.createTextNode(`_{${sub.textContent?.trim() || ""}}`), sub);
      }
    });
    Array.from(doc.querySelectorAll("sup")).forEach((sup) => {
      if (sup.parentNode) {
        sup.parentNode.replaceChild(doc.createTextNode(`^{${sup.textContent?.trim() || ""}}`), sup);
      }
    });

    // Clean and normalize table elements
    const tables = doc.querySelectorAll("table");
    tables.forEach((table) => {
      (table as HTMLElement).style.borderCollapse = "collapse";
      if (!(table as HTMLElement).style.width) {
        (table as HTMLElement).style.width = "100%";
      }
      (table as HTMLElement).style.margin = "0.5rem 0";
    });

    const cells = doc.querySelectorAll("th, td");
    cells.forEach((cell) => {
      const el = cell as HTMLElement;
      if (!el.style.border) {
        el.style.border = "1px solid currentColor";
        el.style.opacity = "0.85";
      }
      if (!el.style.padding) {
        el.style.padding = "4px 8px";
      }
    });

    // Convert any <tiptap-math data-latex="..."> or <span data-type="equation" data-latex="..."> into rendered KaTeX
    const tiptapMathEls = doc.querySelectorAll('tiptap-math, [data-type="equation"]');
    tiptapMathEls.forEach((el) => {
      const latex = el.getAttribute('data-latex') || el.getAttribute('data-tex') || el.textContent || '';
      const isDisplay = el.getAttribute('data-display') === 'true' || el.tagName.toLowerCase() === 'tiptap-math-block';
      if (latex) {
        const rendered = renderTeXToHTML(latex, isDisplay);
        const span = document.createElement(isDisplay ? 'div' : 'span');
        span.className = isDisplay
          ? 'math-block-wrapper-preview my-2.5 py-3.5 px-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 overflow-x-auto text-center [direction:ltr] print:my-1 print:p-0 print:bg-transparent'
          : 'inline-block px-1 align-baseline [direction:ltr] [text-align:left]';
        span.dir = 'ltr';
        span.style.direction = 'ltr';
        span.style.unicodeBidi = 'isolate';
        span.innerHTML = rendered;
        el.parentNode?.replaceChild(span, el);
      }
    });

    // Provide bidi isolation only to pure math block lines. For normal text, we trust HTML dir="auto"
    const blockEls = doc.querySelectorAll("p, div, li, td, th, h1, h2, h3, h4, h5, h6");
    blockEls.forEach((el) => {
      if (!el.hasAttribute("dir")) {
        el.setAttribute("dir", "auto");
      }
    });

    // Hard Normalization: Strip legacy inline spacing to force consistent CSS defaults for all cards
    const allStyledElements = doc.querySelectorAll("p, li, ul, ol, div, span, h1, h2, h3, h4, h5, h6");
    allStyledElements.forEach((el) => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.removeProperty("margin-top");
      htmlEl.style.removeProperty("margin-bottom");
      htmlEl.style.removeProperty("margin-left");
      htmlEl.style.removeProperty("margin-right");
      htmlEl.style.removeProperty("margin");
      htmlEl.style.removeProperty("padding-top");
      htmlEl.style.removeProperty("padding-bottom");
      htmlEl.style.removeProperty("line-height");
      htmlEl.removeAttribute("data-paragraph-spacing");
      
      if (htmlEl.getAttribute("style") === "") {
        htmlEl.removeAttribute("style");
      }
    });

    // Walk the DOM and find text nodes
    const walk = document.createTreeWalker(
      doc.body,
      NodeFilter.SHOW_TEXT,
      null,
    );
    const textNodes: Node[] = [];
    let node;
    while ((node = walk.nextNode())) {
      textNodes.push(node);
    }

    textNodes.forEach((textNode) => {
      if (textNode.parentElement?.closest('.katex, .katex-html, .katex-mathml, tiptap-math, [data-type="equation"], script, style')) {
        return;
      }
      const text = textNode.nodeValue;
      if (!text) return;
      const hasIndicators =
        /[\$\^\\_→⇌➔⟶⇅⁺⁻⁼⁽⁾⁰¹²³⁴⁵⁶⁷⁸⁹₊₋₌₍₎₀₁₂₃₄₅₆₇₈₉\=\+\-\*\/\×\÷\±\≠\<\>\≤\≥]/.test(text) ||
        text.includes("->") ||
        text.includes("<=>") ||
        text.includes("■") ||
        text.includes("\u25A0") ||
        text.includes("matrix") ||
        isMathEquationLine(text);
      if (!hasIndicators) return;

      const segments = parseMathSegments(text);
      let hasMath = false;

      // If there's math, we need to replace this text node with multiple nodes/spans
      const fragment = document.createDocumentFragment();

      segments.forEach((seg) => {
        if (seg.type === "text") {
          fragment.appendChild(document.createTextNode(seg.content));
        } else {
          hasMath = true;
          const isBlock = seg.type === "block-math";
          const renderedHtml = renderTeXToHTML(seg.content, isBlock);

          const wrapper = document.createElement(isBlock ? "div" : "span");
          wrapper.className = isBlock
            ? "math-block-wrapper-preview my-2.5 py-3.5 px-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 overflow-x-auto text-center [direction:ltr] print:my-1 print:p-0 print:bg-transparent"
            : "inline-block px-1 align-baseline [direction:ltr] [text-align:left]";
          if (isBlock) {
            wrapper.style.overflowY = "visible";
          }
          wrapper.dir = "ltr";
          wrapper.style.direction = "ltr";
          wrapper.style.unicodeBidi = "isolate";
          wrapper.innerHTML = renderedHtml;
          fragment.appendChild(wrapper);
        }
      });

      if (hasMath && textNode.parentNode) {
        textNode.parentNode.replaceChild(fragment, textNode);
      }
    });

    return normalizeHtmlLists(doc.body.innerHTML);
  } catch (err) {
    console.error("Error processing HTML for math:", err);
    return html;
  }
}

export const MathText: React.FC<MathTextProps> = ({
  text,
  className = "",
  inline = false,
  dir,
  style,
  onEquationClick,
}) => {
  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: '400px 0px',
  });

  if (!text) return null;
  const sanitizedText = cleanLeakedTokens(unescapeHtmlEntities(text));

  const computedDir = dir || "auto";

  // Check if text contains structured HTML line blocks or formatting tags
  const isHtmlBlocks = /<(p|div|span|strong|b|em|i|u|s|mark|font|table|ul|ol|li|h1|h2|h3|h4|h5|h6|img|br)\b/i.test(sanitizedText);

  // Always render math/text immediately without offscreen pulse placeholder
  // so DOM measurements, A4 pagination, and PDF export work 100% reliably.

  if (isHtmlBlocks && typeof window !== "undefined") {
    const processedHtml = processHtmlWithMath(sanitizedText);
    const Wrapper = inline ? "span" : "div";
    return (
      <Wrapper
        ref={ref}
        dir={computedDir as any}
        className={`math-text-container prose prose-sm dark:prose-invert max-w-none break-words ${inline ? "inline [&_p]:inline [&_p]:m-0 [&_div]:inline [&_div]:m-0" : ""} ${className}`}
        style={{ ...style }}
        dangerouslySetInnerHTML={{ __html: processedHtml }}
      />
    );
  }

  const segments = parseMathSegments(sanitizedText);

  const Component = inline ? "span" : "div";
  return (
    <Component
      ref={ref}
      dir={computedDir as any}
      className={`math-text-container break-words ${className}`}
      style={{ ...style }}
    >
      {segments.map((seg, idx) => {
        if (seg.type === "text") {
          // Render plain text with newlines preserved
          return (
            <span key={idx} className="whitespace-pre-wrap">
              {renderMixedText(seg.content)}
            </span>
          );
        }

        const isBlock = seg.type === "block-math";
        const html = renderTeXToHTML(seg.content, isBlock);

        if (isBlock) {
          return (
            <div
              key={idx}
              dir="ltr"
              style={{
                direction: "ltr",
                unicodeBidi: "isolate",

                overflowY: "visible",
              }}
              onClick={(e) => {
                if (onEquationClick) {
                  e.stopPropagation();
                  onEquationClick(`$$${seg.content}$$`);
                } else if (typeof (window as any).__openGlobalEquationEditor === "function") {
                  e.stopPropagation();
                  (window as any).__openGlobalEquationEditor({ text: `$$${seg.content}$$` });
                }
              }}
              className={`math-block-wrapper-preview my-2.5 py-3.5 px-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 overflow-x-auto text-center [direction:ltr] print:my-1 print:p-0 print:bg-transparent ${onEquationClick || typeof (window as any).__openGlobalEquationEditor === "function" ? "cursor-pointer hover:border hover:border-blue-400 transition-all active:scale-[0.99]" : ""}`}
              title={onEquationClick || typeof (window as any).__openGlobalEquationEditor === "function" ? "انقر لتعديل هذه المعادلة" : undefined}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        }

        return (
          <span
            key={idx}
            dir="ltr"
            style={{ direction: "ltr", unicodeBidi: "isolate" }}
            onClick={(e) => {
              if (onEquationClick) {
                e.stopPropagation();
                onEquationClick(`$${seg.content}$`);
              } else if (typeof (window as any).__openGlobalEquationEditor === "function") {
                e.stopPropagation();
                (window as any).__openGlobalEquationEditor({ text: `$${seg.content}$` });
              }
            }}
            className={`inline-block px-1 align-baseline [direction:ltr] [text-align:left] ${
              onEquationClick || typeof (window as any).__openGlobalEquationEditor === "function" ? "cursor-pointer hover:bg-blue-100/80 rounded transition-colors active:scale-[0.98]" : ""
            }`}
            title={onEquationClick || typeof (window as any).__openGlobalEquationEditor === "function" ? "انقر لتعديل هذه المعادلة" : undefined}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
    </Component>
  );
};

/**
 * Render HTML line blocks (<div style="...">inner</div>) with KaTeX math inside
 */
function renderFormattedHtmlWithMath(
  rawText: string,
  inline: boolean = false,
  dir: string = "rtl",
): React.ReactNode {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawText, "text/html");
    const childNodes = Array.from(doc.body.childNodes);

    if (childNodes.length === 0) return null;

    const Wrapper = inline ? "span" : "div";

    return (
      <Wrapper dir={dir} className={inline ? "space-x-1" : "space-y-1"}>
        {childNodes.map((node, nodeIdx) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            const styleAttr = el.getAttribute("style") || "";
            const rawDirAttr = el.getAttribute("dir") || el.getAttribute("data-dir");

            const styleObj: React.CSSProperties = {};
            styleAttr.split(";").forEach((pair) => {
              const idx = pair.indexOf(":");
              if (idx > -1) {
                const k = pair.substring(0, idx).trim().toLowerCase();
                const v = pair.substring(idx + 1).trim();
                if (k === "text-align") styleObj.textAlign = v as any;
                if (k === "font-size") styleObj.fontSize = v;
                if (k === "font-weight") styleObj.fontWeight = v as any;
                if (k === "font-style") styleObj.fontStyle = v as any;
                if (k === "color") styleObj.color = v;
                if (k === "direction") styleObj.direction = v as any;
              }
            });

            const dirAttr = (rawDirAttr || styleObj.direction || (dir !== "auto" ? dir : "rtl")) as "rtl" | "ltr";
            styleObj.direction = dirAttr;
            

            const imgEl = el.querySelector("img");
            const imgSrc = imgEl ? imgEl.getAttribute("src") : null;

            // Pre-convert <sub> and <sup> tags inside el to TeX _ and ^
            Array.from(el.querySelectorAll("sub")).forEach((sub) => {
              if (sub.parentNode) {
                sub.parentNode.replaceChild(doc.createTextNode(`_{${sub.textContent?.trim() || ""}}`), sub);
              }
            });
            Array.from(el.querySelectorAll("sup")).forEach((sup) => {
              if (sup.parentNode) {
                sup.parentNode.replaceChild(doc.createTextNode(`^{${sup.textContent?.trim() || ""}}`), sup);
              }
            });

            const plainText = el.textContent || "";
            const segments = parseMathSegments(plainText);

            const NodeWrapper = inline ? "span" : "div";

            return (
              <NodeWrapper
                key={nodeIdx}
                style={styleObj}
                dir={dirAttr}
                className={`leading-relaxed ${inline ? "inline-block ml-1" : ""}`}
              >
                {imgSrc && (
                  <div
                    className={
                      inline ? "inline-block mx-2 align-middle" : "my-2"
                    }
                    style={{ textAlign: styleObj.textAlign || "center" }}
                  >
                    <img
                      src={imgSrc}
                      alt="صورة توضيحية"
                      className="max-w-full h-auto rounded-xl shadow-xs inline-block"
                      style={{ maxHeight: inline ? "60px" : "320px" }}
                    />
                  </div>
                )}
                {segments.map((seg, sIdx) => {
                  if (seg.type === "text") {
                    return (
                      <span key={sIdx} className="whitespace-pre-wrap">
                        {renderMixedText(seg.content)}
                      </span>
                    );
                  }
                  const isBlock = seg.type === "block-math";
                  const html = renderTeXToHTML(seg.content, isBlock);
                  return (
                    <span
                      key={sIdx}
                      dir="ltr"
                      style={{ direction: "ltr", unicodeBidi: "isolate" }}
                      className={
                        isBlock && !inline
                          ? "block my-1 text-center"
                          : "inline-block px-1 align-baseline [direction:ltr] [text-align:left]"
                      }
                      dangerouslySetInnerHTML={{ __html: html }}
                    />
                  );
                })}
              </NodeWrapper>
            );
          } else if (
            node.nodeType === Node.TEXT_NODE &&
            node.textContent?.trim()
          ) {
            const segments = parseMathSegments(node.textContent);
            const NodeWrapper = inline ? "span" : "div";
            return (
              <NodeWrapper
                key={nodeIdx}
                dir={dir}
                className={`whitespace-pre-wrap ${inline ? "inline-block ml-1" : ""}`}
              >
                {segments.map((seg, sIdx) => {
                  if (seg.type === "text")
                    return (
                      <span key={sIdx}>{renderMixedText(seg.content)}</span>
                    );
                  const isBlock = seg.type === "block-math";
                  const html = renderTeXToHTML(seg.content, isBlock);
                  return (
                    <span
                      key={sIdx}
                      dir="ltr"
                      style={{ direction: "ltr", unicodeBidi: "isolate" }}
                      className="inline-block px-1 align-baseline [direction:ltr] [text-align:left]"
                      dangerouslySetInnerHTML={{ __html: html }}
                    />
                  );
                })}
              </NodeWrapper>
            );
          }
          return null;
        })}
      </Wrapper>
    );
  } catch (err) {
    console.error("Error rendering HTML formatted math:", err);
    return null;
  }
}
