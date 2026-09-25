import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { serverAiVault, decryptVaultKey } from "./server/aiVault";
import { executeGateway, sanitizeClientRequest } from "./server/aiGateway";
import { aiUsageLogger } from "./server/aiUsageLogger";

const app = express();

function readCliOption(name: string): string | undefined {
  const inlinePrefix = `${name}=`;
  const inlineArg = process.argv.find((arg) => arg.startsWith(inlinePrefix));
  if (inlineArg) return inlineArg.slice(inlinePrefix.length);

  const optionIndex = process.argv.indexOf(name);
  return optionIndex >= 0 ? process.argv[optionIndex + 1] : undefined;
}

const requestedPort = Number(readCliOption("--port") || process.env.PORT || 3000);
const PORT = Number.isFinite(requestedPort) ? requestedPort : 3000;
const HOST = readCliOption("--host") || "0.0.0.0";

app.use(express.json({ limit: "10mb" }));

// Enforce Same-Origin Protection for API routes: Reject unauthorized external origins with 403
app.use("/api", (req, res, next) => {
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (origin) {
    try {
      const originUrl = new URL(origin);
      if (host && originUrl.host !== host && !originUrl.host.startsWith("localhost") && !originUrl.host.startsWith("127.0.0.1")) {
        return res.status(403).json({ success: false, error: "Access forbidden: Cross-Origin API requests are blocked." });
      }
    } catch (e) {
      return res.status(403).json({ success: false, error: "Access forbidden: Invalid origin header." });
    }
  }
  next();
});

// ==========================================
// 1. SECURE SERVER AI VAULT ROUTES (Stage 14A)
// ==========================================

// GET user models (Returns sanitized list with masked keys only)
app.get("/api/ai/vault/models", (req, res) => {
  try {
    const userId = (req.headers["x-user-id"] as string) || (req.query.userId as string) || "default-user";
    const models = serverAiVault.getUserModels(userId);
    res.json({ success: true, models });
  } catch (error: any) {
    console.error("Vault GET Models Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST save/update user models (Encrypts new raw keys with AES-256-GCM, preserves existing)
app.post("/api/ai/vault/models", (req, res) => {
  try {
    const userId = (req.headers["x-user-id"] as string) || req.body.userId || "default-user";
    const incomingModels = req.body.models || [];
    
    if (!Array.isArray(incomingModels)) {
      return res.status(400).json({ success: false, error: "models must be an array" });
    }

    const updated = serverAiVault.saveUserModels(userId, incomingModels);
    res.json({ success: true, models: updated });
  } catch (error: any) {
    console.error("Vault Save Models Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST migrate legacy localStorage keys to Encrypted Server Vault
app.post("/api/ai/vault/migrate", (req, res) => {
  try {
    const userId = (req.headers["x-user-id"] as string) || req.body.userId || "default-user";
    const legacyModels = req.body.legacyModels || [];

    const result = serverAiVault.migrateLegacyModels(userId, legacyModels);
    res.json({
      success: true,
      migratedCount: result.migratedCount,
      models: result.models,
    });
  } catch (error: any) {
    console.error("Vault Migration Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE a model from user vault
app.delete("/api/ai/vault/models/:id", (req, res) => {
  try {
    const userId = (req.headers["x-user-id"] as string) || (req.query.userId as string) || "default-user";
    const modelId = req.params.id;
    const deleted = serverAiVault.deleteModel(userId, modelId);
    res.json({ success: deleted, models: serverAiVault.getUserModels(userId) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST test model connection using stored encrypted vault key or system key
app.post("/api/ai/vault/test", async (req, res) => {
  try {
    const userId = (req.headers["x-user-id"] as string) || req.body.userId || "default-user";
    const { modelId, model } = req.body;

    let targetModel = model;
    if (modelId && !targetModel) {
      const all = serverAiVault.getUserModels(userId);
      targetModel = all.find((m) => m.id === modelId);
    }

    if (!targetModel) {
      return res.status(400).json({ success: false, error: "Model not found" });
    }

    let keyToUse = "";
    // If the frontend sends a newly typed key that isn't masked
    if (targetModel.apiKey && !targetModel.apiKey.startsWith("••••")) {
      keyToUse = targetModel.apiKey;
    } else {
      // Resolve key from vault
      const decryptedInfo = serverAiVault.getDecryptedKeyForModel(userId, targetModel.id || modelId);
      keyToUse = decryptedInfo?.key || (targetModel.provider === "google" ? process.env.GEMINI_API_KEY || "" : "");
    }

        const isLocal = targetModel.baseUrl && (targetModel.baseUrl.includes("localhost") || targetModel.baseUrl.includes("127.0.0.1") || targetModel.baseUrl.includes("ngrok"));
    if (!keyToUse && isLocal) {
      keyToUse = "ollama-local";
    }

    if (!keyToUse && targetModel.provider !== "ollama") {
      return res.status(400).json({
        success: false,
        error: "No API key configured for this model in the server vault.",
      });
    }

    // Quick test ping using overrideModelConfig so it bypasses vault retrieval requirement for unsaved models
    const testReq = {
      prompt: "Ping test. Please reply with 'OK'.",
      mode: "specific" as const,
      overrideModelConfig: {
        provider: targetModel.provider,
        modelName: targetModel.modelName,
        baseUrl: targetModel.baseUrl,
        temperature: targetModel.temperature || 0.7,
        key: keyToUse,
      },
      userId,
    };

    const gatewayResult = await executeGateway(testReq);
    res.json({ success: true, message: "Connection successful", details: gatewayResult.statusMessage });
  } catch (error: any) {
    console.error("Vault Test Error:", error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// ==========================================
// 2. UNIFIED AI GATEWAY DISPATCHER (Stage 14A)
// ==========================================
app.post("/api/ai/gateway/execute", async (req, res) => {
  try {
    // Strict security check: reject raw browser keys
    sanitizeClientRequest(req.body);

    const userId = (req.headers["x-user-id"] as string) || req.body.userId || "default-user";
    const { prompt, imageBase64, mode, specificModelId, temperature, systemPrompt, taskType } = req.body;

    if (!prompt && !imageBase64) {
      return res.status(400).json({ success: false, error: "Prompt or image is required." });
    }

    const result = await executeGateway({
      prompt: prompt || "تحليل المحتوى",
      imageBase64,
      mode: mode || "auto",
      specificModelId,
      userId,
      temperature,
      systemPrompt,
      taskType,
    });

    res.json(result);
  } catch (error: any) {
    console.error("AI Gateway Execution Error:", error);
    res.status(500).json({ success: false, error: error.message || "فشل تنفيذ العملية عبر بوابة الذكاء الاصطناعي." });
  }
});

// GET safe AI consumption log stats (No raw prompts, completion text, or keys stored)
app.get("/api/ai/usage-stats", (req, res) => {
  try {
    const stats = aiUsageLogger.getStats();
    res.json({ success: true, ...stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Initialize Google Gen AI
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Helper to sanitize Gemini response text
function cleanGeminiJson(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }
  
  // Hide correctly escaped backslashes temporarily
  cleaned = cleaned.replace(/\\\\/g, '@@DBL@@');
  
  // Fix known LaTeX commands that start with valid JSON escape characters
  cleaned = cleaned.replace(/\\(frac|nabla|nu|rightarrow|Rightarrow|rho|text|times|tan|theta|tau|begin|bmatrix|bf)/g, '@@DBL@@$1');
  
  // Fix all other invalid JSON escapes
  cleaned = cleaned.replace(/\\([^"\/bfnrtu])/g, '@@DBL@@$1');
  
  // Restore double backslashes
  cleaned = cleaned.replace(/@@DBL@@/g, '\\\\');

  return cleaned;
}

// Server-side placeholder sanitizers
function stripLeakedPlaceholders(str: string): string {
  if (!str) return "";
  return str
    .replace(/[\u2066\u2067\u2068]?(__BIDI_MATH_\d+__|BIDI_MATH_\d+)[\u2069]?/gi, "")
    .replace(/__BIDI_[A-Za-z0-9_]+__/gi, "")
    .replace(/__MATH_[A-Za-z0-9_]+__/gi, "")
    .replace(/__TOKEN_[A-Za-z0-9_]+__/gi, "");
}

function sanitizeObjectPlaceholders(obj: any): any {
  if (typeof obj === "string") {
    return stripLeakedPlaceholders(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObjectPlaceholders);
  }
  if (obj !== null && typeof obj === "object") {
    const result: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      result[key] = sanitizeObjectPlaceholders(obj[key]);
    }
    return result;
  }
  return obj;
}

// Helper to call Gemini with multi-model fallback chain
async function callGeminiWithFallback(contents: any, config?: any) {
  if (!ai) return null;
  const models = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"];
  let lastError: any = null;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config,
      });
      if (response && response.text) {
        return response;
      }
    } catch (err: any) {
      console.warn(`Gemini model '${model}' failed/rate-limited:`, err?.message || err);
      // Construct a better error message but continue loop
      lastError = new Error(`Gemini model '${model}' failed: ${err?.message || JSON.stringify(err)}`);
    }
  }
  throw lastError;
}

// Server-side local smart question parser fallback
function localParseTextQuestions(rawText: string, defaultSubject: string, importPattern: string = "auto") {
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
      const qText = line.replace(/^(س\d*[:\.\-]|سؤال\d*[:\.\-]|Q\d*[:\.\-]|[\d\u0660-\u0669]+[\.\-\)])\s*/i, "").trim();
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
      const optionText = line.replace(/^([أبجدa-d][\.\-\)]|[\(][أبجدa-d][\)]|\[\s*\]|[\*\-•])\s+/i, "").trim();
      if (optionText) {
        currentQuestion.distractors.push(optionText);
      }
    } else if (currentQuestion && isAnswerLine(line)) {
      const ansText = line.replace(/^(الإجابة|الجواب|الحل|الإجابة الصحيحة|الخيار الصحيح|ج[:\.\-])\s*/i, "").trim();
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
    if (qType === "mcq" && distractors.length < 3) {
      while (distractors.length < 3) {
        distractors.push(`خيار بديل ${distractors.length + 1}`);
      }
    }

    return {
      text: q.text,
      type: qType,
      answer: q.answer || "الحل الإجرائي والتعليق النموذجي خطوة بخطوة",
      distractors: qType === "mcq" ? distractors.slice(0, 3) : undefined,
      difficulty: q.difficulty || "medium",
      importance: q.importance || 4,
      futureProb: q.futureProb || 80,
    };
  });

  return { parsedQuestions };
}

// API Routes
app.use(express.json({limit: '50mb'}));
app.post("/api/audit", (req, res) => {
  console.log("\n\n[AUDIT FROM BROWSER]:\n", req.body.msg, "\n\n");
  res.json({ok:true});
});
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", hasAiKey: !!apiKey });
});

// 1. Generate Smart Distractors (توليد المشتتات الذكية)

// AI Question Solver
app.post("/api/ai/solve-question", async (req, res) => {
  try {
    const { questionText, type, subject, distractors, shortSolution } = req.body;
    if (!questionText) {
      return res.status(400).json({ error: "Missing question details" });
    }

    if (!ai) {
      return res.json({ solution: "تم تفعيل وضع عدم الاتصال (Offline Fallback). لحل هذا السؤال باستخدام الذكاء الاصطناعي يتطلب إضافة مفتاح التفعيل." });
    }

    const distractorsList = distractors && distractors.length > 0
      ? distractors.map((d, i) => `${i + 1}- ${d}`).join("\n")
      : "";

    const prompt = `أنت معلم خبير ومساعد ذكاء اصطناعي متمكن.
${shortSolution 
  ? "مهمتك هي تقديم حل بشري متسلسل ومختصر للسؤال التالي بناءً على القواعد التالية:\nقواعد الحل الإجرائي (في حقل answer): اختصر الشرح النصي والإنشائي فقط، لكن لا تختصر خطوات الحل الرياضية أو العلمية إطلاقاً. يجب أن يُعرض الحل كما يكتبه طالب متميز على الورقة باختصار ودقة: (كتابة القانون عند الحاجة ← التعويض العددي ← العملية الرياضية الفعلية ← التبسيط والتحويل خطوة بخطوة ← النتيجة النهائية). يمنع الاكتفاء بذكر القانون أو النتيجة النهائية فقط. في المصفوفات أظهر عمليات الصفوف وتحديث المصفوفة خطوة بخطوة. في المعادلات أظهر النقل والتبسيط. في الكيمياء أظهر المعادلة والموازنة والحسابات الأساسية. في المسائل المقالية اكتفِ بذكر نقاط الحل الضرورية فقط. اجعل كل خطوة قصيرة وواضحة دون كلام إنشائي أو تكرار، مع الحفاظ على كافة المعادلات بصيغة رياضية صحيحة باستخدام LaTeX داخل $...$." 
  : "مهمتك هي تقديم حل نموذجي تفصيلي وواضح للسؤال التالي. يجب أن يكون الحل خطوة بخطوة، مع الشرح المفصل لكل خطوة وذكر القوانين والأسباب."}
استخدم تنسيق Markdown، واكتب أي معادلات أو رموز رياضية باستخدام LaTeX داخل علامتي دولار $...$ أو $...$.

بيانات السؤال:
- المادة: ${subject || "غير محدد"}
- نوع السؤال: ${type || "غير محدد"}
- نص السؤال:
${questionText}

${distractorsList ? `- الخيارات المتاحة:\n${distractorsList}` : ""}

المطلوب:
${shortSolution 
  ? "اكتب الحل بخطوات رياضية/علمية متسلسلة ومختصرة مباشرة بدون أي مقدمات عامة أو كلام إنشائي، وضع النتيجة النهائية بوضوح في النهاية." 
  : "اكتب 'الإجابة النموذجية وخطة الحل التفصيلية' مباشرة بدون مقدمات عامة، وضع الحل النهائي بوضوح في النهاية."}`;

    const result = await callGeminiWithFallback(prompt);
    
    if (result && result.text) {
      return res.json({ solution: result.text.trim() });
    }
    
    res.status(500).json({ error: "No response from AI" });
  } catch (error) {
    console.error("AI solve endpoint error:", error);
    res.status(500).json({ error: error.message || "Failed to generate solution" });
  }
});

app.post("/api/ai/generate-exam", async (req, res) => {
  try {
    const {
      subject,
      units,
      totalQuestions = 10,
      targetDifficulty = "متوازن",
      totalMarks = 100,
      instructions = "",
    } = req.body;

    if (!ai) {
      return res.json(
        sanitizeObjectPlaceholders({
          title: `امتحان مادة ${subject} الشامل`,
          pedagogicalRationale: "تم اختيار الأسئلة لمراعاة التوزيع المتوازن للوحدات ومستويات بلوم المعرفية مع حلول إجرائية كاملة للمسائل.",
          suggestedQuestionsCount: totalQuestions,
        })
      );
    }

    const prompt = `
أنت خبير قياس وتقويم امتحاني في نظام إديوتيك (Edutech).
قم بتحليل وبناء مصفوفة اختبار متكاملة لمادة: ${subject}
الوحدات المستهدفة: ${units ? JSON.stringify(units) : "جميع الوحدات"}
عدد الأسئلة المطلوبة: ${totalQuestions}
إجمالي الدرجات: ${totalMarks}
المستوى المطلوب: ${targetDifficulty}
ملاحظات إضافية: ${instructions}

المتطلبات الإجرائية والعلمية:
1. إعطاء تعليل تربوي مفصّل (pedagogicalRationale) يشرح استراتيجية توزيع الأسئلة والدرجات حسب أهمية كل موضوع.
2. تقديم توصيات وتوزيع الأسئلة على الأقسام (اختيار من متعدد، صح وخطأ، مسائل وشرح).
3. اقتراح 3 نماذج أسئلة نموذجية إضافية مخصصة لهذا الامتحان، مع حل إجرائي كامل خطوة بخطوة لكل مسألة (كتابة القانون، التعويض، العمليات الحسابية الوسيطة، الناتج بوحدات القياس) بصيغة LaTeX داخل $...$.

أرجع النتيجة بصيغة JSON:
{
  "examTitle": "عنوان الامتحان المقترح",
  "pedagogicalRationale": "شرح تربوي شامل لخطة القياس والتقويم ومستوى الصعوبة...",
  "recommendedDistribution": {
    "mcqCount": 4,
    "trueFalseCount": 3,
    "problemsCount": 3
  },
  "sampleAiQuestions": [
    {
      "text": "سؤال متقدم مقترح للامتحان...",
      "type": "problem",
      "answer": "الحل الإجرائي الكامل: القانون -> التعويض -> العمليات الحسابية -> الناتج النهائي...",
      "distractors": ["مشتت 1", "مشتت 2", "مشتت 3"],
      "allocatedMarks": 10,
      "importance": 5
    }
  ]
}
`;

    const response = await callGeminiWithFallback(prompt, {
      responseMimeType: "application/json",
    });

    if (response && response.text) {
      const parsed = JSON.parse(cleanGeminiJson(response.text));
      return res.json(sanitizeObjectPlaceholders(parsed));
    }

    throw new Error("No response text from Gemini");
  } catch (error: any) {
    console.error("Exam Generator Error:", error);
    res.json(
      sanitizeObjectPlaceholders({
        examTitle: `امتحان مادة ${req.body?.subject || "العامة"} المقترح`,
        pedagogicalRationale: "تم وضع الخطة بناءً على مصفوفة معايير الجودة والتقويم لضمان توزيع الدرجات.",
        recommendedDistribution: { mcqCount: 5, trueFalseCount: 3, problemsCount: 2 },
        sampleAiQuestions: [],
      })
    );
  }
});

// 4. Import & Parse Raw Text into Structured Questions (تحليل واستيراد النص)
app.post("/api/ai/parse-text-questions", async (req, res) => {
  const { rawText, defaultSubject, importPattern = "auto" } = req.body;

  try {
    if (!ai) {
      return res.json(sanitizeObjectPlaceholders(localParseTextQuestions(rawText, defaultSubject, importPattern)));
    }

    const prompt = `
حلل النص المرفق أدناه واستخرج منه كافة الأسئلة والمسائل والتمارين، مع فصل كل سؤال بدقة وتحديد نوعه والإجابة والمشتتات:

المادة المفترضة: ${defaultSubject || "غير محددة"}
نمط الاستخراج المطلوب: ${importPattern}
النص الخام:
"""
${rawText}
"""

القواعد الصارمة:
1. قواعد الحل الإجرائي (في حقل answer): اختصر الشرح النصي والإنشائي فقط، لكن لا تختصر خطوات الحل الرياضية أو العلمية إطلاقاً. يجب أن يُعرض الحل كما يكتبه طالب متميز على الورقة باختصار ودقة: (كتابة القانون عند الحاجة ← التعويض العددي ← العملية الرياضية الفعلية ← التبسيط والتحويل خطوة بخطوة ← النتيجة النهائية). يمنع الاكتفاء بذكر القانون أو النتيجة النهائية فقط. في المصفوفات أظهر عمليات الصفوف وتحديث المصفوفة خطوة بخطوة. في المعادلات أظهر النقل والتبسيط. في الكيمياء أظهر المعادلة والموازنة والحسابات الأساسية. في المسائل المقالية اكتفِ بذكر نقاط الحل الضرورية فقط. اجعل كل خطوة قصيرة وواضحة دون كلام إنشائي أو تكرار، مع الحفاظ على كافة المعادلات بصيغة رياضية صحيحة باستخدام LaTeX داخل $...$.
2. كتابة كافة الرموز والمعادلات بصيغة LaTeX داخل $...$ أو $$...$$.
3. عدم ترك أي رموز أو حقول مبهمة. استخرج بيانات المرجع (اسم الكتاب، رقم الصفحة، عنوان السؤال، ورقم التمرين) من النص إن وجدت وضعها في كائن bookReference.
4. هام جداً لتنسيق JSON: يجب مضاعفة الهروب (Double Escape) لأي شرطة مائلة خلفية (Backslash) داخل نصوص JSON. على سبيل المثال يجب كتابة \\\\frac بدلاً من \\frac، و \\\\rightarrow بدلاً من \\rightarrow لتجنب أخطاء JSON Parser.

أرجع قائمة بالأسئلة المستخرجة بتنسيق JSON:
{
  "parsedQuestions": [
    {
      "text": "نص السؤال المستخرج ناصعاً",
      "type": "mcq أو true_false أو definition أو problem أو essay",
      "answer": "الإجابة الإجرائية الكاملة خطوة بخطوة مع توضيح العمليات الحسابية والناتج النهائي",
      "distractors": ["مشتت 1", "مشتت 2", "مشتت 3"],
      "difficulty": "سهل أو متوسط أو صعب",
      "importance": 4,
      "futureProb": 75,
      "bookReference": {
        "bookSource": "اسم الكتاب أو المصدر إذا ذكر",
        "pageNumber": "رقم الصفحة إذا ذكرت",
        "questionTitle": "عنوان السؤال أو الفقرة إذا ذكر",
        "exerciseNumber": "رقم التمرين أو السؤال إذا ذكر"
      }
    }
  ]
}
`;

    const response = await callGeminiWithFallback(prompt, {
      responseMimeType: "application/json",
    });

    if (response && response.text) {
      const parsed = JSON.parse(cleanGeminiJson(response.text));
      if (parsed && Array.isArray(parsed.parsedQuestions) && parsed.parsedQuestions.length > 0) {
        return res.json(sanitizeObjectPlaceholders(parsed));
      }
    }

    // Fallback if empty or failed parsing
    return res.json(sanitizeObjectPlaceholders(localParseTextQuestions(rawText, defaultSubject, importPattern)));
  } catch (error: any) {
    console.warn("Parse Text AI Error (Falling back to local smart parser):", error?.message || error);
    // Automatic local smart parser fallback on 429 rate limit or any other API error
    return res.json(sanitizeObjectPlaceholders(localParseTextQuestions(rawText, defaultSubject, importPattern)));
  }
});


// OCR API Endpoint for Image to Rich Text
app.post("/api/ocr", async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64" });
    }
    
    if (!ai) {
      return res.status(500).json({ error: "AI not configured" });
    }

    const prompt = `أنت خبير في استخراج النصوص وتحويلها (OCR) بدقة فائقة.
قم بتحليل الصورة المرفقة واستخرج جميع النصوص والمعادلات الرياضية والكيميائية والخطوات الإجرائية والجداول بدقة تامة.
أعد الناتج بتنسيق HTML صالح ونظيف (HTML Tags) يمكن إدراجه مباشرة في محرر النصوص:
1. النصوص العادية والفقرات والأسئلة والشروحات يجب وضعها في فقرات <p dir="rtl"> (إذا كانت عربية) أو <p dir="ltr"> (إذا كانت إنجليزية).
2. تحذير صارم: لا تحوّل النصوص أو الفقرات العادية إلى قوائم نقطية أو رقمية تلقائياً. استخدم <ul> أو <ol> فقط وفقط إذا كانت الصورة تحتوي صراحة ووضوحاً على قائمة نقطية أو مرقمة فعلية في الصورة.
3. المعادلات والرموز الرياضية والكيميائية وخطوات الحل والتحويلات الإجرائية (مثل R_1 \\rightarrow R_2 أو الخطوات الحسابية) يجب كتابتها بصيغة LaTeX محاطة بـ $...$ للمعادلات المضمنة أو $...$ للمعادلات المستقلة.
4. الجداول يجب كتابتها باستخدام <table>, <tr>, <td>, <th> مع وضع dir="rtl" للجداول العربية.
5. حافظ على اتجاه كل فقرة (dir="rtl" للعربي، dir="ltr" للإنجليزي) والترتيب المنطقي للكلمات والرموز دون عكسها.
6. لا تقم بتوليد وسوم تالفة أو نصوص خارج نطاق ما هو موجود في الصورة.`;

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    
    const response = await callGeminiWithFallback([
      { text: prompt },
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Data
        }
      }
    ]);
    
    if (!response || !response.text) {
      throw new Error("No response text from Gemini");
    }
    const text = response.text || "";
    const cleanHtml = stripLeakedPlaceholders(text.replace(/```html/gi, "").replace(/```/gi, "").trim());

    res.json({ html: cleanHtml });
  } catch (error: any) {
    console.error("OCR Error:", error);
    res.status(500).json({ error: "فشل استخراج النص من الصورة" });
  }
});

// 5. AI Content Assistant (مساعد المحتوى الذكي - تحليل العناصر غير المعروفة بدقة)
app.post("/api/ai/content-assistant", async (req, res) => {
  try {
    const { elements, subjectContext } = req.body;

    if (!elements || !Array.isArray(elements) || elements.length === 0) {
      return res.json({ analyzedElements: [] });
    }

    if (!ai) {
      // Return smart fallback items if no API key present
      const fallbackList = elements.map((e: any) => {
        const text = e.textContent || "";
        const isQ = /^(س:|سؤال|علل|عرف|اختر)/.test(text) || text.endsWith("؟");
        return {
          id: e.id,
          suggestedType: isQ ? "question" : "explanation",
          suggestedTypeLabelArabic: isQ ? "سؤال" : "شرح",
          suggestedCardType: isQ ? "questions" : "explanation",
          suggestedCardTitle: isQ ? "❓ الأسئلة والتطبيقات" : "📖 الشرح والتوضيح",
          confidenceScore: isQ ? 80 : 50,
          rationale: "تحليل اختباري محلي (لا يتوفر مفتاح AI للخدمة السحابية)",
          isQuestion: isQ,
          needsManualReview: !isQ,
        };
      });
      return res.json({ analyzedElements: fallbackList });
    }

    const prompt = `
أنت مساعد المحتوى الذكي (AI Content Assistant) في منصة إديوتيك (Edutech).
وظيفتك: تحليل عناصر محتوى الدرس غير المحددة أو المعقدة وتصنيفها واقتراح البطاقة التعليمية والتفاصيل الدقيقة لكل عنصر.

السياق الدراسي: ${subjectContext || "عام"}

العناصر المطلوبة للتحليل:
${JSON.stringify(elements)}

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
     - correctAnswer: "الإجابة الإجرائية الكاملة خطوة بخطوة (كتابة القانون، التعويض، الخطوات الحسابية الوسيطة، الناتج)"
     - difficulty: "easy" أو "medium" أو "hard"
     - difficultyLabelArabic: "سهل" أو "متوسط" أو "صعب"
     - educationalSkill: "تذكر" أو "فهم" أو "تطبيق" أو "تحليل" أو "تقويم" أو "إبداع"
     - keywords: ["كلمة1", "كلمة2"]

4. درجة الثقة (confidenceScore) من 0 إلى 100 بناءً على وضوح النمط.
5. سبب الاقتراح (rationale) بلغة عربية سليمة.
6. إذا كانت درجة الثقة أقل من 60، اجعل needsManualReview: true.
7. هام جداً لتنسيق JSON: يجب مضاعفة الهروب (Double Escape) لأي شرطة مائلة خلفية (Backslash) داخل نصوص JSON. على سبيل المثال يجب كتابة \\\\frac بدلاً من \\frac، و \\\\rightarrow بدلاً من \\rightarrow لتجنب أخطاء JSON Parser.

أرجع النتيجة بصيغة JSON حصرية بالشكل التالي:
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
}
`;

    const response = await callGeminiWithFallback(prompt, {
      responseMimeType: "application/json",
    });

    if (response && response.text) {
      const parsed = JSON.parse(cleanGeminiJson(response.text));
      return res.json(sanitizeObjectPlaceholders(parsed));
    }

    throw new Error("No response text from Gemini");
  } catch (error: any) {
    console.error("AI Content Assistant Route Error:", error);
    const fallbackList = (req.body.elements || []).map((e: any) => {
      const text = e.textContent || "";
      const isQ = /^(س:|سؤال|علل|عرف|اختر)/.test(text) || text.endsWith("؟");
      return {
        id: e.id,
        suggestedType: isQ ? "question" : "explanation",
        suggestedTypeLabelArabic: isQ ? "سؤال" : "شرح",
        suggestedCardType: isQ ? "questions" : "explanation",
        suggestedCardTitle: isQ ? "❓ الأسئلة والتطبيقات" : "📖 الشرح والتوضيح",
        confidenceScore: isQ ? 80 : 50,
        rationale: "تحليل اختباري محلي عند انشغال الذكاء الاصطناعي",
        isQuestion: isQ,
        needsManualReview: !isQ,
      };
    });
    res.json({ analyzedElements: fallbackList });
  }
});

// Proxy for external AI providers to bypass CORS
app.use("/api/ai/proxy", express.json({ limit: "10mb" })); // enforce 10MB limit specifically for AI if needed
app.post("/api/ai/proxy", async (req, res) => {
  try {
    let { url, method, headers, body } = req.body;
    
    if (url) {
      url = url.replace(/\[.*?\]\((.*?)\)/g, '$1').trim();
    }
    
    if (!url) {
      return res.status(400).json({ error: "URL is required." });
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch (e) {
      return res.status(400).json({ error: "Invalid URL." });
    }

    if (parsedUrl.protocol !== "https:") {
      return res.status(403).json({ error: "Only HTTPS is allowed." });
    }
    
    const allowedHosts = [
      "generativelanguage.googleapis.com",
      "api.openai.com",
      "api.anthropic.com",
      "api.deepseek.com",
      "api.groq.com",
      "openrouter.ai",
      "api.mistral.ai",
      "api.together.xyz"
    ];
    
    if (!allowedHosts.includes(parsedUrl.hostname)) {
      return res.status(403).json({ error: "Host not in allowed providers list." });
    }

    const safeMethod = (method || "GET").toUpperCase();
    if (safeMethod !== "GET" && safeMethod !== "POST") {
      return res.status(405).json({ error: "Method not allowed. Only GET and POST." });
    }

    // SSRF and unsafe headers protection
    const safeHeaders: Record<string, string> = {};
    const unsafeHeaders = ["host", "connection", "content-length", "origin", "referer", "cookie", "sec-fetch-dest", "sec-fetch-mode", "sec-fetch-site"];
    
    let hasAuthHeader = false;
    if (headers) {
      for (const [key, value] of Object.entries(headers)) {
        const lowerKey = key.toLowerCase();
        if (!unsafeHeaders.includes(lowerKey)) {
          safeHeaders[key] = String(value);
        }
        if (lowerKey === "authorization" || lowerKey === "x-goog-api-key") {
          hasAuthHeader = true;
        }
      }
    }

    // Gemini OpenAI-compatible and native endpoint handling
    if (parsedUrl.hostname === "generativelanguage.googleapis.com") {
      if (!hasAuthHeader && process.env.GEMINI_API_KEY) {
        if (parsedUrl.pathname.includes("/v1beta/openai/")) {
          // Send Bearer token for OpenAI-compatible endpoint
          safeHeaders["Authorization"] = `Bearer ${process.env.GEMINI_API_KEY}`;
        } else {
          // Send x-goog-api-key for native endpoint
          safeHeaders["x-goog-api-key"] = process.env.GEMINI_API_KEY;
        }
      }
    }
    
    let response;
    try {
      const fetchOptions: any = {
        method: safeMethod,
        headers: safeHeaders,
        redirect: "manual" // Cloudflare Worker compatibility
      };

      if (body && safeMethod === "POST") {
        fetchOptions.body = typeof body === "string" ? body : JSON.stringify(body);
      }

      response = await fetch(url, fetchOptions as RequestInit);
    } catch (e: any) {
      // Do not log API keys or sensitive payload details
      console.error("AI Proxy Network Fetch Error:", e.name, e.message);
      return res.status(400).json({ error: "Bad Gateway or Network Error fetching from AI provider.", details: e.message });
    }

    if (response.type === "opaqueredirect" || (response.status >= 300 && response.status < 400)) { 
      return res.status(403).json({ error: "Redirects are not allowed (SSRF protection)." });
    }

    // Pass the real provider message and status without wrapping generically if possible
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        const errorText = await response.text();
        return res.status(response.status).json({ error: errorText || `HTTP ${response.status}` });
      }
      return res.status(response.status).json(errorData);
    }

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("AI Proxy General Error:", error.name, error.message);
    res.status(500).json({ error: "Internal Proxy Error" });
  }
});

// Vite Middleware Setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
  });
}

startServer();
