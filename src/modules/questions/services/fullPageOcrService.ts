import { executeWithAIGateway } from "../../ai/services/aiProviderAdapter";
import { debugLog } from "../../../utils/debugLog";

export interface ExtractedQuestionData {
  type: string;
  text: string;
  answer: string;
  distractors?: { text: string; isCorrect: boolean }[];
  difficulty: "easy" | "medium" | "hard";
  importance: 1 | 2 | 3 | 4 | 5;
  explanation?: string;
  boundingBox?: { top: number; left: number; width: number; height: number };
}

export async function extractQuestionsFromFullPage(
  imageBase64: string,
  onProgress?: (msg: string) => void
): Promise<ExtractedQuestionData[]> {
  const prompt = `أنت خبير في استخراج النصوص وتحويلها (OCR) بدقة فائقة من الصور، ومختص في تحليل المحتوى التعليمي.
هذه صورة لصفحة كاملة تحتوي على مجموعة من الأسئلة.
المطلوب:
1. استخراج جميع الأسئلة الموجودة في الصفحة.
2. تحديد نوع كل سؤال (mcq, true_false, essay, fill_blanks, problem, etc.).
3. استخراج نص السؤال بدقة، مع الحفاظ على المعادلات الرياضية والرموز بصيغة LaTeX محاطة بـ $ للسطر الواحد أو $$ للأسطر المتعددة.
4. استخراج الإجابة الصحيحة أو النموذجية لكل سؤال (إن وجدت) أو توقع الإجابة المناسبة باختصار.
5. بالنسبة لأسئلة الاختيار من متعدد، استخرج جميع الخيارات وضعها في حقل distractors مع تحديد الخيار الصحيح (اجعل isCorrect: true للخيار الصحيح إن كان معلوماً، وإلا اجعله للخيار الأول كافتراضي، مع بقية الخيارات كـ false).
6. تقييم مستوى الصعوبة (easy, medium, hard).
7. تحديد مستوى الأهمية من 1 إلى 5.
8. بالنسبة لكل سؤال، حدد إحداثيات المنطقة التقريبية التي استخرج منها داخل الصورة وضعها في حقل boundingBox بنسب مئوية (0 إلى 100): { "top": 10, "left": 5, "width": 90, "height": 15 }.

يجب أن يكون الناتج حصرياً بصيغة JSON Array، ولا تكتب أي نص إضافي قبل أو بعد الـ JSON.
مثال للناتج المطلوب:
[
  {
    "type": "mcq",
    "text": "ما هو ناتج $2+2$؟",
    "answer": "4",
    "distractors": [
      { "text": "4", "isCorrect": true },
      { "text": "3", "isCorrect": false },
      { "text": "5", "isCorrect": false },
      { "text": "6", "isCorrect": false }
    ],
    "difficulty": "easy",
    "importance": 3,
    "explanation": "عملية جمع بسيطة",
    "boundingBox": { "top": 15, "left": 5, "width": 80, "height": 12 }
  }
]
`;

  try {
    if (onProgress) onProgress("جاري تحليل الصورة عبر الذكاء الاصطناعي واستخراج الأسئلة...");
    const response = await executeWithAIGateway(prompt, imageBase64, {
      mode: "auto",
    });

    const rawResult = response.data;
    
    // Clean up JSON markdown blocks
    let jsonStr = rawResult;
    const jsonMatch = rawResult.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    } else {
      // Sometimes it returns markdown without json keyword
      const genericMatch = rawResult.match(/```\s*([\s\S]*?)\s*```/);
      if (genericMatch) {
        jsonStr = genericMatch[1];
      }
    }
    
    // Attempt to parse
    const parsed = JSON.parse(jsonStr.trim()) as ExtractedQuestionData[];
    
    if (!Array.isArray(parsed)) {
      throw new Error("Invalid output format. Expected an array of questions.");
    }
    
    if (onProgress) onProgress("تم الاستخراج بنجاح.");
    return parsed;
  } catch (error: any) {
    debugLog("FullPageOcrPipeline", "Error during extraction", error);
    throw new Error(error.message || "حدث خطأ أثناء تحليل الصورة.");
  }
}
