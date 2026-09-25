import { GoogleGenAI } from "@google/genai";
import { serverAiVault, ProviderType, ALLOWED_PROVIDER_HOSTS, decryptVaultKey } from "./aiVault";
import { aiUsageLogger } from "./aiUsageLogger";

export interface GatewayExecutionRequest {
  prompt: string;
  imageBase64?: string;
  mode?: "auto" | "specific";
  specificModelId?: string;
  overrideModelConfig?: {
    provider: ProviderType;
    modelName: string;
    baseUrl: string;
    temperature: number;
    key: string;
  };
  userId?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  taskType?: string;
}

export interface GatewayExecutionResponse {
  success: boolean;
  data: string;
  modelName: string;
  provider: ProviderType;
  modelId: string;
  totalAttempts: number;
  durationMs: number;
  fallbackChainUsed: string[];
  statusMessage: string;
}

// Check for forbidden raw keys anywhere in client request (recursively)
export function sanitizeClientRequest(body: any) {
  if (!body || typeof body !== "object") return;

  const keyPattern = /key|secret|token|passwd|password/i;

  function walk(curr: any) {
    if (!curr || typeof curr !== "object") return;

    if (Array.isArray(curr)) {
      for (const item of curr) {
        walk(item);
      }
      return;
    }

    for (const [k, v] of Object.entries(curr)) {
      if (typeof v === "string" && v.trim() !== "") {
        if (keyPattern.test(k) && !v.startsWith("••••")) {
          throw new Error(
            `Raw browser API keys (${k}) are strictly rejected. Please configure credentials in the secure Server Vault.`
          );
        }
      } else if (v && typeof v === "object") {
        walk(v);
      }
    }
  }

  walk(body);
}

// Google Gen AI SDK Caller with internal multi-model fallback
async function callGoogleGenAiDirect(
  modelName: string,
  apiKey: string,
  prompt: string,
  imageBase64?: string,
  temperature: number = 0.7,
  systemPrompt?: string
): Promise<string> {
  const genAI = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  // Determine candidate models list with fallbacks for Google provider
  const primaryModel = modelName || "gemini-2.5-flash";
  const candidateModels = [
    primaryModel,
    "gemini-2.5-flash",
    "gemini-2.5-pro",
  ].filter((m, i, arr) => arr.indexOf(m) === i); // deduplicate

  let lastErr: any = null;

  for (const modelToTry of candidateModels) {
    try {
      const parts: any[] = [];

      if (imageBase64) {
        let mimeType = "image/jpeg";
        let base64Data = imageBase64;
        if (imageBase64.includes(";base64,")) {
          const split = imageBase64.split(";base64,");
          mimeType = split[0].replace("data:", "") || "image/jpeg";
          base64Data = split[1];
        }
        parts.push({
          inlineData: {
            mimeType,
            data: base64Data,
          },
        });
      }

      parts.push({ text: prompt });

      const response = await genAI.models.generateContent({
        model: modelToTry,
        contents: [{ role: "user", parts }],
        config: {
          temperature,
          systemInstruction: systemPrompt || undefined,
        },
      });

      if (response && response.text) {
        return response.text;
      }
    } catch (err: any) {
      console.warn(`Google GenAI model [${modelToTry}] notice:`, err?.message || err);
      lastErr = err;
      continue;
    }
  }

  throw lastErr || new Error(`Google Provider failed to execute after trying [${candidateModels.join(", ")}]`);
}

// Safe provider call using standard OpenAI / Provider REST APIs or Google GenAI
async function callExternalProvider(
  provider: ProviderType,
  baseUrl: string,
  modelName: string,
  apiKey: string,
  prompt: string,
  imageBase64?: string,
  temperature: number = 0.7,
  systemPrompt?: string
): Promise<string> {
  if (apiKey && /[^\x00-\x7F]/.test(apiKey)) {
    throw new Error("مفتاح API يحتوي على أحرف غير صالحة (مثل الأحرف العربية أو مسافات غير مرئية). يرجى التأكد من نسخ المفتاح الإنجليزي الصحيح.");
  }

  // 1. Google Provider - Use robust GoogleGenAI SDK with automatic sub-model fallback
  if (provider === "google") {
    return await callGoogleGenAiDirect(
      modelName,
      apiKey,
      prompt,
      imageBase64,
      temperature,
      systemPrompt
    );
  }

  // Validate URL scheme and host for non-google providers
  const parsed = new URL(baseUrl);
  const allowedHosts = ALLOWED_PROVIDER_HOSTS[provider];
  if (allowedHosts && allowedHosts.length > 0) {
    if (!allowedHosts.includes(parsed.hostname) && !(provider === "ollama" && parsed.hostname.includes("ngrok"))) {
      throw new Error(`Security Violation: Host ${parsed.hostname} is not permitted for provider ${provider}.`);
    }
  }

  // Handle Anthropic specific API
  if (provider === "anthropic") {
    const url = baseUrl.endsWith("/messages") ? baseUrl : `${baseUrl.replace(/\/+$/, "")}/messages`;
    const content: any[] = [];
    if (imageBase64) {
      let mediaType = "image/jpeg";
      let base64Data = imageBase64;
      if (imageBase64.includes(";base64,")) {
        const parts = imageBase64.split(";base64,");
        mediaType = parts[0].replace("data:", "");
        base64Data = parts[1];
      }
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: mediaType,
          data: base64Data,
        },
      });
    }
    content.push({ type: "text", text: prompt });

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "ngrok-skip-browser-warning": "true",
        "User-Agent": "edutech-backend/1.0",
      },
      body: JSON.stringify({
        model: modelName || "claude-3-haiku-20240307",
        max_tokens: 4096,
        temperature,
        system: systemPrompt || undefined,
        messages: [{ role: "user", content }],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      throw new Error(`Anthropic Error HTTP ${resp.status}: ${errText.slice(0, 300)}`);
    }

    const data = await resp.json();
    const textPart = data.content?.find((c: any) => c.type === "text");
    return textPart?.text || "";
  }

  
  // Localhost check for Cloud Run environment
  if (baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1")) {
    throw new Error("لا يمكن للخادم السحابي الوصول إلى (localhost). إذا كنت تستخدم Ollama محلياً، يرجى استخدام أداة مثل ngrok أو Cloudflare Tunnel للحصول على رابط عام (Public URL).");
  }

  // Handle Ollama specific API (if not using /v1)
  if (provider === "ollama" && !baseUrl.includes("/v1")) {
    const url = `${baseUrl.replace(/\/+$/, "")}/generate`;
    const payload: any = {
      model: modelName || "llama3",
      prompt,
      stream: false,
      options: { temperature },
    };
    if (imageBase64) {
      let cleanBase64 = imageBase64;
      if (imageBase64.includes(";base64,")) {
        cleanBase64 = imageBase64.split(";base64,")[1];
      }
      payload.images = [cleanBase64];
    }
    if (systemPrompt) {
      payload.system = systemPrompt;
    }

    const headers: Record<string, string> = { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true", "User-Agent": "edutech-backend/1.0" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    const resp = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      throw new Error(`Ollama Error HTTP ${resp.status}: ${errText.slice(0, 300)}`);
    }

    const data = await resp.json();
    return data.response || "";
  }

  // Default: OpenAI Compatible Endpoint (Google Gemini OpenAI-compat, DeepSeek, Groq, OpenRouter, Mistral, Together, OpenAI, Custom)
  let endpoint = baseUrl.endsWith("/chat/completions")
    ? baseUrl
    : `${baseUrl.replace(/\/+$/, "")}/chat/completions`;

  const messages: any[] = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }

  if (imageBase64) {
    messages.push({
      role: "user",
      content: [
        { type: "text", text: prompt },
        {
          type: "image_url",
          image_url: {
            url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`,
          },
        },
      ],
    });
  } else {
    messages.push({ role: "user", content: prompt });
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
    "User-Agent": "edutech-backend/1.0"
  };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const resp = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: modelName,
      messages,
      temperature,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    const errorStatus = resp.status;
    let friendlyMsg = errText.slice(0, 300);
    if (errorStatus === 401 || errorStatus === 403) {
      friendlyMsg += " (تم رفض الاتصال. تحقق من صحة مفتاح API وصلاحياته لهذه الخدمة).";
    }
    if (errorStatus === 404) {
      friendlyMsg += " (المسار غير موجود. تأكد من صحة الرابط الأساسي Base URL).";
    }
    const error: any = new Error(`Provider [${provider}/${modelName}] Error HTTP ${errorStatus}: ${friendlyMsg}`);
    error.status = errorStatus;
    throw error;
  }

  const json = await resp.json();
  const choice = json.choices?.[0];
  const responseText = choice?.message?.content || "";
  return responseText;
}

// Unified AI Gateway Dispatcher
export async function executeGateway(
  req: GatewayExecutionRequest
): Promise<GatewayExecutionResponse> {
  const startTime = Date.now();
  const userId = req.userId || "default-user";
  const mode = req.mode || "auto";
  const fallbackChainUsed: string[] = [];

  let candidates: {
    id: string;
    provider: ProviderType;
    modelName: string;
    baseUrl: string;
    temperature: number;
    encryptedKey?: string;
  }[] = [];

  if (req.overrideModelConfig) {
    candidates = [
      {
        id: "override-1",
        provider: req.overrideModelConfig.provider,
        modelName: req.overrideModelConfig.modelName,
        baseUrl: req.overrideModelConfig.baseUrl,
        temperature: typeof req.temperature === "number" ? req.temperature : req.overrideModelConfig.temperature,
      },
    ];
  } else if (mode === "specific" && req.specificModelId) {
    const model = serverAiVault.getDecryptedKeyForModel(userId, req.specificModelId);
    if (!model) {
      throw new Error(`Selected model [${req.specificModelId}] was not found in user vault.`);
    }
    candidates = [
      {
        id: req.specificModelId,
        provider: model.provider,
        modelName: model.modelName,
        baseUrl: model.baseUrl,
        temperature: typeof req.temperature === "number" ? req.temperature : model.temperature,
      },
    ];
  } else {
    // Auto mode: Load active models in priority order
    const activeModels = serverAiVault.getActiveModelsForFallback(userId);
    candidates = activeModels.map((m) => ({
      id: m.id,
      provider: m.provider,
      modelName: m.modelName,
      baseUrl: m.baseUrl,
      temperature: typeof req.temperature === "number" ? req.temperature : m.temperature,
      encryptedKey: m.encryptedKey,
    }));

    // If no models registered, fallback to Gemini 3.7 Flash
    if (candidates.length === 0) {
      candidates = [
        {
          id: "sys-fallback-gemini",
          provider: "google",
          modelName: "gemini-2.5-flash",
          baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
          temperature: req.temperature ?? 0.7,
        },
      ];
    }
  }

  let lastError: any = null;
  let totalAttempts = 0;

  for (const candidate of candidates) {
    const modelTag = `${candidate.provider}/${candidate.modelName}`;
    fallbackChainUsed.push(modelTag);

    // Resolve key from Vault
    let key = "";
    if (req.overrideModelConfig && candidate.id === "override-1") {
      key = req.overrideModelConfig.key;
    } else if (candidate.encryptedKey) {
      try {
        key = decryptVaultKey(candidate.encryptedKey);
      } catch (e) {
        console.warn(`Failed to decrypt key for ${modelTag}:`, e);
      }
    }

        // If no vault key for google provider, check server GEMINI_API_KEY
    if (!key && candidate.provider === "google" && process.env.GEMINI_API_KEY) {
      key = process.env.GEMINI_API_KEY;
    }

    const isLocal = candidate.baseUrl && (candidate.baseUrl.includes("localhost") || candidate.baseUrl.includes("127.0.0.1") || candidate.baseUrl.includes("ngrok"));
    if (!key && isLocal) {
      key = "ollama-local";
    }

    // If still no key and not ollama, skip to next candidate in auto mode
    if (!key && candidate.provider !== "ollama") {
      if (mode === "specific") {
        throw new Error(`Model ${candidate.modelName} has no API key configured in the Server Vault.`);
      }
      continue;
    }

    // Try executing with retry on 429/503 (up to 2 retries)
    const MAX_RETRIES = 2;
    for (let retry = 0; retry <= MAX_RETRIES; retry++) {
      totalAttempts++;
      try {
        const resultText = await callExternalProvider(
          candidate.provider,
          candidate.baseUrl,
          candidate.modelName,
          key,
          req.prompt,
          req.imageBase64,
          candidate.temperature,
          req.systemPrompt
        );

        const durationMs = Date.now() - startTime;
        
        // Log usage metrics safely without logging prompts, outputs or keys
        aiUsageLogger.log({
          userId,
          modelName: candidate.modelName,
          provider: candidate.provider,
          taskType: req.taskType || "general",
          promptCharCount: (req.prompt || "").length,
          responseCharCount: (resultText || "").length,
          estimatedTokens: Math.ceil(((req.prompt || "").length + (resultText || "").length) / 4),
          durationMs,
          status: "success",
        });

        return {
          success: true,
          data: resultText,
          modelName: candidate.modelName,
          provider: candidate.provider,
          modelId: candidate.id,
          totalAttempts,
          durationMs,
          fallbackChainUsed,
          statusMessage: `تمت المعالجة بنجاح عبر [${candidate.modelName}] (${candidate.provider})`,
        };
      } catch (err: any) {
        lastError = err;
        const status = err.status || 0;
        const isRateLimitOrOverloaded = status === 429 || status === 503 || String(err.message).includes("429") || String(err.message).includes("503");

        if (isRateLimitOrOverloaded && retry < MAX_RETRIES) {
          const backoffDelay = (retry + 1) * 1000;
          console.warn(`Rate limit on [${modelTag}], retrying in ${backoffDelay}ms... (attempt ${retry + 1}/${MAX_RETRIES})`);
          await new Promise((resolve) => setTimeout(resolve, backoffDelay));
          continue;
        }

        // If not recoverable or retries exhausted, break retry loop to try next model in chain
        console.warn(`Candidate [${modelTag}] failed: ${err.message}`);
        break;
      }
    }
  }

  const durationMs = Date.now() - startTime;
  let friendlyReason = lastError?.message || "تعذر الوصول للنماذج";
  if (friendlyReason.includes("429") || friendlyReason.includes("quota") || friendlyReason.includes("RESOURCE_EXHAUSTED")) {
    friendlyReason = "تم تجاوز الحصة المؤقتة (Rate limit / Quota exceeded). يرجى الانتظار دقيقة أو اختيار مزود آخر مثل DeepSeek أو إضافة مفتاح API خاص بك في إعدادات الذكاء الاصطناعي.";
  }

  aiUsageLogger.log({
    userId,
    modelName: candidates[0]?.modelName || "unknown",
    provider: candidates[0]?.provider || "google",
    taskType: req.taskType || "general",
    promptCharCount: (req.prompt || "").length,
    responseCharCount: 0,
    estimatedTokens: Math.ceil((req.prompt || "").length / 4),
    durationMs,
    status: "error",
    errorMessage: friendlyReason,
  });

  throw new Error(
    `فشلت بوابة الذكاء الاصطناعي في إتمام المهمة بعد تجربة (${fallbackChainUsed.join(" -> ")}). السبب: ${friendlyReason}`
  );
}
