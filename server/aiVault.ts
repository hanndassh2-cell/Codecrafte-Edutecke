import crypto from "crypto";
import fs from "fs";
import path from "path";

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

export interface VaultModelRecord {
  id: string;
  userId: string;
  provider: ProviderType;
  modelName: string;
  baseUrl: string;
  encryptedKey?: string; // Format: "ivHex:tagHex:ciphertextHex"
  maskedKey: string; // e.g. "••••••••1a2b" or "••••1a2b"
  hasKey: boolean;
  temperature: number;
  priority: number;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface PublicModelInfo {
  id: string;
  provider: ProviderType;
  modelName: string;
  baseUrl: string;
  apiKey: string; // Always masked e.g. "••••••••1a2b" or ""
  maskedKey: string;
  hasKey: boolean;
  temperature: number;
  priority: number;
  enabled: boolean;
}

// Master encryption secret from environment or deterministic server key
const MASTER_SECRET =
  process.env.AI_VAULT_MASTER_SECRET ||
  process.env.GEMINI_API_KEY ||
  "edutech-ai-vault-secure-aes256-gcm-master-key-2026";

// Derive 32-byte key using SHA-256
const VAULT_KEY = crypto.createHash("sha256").update(MASTER_SECRET).digest();

const DATA_DIR = path.join(process.cwd(), "data");
const VAULT_FILE_PATH = path.join(DATA_DIR, "ai_vault.json");

// Allowed Provider Hostnames for Scoping & SSRF Protection
export const ALLOWED_PROVIDER_HOSTS: Record<ProviderType, string[]> = {
  google: ["generativelanguage.googleapis.com"],
  openai: ["api.openai.com", "generativelanguage.googleapis.com"],
  anthropic: ["api.anthropic.com"],
  deepseek: ["api.deepseek.com"],
  groq: ["api.groq.com"],
  openrouter: ["openrouter.ai"],
  mistral: ["api.mistral.ai"],
  together: ["api.together.xyz"],
  ollama: ["localhost", "127.0.0.1", "0.0.0.0"],
  custom: [], // validated separately
};

// Mask API Key Helper (Only last 4 chars)
export function maskKey(key?: string): string {
  if (!key || typeof key !== "string" || key.trim() === "") {
    return "";
  }
  const clean = key.trim();
  if (clean.length <= 4) {
    return `••••${clean}`;
  }
  return `••••••••${clean.slice(-4)}`;
}

// AES-256-GCM Encryption
export function encryptVaultKey(plaintext: string): string {
  if (!plaintext || plaintext.trim() === "") return "";
  const iv = crypto.randomBytes(12); // 12-byte IV standard for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", VAULT_KEY, iv);
  
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

// AES-256-GCM Decryption
export function decryptVaultKey(encryptedPayload: string): string {
  if (!encryptedPayload || !encryptedPayload.includes(":")) return "";
  const parts = encryptedPayload.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted payload structure");
  }

  const [ivHex, tagHex, cipherHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(tagHex, "hex");
  
  const decipher = crypto.createDecipheriv("aes-256-gcm", VAULT_KEY, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(cipherHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

// Default models registry if user has no models yet
export function getDefaultModels(userId: string = "default-user"): VaultModelRecord[] {
  const now = Date.now();
  return [
    {
      id: "default-1",
      userId,
      provider: "google",
      modelName: "gemini-2.5-flash",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
      encryptedKey: "",
      maskedKey: "",
      hasKey: false,
      temperature: 0.7,
      priority: 1,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "default-2",
      userId,
      provider: "google",
      modelName: "gemini-2.5-pro",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
      encryptedKey: "",
      maskedKey: "",
      hasKey: false,
      temperature: 0.7,
      priority: 2,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "default-3",
      userId,
      provider: "deepseek",
      modelName: "deepseek-chat",
      baseUrl: "https://api.deepseek.com/v1",
      encryptedKey: "",
      maskedKey: "",
      hasKey: false,
      temperature: 0.7,
      priority: 3,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

class ServerAiVault {
  private vaultStore: Map<string, VaultModelRecord[]> = new Map();
  private initialized = false;

  constructor() {
    this.init();
  }

  private init() {
    if (this.initialized) return;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(VAULT_FILE_PATH)) {
        const raw = fs.readFileSync(VAULT_FILE_PATH, "utf8");
        const data = JSON.parse(raw);
        if (typeof data === "object" && data !== null) {
          for (const [userId, records] of Object.entries(data)) {
            if (Array.isArray(records)) {
              this.vaultStore.set(userId, records as VaultModelRecord[]);
            }
          }
        }
      }
    } catch (e) {
      console.warn("Could not load AI vault file from disk, using memory store:", e);
    }
    this.initialized = true;
  }

  private persist() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const dataObj: Record<string, VaultModelRecord[]> = {};
      for (const [userId, records] of this.vaultStore.entries()) {
        dataObj[userId] = records;
      }
      fs.writeFileSync(VAULT_FILE_PATH, JSON.stringify(dataObj, null, 2), "utf8");
    } catch (e) {
      console.warn("Could not persist AI vault to disk:", e);
    }
  }

  public validateBaseUrl(provider: ProviderType, baseUrl: string): boolean {
    if (!baseUrl) return false;
    try {
      const parsed = new URL(baseUrl);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        return false;
      }
      // Only allow HTTP for localhost/127.0.0.1
      if (parsed.protocol === "http:") {
        const host = parsed.hostname;
        if (host !== "localhost" && host !== "127.0.0.1" && host !== "0.0.0.0" && !host.includes("ngrok")) {
          return false;
        }
      }

      const allowedHosts = ALLOWED_PROVIDER_HOSTS[provider];
      if (allowedHosts && allowedHosts.length > 0) {
        return allowedHosts.includes(parsed.hostname) || (provider === "ollama" && parsed.hostname.includes("ngrok"));
      }
      return true; // For custom provider
    } catch (e) {
      return false;
    }
  }

  public getUserModels(userId: string = "default-user"): PublicModelInfo[] {
    this.init();
    let records = this.vaultStore.get(userId);
    if (!records || records.length === 0) {
      records = getDefaultModels(userId);
      this.vaultStore.set(userId, records);
      this.persist();
    }

    return records.map((r) => ({
      id: r.id,
      provider: r.provider,
      modelName: r.modelName,
      baseUrl: r.baseUrl,
      apiKey: r.maskedKey, // NEVER return raw key!
      maskedKey: r.maskedKey,
      hasKey: !!r.hasKey,
      temperature: r.temperature,
      priority: r.priority,
      enabled: r.enabled,
    }));
  }

  public saveUserModels(
    userId: string = "default-user",
    models: any[]
  ): PublicModelInfo[] {
    this.init();
    const existingRecords = this.vaultStore.get(userId) || [];
    const existingMap = new Map(existingRecords.map((r) => [r.id, r]));

    const now = Date.now();
    const updatedRecords: VaultModelRecord[] = [];

    models.forEach((incoming, idx) => {
      const id = incoming.id || `model_${now}_${idx}`;
      const existing = existingMap.get(id);

      const incomingKey = typeof incoming.apiKey === "string" ? incoming.apiKey.trim() : "";
      const isMaskedOrEmpty = !incomingKey || incomingKey.startsWith("••••");

      let encryptedKey = existing?.encryptedKey || "";
      let maskedKey = existing?.maskedKey || "";
      let hasKey = existing?.hasKey || false;

      // If user provided a new raw key (not masked)
      if (!isMaskedOrEmpty) {
        encryptedKey = encryptVaultKey(incomingKey);
        maskedKey = maskKey(incomingKey);
        hasKey = true;
      } else if (incomingKey === "" && !existing?.encryptedKey) {
        encryptedKey = "";
        maskedKey = "";
        hasKey = false;
      }

      const record: VaultModelRecord = {
        id,
        userId,
        provider: incoming.provider || "google",
        modelName: incoming.modelName || "gemini-3.7-flash",
        baseUrl: incoming.baseUrl || "https://generativelanguage.googleapis.com/v1beta/openai",
        encryptedKey,
        maskedKey,
        hasKey,
        temperature: typeof incoming.temperature === "number" ? incoming.temperature : 0.7,
        priority: typeof incoming.priority === "number" ? incoming.priority : idx + 1,
        enabled: incoming.enabled !== false,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };

      updatedRecords.push(record);
    });

    this.vaultStore.set(userId, updatedRecords);
    this.persist();

    return this.getUserModels(userId);
  }

  public migrateLegacyModels(
    userId: string = "default-user",
    legacyModels: any[]
  ): { migratedCount: number; models: PublicModelInfo[] } {
    this.init();
    if (!Array.isArray(legacyModels) || legacyModels.length === 0) {
      return { migratedCount: 0, models: this.getUserModels(userId) };
    }

    let migratedCount = 0;
    const existingRecords = this.vaultStore.get(userId) || [];
    const existingMap = new Map(existingRecords.map((r) => [r.id, r]));

    const now = Date.now();
    const updatedRecords: VaultModelRecord[] = [];

    legacyModels.forEach((legacy, idx) => {
      const id = legacy.id || `migrated_${now}_${idx}`;
      const existing = existingMap.get(id);

      const rawKey = typeof legacy.apiKey === "string" ? legacy.apiKey.trim() : "";
      const isMaskedOrEmpty = !rawKey || rawKey.startsWith("••••");

      let encryptedKey = existing?.encryptedKey || "";
      let maskedKey = existing?.maskedKey || "";
      let hasKey = existing?.hasKey || false;

      if (!isMaskedOrEmpty) {
        encryptedKey = encryptVaultKey(rawKey);
        maskedKey = maskKey(rawKey);
        hasKey = true;
        migratedCount++;
      }

      const record: VaultModelRecord = {
        id,
        userId,
        provider: legacy.provider || "google",
        modelName: legacy.modelName || "gemini-3.7-flash",
        baseUrl: legacy.baseUrl || "https://generativelanguage.googleapis.com/v1beta/openai",
        encryptedKey,
        maskedKey,
        hasKey,
        temperature: typeof legacy.temperature === "number" ? legacy.temperature : 0.7,
        priority: typeof legacy.priority === "number" ? legacy.priority : idx + 1,
        enabled: legacy.enabled !== false,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };

      updatedRecords.push(record);
    });

    this.vaultStore.set(userId, updatedRecords);
    this.persist();

    return {
      migratedCount,
      models: this.getUserModels(userId),
    };
  }

  public getDecryptedKeyForModel(
    userId: string = "default-user",
    modelId: string
  ): {
    key: string;
    provider: ProviderType;
    baseUrl: string;
    modelName: string;
    temperature: number;
  } | null {
    this.init();
    const records = this.vaultStore.get(userId) || [];
    const model = records.find((r) => r.id === modelId);
    if (!model) return null;

    let decryptedKey = "";
    if (model.encryptedKey) {
      try {
        decryptedKey = decryptVaultKey(model.encryptedKey);
      } catch (err) {
        console.error(`Vault Decryption Failure for model [${model.modelName}]:`, err);
      }
    }

    // Fallback to system key for google provider if no user key is set
    if (!decryptedKey && (model.provider === "google" || model.baseUrl.includes("generativelanguage")) && process.env.GEMINI_API_KEY) {
      decryptedKey = process.env.GEMINI_API_KEY;
    }

    return {
      key: decryptedKey,
      provider: model.provider,
      baseUrl: model.baseUrl,
      modelName: model.modelName,
      temperature: model.temperature,
    };
  }

  public getActiveModelsForFallback(
    userId: string = "default-user"
  ): VaultModelRecord[] {
    this.init();
    let records = this.vaultStore.get(userId);
    if (!records || records.length === 0) {
      records = getDefaultModels(userId);
      this.vaultStore.set(userId, records);
      this.persist();
    }

    return records
      .filter((r) => r.enabled !== false)
      .sort((a, b) => (a.priority || 0) - (b.priority || 0));
  }

  public deleteModel(userId: string = "default-user", modelId: string): boolean {
    this.init();
    const records = this.vaultStore.get(userId) || [];
    const filtered = records.filter((r) => r.id !== modelId);
    if (filtered.length === records.length) return false;

    // Renumber priorities
    filtered.forEach((r, idx) => {
      r.priority = idx + 1;
    });

    this.vaultStore.set(userId, filtered);
    this.persist();
    return true;
  }
}

export const serverAiVault = new ServerAiVault();
