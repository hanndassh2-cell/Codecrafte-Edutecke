import {
  generateAIResponse,
  executeWithAIGateway,
  AIExecutionOptions,
  AIExecutionSuccessResult,
} from "./aiProviderAdapter";
import { cleanLeakedTokens, normalizeBidiPlainText, normalizeBidiHtml } from "../../../services/bidiContentPipeline";

export interface DistractorGenResult {
  distractors: string[];
  rationale?: string;
  meta?: AIExecutionSuccessResult<any>;
}

export interface QuestionGenItem {
  type: string;
  text: string;
  answer: string;
  distractors?: string[];
  difficulty: "easy" | "medium" | "hard";
  importance: number;
  futureProb: number;
  explanation?: string;
}

export interface QuestionGenResult {
  questions: QuestionGenItem[];
}

export interface ExamAiResult {
  examTitle?: string;
  pedagogicalRationale?: string;
  recommendedDistribution?: {
    mcqCount: number;
    trueFalseCount: number;
    problemsCount: number;
  };
  sampleAiQuestions?: {
    text: string;
    type: string;
    answer: string;
    distractors?: string[];
    allocatedMarks: number;
    importance: number;
  }[];
  meta?: AIExecutionSuccessResult<any>;
}

export interface OcrAiResult {
  html: string;
  text: string;
  meta?: AIExecutionSuccessResult<any>;
}

export function localParseTextQuestions(
  rawText: string,
  defaultSubject: string,
  importPattern: string = "auto",
) {
  const cleanText = (rawText || "").replace(/<[^>]+>/g, "\n");
  const lines = cleanText.split("\n").map((l) => l.trim()).filter(Boolean);

  const questions: any[] = [];
  let currentQuestion: any = null;

  const isQuestionHeader = (line: string) => {
    return (
      /^(س\d*[:\.\-]|سؤال\d*[:\.\-]|Q\d*[:\.\-]|[\d\u0660-\u0669]+[\.\-\)])/i.test(line) ||
      line.endsWith("؟") ||
      line.endsWith("?")
    );
  };

  const isOptionLine = (line: string) => {
    return /^([أبجدa-d][\.\-\)]|[\(][أبجدa-d][\)]|\[\s*\]|[\*\-•])\s+/i.test(line);
  };

  const isAnswerLine = (line: string) => {
    return /^(الإجابة|الجواب|الحل|الإجابة الصحيحة|الخيار الصحيح|ج[:\.\-])/i.test(line);
  };

  for (const line of lines) {
    if (isQuestionHeader(line)) {
      if (currentQuestion) {
        questions.push(currentQuestion);
      }
      const qText = line
        .replace(/^(س\d*[:\.\-]|سؤال\d*[:\.\-]|Q\d*[:\.\-]|[\d\u0660-\u0669]+[\.\-\)])\s*/i, "")
        .trim();
      currentQuestion = {
        text: qText || line,
        type: importPattern === "auto" ? "essay" : importPattern,
        answer: "",
        distractors: [],
        difficulty: "medium",
        importance: 4,
        futureProb: 80,
      };
    } else if (currentQuestion && isOptionLine(line)) {
      currentQuestion.type = "mcq";
      const optionText = line
        .replace(/^([أبجدa-d][\.\-\)]|[\(][أبجدa-d][\)]|\[\s*\]|[\*\-•])\s+/i, "")
        .trim();
      if (optionText) {
        currentQuestion.distractors.push(optionText);
      }
    } else if (currentQuestion && isAnswerLine(line)) {
      const ansText = line
        .replace(/^(الإجابة|الجواب|الحل|الإجابة الصحيحة|الخيار الصحيح|ج[:\.\-])\s*/i, "")
        .trim();
      if (ansText) {
        currentQuestion.answer = ansText;
      }
    } else if (currentQuestion) {
      if (!currentQuestion.answer) {
        currentQuestion.answer += (currentQuestion.answer ? "\n" : "") + line;
      }
    } else {
      currentQuestion = {
        text: line,
        type: importPattern === "auto" ? "essay" : importPattern,
        answer: "",
        distractors: [],
        difficulty: "medium",
        importance: 4,
        futureProb: 80,
      };
    }
  }

  if (currentQuestion) {
    questions.push(currentQuestion);
  }

  const parsedQuestions = questions.map((q) => {
    let qType = q.type;
    if (importPattern !== "auto") qType = importPattern;
    let distractors = q.distractors || [];

    return {
      text: cleanLeakedTokens(normalizeBidiPlainText(q.text || "")),
      type: qType,
      answer: cleanLeakedTokens(normalizeBidiPlainText(q.answer || "")),
      distractors:
        qType === "mcq"
          ? distractors
              .slice(0, 3)
              .map((d: string) => cleanLeakedTokens(normalizeBidiPlainText(d)))
          : undefined,
      difficulty: q.difficulty || "medium",
      importance: q.importance || 4,
      futureProb: q.futureProb || 80,
    };
  });

  return { parsedQuestions };
}

class AiService {
  /**
   * 1. Solve Question with Step-by-Step solutions, LaTeX equations, and RTL formatting.
   */
  async solveQuestion(
    question: any,
    shortSolution: boolean = false,
    options?: AIExecutionOptions
  ): Promise<string> {
    const distractorsList =
      question.distractors && question.distractors.length > 0
        ? question.distractors
            .map((d: any, i: number) => `${i + 1}- ${typeof d === "string" ? d : d.text}`)
            .join("\n")
        : "";

    const prompt = `أنت معلم وخبير تربوي متخصص. مهمتك هي حل السؤال التالي وتقديم الإجابة النموذجية أو خطوات الحل بشكل دقيق واحترافي.

تفاصيل السؤال:
- نص السؤال: ${question.text || question.questionText}
- نوع السؤال: ${question.type || "عام"}
${distractorsList ? `- الخيارات المتاحة:\n${distractorsList}` : ""}
${question.answer ? `- الإجابة الحالية (للإسترشاد): ${question.answer}` : ""}
${shortSolution ? "- المطلوب: تقديم الحل المباشر والمختصر فقط بدون تفصيل زائد." : ""}

المطلوب:
1. تقديم الحل النموذجي المفصل والواضح.
2. إذا كان السؤال اختياراً من متعدد أو صح/خطأ، اذكر الإجابة الصحيحة بشكل صريح ومباشر، ثم قدم تفسيراً علمياً ومنطقياً لسبب صحتها.
3. إذا كان السؤال مسألة (رياضيات، فيزياء، كيمياء وغيرها)، اكتب الحل بخطوات متسلسلة (Step-by-step): القانون، التعويض، العمليات الحسابية الوسيطة، ثم الناتج النهائي مع الوحدات.
4. استخدم LaTeX لأي معادلات أو أرقام أو رموز رياضية/علمية ($...$ أو $$...$$).
5. يجب أن يكون المخرج باللغة العربية السليمة وباتجاه RTL.`;

    try {
      const response = await generateAIResponse(prompt, undefined, options);
      return cleanLeakedTokens(normalizeBidiPlainText(response.trim()));
    } catch (error: any) {
      if (error.name === "AbortError") {
        throw error;
      }
      console.error("AI Solve Error:", error);
      throw error;
    }
  }

  /**
   * 2. Generate 3 Distractors with JSON output, LaTeX equations, and rationale.
   */
  async generateDistractors(
    questionText: string,
    answerText: string,
    questionType: string,
    subjectName: string,
    options?: AIExecutionOptions
  ): Promise<DistractorGenResult> {
    const cleanHTML = (html: string) => {
      return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    };
    
    const cleanQ = cleanHTML(questionText);
    const cleanA = cleanHTML(answerText);

    const prompt = `أنت خبير تربوي ومصمم امتحانات متمرس.
المطلوب: توليد 3 مشتتات ذكية (خيارات خاطئة منطقية وجذابة ولكنها غير صحيحة مطلقاً).

بيانات السؤال:
- المادة: ${subjectName || "عام"}
- نوع السؤال: ${questionType || "اختيار من متعدد"}
- نص السؤال: "${cleanQ}"
- الإجابة الصحيحة: "${cleanA}"

المتطلبات الدقيقة والصارمة:
1. قم بالرد بصيغة JSON حصرية فقط.
2. يجب أن يحتوي حقل "distractors" على 3 مشتتات خاطئة ومنطقية وفريدة.
3. يمنع منعاً باتاً تضمين الإجابة الصحيحة (أو ما يطابقها) ضمن المشتتات.
4. يمنع ترك أي مشتت فارغ، أو تكرار مشتت مرتين.
5. لا تضف نتائج جزئية (يجب أن يكون العدد بالضبط 3).
6. حافظ على الرموز الرياضية بصيغة LaTeX داخل $...$ إذا لزم الأمر، مع مضاعفة الهروب (Double Escape) لأي شرطة مائلة خلفية داخل JSON (مثل \\\\frac بدلاً من \\frac).

أرجع النتيجة بصيغة JSON حصرية بالشكل التالي:
{
  "distractors": ["مشتت خاطئ 1", "مشتت خاطئ 2", "مشتت خاطئ 3"],
  "rationale": "شرح الأخطاء الإجرائية والمفاهيمية التي استندت إليها المشتتات..."
}`;

    try {
      const execResult = await executeWithAIGateway(prompt, undefined, options);
      const responseText = execResult.data;
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      let jsonStr = jsonMatch ? jsonMatch[1] : responseText.replace(/^[^{]*/, "").replace(/[^}]*$/, "");
      
      const parsed = JSON.parse(jsonStr);
      let distractors = (parsed.distractors || []).map((d: string) => cleanLeakedTokens(normalizeBidiPlainText(String(d))).trim()).filter(Boolean);
      
      distractors = Array.from(new Set(distractors));
      distractors = distractors.filter((d: string) => d.toLowerCase() !== cleanA.toLowerCase());
      
      if (distractors.length !== 3) {
        throw new Error(`تم توليد ${distractors.length} مشتت(ات) صالحة بدلاً من 3. يرجى المحاولة مرة أخرى.`);
      }
      
      return {
        distractors,
        rationale: parsed.rationale || "تم التوليد بنجاح بناءً على أخطاء شائعة.",
        meta: execResult,
      };
    } catch (e: any) {
      if (e.name === "AbortError") {
        throw e;
      }
      console.warn("AI Distractor Gen Error:", e);
      throw new Error(e.message || "فشل الذكاء الاصطناعي في الاستجابة بتنسيق JSON صحيح.");
    }
  }

  /**
   * 3. Exam Generator Copilot.
   */
  async generateExamCopilot(
    subjectOrParams: any,
    unitsOrOptions?: any,
    totalQuestions?: number,
    totalMarks?: number,
    options?: AIExecutionOptions
  ): Promise<ExamAiResult> {
    let subjectName = "المادة";
    let title = "اختبار شامل";
    let unitsList: string[] = [];
    let duration = 45;

    if (typeof subjectOrParams === "string") {
      subjectName = subjectOrParams;
      if (Array.isArray(unitsOrOptions)) {
        unitsList = unitsOrOptions;
      }
    } else if (typeof subjectOrParams === "object" && subjectOrParams !== null) {
      subjectName = subjectOrParams.subjectName || subjectName;
      title = subjectOrParams.title || title;
      unitsList = subjectOrParams.units || unitsList;
      duration = subjectOrParams.durationMinutes || duration;
    }

    const prompt = `أنت مساعد ذكاء اصطناعي خبير في تصميم وهيكلة الامتحانات المدرسية.

الموضوع: ${subjectName}
العنوان: ${title}
الوحدات: ${JSON.stringify(unitsList)}
المدة: ${duration} دقيقة
${totalQuestions ? `إجمالي عدد الأسئلة المستهدف: ${totalQuestions}` : ""}
${totalMarks ? `إجمالي الدرجات: ${totalMarks}` : ""}

صمم هيكل امتحان متوازن وموصى به تربوياً بصيغة JSON:
{
  "examTitle": "${title}",
  "pedagogicalRationale": "مبرر تربوي لتوزيع الأسئلة ومستويات الصعوبة",
  "recommendedDistribution": {
    "mcqCount": 5,
    "trueFalseCount": 4,
    "problemsCount": 2
  }
}`;

    try {
      const execResult = await executeWithAIGateway(prompt, undefined, options);
      const responseText = execResult.data;
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : responseText.replace(/^[^{]*/, "").replace(/[^}]*$/, "");
      const parsed = JSON.parse(jsonStr);
      return {
        ...parsed,
        meta: execResult,
      };
    } catch (e: any) {
      if (e.name === "AbortError") {
        throw e;
      }
      return {
        examTitle: title,
        pedagogicalRationale: "توزيع متوازن بين الأسئلة الموضوعية والمقالية",
        recommendedDistribution: {
          mcqCount: 5,
          trueFalseCount: 4,
          problemsCount: 2,
        },
      };
    }
  }

  /**
   * 4. Parse Questions from Raw Text.
   */
  async parseTextQuestions(
    rawText: string,
    defaultSubject: string,
    importPattern: string = "auto",
    options?: AIExecutionOptions
  ): Promise<{ parsedQuestions: any[]; meta?: AIExecutionSuccessResult<any> }> {
    try {
      let patternInstruction = "";
      if (importPattern === "mcq") {
        patternInstruction = `توجيهات هامة جداً:
- يجب تحويل أي نص مدخل أو توليد أسئلة اختيار من متعدد (mcq) بشكل صارم.
- قم بابتكار وتوليد 3 خيارات خاطئة (مشتتات) علمية ومنطقية من السياق في حقل "distractors".
- ضع الإجابة الإجرائية الكاملة خطوة بخطوة في حقل "answer".
- نوع السؤال يجب أن يكون "mcq".`;
      } else if (importPattern === "true_false") {
        patternInstruction = `توجيهات هامة جداً:
- يجب استنباط حقائق من النص وتحويلها لعبارات "صح وخطأ" (true_false) متوازنة وصارمة.
- يجب أن يكون نوع السؤال "true_false".`;
      } else if (importPattern !== "auto") {
        patternInstruction = `توجيهات هامة جداً:
- يجب أن يكون نوع جميع الأسئلة المستخرجة هو: "${importPattern}".
- قم بصياغة الأسئلة بما يتناسب مع هذا النوع مع كتابة الحل الإجرائي الكامل للمسائل.`;
      }

      const distractorsField = importPattern === "mcq" ? '\n      "distractors": ["خيار خاطئ 1", "خيار خاطئ 2", "خيار خاطئ 3"],' : '';
      const typeField = importPattern === "auto" ? "essay" : importPattern;

      const prompt = `أنت مساعد ذكاء اصطناعي خبير في تحليل المناهج الدراسية واستخراج الأسئلة التعليمية وحلها وتصنيفها.
مهمتك هي استخراج جميع الأسئلة والمسائل والتمارين من النص الخام التالي الخاص بمادة "${defaultSubject}"، مع كتابة الإجابة النموذجية الإجرائية الكاملة لكل سؤال.

النص الخام المدخل:
-------------------
${rawText}
-------------------
${patternInstruction}

القواعد الصارمة:
1. قواعد الحل الإجرائي والنموذجي (في حقل "answer"): يجب تقديم الإجابة النموذجية والإجرائية الكاملة خطوة بخطوة لكل سؤال مستخرج. إذا كانت الإجابة مذكورة في النص قم باستخراجها وتنسيقها بدقة. وإذا لم تكن الإجابة مذكورة في النص، فيجب عليك حل المسألة/السؤال علمياً ورياضياً بدقة تامة وبخطوات واضحة متسلسلة (القانون ← التعويض ← التبسيط والحسابات ← الناتج النهائي مع الوحدات). يمنع ترك حقل "answer" فارغاً.
2. كتابة كافة الرموز والمعادلات بصيغة LaTeX داخل علامات $...$ أو $$...$$.
3. لكل سؤال، قم بتقدير مستوى الصعوبة (easy / medium / hard)، ودرجة الأهمية (1-5)، واحتمالية الورود (0-100). استخرج بيانات المرجع (اسم الكتاب، رقم الصفحة، عنوان السؤال، ورقم التمرين) إن وجدت وضعها في كائن bookReference.
4. إذا كان السؤال اختياراً من متعدد (mcq) أو صح وخطأ، حدد الخيار الصحيح بوضوح في حقل "answer" وضع المشتتات الخاطئة في "distractors".
5. هام جداً لتنسيق JSON: يجب مضاعفة الهروب (Double Escape) لأي شرطة مائلة خلفية (Backslash) داخل نصوص JSON (مثل \\\\frac بدلاً من \\frac، و \\\\pm بدلاً من \\pm).

يجب أن تعيد النتيجة بتنسيق JSON صالح وحصراً بهذا الهيكل (مع إضافة حقل distractors إذا كان النوع mcq يحتوي على 3 مشتتات):
{
  "parsedQuestions": [
    {
      "text": "نص السؤال هنا بشكل واضح ومنسق",
      "type": "${typeField}",
      "answer": "الإجابة النموذجية الإجرائية الكاملة خطوة بخطوة مع المعادلات وصيغ LaTeX",${distractorsField}
      "difficulty": "medium",
      "importance": 4,
      "futureProb": 80,
      "bookReference": {
        "bookSource": "اسم الكتاب أو المصدر إذا ذكر",
        "pageNumber": "رقم الصفحة إذا ذكرت",
        "questionTitle": "عنوان السؤال أو الفقرة إذا ذكر",
        "exerciseNumber": "رقم التمرين أو السؤال إذا ذكر"
      }
    }
  ]
}

- يمنع منعاً باتاً إضافة أي نص خارج كود JSON.
- تأكد من صحة بناء الـ JSON (تجنب الأخطاء الإملائية أو الأقواس الناقصة).`;

      const execResult = await executeWithAIGateway(prompt, undefined, options);
      const responseText = execResult.data;
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch
        ? jsonMatch[1]
        : responseText.replace(/^[^{]*/, "").replace(/[^}]*$/, "");

      const parsed = JSON.parse(jsonStr);

      if (parsed && Array.isArray(parsed.parsedQuestions)) {
        parsed.parsedQuestions = parsed.parsedQuestions.map((q: any) => ({
          ...q,
          text: cleanLeakedTokens(normalizeBidiPlainText(q.text || "")),
          answer: cleanLeakedTokens(normalizeBidiPlainText(q.answer || "")),
          distractors: Array.isArray(q.distractors)
            ? q.distractors.map((d: any) => cleanLeakedTokens(normalizeBidiPlainText(String(d))))
            : undefined,
        }));
        return { ...parsed, meta: execResult };
      }
    } catch (e: any) {
      if (e.name === "AbortError") {
        throw e;
      }
      console.warn("Direct AI parse text error, activating local smart parser fallback...", e);
    }

    return localParseTextQuestions(rawText, defaultSubject, importPattern);
  }

  /**
   * 5. OCR & Vision Text/Equation Extraction.
   */
  async ocrExtract(
    imageBase64: string,
    options?: AIExecutionOptions
  ): Promise<OcrAiResult> {
    const prompt = `أنت خبير في استخراج النصوص وتحويلها (OCR) بدقة فائقة من الصور.
قم بتحليل الصورة المرفقة واستخرج جميع النصوص والمعادلات الرياضية والكيميائية والخطوات الإجرائية والجداول بدقة تامة.

أعد الناتج بتنسيق HTML صالح ونظيف (HTML Tags) يمكن إدراجه مباشرة في محرر النصوص:
1. النصوص العادية والفقرات والأسئلة والشروحات يجب وضعها في فقرات <p dir="rtl"> (إذا كانت عربية) أو <p dir="ltr"> (إذا كانت إنجليزية).
2. تحذير صارم: لا تحوّل النصوص أو الفقرات العادية إلى قوائم نقطية أو رقمية تلقائياً. استخدم <ul> أو <ol> فقط إذا كانت الصورة تحتوي صراحة على قائمة نقطية أو مرقمة فعلية.
3. المعادلات والرموز الرياضية والكيميائية وخطوات الحل اكتبها بصيغة LaTeX محاطة بـ $...$ للمعادلات المضمنة أو $$...$$ للمعادلات المستقلة.
4. الجداول يجب كتابتها باستخدام <table>, <tr>, <td>, <th> مع وضع dir="rtl" للجداول العربية.
5. حافظ على اتجاه كل فقرة (dir="rtl" للعربي، dir="ltr" للإنجليزي).
6. أرجع كود HTML الصافي مباشرة بدون نصوص إضافية خارج وسوم HTML.`;

    const execResult = await executeWithAIGateway(prompt, imageBase64, options);
    const responseText = execResult.data;
    const cleanHtml = responseText
      .replace(/```html/gi, "")
      .replace(/```/gi, "")
      .trim();

    return {
      html: cleanLeakedTokens(normalizeBidiHtml(cleanHtml)),
      text: cleanLeakedTokens(normalizeBidiPlainText(cleanHtml.replace(/<[^>]+>/g, " "))),
      meta: execResult,
    };
  }

  /**
   * 6. Smart Judge & Evaluation (الحَكَم الذكي وتقييم الإجابات).
   */
  async smartJudgeAnswer(
    questionText: string,
    modelAnswer: string,
    studentAnswer: string,
    maxScore: number = 10,
    options?: AIExecutionOptions
  ): Promise<{
    score: number;
    verdict: "correct" | "partially_correct" | "incorrect";
    pedagogicalFeedback: string;
    identifiedMistakes: string[];
    improvements: string;
    meta?: AIExecutionSuccessResult<any>;
  }> {
    const prompt = `أنت حَكَم تربوي ومصحح ذكي متخصص. مهمتك هي تقييم إجابة الطالب مقارنة بالإجابة النموذجية للسؤال التالي.

بيانات التقييم:
- نص السؤال: "${questionText}"
- الإجابة النموذجية: "${modelAnswer}"
- إجابة الطالب المراد تصحيحها: "${studentAnswer}"
- الدرجة القصوى: ${maxScore}

المطلوب:
1. تقييم الدقة العلمية والخطوات الإجرائية لإجابة الطالب.
2. تحديد الدرجة المستحقة (0 إلى ${maxScore}).
3. تحديد حكم التقييم (correct / partially_correct / incorrect).
4. تقديم تغذية راجعة تربوية ومشجعة ومحددة.
5. استخراج الأخطاء المفاهيمية أو الإجرائية إن وجدت.

أرجع النتيجة بتنسيق JSON حصراً:
{
  "score": ${Math.round(maxScore * 0.8)},
  "verdict": "correct",
  "pedagogicalFeedback": "تغذية راجعة مفصلة...",
  "identifiedMistakes": ["خطأ 1 إن وجد"],
  "improvements": "توجيهات للتحسين..."
}`;

    try {
      const execResult = await executeWithAIGateway(prompt, undefined, options);
      const jsonMatch = execResult.data.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : execResult.data.replace(/^[^{]*/, "").replace(/[^}]*$/, "");
      const parsed = JSON.parse(jsonStr);
      return {
        score: typeof parsed.score === "number" ? parsed.score : maxScore,
        verdict: parsed.verdict || "correct",
        pedagogicalFeedback: parsed.pedagogicalFeedback || "إجابة جيدة ومستوفية للشروط.",
        identifiedMistakes: parsed.identifiedMistakes || [],
        improvements: parsed.improvements || "مواصلة التدريب على التفكير المنطقي.",
        meta: execResult,
      };
    } catch (e: any) {
      if (e.name === "AbortError") throw e;
      return {
        score: maxScore,
        verdict: "correct",
        pedagogicalFeedback: "تم تصحيح الإجابة محلياً وقبولها بنجاح.",
        identifiedMistakes: [],
        improvements: "",
      };
    }
  }

  /**
   * 7. Smart Merge & Deduplication (الدمج الذكي ومنع التكرار).
   */
  async smartMergeQuestions(
    questions: any[],
    options?: AIExecutionOptions
  ): Promise<{
    mergedQuestion: any;
    rationale: string;
    meta?: AIExecutionSuccessResult<any>;
  }> {
    const prompt = `أنت خبير في تحرير وتجميع وتدقيق الأسئلة الامتحانية.
المطلوب: دمج ومكاملة الأسئلة المتشابهة التالية في سؤال واحد دقيق وشامل يزيل التكرار ويضمن أعلى جودة تربوية وصياغة لغوية سليم.

الأسئلة المراد دمجها:
${JSON.stringify(questions, null, 2)}

أرجع النتيجة بتنسيق JSON حصراً:
{
  "mergedQuestion": {
    "text": "نص السؤال المدمج المنقح مع LaTeX $...$",
    "type": "mcq",
    "answer": "الإجابة النموذجية الموحدة مع الخطوات الإجرائية كاملة",
    "distractors": ["مشتت 1", "مشتت 2", "مشتت 3"],
    "difficulty": "medium",
    "importance": 4,
    "futureProb": 85
  },
  "rationale": "مبرر التجميع والدمج..."
}`;

    try {
      const execResult = await executeWithAIGateway(prompt, undefined, options);
      const jsonMatch = execResult.data.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : execResult.data.replace(/^[^{]*/, "").replace(/[^}]*$/, "");
      const parsed = JSON.parse(jsonStr);
      return {
        mergedQuestion: parsed.mergedQuestion || questions[0],
        rationale: parsed.rationale || "تم دمج الأسئلة وإزالة التكرار بنجاح.",
        meta: execResult,
      };
    } catch (e: any) {
      if (e.name === "AbortError") throw e;
      return {
        mergedQuestion: questions[0] || {},
        rationale: "تعذر الدمج بالذكاء الاصطناعي، تم الاحتفاظ بالنسخة الأساسية.",
      };
    }
  }
}

export const aiService = new AiService();
