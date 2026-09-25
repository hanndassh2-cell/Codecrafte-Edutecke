import { formatPastedEquation, convertMathMLInText, convertMathMLToTeX, convertWordLinearMathToTeX } from "../components/MathText";
import { analyzeContent, ContentAnalysisResult } from "./contentAnalyzer";
import { normalizeHtmlLists, parsePlainTextListItem } from "../utils/listEngine";
import { normalizeBidiHtml } from "./bidiContentPipeline";
import { setStoredData, getStoredData } from "./storage";

export interface SmartPasteAnalysis {
  detectedTypes: string[]; // ["plain_text", "formatted_text", "headings", "lists", "tables", "images", "equations", "links", "files", "scientific_symbols"]
  listCount: number;
  tableCount: number;
  imageCount: number;
  equationCount: number;
  linkCount: number;
  paragraphCount: number;
  characterCount: number;
  sourceApp: "Microsoft Word" | "Google Docs" | "LibreOffice" | "WPS Office" | "Web Browser / HTML" | "Plain Text";
}

const ARABIC_TEXT_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const MATH_SELECTOR = ".katex, .katex-display, .katex-html, tiptap-math, [data-type='equation'], math, svg, .math-node";
const EMPTY_LIST_MARKER_RE = /^[\s\u00a0\u200B-\u200F\u202A-\u202E]*[•·▪▫◦○●\-–—*]+[\s\u00a0\u200B-\u200F\u202A-\u202E]*$/;
const STYLE_ALLOWLIST = new Set([
  "color",
  "background",
  "background-color",
  "font-weight",
  "font-style",
  "text-decoration",
  "text-align",
  "vertical-align",
  "border",
  "border-top",
  "border-bottom",
  "border-left",
  "border-right",
  "border-collapse",
]);

function escapeHtmlText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatPlainTextForEducationalPaste(plainText: string): string {
  const lines = plainText
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\u00a0/g, " ").trim())
    .filter((line) => line.length > 0 && !EMPTY_LIST_MARKER_RE.test(line));

  return lines
    .map((line) => {
      const dir = ARABIC_TEXT_RE.test(line) ? ' dir="rtl"' : "";
      return `<p${dir}>${escapeHtmlText(line)}</p>`;
    })
    .join("");
}

function hasMeaningfulSibling(node: ChildNode | null, direction: "previous" | "next"): boolean {
  let current = node;
  while (current) {
    if (current.nodeType === Node.TEXT_NODE) {
      const text = (current.textContent || "").replace(/\u00a0/g, " ").trim();
      if (text) return true;
    }

    if (current.nodeType === Node.ELEMENT_NODE) {
      const element = current as Element;
      if (element.matches(MATH_SELECTOR) || element.querySelector(MATH_SELECTOR)) return true;
      if (!["br"].includes(element.tagName.toLowerCase())) {
        const text = (element.textContent || "").replace(/\u00a0/g, " ").trim();
        if (text || element.querySelector("img, table")) return true;
      }
    }

    current = direction === "previous" ? current.previousSibling : current.nextSibling;
  }

  return false;
}

function normalizePastedLineBreaks(doc: Document): void {
  Array.from(doc.body.querySelectorAll<HTMLElement>("p, div, li")).forEach((block) => {
    if (block.closest(MATH_SELECTOR)) return;

    Array.from(block.querySelectorAll("br")).forEach((br) => {
      const hasPrevious = hasMeaningfulSibling(br.previousSibling, "previous");
      const hasNext = hasMeaningfulSibling(br.nextSibling, "next");
      const previousIsBreak =
        br.previousSibling instanceof HTMLElement &&
        br.previousSibling.tagName.toLowerCase() === "br";

      if (!hasPrevious || !hasNext || previousIsBreak) {
        br.remove();
      }
    });
  });
}

function normalizeEducationalPasteHtml(doc: Document): void {
  const elements = Array.from(doc.body.querySelectorAll<HTMLElement>("*"));

  elements.forEach((node) => {
    const tag = node.tagName.toLowerCase();
    const isMath = !!node.closest(MATH_SELECTOR) || node.matches(MATH_SELECTOR);
    if (isMath) return;

    node.removeAttribute("lang");
    node.removeAttribute("id");
    node.removeAttribute("dir");
    node.removeAttribute("width");
    node.removeAttribute("height");
    node.removeAttribute("align");
    node.removeAttribute("valign");
    node.removeAttribute("bgcolor");

    const className = node.getAttribute("class") || "";
    if (
      className &&
      /(^|\s)(Mso|docs-internal|Apple-|WordSection|Normal|Default)/i.test(className)
    ) {
      node.removeAttribute("class");
    }

    const styleAttr = node.getAttribute("style");
    if (styleAttr) {
      const safeStyles: string[] = [];
      styleAttr.split(";").forEach((prop) => {
        const [rawKey, ...rawValue] = prop.split(":");
        const key = (rawKey || "").trim().toLowerCase();
        let value = rawValue.join(":").trim();
        if (!key || !value) return;
        if (key.startsWith("mso-")) return;
        if (!STYLE_ALLOWLIST.has(key)) return;
        if (/expression\s*\(|javascript:|url\s*\(/i.test(value)) return;
        if (value.includes("windowtext")) value = value.replace(/windowtext/g, "currentColor");
        if (value === "window") value = "transparent";
        safeStyles.push(`${key}: ${value}`);
      });

      if (safeStyles.length > 0) {
        node.setAttribute("style", safeStyles.join("; "));
      } else {
        node.removeAttribute("style");
      }
    }

    if (["p", "div", "li", "td", "th", "blockquote"].includes(tag)) {
      const text = node.textContent || "";
      if (ARABIC_TEXT_RE.test(text)) {
        node.setAttribute("dir", "rtl");
      }
    }
  });

  Array.from(doc.body.querySelectorAll("span")).forEach((span) => {
    if (span.closest(MATH_SELECTOR)) return;
    if (span.attributes.length === 0) {
      const parent = span.parentNode;
      if (!parent) return;
      while (span.firstChild) parent.insertBefore(span.firstChild, span);
      parent.removeChild(span);
    }
  });

  normalizePastedLineBreaks(doc);

  const hasMeaningfulContent = (node: Element) => {
    const text = (node.textContent || "")
      .replace(/\u00a0/g, " ")
      .replace(/[\u200B-\u200F\u202A-\u202E]/g, "")
      .trim();

    if (text.length > 0 && !EMPTY_LIST_MARKER_RE.test(text)) return true;
    return node.querySelector("img, table, " + MATH_SELECTOR) !== null;
  };

  Array.from(doc.body.querySelectorAll("li")).forEach((li) => {
    if (!hasMeaningfulContent(li)) {
      li.remove();
    }
  });

  Array.from(doc.body.querySelectorAll("p, div")).forEach((block) => {
    if (block.closest("td, th") || block.closest(MATH_SELECTOR)) return;
    if (!hasMeaningfulContent(block)) {
      block.remove();
    }
  });

  Array.from(doc.body.querySelectorAll("ul, ol")).forEach((list) => {
    if (!list.querySelector("li")) {
      list.remove();
    }
  });
}


/**
 * Analyzes clipboard content and identifies formatting, applications of origin, and elements.
 */
export async function analyzeClipboard(
  html: string,
  plainText: string,
  files: FileList | null | undefined
): Promise<SmartPasteAnalysis> {
  const detectedTypes: string[] = [];
  let listCount = 0;
  let tableCount = 0;
  let imageCount = files ? Array.from(files).filter(f => f.type.startsWith("image/")).length : 0;
  let equationCount = 0;
  let linkCount = 0;
  let paragraphCount = 0;
  let characterCount = plainText ? plainText.length : (html ? html.replace(/<[^>]*>/g, "").length : 0);
  let sourceApp: SmartPasteAnalysis["sourceApp"] = "Plain Text";

  if (html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Detect Source App
    const htmlLower = html.toLowerCase();
    const docText = doc.body.textContent || "";

    if (htmlLower.includes("mso-") || htmlLower.includes("msolist") || htmlLower.includes("urn:schemas-microsoft-com:office") || htmlLower.includes("microsoft-officedocument")) {
      sourceApp = "Microsoft Word";
    } else if (htmlLower.includes("docs-internal-guid") || htmlLower.includes("google-office-docs") || htmlLower.includes("id=\"docs-internal-guid\"")) {
      sourceApp = "Google Docs";
    } else if (htmlLower.includes("libreoffice") || htmlLower.includes("writer")) {
      sourceApp = "LibreOffice";
    } else if (htmlLower.includes("wps")) {
      sourceApp = "WPS Office";
    } else if (html.trim().startsWith("<") || html.includes("<p") || html.includes("<span") || html.includes("<div")) {
      sourceApp = "Web Browser / HTML";
    }

    // Paragraphs
    paragraphCount = doc.querySelectorAll("p, div, li").length || 1;

    // Headings
    const headings = doc.querySelectorAll("h1, h2, h3, h4, h5, h6");
    if (headings.length > 0) {
      detectedTypes.push("headings");
    }

    // Lists
    const lists = doc.querySelectorAll("ul, ol, li");
    const styleAttr = htmlLower.includes("mso-list") || htmlLower.includes("class=\"msolist");
    if (lists.length > 0 || styleAttr) {
      detectedTypes.push("lists");
      listCount = doc.querySelectorAll("ul, ol").length || doc.querySelectorAll("li").length || 1;
    }

    // Tables
    const tables = doc.querySelectorAll("table");
    if (tables.length > 0) {
      detectedTypes.push("tables");
      tableCount = tables.length;
    }

    // Images
    const imgs = doc.querySelectorAll("img");
    imageCount += imgs.length;
    if (imageCount > 0) {
      detectedTypes.push("images");
    }

    // Equations
    const hasMathTags = htmlLower.includes("math") || htmlLower.includes("omath") || htmlLower.includes("omathpara") || doc.querySelector("math, omath, omathpara");
    const hasTeX = /\$\$([\s\S]+?)\$\$|\$((?:\\\$|[^\$])+?)\$/.test(plainText || docText);
    const hasWordLinearMath = htmlLower.includes("■") || (plainText || docText).includes("■") || (plainText || docText).includes("\\matrix") || (plainText || docText).includes("\\bmatrix") || (plainText || docText).includes("\\pmatrix") || (plainText || docText).includes("\\vmatrix");
    if (hasMathTags || hasTeX || hasWordLinearMath) {
      detectedTypes.push("equations");
      // Count equations roughly
      const mathNodes = doc.querySelectorAll("math, omath, omathpara");
      const texMatches = (plainText || docText).match(/\$\$([\s\S]+?)\$\$|\$((?:\\\$|[^\$])+?)\$/g);
      equationCount = (mathNodes.length || 0) + (texMatches ? texMatches.length : 0) || 1;
    }

    // Links
    const links = doc.querySelectorAll("a");
    if (links.length > 0) {
      detectedTypes.push("links");
      linkCount = links.length;
    }

    // Formatted Text vs Plain Text
    const formattedStyles = htmlLower.includes("font-weight") || htmlLower.includes("font-style") || htmlLower.includes("text-decoration") || htmlLower.includes("color") || htmlLower.includes("background");
    if (formattedStyles || doc.querySelectorAll("b, strong, i, em, u, strike, s, sup, sub").length > 0) {
      detectedTypes.push("formatted_text");
    } else {
      detectedTypes.push("plain_text");
    }

    // Scientific Symbols
    const chemSymbols = /[αβγδ±×÷≤≥≠→←⇌]|H₂O|NaOH|H⁺|OH⁻|CO₂|SO₄²⁻|[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎]/;
    if (chemSymbols.test(docText || plainText)) {
      detectedTypes.push("scientific_symbols");
    }
  } else {
    // Plain Text Analysis
    detectedTypes.push("plain_text");
    paragraphCount = plainText ? plainText.split("\n\n").length : 0;
    
    const chemSymbols = /[αβγδ±×÷≤≥≠→←⇌]|H₂O|NaOH|H⁺|OH⁻|CO₂|SO₄²⁻|[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎]/;
    if (chemSymbols.test(plainText)) {
      detectedTypes.push("scientific_symbols");
    }

    const hasTeX = /\$\$([\s\S]+?)\$\$|\$((?:\\\$|[^\$])+?)\$/.test(plainText);
    if (hasTeX) {
      detectedTypes.push("equations");
      const texMatches = plainText.match(/\$\$([\s\S]+?)\$\$|\$((?:\\\$|[^\$])+?)\$/g);
      equationCount = texMatches ? texMatches.length : 1;
    }
  }

  if (files && files.length > 0) {
    detectedTypes.push("files");
  }

  return {
    detectedTypes: Array.from(new Set(detectedTypes)),
    listCount,
    tableCount,
    imageCount,
    equationCount,
    linkCount,
    paragraphCount,
    characterCount,
    sourceApp,
  };
}

/**
 * Clean HTML and convert to standard format. Handles Word, LibreOffice, WPS, Google Docs.
 */
export async function cleanAndConvertHtml(
  html: string,
  plainText: string,
  files: FileList | null | undefined,
  options = {
    keepColors: true,
    keepFonts: true,
    convertEquations: true,
    cleanWordJunk: true
  }
): Promise<{ html: string; analysis: SmartPasteAnalysis; filesProcessed: number }> {
  const analysis = await analyzeClipboard(html, plainText, files);

  if (!html && !files?.length) {
    let formattedText = plainText || "";
    formattedText = convertWordLinearMathToTeX(formattedText);
    formattedText = convertMathMLInText(formattedText);
    const formattedPlain = formattedText ? formatPlainTextForEducationalPaste(formattedText) : "";
    return { html: formattedPlain, analysis, filesProcessed: 0 };
  }

  // Preprocess HTML to convert Word OMML/MathML and Linear Math before DOM parsing
  let inputHtml = html || "";
  if (inputHtml && options.convertEquations) {
    inputHtml = convertWordLinearMathToTeX(inputHtml);
    inputHtml = convertMathMLInText(inputHtml);
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(inputHtml || "<body></body>", "text/html");

  // Process Images
  const imageFiles = files ? Array.from(files).filter(f => f.type.startsWith("image/")) : [];
  const base64Images: string[] = [];

  for (const file of imageFiles) {
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string || "");
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });
    if (base64) {
      base64Images.push(base64);

      // Save to local storage media library
      try {
        const existingMedia = getStoredData<any[]>("edutech_media_library_v1", []);
        const newItem = {
          id: "media-" + Date.now() + "-" + Math.random().toString(36).substring(2, 9),
          type: "image",
          url: base64,
          name: file.name || "صورة ملصقة من Word",
          createdAt: new Date().toISOString()
        };
        const updatedMedia = [...existingMedia, newItem].slice(-8);
        setStoredData("edutech_media_library_v1", updatedMedia);
        window.dispatchEvent(new CustomEvent("refresh-media-library"));
      } catch (e) {
        console.error("Failed to save to media library:", e);
      }
    }
  }

  // Map Base64 images to img tags
  const imgTags = Array.from(doc.querySelectorAll("img"));
  let fileIndex = 0;
  imgTags.forEach((img) => {
    const src = img.getAttribute("src") || "";
    if (src.startsWith("file://") || src.startsWith("blob:") || !src) {
      if (fileIndex < base64Images.length) {
        img.setAttribute("src", base64Images[fileIndex]);
        fileIndex++;
      }
    } else if (src.startsWith("data:image/")) {
      // Save existing inline images to the Media Library
      try {
        const existingMedia = getStoredData<any[]>("edutech_media_library_v1", []);
        const exists = existingMedia.some((m: any) => m.url === src);
        if (!exists) {
          const newItem = {
            id: "media-" + Date.now() + "-" + Math.random().toString(36).substring(2, 9),
            type: "image",
            url: src,
            name: img.getAttribute("alt") || img.getAttribute("title") || "صورة ملصقة",
            createdAt: new Date().toISOString()
          };
          const updatedMedia = [...existingMedia, newItem].slice(-8);
          setStoredData("edutech_media_library_v1", updatedMedia);
          window.dispatchEvent(new CustomEvent("refresh-media-library"));
        }
      } catch (e) {
        console.error("Error saving inline image:", e);
      }
    }
  });

  // Append remaining clipboard images
  while (fileIndex < base64Images.length) {
    const p = doc.createElement("p");
    const img = doc.createElement("img");
    img.setAttribute("src", base64Images[fileIndex]);
    p.appendChild(img);
    doc.body.appendChild(p);
    fileIndex++;
  }

  // Convert MathML / Office Math to LaTeX TeX inline equations
  if (options.convertEquations) {
    const allNodes = doc.getElementsByTagName("*");
    const mathNodes: Element[] = [];
    for (let i = 0; i < allNodes.length; i++) {
      const n = allNodes[i];
      const localName = (n.localName || n.tagName || "").toLowerCase().replace(/^[a-z0-9_]+:/, "");
      if (localName === "omath" || localName === "omathpara" || localName === "math") {
        mathNodes.push(n);
      }
    }

    mathNodes.forEach((node) => {
      let parent = node.parentElement;
      let isNested = false;
      while (parent) {
        const parentName = (parent.localName || parent.tagName || "").toLowerCase().replace(/^[a-z0-9_]+:/, "");
        if (parentName === "omath" || parentName === "omathpara" || parentName === "math") {
          isNested = true;
          break;
        }
        parent = parent.parentElement;
      }
      if (!isNested) {
        try {
          const outerXML = node.outerHTML;
          const tex = convertMathMLToTeX(outerXML);
          if (tex && tex.trim()) {
            const textNode = doc.createTextNode(`$${tex.trim()}$`);
            node.parentNode?.replaceChild(textNode, node);
          }
        } catch (e) {
          console.error("Error converting pasted math node to TeX:", e);
        }
      }
    });
  }

  // Convert Microsoft Word list paragraphs into real semantic lists
  // NOTE: A list requires multiple consecutive list items or explicit MS Word list attributes.
  // Isolated single paragraphs (like "1. ما هو الشرط...") must remain normal paragraphs.
  const paragraphs = Array.from(doc.querySelectorAll("p"));
  
  // First pass: analyze which paragraphs are genuine list candidates
  const parsedParagraphs = paragraphs.map((p) => {
    const styleAttr = p.getAttribute("style") || "";
    const className = p.getAttribute("class") || "";
    const textContent = p.textContent || "";
    const parsed = parsePlainTextListItem(textContent);
    const hasWordListMarker =
      styleAttr.includes("mso-list") ||
      className.includes("MsoList") ||
      p.querySelector("[style*='mso-list:Ignore']") !== null;

    return {
      element: p,
      styleAttr,
      className,
      textContent,
      parsed,
      hasWordListMarker,
    };
  });

  let currentList: Element | null = null;
  let currentListType: "ul" | "ol" | null = null;
  let currentListStyle: string | null = null;

  for (let i = 0; i < parsedParagraphs.length; i++) {
    const curr = parsedParagraphs[i];
    const prev = i > 0 ? parsedParagraphs[i - 1] : null;
    const next = i < parsedParagraphs.length - 1 ? parsedParagraphs[i + 1] : null;

    // Check if this item is part of a consecutive list group or has explicit Word list structure
    const isConsecutiveList =
      (curr.parsed && curr.parsed.isList) &&
      ((prev && prev.parsed && prev.parsed.isList) || (next && next.parsed && next.parsed.isList));

    const isExplicitWordList = curr.hasWordListMarker;

    const isRealList = isConsecutiveList || isExplicitWordList;

    if (isRealList) {
      const listType: "ul" | "ol" =
        curr.parsed && curr.parsed.isList
          ? curr.parsed.type === "ordered"
            ? "ol"
            : "ul"
          : curr.hasWordListMarker && /^\s*\d+/.test(curr.textContent)
          ? "ol"
          : "ul";

      const detectedStyle =
        curr.parsed && curr.parsed.isList
          ? curr.parsed.style || (listType === "ol" ? "decimal" : "disc")
          : listType === "ol"
          ? "decimal"
          : "disc";

      let cleanHtml = curr.element.innerHTML;
      
      // 1. Strip Word ignore & symbol wrappers first
      cleanHtml = cleanHtml.replace(/<span[^>]*style="[^"]*mso-list:\s*Ignore[^"]*"[^>]*>[\s\S]*?<\/span>/gi, "");
      cleanHtml = cleanHtml.replace(/<span[^>]*font-family:\s*Symbol[^>]*>[\s\S]*?<\/span>/gi, "");
      cleanHtml = cleanHtml.replace(/<span[^>]*font-family:\s*Wingdings[^>]*>[\s\S]*?<\/span>/gi, "");

      // 2. Strip explicit parsed marker or common list bullet / number prefixes
      if (curr.parsed && curr.parsed.isList && curr.parsed.marker) {
        cleanHtml = cleanHtml.replace(
          new RegExp(`^\\s*${curr.parsed.marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*`),
          ""
        );
      }
      cleanHtml = cleanHtml.replace(/^\s*(\d+|[a-zA-ZIVXLCDMivxlcdm]+|[أ-ي])[\.\)\-]\s*/, "");
      cleanHtml = cleanHtml.replace(/^\s*[·•o§\-*◆◇■□★☆✓✔➤🔹💡📌\u00b7\u2022\u25cf\u25cb\u25a0\u25a1]\s*/, "");
      
      // 3. Clean leading non-breaking spaces or tabs from Word indentation
      cleanHtml = cleanHtml.replace(/^(&nbsp;|\s|\u00a0|\t)+/i, "");

      const textScript = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(curr.textContent) ? "rtl" : "ltr";

      if (!currentList || currentListType !== listType || currentListStyle !== detectedStyle) {
        currentList = doc.createElement(listType);
        currentList.setAttribute("data-list-style", detectedStyle);
        currentList.setAttribute("dir", textScript);
        curr.element.parentNode?.insertBefore(currentList, curr.element);
        currentListType = listType;
        currentListStyle = detectedStyle;
      }

      const li = doc.createElement("li");
      li.setAttribute("dir", textScript);
      li.innerHTML = cleanHtml;

      currentList.appendChild(li);
      curr.element.parentNode?.removeChild(curr.element);
    } else {
      currentList = null;
      currentListType = null;
      currentListStyle = null;
    }
  }

  // Clean elements and remove garbage MS Office XML/styles
  const cleanNode = (node: Element) => {
    // Convert <font> to <span>
    if (node.tagName.toLowerCase() === "font") {
      const face = node.getAttribute("face");
      const size = node.getAttribute("size");
      const color = node.getAttribute("color");
      const newSpan = doc.createElement("span");
      let newStyle = node.getAttribute("style") || "";
      if (face && options.keepFonts) newStyle += `font-family: ${face};`;
      if (size && options.keepFonts) {
         // rough mapping of html size 1-7 to pt
         const sizeMap: Record<string, string> = { "1": "8pt", "2": "10pt", "3": "12pt", "4": "14pt", "5": "18pt", "6": "24pt", "7": "36pt" };
         newStyle += `font-size: ${sizeMap[size] || size};`;
      }
      if (color && options.keepColors) newStyle += `color: ${color};`;
      if (newStyle) newSpan.setAttribute("style", newStyle);
      
      while (node.firstChild) {
        newSpan.appendChild(node.firstChild);
      }
      node.parentNode?.replaceChild(newSpan, node);
      node = newSpan;
    }

    if (options.cleanWordJunk) {
      const className = node.getAttribute("class") || "";
      if (className) {
        const cleanedClass = className.split(" ").filter(c => !c.toLowerCase().startsWith("mso")).join(" ");
        if (cleanedClass) {
          node.setAttribute("class", cleanedClass);
        } else {
          node.removeAttribute("class");
        }
      }

      node.removeAttribute("lang");
      node.removeAttribute("v:shapes");
      node.removeAttribute("o:spid");
    }

    
    const isTableElement = ["table", "tr", "td", "th", "tbody", "thead", "tfoot"].includes(node.tagName.toLowerCase());
    if (isTableElement) {
      node.removeAttribute("width");
      node.removeAttribute("height");
      node.removeAttribute("border");
      node.removeAttribute("cellspacing");
      node.removeAttribute("cellpadding");
      node.removeAttribute("valign");
      node.removeAttribute("align");
      node.removeAttribute("bgcolor");

      // Validate and standardize colspan/rowspan for merged cells
      if (node.hasAttribute("colspan")) {
        const cs = parseInt(node.getAttribute("colspan") || "1", 10);
        if (isNaN(cs) || cs <= 1) {
          node.removeAttribute("colspan");
        } else {
          node.setAttribute("colspan", cs.toString());
        }
      }
      if (node.hasAttribute("rowspan")) {
        const rs = parseInt(node.getAttribute("rowspan") || "1", 10);
        if (isNaN(rs) || rs <= 1) {
          node.removeAttribute("rowspan");
        } else {
          node.setAttribute("rowspan", rs.toString());
        }
      }
    }

    const styleAttr = node.getAttribute("style");

    if (styleAttr) {
      const props = styleAttr.split(";");
      const preserved: string[] = [];

      let fontFamilies: string[] = [];

      props.forEach((prop) => {
        const parts = prop.split(":");
        if (parts.length >= 2) {
          const key = parts[0].trim().toLowerCase();
          const val = parts.slice(1).join(":").trim();

          // Handle MS Word font fallbacks
          if (options.keepFonts && (key === "font-family" || key === "mso-ascii-font-family" || key === "mso-hansi-font-family" || key === "mso-bidi-font-family" || key === "mso-fareast-font-family")) {
            if (val && val !== "Symbol") {
              const fonts = val.split(",").map(f => f.replace(/['"]/g, "").trim()).filter(Boolean);
              fonts.forEach(f => {
                if (!fontFamilies.includes(f)) {
                  fontFamilies.push(f.includes(" ") ? `"${f}"` : f);
                }
              });
            }
            return; // processed
          }

          let finalKey = key;
          let safeVal = val;

          // Map MS Word specific color styles to standard CSS
          if (key === "mso-highlight") {
            finalKey = "background-color";
          } else if (key === "mso-style-textfill-fill-color") {
            finalKey = "color";
          } else if (key === "mso-shading") {
            finalKey = "background-color";
          }

          if (safeVal.includes("windowtext")) {
            safeVal = safeVal.replace(/windowtext/g, "currentColor");
          }
          if (safeVal === "window") {
            safeVal = "transparent";
          }

          // Diagnostic log for unsupported font attributes
          if (finalKey.startsWith("font-") && finalKey !== "font-size" && finalKey !== "font-weight" && finalKey !== "font-style" && finalKey !== "font-family") {
            console.warn(`[RichTextEditor Diagnostic Log] Unsupported font property detected: ${key}:${val}. Reason: Not supported by standard CSS or current extensions.`);
          }
          if (finalKey === "text-decoration" && safeVal && !safeVal.includes("underline") && !safeVal.includes("line-through") && safeVal !== "none") {
            console.warn(`[RichTextEditor Diagnostic Log] Unsupported text-decoration detected: ${val}. Reason: Editor only supports underline and line-through.`);
          }
          if (finalKey === "vertical-align" && safeVal && safeVal !== "baseline" && safeVal !== "sub" && safeVal !== "super" && safeVal !== "top" && safeVal !== "middle" && safeVal !== "bottom") {
            console.warn(`[RichTextEditor Diagnostic Log] Unsupported vertical-align detected: ${val}. Reason: Editor only supports sub, super, or table alignments.`);
          }

          if (key.startsWith("mso-") && !["mso-highlight", "mso-style-textfill-fill-color", "mso-shading", "mso-ascii-font-family", "mso-hansi-font-family", "mso-bidi-font-family", "mso-fareast-font-family"].includes(key)) {
            if (key.includes("color") || key.includes("fill") || key.includes("background")) {
               console.warn(`[RichTextEditor Diagnostic Log] Unsupported MS Word color property detected: ${key}:${val}. Reason: Not mapped to standard CSS color.`);
            }
          }

          if (options.cleanWordJunk && key.startsWith("mso-") && finalKey === key) return;
          if (!options.keepColors && (finalKey === "color" || finalKey === "background-color" || finalKey === "background")) return;
          if (!options.keepFonts && (finalKey === "font-family" || finalKey === "font-size")) return;

          
          if (isTableElement && [
            "width", "height", "border", "border-top", "border-bottom", "border-left", "border-right", "border-collapse",
            "background-color", "background", "color", "vertical-align", "text-align",
            "margin", "margin-top", "margin-bottom", "margin-left", "margin-right",
            "padding", "padding-top", "padding-bottom", "padding-left", "padding-right"
          ].includes(finalKey)) {
            return; // Skip these for table elements
          }

          if ([
            "font-size",
            "color",
            "background-color",
            "background",
            "text-align",
            "line-height",
            "text-indent",
            "font-weight",
            "font-style",
            "text-decoration",
            "width",
            "height",
            "border",
            "border-top",
            "border-bottom",
            "border-left",
            "border-right",
            "border-collapse",
            "padding",
            "padding-top",
            "padding-bottom",
            "padding-left",
            "padding-right",
            "margin",
            "margin-top",
            "margin-bottom",
            "margin-left",
            "margin-right",
            "vertical-align",
            "direction"
          ].includes(finalKey)) {
            // Normalize font-size from pt to standard if needed, but keeping pt is fine for browsers
            if (finalKey === "font-size") {
              safeVal = safeVal.replace(/['"]+/g, "");
            }

            preserved.push(`${finalKey}: ${safeVal}`);
          }
        }
      });
      
      if (fontFamilies.length > 0) {
        preserved.push(`font-family: ${fontFamilies.join(", ")}`);
      }

      if (preserved.length > 0) {
        node.setAttribute("style", preserved.join("; "));
      } else {
        node.removeAttribute("style");
      }
    }

    // Convert styles to standard semantic HTML elements for Tiptap (only on inline elements without block children)
    const htmlNode = node as HTMLElement;
    const tag = htmlNode.tagName ? htmlNode.tagName.toLowerCase() : "";
    const isContainerTag = [
      "body", "table", "tbody", "thead", "tfoot", "tr", "td", "th",
      "div", "ul", "ol", "li", "blockquote", "figure", "section"
    ].includes(tag);

    const hasBlockChildren = Array.from(htmlNode.children).some(child => {
      const cTag = child.tagName ? child.tagName.toLowerCase() : "";
      return ["p", "div", "table", "tbody", "thead", "tfoot", "tr", "td", "th", "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote"].includes(cTag);
    });

    if (htmlNode.style && !isContainerTag && !hasBlockChildren) {
      // Bold
      const fw = htmlNode.style.fontWeight;
      if (fw === "bold" || fw === "700" || fw === "bolder" || parseInt(fw) >= 600) {
        const strong = doc.createElement("strong");
        while (node.firstChild) strong.appendChild(node.firstChild);
        node.appendChild(strong);
        htmlNode.style.fontWeight = "";
      }
      
      // Italic
      if (htmlNode.style.fontStyle === "italic" || htmlNode.style.fontStyle === "oblique") {
        const em = doc.createElement("em");
        while (node.firstChild) em.appendChild(node.firstChild);
        node.appendChild(em);
        htmlNode.style.fontStyle = "";
      }
      
      // Underline and Strikethrough
      if (htmlNode.style.textDecoration) {
        const textDec = htmlNode.style.textDecoration.toLowerCase();
        if (textDec.includes("underline")) {
          const u = doc.createElement("u");
          while (node.firstChild) u.appendChild(node.firstChild);
          node.appendChild(u);
        }
        if (textDec.includes("line-through")) {
          const s = doc.createElement("s");
          while (node.firstChild) s.appendChild(node.firstChild);
          node.appendChild(s);
        }
        htmlNode.style.textDecoration = htmlNode.style.textDecoration.replace(/underline|line-through/gi, "").trim();
      }
      
      // Superscript / Subscript
      const verticalAlign = htmlNode.style.verticalAlign;
      if (verticalAlign === "super") {
        const sup = doc.createElement("sup");
        while (node.firstChild) sup.appendChild(node.firstChild);
        node.appendChild(sup);
        htmlNode.style.verticalAlign = "";
      } else if (verticalAlign === "sub") {
        const sub = doc.createElement("sub");
        while (node.firstChild) sub.appendChild(node.firstChild);
        node.appendChild(sub);
        htmlNode.style.verticalAlign = "";
      }

      // Background Color / Highlight
      const bgColor = htmlNode.style.backgroundColor || htmlNode.style.background;
      if (bgColor && bgColor !== "transparent" && bgColor !== "rgba(0, 0, 0, 0)" && htmlNode.tagName.toLowerCase() !== "mark") {
        const mark = doc.createElement("mark");
        mark.style.backgroundColor = bgColor;
        mark.setAttribute("data-color", bgColor);
        while (node.firstChild) mark.appendChild(node.firstChild);
        node.appendChild(mark);
        htmlNode.style.backgroundColor = "";
        htmlNode.style.background = "";
      }
    }

    Array.from(node.children).forEach(cleanNode);
  };

  cleanNode(doc.body);
  normalizeEducationalPasteHtml(doc);

  let cleanHtmlString = doc.body.innerHTML;
  if (options.cleanWordJunk) {
    cleanHtmlString = cleanHtmlString
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<xml>[\s\S]*?<\/xml>/gi, "")
      .replace(/<style>[\s\S]*?<\/style>/gi, "");
  }

  // Pre-process chemistry formulas, scientific subscripts/superscripts and formulas
  cleanHtmlString = convertWordLinearMathToTeX(cleanHtmlString);
  cleanHtmlString = convertMathMLInText(cleanHtmlString);
  cleanHtmlString = normalizeHtmlLists(cleanHtmlString);
  cleanHtmlString = normalizeBidiHtml(cleanHtmlString, { cleanWordJunk: options.cleanWordJunk });
  cleanHtmlString = sanitizeHtmlForProseMirror(cleanHtmlString);

  return {
    html: cleanHtmlString,
    analysis,
    filesProcessed: base64Images.length,
  };
}

/**
 * Ensures HTML output conforms strictly to ProseMirror/TipTap schema rules (especially tableCell content: block+).
 * Fixes inverted inline-wrapping-block nodes, flattens nested tables in cells, and wraps naked cell text in <p> tags.
 */
export function sanitizeHtmlForProseMirror(htmlString: string): string {
  if (!htmlString || typeof window === "undefined") return htmlString || "";

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, "text/html");

    const inlineWrapperTags = ["strong", "em", "u", "s", "mark", "span", "sup", "sub", "b", "i", "font", "a"];
    const blockTags = ["p", "div", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "ul", "ol", "li", "table"];

    // 1. Unwrap inline tags that wrap block elements anywhere in the document
    let changed = true;
    let iterations = 0;
    while (changed && iterations < 10) {
      changed = false;
      iterations++;
      inlineWrapperTags.forEach((inlineTag) => {
        const inlineElems = Array.from(doc.querySelectorAll(inlineTag));
        inlineElems.forEach((inlineEl) => {
          const hasBlock = Array.from(inlineEl.children).some((child) =>
            blockTags.includes(child.tagName.toLowerCase())
          );
          if (hasBlock) {
            const parent = inlineEl.parentNode;
            if (parent) {
              changed = true;
              while (inlineEl.firstChild) {
                const child = inlineEl.firstChild;
                if (
                  child.nodeType === Node.ELEMENT_NODE &&
                  blockTags.includes((child as Element).tagName.toLowerCase())
                ) {
                  const blockEl = child as Element;
                  const clonedInline = doc.createElement(inlineTag);
                  Array.from(inlineEl.attributes).forEach((attr) =>
                    clonedInline.setAttribute(attr.name, attr.value)
                  );
                  while (blockEl.firstChild) {
                    clonedInline.appendChild(blockEl.firstChild);
                  }
                  blockEl.appendChild(clonedInline);
                  parent.insertBefore(blockEl, inlineEl);
                } else {
                  parent.insertBefore(child, inlineEl);
                }
              }
              parent.removeChild(inlineEl);
            }
          }
        });
      });
    }

    normalizeEducationalPasteHtml(doc);

    // 2. Normalize every <td> and <th> for TipTap tableCell requirements (content: 'block+')
    const cells = Array.from(doc.querySelectorAll("td, th"));
    cells.forEach((cell) => {
      // Flatten any nested tables inside td/th to paragraphs to avoid invalid table cell schema
      const nestedTables = Array.from(cell.querySelectorAll("table"));
      nestedTables.forEach((nestedTable) => {
        const rows = Array.from(nestedTable.querySelectorAll("tr"));
        rows.forEach((row) => {
          const p = doc.createElement("p");
          p.textContent = (row.textContent || "").trim();
          if (p.textContent) {
            nestedTable.parentNode?.insertBefore(p, nestedTable);
          }
        });
        nestedTable.parentNode?.removeChild(nestedTable);
      });

      // Ensure direct children of cell are blocks
      const children = Array.from(cell.childNodes);
      const hasBlockChild = children.some(
        (child) =>
          child.nodeType === Node.ELEMENT_NODE &&
          blockTags.includes((child as Element).tagName.toLowerCase())
      );

      if (!hasBlockChild) {
        const p = doc.createElement("p");
        while (cell.firstChild) {
          p.appendChild(cell.firstChild);
        }
        if (!p.textContent?.trim() && p.children.length === 0) {
          p.innerHTML = "<br>";
        }
        cell.appendChild(p);
      } else {
        // Handle mixed nodes in cell: wrap any loose text/inline siblings into <p> blocks
        let inlineBuffer: Node[] = [];
        const flushBuffer = () => {
          if (inlineBuffer.length > 0) {
            const hasText = inlineBuffer.some(
              (n) =>
                (n.textContent || "").trim().length > 0 ||
                (n.nodeType === Node.ELEMENT_NODE &&
                  (n as Element).tagName.toLowerCase() === "img")
            );
            if (hasText) {
              const p = doc.createElement("p");
              const refNode = inlineBuffer[0];
              inlineBuffer.forEach((n) => p.appendChild(n));
              cell.insertBefore(p, refNode);
            } else {
              inlineBuffer.forEach((n) => n.parentNode?.removeChild(n));
            }
            inlineBuffer = [];
          }
        };

        Array.from(cell.childNodes).forEach((child) => {
          if (
            child.nodeType === Node.ELEMENT_NODE &&
            blockTags.includes((child as Element).tagName.toLowerCase())
          ) {
            flushBuffer();
          } else {
            inlineBuffer.push(child);
          }
        });
        flushBuffer();
      }
    });

    return doc.body.innerHTML;
  } catch (err) {
    console.error("Error sanitizing HTML for ProseMirror:", err);
    return htmlString;
  }
}

/**
 * Clean scientific formulas in text inputs (Unicode subscript/superscript mapping to LaTeX syntax)
 */
export function convertScientificSymbolsAndFormulas(text: string): string {
  if (!text) return "";

  const subSupMap: Record<string, string> = {
    "⁰": "^0", "¹": "^1", "²": "^2", "³": "^3", "⁴": "^4", "⁵": "^5", "⁶": "^6", "⁷": "^7", "⁸": "^8", "⁹": "^9", "⁺": "^+", "⁻": "^-", "⁼": "^=", "⁽": "^(", "⁾": "^)",
    "₀": "_0", "₁": "_1", "₂": "_2", "₃": "_3", "₄": "_4", "₅": "_5", "₆": "_6", "₇": "_7", "₈": "_8", "₉": "_9", "₊": "_+", "₋": "_-", "₌": "_=", "₍": "_(", "₎": "_)"
  };

  let replaced = "";
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (subSupMap[char] !== undefined) {
      replaced += subSupMap[char];
    } else {
      replaced += char;
    }
  }

  return replaced;
}

/**
 * Fully processes clipboard content and passes the cleaned HTML payload to Content Analyzer.
 * Returns both SmartPasteAnalysis and structured SemanticElement[] content items.
 */
export async function processAndAnalyzeClipboard(
  html: string,
  plainText: string,
  files: FileList | null | undefined,
  options?: Parameters<typeof cleanAndConvertHtml>[3]
): Promise<{
  cleanedHtml: string;
  clipboardAnalysis: SmartPasteAnalysis;
  semanticAnalysis: ContentAnalysisResult;
  filesProcessed: number;
}> {
  const result = await cleanAndConvertHtml(html, plainText, files, options);
  const semanticAnalysis = analyzeContent(result.html);
  return {
    cleanedHtml: result.html,
    clipboardAnalysis: result.analysis,
    semanticAnalysis,
    filesProcessed: result.filesProcessed,
  };
}
