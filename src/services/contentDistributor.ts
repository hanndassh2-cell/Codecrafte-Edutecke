import { SemanticElement, SemanticElementType, ContentAnalysisResult } from "./contentAnalyzer";
import { parseQuestionsFromContent } from "./questionParser";
import { storage } from "./storage";
import { QuestionType } from "../types";
import { validateCurriculumContext } from "../utils/curriculumValidator";

export interface CardMappingRule {
  cardType: string;
  cardTitle: string;
  iconName: string;
}

export const ELEMENT_TO_CARD_MAP: Record<SemanticElementType, CardMappingRule> = {
  heading: { cardType: "title", cardTitle: "📘 عنوان الدرس", iconName: "Type" },
  paragraph: { cardType: "explanation", cardTitle: "📖 الشرح", iconName: "BookOpen" },
  definition: { cardType: "concepts", cardTitle: "💡 المفاهيم والتعاريف", iconName: "Lightbulb" },
  table: { cardType: "tables", cardTitle: "📊 الجداول", iconName: "Table" },
  image: { cardType: "images", cardTitle: "📷 الصور", iconName: "Image" },
  equation: { cardType: "math", cardTitle: "🧪 المعادلات والرموز", iconName: "Sigma" },
  list: { cardType: "explanation", cardTitle: "📖 الشرح والتعديدات", iconName: "BookOpen" },
  activity: { cardType: "activities", cardTitle: "⚡ الأنشطة والتجارب", iconName: "Activity" },
  question: { cardType: "questions", cardTitle: "الأسئلة والتطبيقات", iconName: "FileText" },
  note: { cardType: "notes", cardTitle: "📝 الملاحظات والتنبيهات", iconName: "StickyNote" },
  example: { cardType: "examples", cardTitle: "✅ الأمثلة المحلولة", iconName: "CheckSquare" },
  link: { cardType: "explanation", cardTitle: "📖 الشرح والروابط", iconName: "BookOpen" },
  file: { cardType: "notes", cardTitle: "📝 الملاحظات والملحقات", iconName: "StickyNote" },
  unknown: { cardType: "explanation", cardTitle: "📖 الشرح", iconName: "BookOpen" },
};

export interface DistributedCardProposal {
  id: string;
  cardType: string;
  cardTitle: string;
  elementIds: string[];
  elements: SemanticElement[];
  htmlBody: string;
  isEnabled: boolean;
}

export interface DistributionResult {
  proposals: DistributedCardProposal[];
  unmappedCount: number;
  totalCardsToCreate: number;
}

/**
 * Takes analyzed semantic elements and automatically groups them into target Card Proposals.
 * Groups elements of the same type or semantic purpose into corresponding editor card structures.
 */
export function distributeContentToCards(
  elements: SemanticElement[],
  groupSameType: boolean = true
): DistributionResult {
  if (!elements || elements.length === 0) {
    return { proposals: [], unmappedCount: 0, totalCardsToCreate: 0 };
  }

  const proposals: DistributedCardProposal[] = [];
  const mapTypeToProposalIndex: Record<string, number> = {};

  elements.forEach((elem) => {
    const rule = ELEMENT_TO_CARD_MAP[elem.type] || ELEMENT_TO_CARD_MAP.unknown;
    const targetCardType = rule.cardType;

    if (groupSameType && mapTypeToProposalIndex[targetCardType] !== undefined) {
      const idx = mapTypeToProposalIndex[targetCardType];
      const existing = proposals[idx];
      existing.elementIds.push(elem.id);
      existing.elements.push(elem);
      existing.htmlBody += elem.htmlContent.startsWith("<") ? elem.htmlContent : `<p>${elem.htmlContent}</p>`;
    } else {
      const newProposal: DistributedCardProposal = {
        id: "card_prop_" + Math.random().toString(36).substring(2, 9),
        cardType: targetCardType,
        cardTitle: rule.cardTitle,
        elementIds: [elem.id],
        elements: [elem],
        htmlBody: elem.htmlContent.startsWith("<") ? elem.htmlContent : `<p>${elem.htmlContent}</p>`,
        isEnabled: true,
      };
      proposals.push(newProposal);
      if (groupSameType) {
        mapTypeToProposalIndex[targetCardType] = proposals.length - 1;
      }
    }
  });

  return {
    proposals,
    unmappedCount: 0,
    totalCardsToCreate: proposals.filter((p) => p.isEnabled).length,
  };
}

/**
 * Converts selected card proposals into standard Editor Paragraph/Card objects ready for setParagraphs.
 */
export function convertProposalsToEditorCards(proposals: DistributedCardProposal[], lessonContext?: any) {
  return proposals
    .filter((p) => p.isEnabled && p.htmlBody.trim())
    .map((p) => {
      let cardBody = p.htmlBody;

      if (p.cardType === "questions" && p.htmlBody) {
        try {
          const trimmed = p.htmlBody.trim();
          if (!trimmed.startsWith("[") && !trimmed.startsWith("{")) {
            const parsedRes = parseQuestionsFromContent(p.htmlBody);
            if (parsedRes && parsedRes.questions && parsedRes.questions.length > 0) {
              const formattedList = parsedRes.questions.map((q, idx) => {
                const questionTypeMap: Record<string, string> = {
                  explain_reason: "reason",
                  computational: "problem",
                  definition: "definition",
                  mcq: "mcq",
                  true_false: "true_false",
                  ordering: "ordering",
                  matching: "matching",
                  essay: "essay",
                  practical: "essay",
                };

                const fq = {
                  id: q.id || "q-" + Date.now() + "-" + idx,
                  type: (questionTypeMap[q.type] || "essay") as QuestionType,
                  text: q.questionText || p.htmlBody,
                  answer: q.modelAnswer || "",
                  distractors: q.options?.map((opt) => ({
                    id: opt.id,
                    text: opt.text,
                    isCorrect: !!opt.isCorrect,
                  })) || [],
                  difficulty: q.difficulty || "medium",
                  score: q.marks || 1,
                  finalWeightScore: q.marks || 1,
                  importance: 3 as const,
                  tags: [],
                  isPastCycle: false,
                  occurrencesCount: 0,
                  futureProbability: 0,
                  subjectId: lessonContext?.subjectId || "",
                  unitId: lessonContext?.unitId || "",
                  lessonId: lessonContext?.id || "",
                  subjectName: lessonContext?.subjectName || "",
                  unitTitle: lessonContext?.unitTitle || "",
                  lessonTitle: lessonContext?.title || "",
                  createdAt: new Date().toISOString(),
                };

                const validation = validateCurriculumContext(fq.subjectId, fq.unitId, fq.lessonId);
                if (validation.isValid) {
                  storage.saveQuestion(fq);
                } else {
                  console.warn("[DATA-1] Skipping saveQuestion in contentDistributor due to invalid context:", fq.id);
                }
                return fq;
              });

              cardBody = JSON.stringify(formattedList);
            }
          }
        } catch (err) {
          console.error("Failed to auto-parse questions in convertProposalsToEditorCards:", err);
        }
      }

      return {
        id: "p-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
        title: p.cardTitle,
        body: cardBody,
        type: p.cardType,
      };
    });
}
