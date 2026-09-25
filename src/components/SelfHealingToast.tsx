import React, { useEffect, useState } from "react";
import { selfHealingMonitor, FailureContext } from "../services/SelfHealingMonitor";
import { AlertCircle, CheckCircle, RefreshCcw, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const SelfHealingToast = () => {
  const [failure, setFailure] = useState<FailureContext | null>(null);
  const [isFixing, setIsFixing] = useState(false);
  const [fixSuccess, setFixSuccess] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = selfHealingMonitor.subscribe((f) => {
      setFailure(f);
      setIsFixing(false);
      setFixSuccess(null);
    });
    return unsubscribe;
  }, []);

  if (!failure) return null;

  const handleFix = async () => {
    setIsFixing(true);
    const success = await failure.applyFix();
    setFixSuccess(success);
    setIsFixing(false);

    if (success) {
      setTimeout(() => {
        selfHealingMonitor.clear();
      }, 2000);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.9 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 p-4 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full"
        dir="rtl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white mb-1">
                تنبيه: فشل في تنفيذ الأمر ({failure.action})
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {failure.reason}
              </p>
            </div>
          </div>
          <button
            onClick={() => selfHealingMonitor.clear()}
            className="p-1 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {fixSuccess === null ? (
          <button
            onClick={handleFix}
            disabled={isFixing}
            className="mt-2 flex items-center justify-center gap-2 w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-70"
          >
            {isFixing ? (
              <RefreshCcw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCcw className="w-4 h-4" />
            )}
            <span>إصلاح تلقائي (Auto-Fix)</span>
          </button>
        ) : fixSuccess ? (
          <div className="mt-2 flex items-center justify-center gap-2 w-full py-2 bg-emerald-500/20 text-emerald-400 text-sm font-bold rounded-lg border border-emerald-500/30">
            <CheckCircle className="w-4 h-4" />
            <span>تم الإصلاح بنجاح!</span>
          </div>
        ) : (
          <div className="mt-2 flex items-center justify-center gap-2 w-full py-2 bg-rose-500/20 text-rose-400 text-sm font-bold rounded-lg border border-rose-500/30">
            <AlertCircle className="w-4 h-4" />
            <span>فشل الإصلاح التلقائي. حاول مرة أخرى يدوياً.</span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
