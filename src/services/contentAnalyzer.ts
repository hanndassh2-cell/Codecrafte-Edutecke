import { cleanLeakedTokens } from "./bidiContentPipeline";

export type SemanticElementType =
  | "heading"
  | "paragraph"
  | "table"
  | "image"
  | "equation"
  | "list"
  | "question"
  | "definition"
  | "example"
  | "activity"
  | "note"
  | "link"
  | "file"
  | "unknown";

export interface SemanticElement {
  id: string;
  type: SemanticElementType;
  typeLabelArabic: string;
  htmlContent: string;
  textContent: string;
  metadata?: Record<string, any>;
}

export interface ContentAnalysisResult {
  elements: SemanticElement[];
  summary: {
    totalElements: number;
    typesCount: Record<string, number>;
  };
}

const TYPE_ARABIC_LABELS: Record<SemanticElementType, string> = {
  heading: "عنوان",
  paragraph: "فقرة",
  table: "جدول",
  image: "صورة",
  equation: "معادلة",
  list: "قائمة",
  question: "سؤال",
  definition: "تعريف",
  example: "مثال",
  activity: "نشاط",
  note: "ملاحظة",
  link: "رابط",
  file: "ملف",
  unknown: "غير محدد",
};

/**
 * Analyzes content coming from Smart Paste Engine or raw HTML strings.
 * Breaks down content into structured SemanticElement objects without inserting into any editor.
 */
export function analyzeContent(htmlString: string): ContentAnalysisResult {
  const sanitizedInput = cleanLeakedTokens(htmlString || "");
  if (!sanitizedInput || !sanitizedInput.trim()) {
    return {
      elements: [],
      summary: { totalElements: 0, typesCount: {} },
    };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(sanitizedInput, "text/html");
  const elements: SemanticElement[] = [];
  const typesCount: Record<string, number> = {};

  const generateId = () => "elem_" + Math.random().toString(36).substring(2, 9);

  // Traverse top-level nodes of body
  Array.from(doc.body.children).forEach((child) => {
    const tagName = child.tagName.toLowerCase();
    const textContent = child.textContent?.trim() || "";
    const htmlContent = child.outerHTML;

    let type: SemanticElementType = "unknown";
    let metadata: Record<string, any> = {};

    // 1. Structural matching
    if (/^h[1-6]$/.test(tagName)) {
      type = "heading";
      metadata = { level: parseInt(tagName.replace("h", ""), 10) };
    } else if (tagName === "table") {
      type = "table";
      const trs = child.querySelectorAll("tr");
      metadata = {
        rows: trs.length,
        cols: trs[0]?.querySelectorAll("td, th").length || 0,
      };
    } else if (tagName === "ul" || tagName === "ol") {
      type = "list";
      metadata = {
        listType: tagName === "ol" ? "مرقمة" : "منقطة",
        itemsCount: child.querySelectorAll("li").length,
      };
    } else if (tagName === "img" || (child.children.length === 1 && child.querySelector("img"))) {
      type = "image";
      const img = tagName === "img" ? child : child.querySelector("img");
      metadata = {
        src: img?.getAttribute("src") || "",
        alt: img?.getAttribute("alt") || "صورة",
      };
    } else if (tagName === "a" && child.getAttribute("href")) {
      type = "link";
      metadata = {
        url: child.getAttribute("href") || "",
        text: textContent,
      };
    } else if (tagName === "math" || child.querySelector("math") || textContent.includes("$$") || /\$[^$]+\$/.test(textContent)) {
      type = "equation";
      metadata = {
        format: textContent.includes("$$") ? "Display LaTeX" : "Inline TeX/MathML",
      };
    } else if (tagName === "p" || tagName === "div" || tagName === "span" || tagName === "blockquote") {
      const textLower = textContent;

      // Check if p contains a solitary image
      const imgInP = child.querySelector("img");
      if (imgInP && child.children.length === 1 && textContent === "") {
        type = "image";
        metadata = {
          src: imgInP.getAttribute("src") || "",
          alt: imgInP.getAttribute("alt") || "صورة",
        };
      }
      // Check if p is a lone equation
      else if (textContent.startsWith("$$") || textContent.startsWith("$")) {
        type = "equation";
      }
      // Check for standalone link
      else if (child.children.length === 1 && child.querySelector("a") && child.querySelector("a")?.textContent?.trim() === textContent) {
        type = "link";
        const linkElem = child.querySelector("a");
        metadata = {
          url: linkElem?.getAttribute("href") || "",
          text: textContent,
        };
      }
      // Check for semantic pedagogical patterns (Arabic)
      else if (/^(مثال|أمثلة|مثال\s*[\(\d]|مسألة\s*محلولة|تمرين\s*محلول|تطبيق\s*محلول|مثال\s*عددي|تطبيق\s*عددي)/i.test(textLower)) {
        type = "example";
      } else if (/^(تعريف|مفهوم|مصطلح|ما هو|ما هي|المقصود بـ):?/.test(textLower)) {
        type = "definition";
      } else if (/^(س:|سؤال|س\s*:|س\d+|إختر الإجابة|علل|بين|قارن)/.test(textLower) || textLower.endsWith("؟") || textLower.endsWith("?")) {
        type = "question";
      } else if (/^(نشاط|تدريب|تمرين|تجربة|تطبيق عملي):?/.test(textLower)) {
        type = "activity";
      } else if (/^(ملاحظة|تنبيه|هام|تذكر|إرشاد):?/.test(textLower)) {
        type = "note";
      } else if (textContent) {
        type = "paragraph";
      } else {
        return; // skip empty elements
      }
    }

    if (type !== "unknown" || textContent !== "") {
      elements.push({
        id: generateId(),
        type,
        typeLabelArabic: TYPE_ARABIC_LABELS[type] || "عنصر",
        htmlContent,
        textContent,
        metadata,
      });

      typesCount[type] = (typesCount[type] || 0) + 1;
    }
  });

  return {
    elements,
    summary: {
      totalElements: elements.length,
      typesCount,
    },
  };
}

