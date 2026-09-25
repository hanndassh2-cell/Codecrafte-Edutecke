export type ProviderType =
  | "openai"
  | "deepseek"
  | "anthropic"
  | "ollama"
  | "google"
  | "groq"
  | "openrouter"
  | "mistral"
  | "together"
  | "custom";

export interface AiSettings {
  id?: string;
  provider: ProviderType;
  apiKey: string; // Masked e.g. "••••••••1a2b" in UI, never raw in browser storage
  baseUrl: string;
  modelName: string;
  temperature: number;
  priority?: number;
  enabled?: boolean;
  hasKey?: boolean;
  maskedKey?: string;
}

export interface AIExecutionProgress {
  modelName: string;
  provider: ProviderType;
  attempt: number;
  maxAttempts: number;
  status: "trying" | "retrying" | "fallback" | "success" | "aborted" | "error";
  message?: string;
  delayMs?: number;
}

export interface AIExecutionOptions {
  mode?: "auto" | "specific";
  specificModelId?: string;
  abortSignal?: AbortSignal;
  onProgress?: (progress: AIExecutionProgress) => void;
  temperature?: number;
  systemPrompt?: string;
  taskType?: string;
}

export interface AIExecutionSuccessResult<T = string> {
  data: T;
  modelName: string;
  provider: ProviderType;
  totalAttempts: number;
  durationMs: number;
  statusMessage: string;
}

export const defaultAiSettings: AiSettings = {
  provider: "google",
  apiKey: "",
  baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/",
  modelName: "gemini-2.5-flash",
  temperature: 0.7,
  priority: 1,
  enabled: true,
  hasKey: false,
};

// Safe Key Masking Helper: Never expose raw keys in browser UI
export function getMaskedKey(apiKey?: string): string {
  if (!apiKey || apiKey.trim() === "") {
    return "مفتاح الخادم المحمي (AI Gateway)";
  }
  const clean = apiKey.trim();
  if (clean.startsWith("••••")) {
    return clean;
  }
  if (clean.length <= 4) {
    return `••••${clean}`;
  }
  return `••••••••${clean.slice(-4)}`;
}

// Adapter Interface
export interface AiProviderAdapter {
  generateCompletion(
    prompt: string,
    settings: AiSettings,
    imageBase64?: string,
    signal?: AbortSignal
  ): Promise<string>;
  testConnection(settings: AiSettings): Promise<boolean>;
}

function cleanUrlString(url: string | undefined): string {
  if (!url) return "";
  return url.replace(/\[.*?\]\((.*?)\)/g, "$1").trim();
}

import { systemLog } from "../../../services/diagnosticLogger";

// Universal Test Connection Function using Secure Server Vault
export async function testAiModelConnection(settings: AiSettings): Promise<boolean> {
  try {


    systemLog(`[AiProvider] جاري الاتصال بالرابط الأساسي: ${settings.baseUrl}`, "info");
    const resp = await fetch("/api/ai/vault/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        modelId: settings.id,
        model: settings,
      }),
    });

    if (resp.ok) {
      const data = await resp.json();
      systemLog("[AiProvider] تم استلام الرد بنجاح من الخادم.", "success");
      return !!data.success;
    }

    const errData = await resp.json().catch(() => ({}));
    const errorMsg = errData.error || `HTTP ${resp.status}`;
    systemLog(`[AiProvider] فشل الاتصال: ${errorMsg}`, "error");
    throw new Error(errorMsg);
  } catch (err: any) {
    console.warn("Vault test connection failed:", err);
    systemLog(`[AiProvider] فشل الاتصال: ${err.message}`, "error");
    throw err;
  }
}
// OpenAI-Compatible Adapter
export class OpenAiCompatibleAdapter implements AiProviderAdapter {
  async generateCompletion(
    prompt: string,
    settings: AiSettings,
    imageBase64?: string,
    signal?: AbortSignal
  ): Promise<string> {
    const res = await executeWithAIGateway(prompt, imageBase64, {
      mode: "specific",
      specificModelId: settings.id,
      abortSignal: signal,
      temperature: settings.temperature,
    });
    return res.data;
  }

  async testConnection(settings: AiSettings): Promise<boolean> {
    return testAiModelConnection(settings);
  }
}

// Anthropic Adapter
export class AnthropicAdapter implements AiProviderAdapter {
  async generateCompletion(
    prompt: string,
    settings: AiSettings,
    imageBase64?: string,
    signal?: AbortSignal
  ): Promise<string> {
    const res = await executeWithAIGateway(prompt, imageBase64, {
      mode: "specific",
      specificModelId: settings.id,
      abortSignal: signal,
      temperature: settings.temperature,
    });
    return res.data;
  }

  async testConnection(settings: AiSettings): Promise<boolean> {
    return testAiModelConnection(settings);
  }
}

// Local Ollama Adapter
export class OllamaAdapter implements AiProviderAdapter {
  async generateCompletion(
    prompt: string,
    settings: AiSettings,
    imageBase64?: string,
    signal?: AbortSignal
  ): Promise<string> {
    const res = await executeWithAIGateway(prompt, imageBase64, {
      mode: "specific",
      specificModelId: settings.id,
      abortSignal: signal,
      temperature: settings.temperature,
    });
    return res.data;
  }

  async testConnection(settings: AiSettings): Promise<boolean> {
    return testAiModelConnection(settings);
  }
}

// Factory to get the right adapter
export function getAiAdapter(provider: ProviderType): AiProviderAdapter {
  switch (provider) {
    case "anthropic":
      return new AnthropicAdapter();
    case "ollama":
      return new OllamaAdapter();
    case "openai":
    case "deepseek":
    case "google":
    case "groq":
    case "openrouter":
    case "mistral":
    case "together":
    case "custom":
    default:
      return new OpenAiCompatibleAdapter();
  }
}

function cleanBaseUrl(url: string | undefined): string {
  return cleanUrlString(url);
}

// Sanitize models list to ensure no raw keys remain in localStorage and IDs are strictly unique
function sanitizeLocalList(list: any[]): AiSettings[] {
  const seenIds = new Set<string>();

  return list.map((m, idx) => {
    const rawKey = typeof m.apiKey === "string" ? m.apiKey.trim() : "";
    const isMasked = rawKey.startsWith("••••");
    const masked = isMasked ? rawKey : getMaskedKey(rawKey);
    const hasKey = !!(m.hasKey || (rawKey && !rawKey.startsWith("••••")));

    let id = m.id && typeof m.id === "string" && m.id.trim() !== "" ? m.id.trim() : `model_${Date.now()}_${idx}`;
    if (seenIds.has(id)) {
      id = `${id}_${idx + 1}`;
      if (seenIds.has(id)) {
        id = `model_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`;
      }
    }
    seenIds.add(id);

    return {
      id,
      provider: m.provider || "google",
      modelName: m.modelName || "gemini-2.5-flash",
      baseUrl: cleanBaseUrl(m.baseUrl) || "https://generativelanguage.googleapis.com/v1beta/openai/",
      apiKey: masked,
      maskedKey: masked,
      hasKey,
      temperature: typeof m.temperature === "number" ? m.temperature : 0.7,
      priority: typeof m.priority === "number" ? m.priority : idx + 1,
      enabled: m.enabled !== false,
    };
  });
}

// Auto-migration trigger flag to prevent duplicate sync loops
let migrationPromise: Promise<any> | null = null;

export async function triggerVaultMigration(legacyList: any[]) {
  if (migrationPromise) return migrationPromise;
  migrationPromise = (async () => {
    try {
      const response = await fetch("/api/ai/vault/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ legacyModels: legacyList }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.models)) {
          localStorage.setItem(
            "ai_integrator_settings_list",
            JSON.stringify(data.models)
          );
          // Remove old single-key setting completely
          localStorage.removeItem("ai_integrator_settings");
        }
      }
    } catch (e) {
      console.warn("Background AI Vault Migration failed:", e);
    } finally {
      migrationPromise = null;
    }
  })();
  return migrationPromise;
}

export function getAISettingsList(): AiSettings[] {
  const saved = localStorage.getItem("ai_integrator_settings_list");
  let needsMigration = false;
  let parsedList: any[] = [];

  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        parsedList = parsed;
        // Check if any legacy unmasked raw keys exist in localStorage
        for (const item of parsedList) {
          const key = item.apiKey;
          if (typeof key === "string" && key.trim() !== "" && !key.startsWith("••••")) {
            needsMigration = true;
            break;
          }
        }
      }
    } catch (e) {}
  }

  // Check old single legacy setting
  const oldSaved = localStorage.getItem("ai_integrator_settings");
  if (oldSaved) {
    try {
      const oldParsed = JSON.parse(oldSaved);
      if (oldParsed && typeof oldParsed === "object") {
        needsMigration = true;
        const alreadyMigrated = parsedList.some(
          (p) => p.id === "migrated-1" || (oldParsed.apiKey && p.apiKey === oldParsed.apiKey)
        );
        if (!alreadyMigrated) {
          parsedList.unshift({
            ...oldParsed,
            id: "migrated-1",
            priority: 1,
            enabled: true,
          });
        }
      }
    } catch (e) {}
    localStorage.removeItem("ai_integrator_settings");
  }

  if (parsedList.length > 0) {
    const sanitized = sanitizeLocalList(parsedList);
    if (needsMigration) {
      // Save masked version locally immediately and trigger server vault encryption
      localStorage.setItem("ai_integrator_settings_list", JSON.stringify(sanitized));
      localStorage.removeItem("ai_integrator_settings");
      triggerVaultMigration(parsedList);
    }
    return sanitized;
  }

  const defaultList: AiSettings[] = [
    {
      id: "default-1",
      provider: "google",
      modelName: "gemini-2.5-flash",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/",
      apiKey: "",
      maskedKey: "",
      hasKey: false,
      temperature: 0.7,
      priority: 1,
      enabled: true,
    },
    {
      id: "default-2",
      provider: "google",
      modelName: "gemini-2.5-pro",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/",
      apiKey: "",
      maskedKey: "",
      hasKey: false,
      temperature: 0.7,
      priority: 2,
      enabled: true,
    },
    {
      id: "default-3",
      provider: "deepseek",
      modelName: "deepseek-chat",
      baseUrl: "https://api.deepseek.com/v1",
      apiKey: "",
      maskedKey: "",
      hasKey: false,
      temperature: 0.7,
      priority: 3,
      enabled: true,
    },
  ];

  localStorage.setItem("ai_integrator_settings_list", JSON.stringify(defaultList));
  return defaultList;
}

export async function saveAiSettingsList(list: AiSettings[]): Promise<AiSettings[]> {
  const sanitized = sanitizeLocalList(list);
  localStorage.setItem("ai_integrator_settings_list", JSON.stringify(sanitized));

  try {
    const response = await fetch("/api/ai/vault/models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ models: list }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && Array.isArray(data.models)) {
        localStorage.setItem("ai_integrator_settings_list", JSON.stringify(data.models));
        return data.models;
      }
    }
  } catch (err) {
    console.warn("Failed to persist models to server AI vault:", err);
  }

  return sanitized;
}

export function getAISettings(): AiSettings {
  const list = getAISettingsList();
  const active = list
    .filter((m) => m.enabled)
    .sort((a, b) => (a.priority || 0) - (b.priority || 0));
  if (active.length > 0) return active[0];
  return list[0] || defaultAiSettings;
}

export function loadAiSettings(): AiSettings {
  return getAISettings();
}

export async function saveAiSettings(settings: AiSettings) {
  const list = getAISettingsList();
  const index = list.findIndex(
    (m) =>
      m.id === settings.id ||
      (m.provider === settings.provider && m.modelName === settings.modelName)
  );
  if (index >= 0) {
    list[index] = settings;
  } else {
    list.unshift(settings);
  }
  return saveAiSettingsList(list);
}

// Global AI Execution Engine (Stage 14A & 14B: Unified AI Gateway via Secure Server Vault)
export async function executeWithAIGateway(
  prompt: string,
  imageBase64?: string,
  options?: AIExecutionOptions
): Promise<AIExecutionSuccessResult<string>> {
  const startTime = Date.now();
  const signal = options?.abortSignal;

  // Check atomic cancellation immediately
  if (signal?.aborted) {
    throw new DOMException("تم إلغاء عملية الذكاء الاصطناعي بشكل ذري من قبل المستخدم", "AbortError");
  }

  const allModels = getAISettingsList();
  const mode = options?.mode || "auto";
  const targetModel =
    mode === "specific" && options?.specificModelId
      ? allModels.find((m) => m.id === options.specificModelId)
      : allModels.find((m) => m.enabled !== false);

  const initialModelName = targetModel?.modelName || "Gemini 2.5 Flash";
  const initialProvider = targetModel?.provider || "google";

  systemLog(`[AIGateway] بدء طلب المعالجة للنموذج: ${initialModelName} (${initialProvider})`, "info");

  // Notify initial progress
  options?.onProgress?.({
    modelName: initialModelName,
    provider: initialProvider,
    attempt: 1,
    maxAttempts: 3,
    status: "trying",
    message: `جاري الاتصال بـ AI Gateway (${initialModelName})...`,
  });


  try {
    // Send strictly sanitized payload (NO raw browser API keys sent!)
    // Send strictly sanitized payload (NO raw browser API keys sent!)
    const response = await fetch("/api/ai/gateway/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        imageBase64,
        mode: options?.mode || "auto",
        specificModelId: options?.specificModelId,
        temperature: options?.temperature,
        systemPrompt: options?.systemPrompt,
        taskType: options?.taskType,
      }),
      signal,
    });

    if (signal?.aborted) {
      systemLog("[AIGateway] تم إلغاء الطلب من قبل المستخدم.", "warn");
      throw new DOMException("تم إلغاء العملية بشكل ذري", "AbortError");
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData.error || `Gateway Error HTTP ${response.status}`;
      systemLog(`[AIGateway] فشل معالجة الطلب: ${errMsg}`, "error");
      throw new Error(errMsg);
    }

    const gatewayResult = await response.json();
    const durationMs = Date.now() - startTime;
    systemLog(`[AIGateway] تمت المعالجة بنجاح عبر ${gatewayResult.modelName || initialModelName} خلال ${(durationMs / 1000).toFixed(1)}s`, "success");

    options?.onProgress?.({
      modelName: gatewayResult.modelName || initialModelName,
      provider: gatewayResult.provider || initialProvider,
      attempt: gatewayResult.totalAttempts || 1,
      maxAttempts: 3,
      status: "success",
      message: gatewayResult.statusMessage || `تم التنفيذ بنجاح (${(durationMs / 1000).toFixed(1)} ثانية)`,
    });

    return {
      data: gatewayResult.data,
      modelName: gatewayResult.modelName || initialModelName,
      provider: gatewayResult.provider || initialProvider,
      totalAttempts: gatewayResult.totalAttempts || 1,
      durationMs,
      statusMessage: gatewayResult.statusMessage || "تمت المعالجة بنجاح عبر AI Gateway",
    };
  } catch (err: any) {
    if (err.name === "AbortError" || signal?.aborted) {
      options?.onProgress?.({
        modelName: initialModelName,
        provider: initialProvider,
        attempt: 1,
        maxAttempts: 3,
        status: "aborted",
        message: "تم إلغاء العملية بشكل ذري",
      });
      throw new DOMException("تم إلغاء العملية بشكل ذري", "AbortError");
    }

    options?.onProgress?.({
      modelName: initialModelName,
      provider: initialProvider,
      attempt: 1,
      maxAttempts: 3,
      status: "error",
      message: err.message || "فشل الاتصال بـ AI Gateway",
    });

    throw err;
  }
}

// Backward-compatible wrapper
export async function generateAIResponse(
  prompt: string,
  imageBase64?: string,
  options?: AIExecutionOptions
): Promise<string> {
  const result = await executeWithAIGateway(prompt, imageBase64, options);
  return result.data;
}

export async function generateDistractorsWithAI(
  questionText: string,
  answerText: string,
  settings: AiSettings,
): Promise<{ distractors: string[]; rationale: string }> {
  const adapter = getAiAdapter(settings.provider);
  const prompt = `أنت خبير تربوي ومختص في تصميم الاختبارات الأكاديمية.
قم بإنشاء 3 خيارات تشتيت (Distractors) للسؤال التالي.
يجب أن تكون خيارات التشتيت:
- أكاديمية ومنطقية.
- مصممة لاختبار فهم الطالب الحقيقي وتحديد الأخطاء المفاهيمية الشائعة.
- تتجنب الأخطاء الواضحة أو السخيفة.

السؤال: ${questionText}
الإجابة الصحيحة: ${answerText}

يجب أن تعيد النتيجة بصيغة JSON حصراً بهذا الهيكل بدون أي نصوص إضافية:
{
  "distractors": ["خيار 1", "خيار 2", "خيار 3"],
  "rationale": "شرح موجز عن سبب اختيار هذه المشتتات والأخطاء المفاهيمية التي تستهدفها"
}`;

  const responseText = await adapter.generateCompletion(prompt, settings);
  try {
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonStr = jsonMatch
      ? jsonMatch[1]
      : responseText.replace(/^[^{]*/, "").replace(/[^}]*$/, "");
    const parsed = JSON.parse(jsonStr);
    if (parsed.distractors && Array.isArray(parsed.distractors)) {
      return {
        distractors: parsed.distractors,
        rationale: parsed.rationale || "لم يتم توفير تعليل.",
      };
    }
  } catch (e) {
    console.error("Failed to parse AI response:", responseText);
    throw new Error("فشل في تحليل استجابة الذكاء الاصطناعي (يجب أن تكون JSON).");
  }

  throw new Error("استجابة الذكاء الاصطناعي غير مطابقة للمواصفات المطلوبة.");
}
