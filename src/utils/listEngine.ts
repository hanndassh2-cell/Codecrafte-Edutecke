/**
 * Centralized List and Numbering Engine (RTL / LTR BiDi Compliant)
 * 
 * Provides unified definitions, mathematical counters, Unicode glyph mappers,
 * and BiDi isolation utilities across all editors, previews, cards, printing, and exporters.
 */

export interface BulletStyleDefinition {
  id: string;
  glyph: string;
  label: string;
  category: "classic" | "geometric" | "marks" | "visual";
}

export interface NumberStyleDefinition {
  id: string;
  label: string;
  sample: string;
  type: "decimal" | "alphabetic" | "abjad" | "roman" | "circled" | "circled-filled";
  suffix: string;
}

export const BULLET_STYLES: BulletStyleDefinition[] = [
  // Classic & Basic
  { id: "solid-circle", glyph: "●", label: "دائرة ممتلئة", category: "classic" },
  { id: "disc", glyph: "•", label: "نقطة دائرية ممتلئة", category: "classic" },
  { id: "circle", glyph: "○", label: "دائرة مفرغة", category: "classic" },
  { id: "square", glyph: "■", label: "مربع ممتلئ", category: "geometric" },
  { id: "white-square", glyph: "□", label: "مربع مفرغ", category: "geometric" },
  { id: "diamond", glyph: "◆", label: "معين ممتلئ", category: "geometric" },
  { id: "white-diamond", glyph: "◇", label: "معين مفرغ", category: "geometric" },
  
  // Stars & Visual Marks
  { id: "star", glyph: "★", label: "نجمة ممتلئة", category: "marks" },
  { id: "white-star", glyph: "☆", label: "نجمة مفرغة", category: "marks" },
  { id: "check", glyph: "✓", label: "علامة صح", category: "marks" },
  { id: "heavy-check", glyph: "✔", label: "علامة صح عريضة", category: "marks" },
  { id: "arrow", glyph: "➤", label: "سهم مؤشر", category: "marks" },
  
  // Rich Visual Icons
  { id: "blue-diamond", glyph: "🔹", label: "معين أزرق", category: "visual" },
  { id: "bulb", glyph: "💡", label: "فكرة / إضاءة", category: "visual" },
  { id: "pin", glyph: "📌", label: "دبوس تثبيت", category: "visual" },
];

export const NUMBER_STYLES: NumberStyleDefinition[] = [
  { id: "arabic-indic", label: "١، ٢، ٣ (أرقام عربية)", sample: "١. ٢. ٣.", type: "decimal", suffix: "." },
  { id: "arabic-alpha", label: "أ، ب، ت، ث (حروف هجائية)", sample: "أ. ب. ت.", type: "alphabetic", suffix: "." },
  { id: "decimal", label: "1, 2, 3 (أرقام مع نقطة)", sample: "1. 2. 3.", type: "decimal", suffix: "." },
  { id: "decimal-paren", label: "1), 2), 3) (أرقام مع قوس)", sample: "1) 2) 3)", type: "decimal", suffix: ")" },
  { id: "decimal-dash", label: "1-, 2-, 3- (أرقام مع شرطة)", sample: "1- 2- 3-", type: "decimal", suffix: "-" },
  { id: "arabic-abjad", label: "أ، ب، ج، د (أبجدي عربي مع نقطة)", sample: "أ. ب. ج.", type: "abjad", suffix: "." },
  { id: "arabic-abjad-paren", label: "أ)، ب)، ج) (أبجدي مع قوس)", sample: "أ) ب) ج)", type: "abjad", suffix: ")" },
  { id: "arabic-abjad-dash", label: "أ-، ب-، ج- (أبجدي مع شرطة)", sample: "أ- ب- ج-", type: "abjad", suffix: "-" },
  { id: "upper-alpha", label: "A, B, C (حروف إنجليزية كبيرة)", sample: "A. B. C.", type: "alphabetic", suffix: "." },
  { id: "lower-alpha", label: "a, b, c (حروف إنجليزية صغيرة)", sample: "a. b. c.", type: "alphabetic", suffix: "." },
  { id: "upper-roman", label: "I, II, III (أرقام رومانية كبيرة)", sample: "I. II. III.", type: "roman", suffix: "." },
  { id: "lower-roman", label: "i, ii, iii (أرقام رومانية صغيرة)", sample: "i. ii. iii.", type: "roman", suffix: "." },
  { id: "circled", label: "①, ②, ③ (أرقام دائرية مفرغة)", sample: "① ② ③", type: "circled", suffix: "" },
  { id: "circled-filled", label: "❶, ❷, ❸ (أرقام دائرية مصمتة)", sample: "❶ ❷ ❸", type: "circled-filled", suffix: "" },
];

export const ARABIC_ABJAD_LETTERS = [
  "أ", "ب", "ج", "د", "هـ", "و", "ز", "ح", "ط", "ي",
  "ك", "ل", "م", "ن", "س", "ع", "ف", "ص", "ق", "ر",
  "ش", "ت", "ث", "خ", "ذ", "ض", "ظ", "غ"
];

export const CIRCLED_NUMBERS = [
  "①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩",
  "⑪", "⑫", "⑬", "⑭", "⑮", "⑯", "⑰", "⑱", "⑲", "⑳",
  "㉑", "㉒", "㉓", "㉔", "㉕", "㉖", "㉗", "㉘", "㉙", "㉚",
  "㉛", "㉜", "㉝", "㉞", "㉟", "㊱", "㊲", "㊳", "㊴", "㊵",
  "㊶", "㊷", "㊸", "㊹", "㊺", "㊻", "㊼", "㊽", "㊾", "㊿"
];

export const CIRCLED_FILLED_NUMBERS = [
  "❶", "❷", "❸", "❹", "❺", "❻", "❼", "❽", "❾", "❿",
  "⓫", "⓬", "⓭", "⓮", "⓯", "⓰", "⓱", "⓲", "⓳", "⓴"
];

/**
 * Convert number to Roman numerals
 */
export function toRomanNumeral(num: number, upper = true): string {
  if (num < 1 || num > 3999) return String(num);
  const lookup: [number, string][] = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]
  ];
  let res = "";
  let n = num;
  for (const [val, roman] of lookup) {
    while (n >= val) {
      res += roman;
      n -= val;
    }
  }
  return upper ? res : res.toLowerCase();
}

/**
 * Formats a list item marker mathematically with strict BiDi isolation.
 * Prevents the RTL punctuation inversion bug where "1." turns into ".1".
 */
export function formatListMarker(
  index: number,
  style: string = "decimal",
  dir: "rtl" | "ltr" | "auto" = "rtl"
): string {
  const normStyle = (style || "decimal").trim();

  // Bullet styles
  const bulletMatch = BULLET_STYLES.find(
    (b) => b.id === normStyle || b.glyph === normStyle
  );
  if (bulletMatch) {
    return bulletMatch.glyph;
  }

  // Numbered styles
  if (normStyle === "circled") {
    return CIRCLED_NUMBERS[index - 1] || `(${index})`;
  }
  if (normStyle === "circled-filled") {
    return CIRCLED_FILLED_NUMBERS[index - 1] || `[${index}]`;
  }

  if (normStyle.startsWith("arabic-abjad")) {
    const letter = ARABIC_ABJAD_LETTERS[(index - 1) % ARABIC_ABJAD_LETTERS.length] || "أ";
    if (normStyle.includes("paren")) return `${letter})`;
    if (normStyle.includes("dash")) return `${letter}-`;
    return `${letter}.`;
  }

  if (normStyle === "upper-alpha") {
    const letter = String.fromCharCode(65 + ((index - 1) % 26));
    return `${letter}.`;
  }
  if (normStyle === "lower-alpha") {
    const letter = String.fromCharCode(97 + ((index - 1) % 26));
    return `${letter}.`;
  }

  if (normStyle === "upper-roman") {
    return `${toRomanNumeral(index, true)}.`;
  }
  if (normStyle === "lower-roman") {
    return `${toRomanNumeral(index, false)}.`;
  }

  if (normStyle === "decimal-paren") {
    return `${index})`;
  }
  if (normStyle === "decimal-dash") {
    return `${index}-`;
  }

  if (normStyle === "arabic-indic") return `${String(index).replace(/\d/g, digit => "٠١٢٣٤٥٦٧٨٩"[Number(digit)])}.`;
  if (normStyle === "arabic-alpha") {
    const alphabet = ["أ", "ب", "ت", "ث", "ج", "ح", "خ", "د", "ذ", "ر", "ز", "س", "ش", "ص", "ض", "ط", "ظ", "ع", "غ", "ف", "ق", "ك", "ل", "م", "ن", "هـ", "و", "ي"];
    let n = index, result = "";
    while (n > 0) { n--; result = alphabet[n % alphabet.length] + result; n = Math.floor(n / alphabet.length); }
    return `${result}.`;
  }

  // Standard decimal
  return `${index}.`;
}

const RTL_SCRIPT_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u0590-\u05FF]/;
const LTR_SCRIPT_REGEX = /[A-Za-z]/;
const MATH_INDICATOR_REGEX = /[\$\^\\_→⇌➔⟶⇅⁺⁻⁼⁽⁾⁰¹²³⁴⁵⁶⁷⁸⁹₊₋₌₍₎₀₁₂₃₄₅₆₇₈₉\=\+\-\*\/\×\÷\±\≠\<\>\≤\≥]|->|<=>|\\frac|\\sqrt|\\ce|\\mathrm|\\begin/;

export function detectListScriptDirection(text: string, fallbackDir: "rtl" | "ltr" = "rtl"): "rtl" | "ltr" {
  if (!text || !text.trim()) return fallbackDir;
  
  // Math equations are always LTR
  if (text.includes("$$") || text.includes("$") || text.includes("\\frac") || (MATH_INDICATOR_REGEX.test(text) && !RTL_SCRIPT_REGEX.test(text))) {
    return "ltr";
  }
  
  if (RTL_SCRIPT_REGEX.test(text)) {
    return "rtl";
  }
  
  if (LTR_SCRIPT_REGEX.test(text)) {
    return "ltr";
  }
  
  return fallbackDir;
}

/**
 * Normalizes and sanitizes HTML lists to ensure unified styling,
 * correct data attributes, and BiDi isolation.
 */
export function normalizeHtmlLists(html: string): string {
  if (!html || typeof window === "undefined") return html;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Process unordered lists (UL)
    doc.querySelectorAll("ul").forEach((ul) => {
      const existingStyle =
        ul.getAttribute("data-list-style") ||
        ul.getAttribute("data-bullet-symbol") ||
        ul.getAttribute("data-bullet-icon") ||
        "disc";

      // Match against known bullets or default to disc
      const matchedBullet = BULLET_STYLES.find(
        (b) => b.id === existingStyle || b.glyph === existingStyle
      );
      const glyph = matchedBullet ? matchedBullet.glyph : existingStyle;
      const styleId = matchedBullet ? matchedBullet.id : existingStyle;

      ul.setAttribute("data-list-style", styleId);
      ul.style.setProperty("--list-style", `'${glyph} '`);

      const ulDirMode = ul.getAttribute("data-dir-mode");
      const ulExplicitDir = ul.getAttribute("dir") || ul.getAttribute("data-dir");

      let ulDir: "rtl" | "ltr";
      if (ulDirMode === "manual" && (ulExplicitDir === "ltr" || ulExplicitDir === "rtl")) {
        ulDir = ulExplicitDir as "rtl" | "ltr";
      } else {
        ulDir = detectListScriptDirection(ul.textContent || "", "rtl");
      }

      ul.setAttribute("dir", ulDir);
      ul.setAttribute("data-dir", ulDir);
      ul.style.direction = ulDir;
      // Removed explicit textAlign
      // Removed unicodeBidi isolation

      ul.querySelectorAll(":scope > li").forEach((li) => {
        const liDirMode = li.getAttribute("data-dir-mode");
        const liExplicitDir = li.getAttribute("dir") || li.getAttribute("data-dir");

        let liDir: "rtl" | "ltr";
        if (liDirMode === "manual" && (liExplicitDir === "ltr" || liExplicitDir === "rtl")) {
          liDir = liExplicitDir as "rtl" | "ltr";
        } else {
          liDir = detectListScriptDirection(li.textContent || "", ulDir);
        }

        li.setAttribute("dir", liDir);
        li.setAttribute("data-dir", liDir);
        (li as HTMLElement).style.direction = liDir;
      // Removed explicit textAlign
      // Removed unicodeBidi isolation

        // Also normalize child paragraphs in the list item
        li.querySelectorAll<HTMLParagraphElement>(":scope > p").forEach((p) => {
          const explicitDir = p.getAttribute("dir") || p.getAttribute("data-dir");
          const paragraphDir = p.getAttribute("data-dir-mode") === "manual" && (explicitDir === "rtl" || explicitDir === "ltr") ? explicitDir : liDir;
          p.setAttribute("dir", paragraphDir);
          p.setAttribute("data-dir", paragraphDir);
          p.style.direction = paragraphDir;
      // Removed explicit textAlign
      // Removed unicodeBidi isolation
        });
      });
    });

    // Process ordered lists (OL)
    doc.querySelectorAll("ol").forEach((ol) => {
      let styleId = ol.getAttribute("data-list-style") || "decimal";
      
      // Auto-detect style from type attribute or className if present
      const typeAttr = ol.getAttribute("type");
      if (typeAttr === "A") styleId = "upper-alpha";
      else if (typeAttr === "a") styleId = "lower-alpha";
      else if (typeAttr === "I") styleId = "upper-roman";
      else if (typeAttr === "i") styleId = "lower-roman";

      ol.setAttribute("data-list-style", styleId);

      const olDirMode = ol.getAttribute("data-dir-mode");
      const olExplicitDir = ol.getAttribute("dir") || ol.getAttribute("data-dir");

      let olDir: "rtl" | "ltr";
      if (olDirMode === "manual" && (olExplicitDir === "ltr" || olExplicitDir === "rtl")) {
        olDir = olExplicitDir as "rtl" | "ltr";
      } else {
        olDir = detectListScriptDirection(ol.textContent || "", "rtl");
      }

      ol.setAttribute("dir", olDir);
      ol.setAttribute("data-dir", olDir);
      ol.style.direction = olDir;
      // Removed explicit textAlign
      // Removed unicodeBidi isolation

      ol.querySelectorAll(":scope > li").forEach((li) => {
        const liDirMode = li.getAttribute("data-dir-mode");
        const liExplicitDir = li.getAttribute("dir") || li.getAttribute("data-dir");

        let liDir: "rtl" | "ltr";
        if (liDirMode === "manual" && (liExplicitDir === "ltr" || liExplicitDir === "rtl")) {
          liDir = liExplicitDir as "rtl" | "ltr";
        } else {
          liDir = detectListScriptDirection(li.textContent || "", olDir);
        }

        li.setAttribute("dir", liDir);
        li.setAttribute("data-dir", liDir);
        (li as HTMLElement).style.direction = liDir;
      // Removed explicit textAlign
      // Removed unicodeBidi isolation

        // Also normalize child paragraphs in the list item
        li.querySelectorAll<HTMLParagraphElement>(":scope > p").forEach((p) => {
          const explicitDir = p.getAttribute("dir") || p.getAttribute("data-dir");
          const paragraphDir = p.getAttribute("data-dir-mode") === "manual" && (explicitDir === "rtl" || explicitDir === "ltr") ? explicitDir : liDir;
          p.setAttribute("dir", paragraphDir);
          p.setAttribute("data-dir", paragraphDir);
          p.style.direction = paragraphDir;
      // Removed explicit textAlign
      // Removed unicodeBidi isolation
        });
      });
    });

    return doc.body.innerHTML;
  } catch (e) {
    console.error("Error normalizing HTML lists:", e);
    return html;
  }
}

/**
 * Detects if a plain text line is a list item and extracts its marker and content
 */
export function parsePlainTextListItem(line: string): {
  isList: boolean;
  type: "bullet" | "ordered" | null;
  style: string;
  marker: string;
  content: string;
  indent: number;
} {
  const raw = line || "";
  const indentMatch = raw.match(/^(\s*)/);
  const indent = indentMatch ? indentMatch[1].length : 0;
  const trimmed = raw.trim();

  // Check symbolic bullets
  for (const b of BULLET_STYLES) {
    if (trimmed.startsWith(b.glyph)) {
      const content = trimmed.substring(b.glyph.length).trim();
      if (content.length > 0) {
        return {
          isList: true,
          type: "bullet",
          style: b.id,
          marker: b.glyph,
          content,
          indent,
        };
      }
    }
  }

  // Check additional plain text bullet chars: -, *, +, · (Must be followed by at least one space and text)
  const genericBulletMatch = trimmed.match(/^([-*+·])\s+(.+)/);
  if (genericBulletMatch) {
    return {
      isList: true,
      type: "bullet",
      style: "disc",
      marker: "•",
      content: genericBulletMatch[2].trim(),
      indent,
    };
  }

  // Check Circled numbers ① ② ③ or ❶ ❷ ❸
  const firstChar = trimmed.charAt(0);
  if (CIRCLED_NUMBERS.includes(firstChar) || CIRCLED_FILLED_NUMBERS.includes(firstChar)) {
    const isFilled = CIRCLED_FILLED_NUMBERS.includes(firstChar);
    const content = trimmed.substring(1).trim();
    if (content.length > 0) {
      return {
        isList: true,
        type: "ordered",
        style: isFilled ? "circled-filled" : "circled",
        marker: firstChar,
        content,
        indent,
      };
    }
  }

  // Check Arabic Abjad list: أ. أو أ) أو أ-
  const abjadMatch = trimmed.match(/^([أ-ي])([\.\)\-])\s+(.+)/);
  if (abjadMatch) {
    const letter = abjadMatch[1];
    const sep = abjadMatch[2];
    const content = abjadMatch[3].trim();
    
    // Avoid false positives for titles like "د. خالد" or "أ. محمد" or "م. أحمد"
    const isHonorific = (letter === "د" || letter === "أ" || letter === "م") && sep === "." && !content.includes(":") && content.split(/\s+/).length <= 3;

    if (!isHonorific) {
      const style = sep === ")" ? "arabic-abjad-paren" : sep === "-" ? "arabic-abjad-dash" : "arabic-abjad";
      return {
        isList: true,
        type: "ordered",
        style,
        marker: `${letter}${sep}`,
        content,
        indent,
      };
    }
  }

  // Check Decimal numbers: 1. or 1) or 1- (Must have \s+ so 1.5 or 3.14 are not matched)
  const numMatch = trimmed.match(/^(\d+)([\.\)\-])\s+(.+)/);
  if (numMatch) {
    const num = numMatch[1];
    const sep = numMatch[2];
    const content = numMatch[3].trim();
    const style = sep === ")" ? "decimal-paren" : sep === "-" ? "decimal-dash" : "decimal";
    return {
      isList: true,
      type: "ordered",
      style,
      marker: `${num}${sep}`,
      content,
      indent,
    };
  }

  // Check Latin alphabetic: A. or A) or a. or a) (Must have \s+)
  const alphaMatch = trimmed.match(/^([a-zA-Z])([\.\)\-])\s+(.+)/);
  if (alphaMatch) {
    const char = alphaMatch[1];
    const sep = alphaMatch[2];
    const isUpper = char === char.toUpperCase();
    return {
      isList: true,
      type: "ordered",
      style: isUpper ? "upper-alpha" : "lower-alpha",
      marker: `${char}${sep}`,
      content: alphaMatch[3].trim(),
      indent,
    };
  }

  // Not a list line
  return {
    isList: false,
    type: null,
    style: "",
    marker: "",
    content: trimmed,
    indent,
  };
}
