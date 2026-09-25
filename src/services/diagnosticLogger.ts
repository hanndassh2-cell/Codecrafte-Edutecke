type LogType = "info" | "success" | "warn" | "error";

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: LogType;
}

type Subscriber = (logs: LogEntry[]) => void;

class DiagnosticLogger {
  private logs: LogEntry[] = [];
  private subscribers: Set<Subscriber> = new Set();

  log(message: string, type: LogType = "info") {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      message,
      type,
    };
    this.logs = [...this.logs, newLog];
    this.notify();
  }

  getLogs() {
    return this.logs;
  }

  subscribe(callback: Subscriber) {
    this.subscribers.add(callback);
    callback(this.logs);
    return () => this.subscribers.delete(callback);
  }

  private notify() {
    this.subscribers.forEach((callback) => callback(this.logs));
  }
}

export const diagnosticLogger = new DiagnosticLogger();
export const systemLog = (message: string, type: LogType = "info") => diagnosticLogger.log(message, type);
