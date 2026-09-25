/**
 * Pure Math Conversion & Sanitization Engine
 * Extracted pure utilities without CSS/DOM dependencies for Node and browser runtime.
 */

export function convertWordLinearMathToTeX(input: string): string {
  if (!input) return "";

  let result = "";
  let i = 0;
  let cleanInput = input
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&nbsp;/gi, " ");

  const triggers = [
    "■", "\u25A0", "\\matrix", "\\pmatrix", "\\bmatrix", "\\vmatrix", "\\Vmatrix", "\\Bmatrix", "\\cases", "\\eqarray"
  ];

  while (i < cleanInput.length) {
    let matchedTrigger: string | null = null;
    let triggerIdx = -1;

    for (const trig of triggers) {
      const idx = cleanInput.indexOf(trig, i);
      if (idx !== -1 && (triggerIdx === -1 || idx < triggerIdx)) {
        triggerIdx = idx;
        matchedTrigger = trig;
      }
    }

    if (triggerIdx === -1 || !matchedTrigger) {
      result += cleanInput.slice(i);
      break;
    }

    let leftBracket = "";
    let leftBracketStart = -1;
    let scanBackIdx = triggerIdx - 1;
    while (scanBackIdx >= i && /\s/.test(cleanInput[scanBackIdx])) {
      scanBackIdx--;
    }
    if (scanBackIdx >= i) {
      if (cleanInput[scanBackIdx] === "[" || cleanInput[scanBackIdx] === "(" || cleanInput[scanBackIdx] === "{" || cleanInput[scanBackIdx] === "|") {
        if (scanBackIdx - 1 >= i && cleanInput[scanBackIdx - 1] === "|" && cleanInput[scanBackIdx] === "|") {
          leftBracket = "||";
          leftBracketStart = scanBackIdx - 1;
        } else {
          leftBracket = cleanInput[scanBackIdx];
          leftBracketStart = scanBackIdx;
        }
      }
    }

    let openParenIdx = cleanInput.indexOf("(", triggerIdx + matchedTrigger.length);
    if (openParenIdx === -1) {
      result += cleanInput.slice(i, triggerIdx + matchedTrigger.length);
      i = triggerIdx + matchedTrigger.length;
      continue;
    }

    const intermediate = cleanInput.slice(triggerIdx + matchedTrigger.length, openParenIdx);
    if (intermediate.trim().length > 0) {
      result += cleanInput.slice(i, openParenIdx);
      i = openParenIdx;
      continue;
    }

    let depth = 1;
    let closeParenIdx = -1;
    for (let j = openParenIdx + 1; j < cleanInput.length; j++) {
      if (cleanInput[j] === "(") {
        depth++;
      } else if (cleanInput[j] === ")") {
        depth--;
        if (depth === 0) {
          closeParenIdx = j;
          break;
        }
      }
    }

    if (closeParenIdx === -1) {
      result += cleanInput.slice(i);
      break;
    }

    let rightBracket = "";
    let rightBracketEnd = closeParenIdx + 1;
    let scanForwardIdx = closeParenIdx + 1;
    while (scanForwardIdx < cleanInput.length && /\s/.test(cleanInput[scanForwardIdx])) {
      scanForwardIdx++;
    }
    if (scanForwardIdx < cleanInput.length) {
      if (cleanInput[scanForwardIdx] === "]" || cleanInput[scanForwardIdx] === ")" || cleanInput[scanForwardIdx] === "}" || cleanInput[scanForwardIdx] === "|") {
        if (scanForwardIdx + 1 < cleanInput.length && cleanInput[scanForwardIdx] === "|" && cleanInput[scanForwardIdx + 1] === "|") {
          rightBracket = "||";
          rightBracketEnd = scanForwardIdx + 2;
        } else {
          rightBracket = cleanInput[scanForwardIdx];
          rightBracketEnd = scanForwardIdx + 1;
        }
      }
    }

    let innerContent = cleanInput.slice(openParenIdx + 1, closeParenIdx);
    innerContent = innerContent.replace(/&amp;/gi, "&").replace(/&/g, "&");

    let prefix = "";
    if (leftBracketStart !== -1) {
      prefix = cleanInput.slice(i, leftBracketStart);
    } else {
      prefix = cleanInput.slice(i, triggerIdx);
    }

    prefix = prefix.replace(/([\u0600-\u06FF0-9a-zA-Z])=$/g, "$1 = ");
    if (prefix.length > 0 && !/\s$/.test(prefix)) {
      prefix += " ";
    }
    result += prefix;

    let env = "matrix";
    const trigLower = matchedTrigger.toLowerCase();

    if (trigLower === "\\cases") {
      env = "cases";
    } else if (trigLower === "\\eqarray") {
      env = "aligned";
    } else if (trigLower === "\\bmatrix" || (leftBracket === "[" && rightBracket === "]") || leftBracket === "[") {
      env = "bmatrix";
    } else if (trigLower === "\\pmatrix" || (leftBracket === "(" && rightBracket === ")")) {
      env = "pmatrix";
    } else if (trigLower === "\\vmatrix" || (leftBracket === "|" && rightBracket === "|")) {
      env = "vmatrix";
    } else if (leftBracket === "||" && rightBracket === "||") {
      env = "Vmatrix";
    } else if (leftBracket === "{" && rightBracket === "}") {
      env = "Bmatrix";
    }

    const rows = innerContent.split("@").map((rowStr) => {
      const cols = rowStr.split("&").map((col) => {
        let cleanCol = col.replace(/<[^>]*>/g, "").trim();
        cleanCol = cleanCol.replace(/^amp;\s*/i, "").replace(/\s*amp;$/i, "").trim();
        return cleanCol;
      });
      return cols.join(" & ");
    });

    const formattedTexMatrix = `\\begin{${env}} ${rows.join(" \\\\ ")} \\end{${env}}`;
    result += formattedTexMatrix;

    if (rightBracket) {
      i = rightBracketEnd;
    } else {
      i = closeParenIdx + 1;
    }
  }

  result = result
    .replace(/∛\(([\s\S]*?)\)/g, "\\sqrt[3]{$1}")
    .replace(/∜\(([\s\S]*?)\)/g, "\\sqrt[4]{$1}")
    .replace(/[√\u221A]\(([\s\S]*?)\)/g, "\\sqrt{$1}")
    .replace(/\\root\(([\s\S]*?)&([\s\S]*?)\)/g, "\\sqrt[$1]{$2}");

  result = result
    .replace(/∫_\(([\s\S]*?)\)\^\(([\s\S]*?)\)/g, "\\int_{$1}^{$2}")
    .replace(/∫_([a-zA-Z0-9]+)\^([a-zA-Z0-9]+)/g, "\\int_{$1}^{$2}")
    .replace(/∑_\(([\s\S]*?)\)\^\(([\s\S]*?)\)/g, "\\sum_{$1}^{$2}")
    .replace(/∑_([a-zA-Z0-9\=\-]+)\^([a-zA-Z0-9]+)/g, "\\sum_{$1}^{$2}")
    .replace(/lim_\(([\s\S]*?)\)/g, "\\lim_{$1}");

  result = result
    .replace(/\\begin\{([a-zA-Z]+)\}([\s\S]*?)\\end\{\1\}/g, (match, envName, body) => {
      const cleanBody = body
        .replace(/&amp;\s*/gi, " & ")
        .replace(/\bamp;\s*/gi, " ")
        .replace(/&/g, " & ")
        .replace(/\s*&\s*/g, " & ");
      return `\\begin{${envName}}${cleanBody}\\end{${envName}}`;
    });

  return result;
}

/**
 * Detects if a text string or line is a math equation or expression composed of numbers and math symbols.
 * Examples: "-8 - 9 = -17", "+3 + 7 = +10", "x + 5 = 12", "12 / 4 = 3", "-5 * (-3) = 15"
 */
export function isMathEquationLine(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (!trimmed) return false;

  if (trimmed.includes("■") || trimmed.includes("\u25A0") || trimmed.includes("\\begin{") || trimmed.includes("\\matrix")) {
    return true;
  }

  // Must contain digits or variables, and at least one math operator or relation (+, -, =, *, /, ×, ÷, ±, ^)
  const hasDigitsOrVars = /[0-9٠-٩a-zA-Z]/.test(trimmed);
  const hasMathOp = /[\+\-\*\/\×\÷\=\±\≠\<\>\≤\≥\^]/.test(trimmed);
  if (!hasDigitsOrVars || !hasMathOp) return false;

  // Count Arabic letters
  const arabicLetters = (trimmed.match(/[\u0600-\u06FF]/g) || []).length;
  if (arabicLetters > 2) return false;

  // Count math/latin/symbol characters vs total length
  const mathChars = (trimmed.match(/[0-9٠-٩a-zA-Z\+\-\*\/\×\÷\=\±\≠\<\>\≤\≥\^\(\)\[\]\{\}\s\.\,\:\%]/g) || []).length;
  if (mathChars / trimmed.length >= 0.75) {
    return true;
  }

  return false;
}
