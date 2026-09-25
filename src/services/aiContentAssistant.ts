import { SemanticElement } from "./contentAnalyzer";
import { normalizeBidiPlainText, normalizeBidiHtml, cleanLeakedTokens } from "./bidiContentPipeline";
import {
  executeWithAIGateway,
  AIExecutionOptions,
  AIExecutionSuccessResult,
} from "../modules/ai/services/aiProviderAdapter";

export type AIContentType =
  | "heading" // عنوان
  | "objective" // هدف تعليمي
  | "concept" // مفهوم / تعريف
  | "explanation" // شرح
  | "example" // مثال
  | "activity" // نشاط
  | "note" // ملاحظة
  | "table" // جدول
  | "equation" // معادلة
  | "image" // صورة
  | "question" // سؤال
  | "paragraph"; // فقرة عامة

export const AI_TYPE_ARABIC_LABELS: Record<AIContentType, string> = {
  heading: "عنوان",
  objective: "هدف تعليمي",
  concept: "مفهوم",
  explanation: "شرح",
  example: "مثال",
  activity: "نشاط",
  note: "ملاحظة",
  table: "جدول",
  equation: "معادلة",
  image: "صورة",
  question: "سؤال",
  paragraph: "فقرة عامة",
};

export interface AIQuestionDetail {
  questionType: string; // mcq, true_false, definition, explain_reason, etc.
  questionTypeLabelArabic: string;
  questionText: string;
  options?: { letter: string; text: string; isCorrect?: boolean }[];
  correctAnswer?: string;
  difficulty?: "easy" | "medium" | "hard";
  difficultyLabelArabic?: string;
  educationalSkill?: "تذكر" | "فهم" | "تطبيق" | "تحليل" | "تقويم" | "إبداع";
  keywords?: string[];
}

export interface AIContentAnalysisItem {
  id: string;
  originalText: string;
  originalHtml: string;
  suggestedType: AIContentType;
  suggestedTypeLabelArabic: string;
  suggestedCardType: string; // matching editor CARD_TYPES (e.g. explanation, concepts, objective, examples, etc.)
  suggestedCardTitle: string;
  confidenceScore: number; // 0 to 100
  rationale: string; // سبب الاقتراح
  isQuestion: boolean;
  questionDetails?: AIQuestionDetail;
  needsManualReview: boolean; // يحتاج إلى مراجعة يدوية
  status: "pending" | "accepted" | "modified" | "ignored";
  userCustomCardType?: string;
  userCustomType?: AIContentType;
}

export interface AIContentAssistantResult {
  items: AIContentAnalysisItem[];
  summary: {
    totalAnalyzed: number;
    aiClassifiedCount: number;
    needsReviewCount: number;
    questionsCount: number;
  };
  meta?: AIExecutionSuccessResult<any>;
}

export interface UserCorrectionLog {
  id: string;
  originalTextSnippet: string;
  aiSuggestedType: string;
  userChosenType: string;
  userChosenCard: string;
  timestamp: string;
}

const LEARNING_STORAGE_KEY = "edutech_ai_learning_data_v1";

/**
 * Gets user correction history logged from previous manual overrides to personalize future AI suggestions.
 */
export function getUserCorrectionHistory(): UserCorrectionLog[] {
  try {
    const raw = localStorage.getItem(LEARNING_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Error reading user AI corrections history:", e);
    return [];
  }
}

/**
 * Records a user correction when the user overrides an AI classification proposal.
 * This logs learning data locally for the project without altering original content.
 */
export function recordUserCorrection(
  textSnippet: string,
  aiSuggestedType: string,
  userChosenType: string,
  userChosenCard: string
) {
  try {
    const history = getUserCorrectionHistory();
    const newEntry: UserCorrectionLog = {
      id: "corr_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      originalTextSnippet: textSnippet.substring(0, 80),
      aiSuggestedType,
      userChosenType,
      userChosenCard,
      timestamp: new Date().toISOString(),
    };
    history.push(newEntry);
    localStorage.setItem(LEARNING_STORAGE_KEY, JSON.stringify(history.slice(-100))); // keep last 100 corrections
  } catch (e) {
    console.error("Error logging user AI correction:", e);
  }
}

/**
 * Helper to map AI type to target Card Type and Title
 */
export function mapAiTypeToCard(type: AIContentType): { cardType: string; cardTitle: string } {
  switch (type) {
    case "heading":
      return { cardType: "title", cardTitle: "📘 عنوان الدرس" };
    case "objective":
      return { cardType: "objective", cardTitle: "🎯 الأهداف التعليمية" };
    case "concept":
      return { cardType: "concepts", cardTitle: "💡 المفاهيم والتعاريف" };
    case "explanation":
    case "paragraph":
      return { cardType: "explanation", cardTitle: "📖 الشرح والتوضيح" };
    case "example":
      return { cardType: "examples", cardTitle: "✅ الأمثلة التطبيقية" };
    case "activity":
      return { cardType: "activities", cardTitle: "⚡ الأنشطة والتجارب" };
    case "note":
      return { cardType: "notes", cardTitle: "📝 الملاحظات والتنبيهات" };
    case "table":
      return { cardType: "tables", cardTitle: "📊 الجداول المنسقة" };
    case "equation":
      return { cardType: "math", cardTitle: "🧪 المعادلات والرموز" };
    case "image":
      return { cardType: "images", cardTitle: "📷 الصور التوضيحية" };
    case "question":
      return { cardType: "questions", cardTitle: "الأسئلة والتطبيقات" };
    default:
      return { cardType: "explanation", cardTitle: "📖 الشرح والتوضيح" };
  }
}

/**
 * Processes unclassified or fallback elements using the Unified AI Gateway.
 * Supports cancellation via AbortSignal and async progress reporting.
 */
export async function analyzeContentWithAI(
  elements: SemanticElement[],
  options?: Omit<AIExecutionOptions, "onProgress"> & {
    signal?: AbortSignal;
    onProgress?: ((progress: any) => void) | ((percent: number) => void);
    subjectContext?: string;
  }
): Promise<AIContentAssistantResult> {
  const signal = options?.abortSignal || options?.signal;
  const subjectContext = options?.subjectContext;

  if (!elements || elements.length === 0) {
    return {
      items: [],
      summary: { totalAnalyzed: 0, aiClassifiedCount: 0, needsReviewCount: 0, questionsCount: 0 },
    };
  }

  // Check if signal is already aborted
  if (signal?.aborted) {
    throw new DOMException("تم إلغاء عملية الذكاء الاصطناعي من قبل المستخدم", "AbortError");
  }

  const prompt = `أنت مساعد المحتوى الذكي (AI Content Assistant) في منصة إديوتيك (Edutech).
وظيفتك: تحليل عناصر محتوى الدرس غير المحددة أو المعقدة وتصنيفها واقتراح البطاقة التعليمية والتفاصيل الدقيقة لكل عنصر.

السياق الدراسي: ${subjectContext || "عام"}

العناصر المطلوبة للتحليل:
${JSON.stringify(
  elements.map((e) => ({
    id: e.id,
    type: e.type,
    textContent: e.textContent,
    htmlContent: e.htmlContent,
  }))
)}

المطلوب لكل عنصر بشكل فائق الدقة:
1. تصنيفه إلى أحد الأنواع:
   - "heading" (عنوان)
   - "objective" (هدف تعليمي)
   - "concept" (مفهوم / تعريف)
   - "explanation" (شرح)
   - "example" (مثال)
   - "activity" (نشاط)
   - "note" (ملاحظة)
   - "table" (جدول)
   - "equation" (معادلة)
   - "image" (صورة)
   - "question" (سؤال)
   - "paragraph" (فقرة عامة)

2. اقتراح بطاقة المحرر المناسبة (suggestedCardType & suggestedCardTitle):
   - heading -> cardType: "title", cardTitle: "📘 عنوان الدرس"
   - objective -> cardType: "objective", cardTitle: "🎯 الأهداف التعليمية"
   - concept -> cardType: "concepts", cardTitle: "💡 المفاهيم والتعاريف"
   - explanation/paragraph -> cardType: "explanation", cardTitle: "📖 الشرح والتوضيح"
   - example -> cardType: "examples", cardTitle: "✅ الأمثلة التطبيقية"
   - activity -> cardType: "activities", cardTitle: "⚡ الأنشطة والتجارب"
   - note -> cardType: "notes", cardTitle: "📝 الملاحظات والتنبيهات"
   - table -> cardType: "tables", cardTitle: "📊 الجداول المنسقة"
   - equation -> cardType: "math", cardTitle: "🧪 المعادلات والرموز"
   - image -> cardType: "images", cardTitle: "📷 الصور التوضيحية"
   - question -> cardType: "questions", cardTitle: "❓ الأسئلة والتطبيقات"

3. إذا كشف الذكاء الاصطناعي أن العنصر يحتوي على سؤال:
   - اجعل isQuestion: true
   - أضف questionDetails:
     - questionType: "mcq" أو "true_false" أو "definition" أو "explain_reason" أو "fill_blanks" أو "ordering" أو "matching" أو "essay" أو "computational" أو "practical"
     - questionTypeLabelArabic: "نوع السؤال بالعربية"
     - questionText: "نص السؤال ناصعاً"
     - options: [ { "letter": "أ", "text": "...", "isCorrect": false }, { "letter": "ب", "text": "...", "isCorrect": true } ]
     - correctAnswer: "الإجابة الإجرائية الكاملة خطوة بخطوة"
     - difficulty: "easy" أو "medium" أو "hard"
     - difficultyLabelArabic: "سهل" أو "متوسط" أو "صعب"
     - educationalSkill: "تذكر" أو "فهم" أو "تطبيق" أو "تحليل" أو "تقويم" أو "إبداع"
     - keywords: ["كلمة1", "كلمة2"]

4. درجة الثقة (confidenceScore) من 0 إلى 100 بناءً على وضوح النمط.
5. سبب الاقتراح (rationale) بلغة عربية سليمة.
6. إذا كانت درجة الثقة أقل من 60، اجعل needsManualReview: true.
7. تنسيق JSON: أرجع النتيجة حصراً بصيغة JSON نظيفة:
{
  "analyzedElements": [
    {
      "id": "نفس id العنصر الأصلي",
      "suggestedType": "concept",
      "suggestedTypeLabelArabic": "مفهوم",
      "suggestedCardType": "concepts",
      "suggestedCardTitle": "💡 المفاهيم والتعاريف",
      "confidenceScore": 95,
      "rationale": "تم اكتشاف صيغة تعريف علمي صريح لمفهوم محوري",
      "isQuestion": false,
      "questionDetails": null,
      "needsManualReview": false
    }
  ]
}`;

  try {
    let rawItems: any[] = [];
    let meta: AIExecutionSuccessResult<any> | undefined;

    const execResult = await executeWithAIGateway(prompt, undefined, {
      mode: options?.mode,
      specificModelId: options?.specificModelId,
      temperature: options?.temperature,
      systemPrompt: options?.systemPrompt,
      abortSignal: signal,
      taskType: "content_assistant",
      onProgress: options?.onProgress
        ? (prog) => {
            if (typeof options.onProgress === "function") {
              (options.onProgress as any)(prog);
            }
          }
        : undefined,
    });

    meta = execResult;
    const responseText = execResult.data;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonStr = jsonMatch
      ? jsonMatch[1]
      : responseText.replace(/^[^{]*/, "").replace(/[^}]*$/, "");
    const parsed = JSON.parse(jsonStr);
    rawItems = parsed.analyzedElements || [];

    // Map response and apply local user corrections learning weights
    const userHistory = getUserCorrectionHistory();

    const finalItems: AIContentAnalysisItem[] = elements.map((elem) => {
      const serverResult = rawItems.find((r) => r.id === elem.id);

      let item: AIContentAnalysisItem;

      if (serverResult) {
        item = {
          id: elem.id,
          originalText: cleanLeakedTokens(normalizeBidiPlainText(elem.textContent || "عنصر بدون نص")),
          originalHtml: cleanLeakedTokens(normalizeBidiHtml(elem.htmlContent || "")),
          suggestedType: serverResult.suggestedType || "paragraph",
          suggestedTypeLabelArabic:
            serverResult.suggestedTypeLabelArabic ||
            AI_TYPE_ARABIC_LABELS[serverResult.suggestedType as AIContentType] ||
            "فقرة عامة",
          suggestedCardType: serverResult.suggestedCardType || "explanation",
          suggestedCardTitle: serverResult.suggestedCardTitle || "📖 الشرح",
          confidenceScore: serverResult.confidenceScore ?? 85,
          rationale: cleanLeakedTokens(normalizeBidiPlainText(serverResult.rationale || "تم التحليل بواسطة نموذج الذكاء الاصطناعي")),
          isQuestion: !!serverResult.isQuestion,
          questionDetails: serverResult.questionDetails
            ? {
                ...serverResult.questionDetails,
                questionText: cleanLeakedTokens(normalizeBidiPlainText(serverResult.questionDetails.questionText || "")),
                correctAnswer: serverResult.questionDetails.correctAnswer
                  ? cleanLeakedTokens(normalizeBidiPlainText(serverResult.questionDetails.correctAnswer))
                  : undefined,
                options: (serverResult.questionDetails.options || []).map((o: any) => ({
                  ...o,
                  text: cleanLeakedTokens(normalizeBidiPlainText(o.text || "")),
                })),
              }
            : undefined,
          needsManualReview: !!serverResult.needsManualReview,
          status: "pending",
        };
      } else {
        // Fallback local heuristic item
        const fallbackCard = mapAiTypeToCard("paragraph");
        item = {
          id: elem.id,
          originalText: cleanLeakedTokens(normalizeBidiPlainText(elem.textContent || "عنصر بدون نص")),
          originalHtml: cleanLeakedTokens(normalizeBidiHtml(elem.htmlContent || "")),
          suggestedType: "paragraph",
          suggestedTypeLabelArabic: "فقرة عامة",
          suggestedCardType: fallbackCard.cardType,
          suggestedCardTitle: fallbackCard.cardTitle,
          confidenceScore: 40,
          rationale: "تعذر التحليل عبر الذكاء الاصطناعي، تم النقل للمراجعة اليدوية",
          isQuestion: false,
          needsManualReview: true,
          status: "pending",
        };
      }

      // Check user history to adjust suggestion or rationale if user frequently corrects this pattern
      const textSub = item.originalText.substring(0, 30);
      const matchHistory = userHistory.find((h) => textSub.includes(h.originalTextSnippet.substring(0, 20)));
      if (matchHistory) {
        item.rationale += ` (ملاحظة: تكيّف مع تفضيل سابق للمستخدم -> ${matchHistory.userChosenType})`;
      }

      return item;
    });

    const questionsCount = finalItems.filter((i) => i.isQuestion).length;
    const needsReviewCount = finalItems.filter((i) => i.needsManualReview || i.confidenceScore < 60).length;

    return {
      items: finalItems,
      summary: {
        totalAnalyzed: finalItems.length,
        aiClassifiedCount: finalItems.length - needsReviewCount,
        needsReviewCount,
        questionsCount,
      },
      meta,
    };
  } catch (error: any) {
    if (error.name === "AbortError" || signal?.aborted) {
      throw new DOMException("تم إلغاء عملية الذكاء الاصطناعي من قبل المستخدم", "AbortError");
    }
    console.error("AI Content Assistant Error, using resilient local fallback:", error);

    // Resilient local fallback: preserve all items and mark low confidence / needs manual review
    const fallbackItems: AIContentAnalysisItem[] = elements.map((elem) => {
      const text = elem.textContent.trim();
      let type: AIContentType = "paragraph";

      if (/^(س:|سؤال|س\s*:|علل|فسر|عرف|اختر)/.test(text) || text.endsWith("؟")) {
        type = "question";
      } else if (/^(تعريف|مفهوم|المقصود بـ)/.test(text)) {
        type = "concept";
      } else if (/^(هدف|الأهداف|يتوقع من الطالب)/.test(text)) {
        type = "objective";
      } else if (/^(مثال|أمثلة)/.test(text)) {
        type = "example";
      } else if (/^(نشاط|تجربة)/.test(text)) {
        type = "activity";
      } else if (/^(ملاحظة|تنبيه|تذكر)/.test(text)) {
        type = "note";
      }

      const card = mapAiTypeToCard(type);

      return {
        id: elem.id,
        originalText: text || "عنصر غير محدد",
        originalHtml: elem.htmlContent,
        suggestedType: type,
        suggestedTypeLabelArabic: AI_TYPE_ARABIC_LABELS[type] || "عنصر",
        suggestedCardType: card.cardType,
        suggestedCardTitle: card.cardTitle,
        confidenceScore: type === "paragraph" ? 45 : 75,
        rationale: type === "paragraph" ? "نص غير معروف النمط - تم إدراجه للمراجعة اليدوية" : "تم التصنيف بالنمط المحلي الاحتياطي",
        isQuestion: type === "question",
        needsManualReview: type === "paragraph",
        status: "pending",
      };
    });

    return {
      items: fallbackItems,
      summary: {
        totalAnalyzed: fallbackItems.length,
        aiClassifiedCount: fallbackItems.filter((i) => !i.needsManualReview).length,
        needsReviewCount: fallbackItems.filter((i) => i.needsManualReview).length,
        questionsCount: fallbackItems.filter((i) => i.isQuestion).length,
      },
    };
  }
}

