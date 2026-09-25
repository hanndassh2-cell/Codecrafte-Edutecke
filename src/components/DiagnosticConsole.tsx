import React, { useEffect, useState, useRef } from "react";
import { Terminal, X, Minimize2, Maximize2 } from "lucide-react";
import { diagnosticLogger, LogEntry } from "../services/diagnosticLogger";

export const DiagnosticConsole: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = diagnosticLogger.subscribe((newLogs) => {
      setLogs(newLogs);
      // Auto-open on first log if not already open
      if (newLogs.length > 0 && !isOpen) {
        setIsOpen(true);
      }
    });
    return () => { unsubscribe(); };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && !isMinimized && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, isOpen, isMinimized]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-[9999] bg-slate-900 text-slate-100 p-3 rounded-full shadow-2xl hover:bg-slate-800 transition-all flex items-center gap-2 group border border-slate-700"
        dir="rtl"
      >
        <Terminal className="w-5 h-5 text-sky-400" />
        <span className="text-xs font-bold max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300">
          النظام التشخيصي
        </span>
      </button>
    );
  }

  return (
    <div 
      className={`fixed z-[9999] bg-[#0a0a0a] border border-slate-800 shadow-2xl transition-all duration-300 flex flex-col overflow-hidden text-slate-300 rounded-tl-2xl
      ${isMinimized ? "bottom-0 right-4 w-64 h-12 rounded-t-xl" : "bottom-0 right-0 left-0 h-64 md:right-4 md:left-auto md:w-[28rem] md:h-80 md:rounded-t-2xl md:bottom-0"}`}
      dir="rtl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 shrink-0 cursor-pointer" onClick={() => setIsMinimized(!isMinimized)}>
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-sky-400" />
          <h3 className="text-xs font-bold text-slate-100">سجل التشخيص (System Logs)</h3>
          <span className="bg-slate-800 text-slate-400 text-[10px] px-1.5 py-0.5 rounded-md font-mono">{logs.length}</span>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200 transition"
          >
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
            className="p-1 hover:bg-red-900/50 rounded text-slate-400 hover:text-red-400 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] flex flex-col gap-2 bg-[#0a0a0a]" dir="ltr">
          {logs.length === 0 ? (
            <div className="text-slate-600 text-center mt-4">لا توجد سجلات بعد...</div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className={`flex gap-2 leading-relaxed ${log.type === "error" ? "text-red-400" : log.type === "success" ? "text-emerald-400" : log.type === "warn" ? "text-amber-400" : "text-sky-300"}`}>
                <span className="text-slate-600 shrink-0 select-none">[{log.timestamp}]</span>
                <span className="break-words">{log.message}</span>
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      )}
    </div>
  );
};
