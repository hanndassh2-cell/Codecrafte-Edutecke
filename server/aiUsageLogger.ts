import fs from "fs";
import path from "path";

export interface AiUsageLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  modelName: string;
  provider: string;
  taskType: string;
  promptCharCount: number;
  responseCharCount: number;
  estimatedTokens: number;
  durationMs: number;
  status: "success" | "error";
  errorMessage?: string;
}

const LOG_FILE_PATH = path.join(process.cwd(), "ai_usage_log.json");
const MAX_LOG_ENTRIES = 500;

export class ServerAiUsageLogger {
  private logs: AiUsageLogEntry[] = [];

  constructor() {
    this.loadLogs();
  }

  private loadLogs() {
    try {
      if (fs.existsSync(LOG_FILE_PATH)) {
        const raw = fs.readFileSync(LOG_FILE_PATH, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.logs = parsed;
        }
      }
    } catch (err) {
      console.warn("[AiUsageLogger] Failed to load usage log file:", err);
      this.logs = [];
    }
  }

  private saveLogs() {
    try {
      if (this.logs.length > MAX_LOG_ENTRIES) {
        this.logs = this.logs.slice(-MAX_LOG_ENTRIES);
      }
      fs.writeFileSync(LOG_FILE_PATH, JSON.stringify(this.logs, null, 2), "utf-8");
    } catch (err) {
      console.warn("[AiUsageLogger] Failed to write usage log file:", err);
    }
  }

  /**
   * Log AI request metrics safely.
   * STRICT SECURITY GUARANTEE: Never log raw prompts, completion text, base64 images, or secret keys.
   */
  public log(entry: Omit<AiUsageLogEntry, "id" | "timestamp">) {
    const safeEntry: AiUsageLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      userId: entry.userId || "anonymous",
      modelName: entry.modelName || "unknown",
      provider: entry.provider || "google",
      taskType: entry.taskType || "general",
      promptCharCount: entry.promptCharCount || 0,
      responseCharCount: entry.responseCharCount || 0,
      estimatedTokens: entry.estimatedTokens || Math.ceil(((entry.promptCharCount || 0) + (entry.responseCharCount || 0)) / 4),
      durationMs: entry.durationMs || 0,
      status: entry.status,
      errorMessage: entry.errorMessage ? entry.errorMessage.substring(0, 150) : undefined,
    };

    this.logs.unshift(safeEntry);
    this.saveLogs();
    return safeEntry;
  }

  public getStats() {
    const totalRequests = this.logs.length;
    const successfulRequests = this.logs.filter((l) => l.status === "success").length;
    const failedRequests = this.logs.filter((l) => l.status === "error").length;
    const totalEstimatedTokens = this.logs.reduce((sum, l) => sum + (l.estimatedTokens || 0), 0);
    const avgDurationMs = totalRequests > 0 ? Math.round(this.logs.reduce((sum, l) => sum + l.durationMs, 0) / totalRequests) : 0;

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      totalEstimatedTokens,
      avgDurationMs,
      recentLogs: this.logs.slice(0, 50),
    };
  }
}

export const aiUsageLogger = new ServerAiUsageLogger();
